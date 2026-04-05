const pool = require('../database');

const ZAPI_INSTANCES = [
    {
        instance: process.env.ZAPI_INSTANCE_ID || '3EEA70039B0B31BFC5924A7638EE86FD',
        token: process.env.ZAPI_TOKEN || '448359FB9C302BCE9D09F8D0',
        clientToken: process.env.ZAPI_CLIENT_TOKEN || 'Fd8be5328288e466eb014c3d6c653dd3aS'
    }
];

const deadInstances = new Map();
const DEAD_INSTANCE_TTL = 10 * 60 * 1000;

// Auto-recovery: track consecutive profile-picture failures and attempt restore
let _picFailCount = 0;
let _lastRecoveryAt = 0;
const PIC_FAIL_THRESHOLD = 5;
const RECOVERY_COOLDOWN = 15 * 60 * 1000;

async function zapiRequest(endpoint, options = {}) {
    for (const inst of ZAPI_INSTANCES) {
        const instKey = inst.instance.slice(0, 8);

        const deadUntil = deadInstances.get(inst.instance);
        if (deadUntil && Date.now() < deadUntil) {
            console.log(`Z-API instance ${instKey}... skipped (marked dead until ${new Date(deadUntil).toISOString()})`);
            continue;
        }

        try {
            const base = `https://api.z-api.io/instances/${inst.instance}/token/${inst.token}`;
            const url = `${base}/${endpoint}`;
            const headers = { 'Client-Token': inst.clientToken, ...options.headers };
            const r = await fetch(url, { ...options, headers });
            const data = await r.json();

            if (!data.error && r.ok) {
                deadInstances.delete(inst.instance);
                return { data, ok: true, instance: instKey };
            }

            console.log(`Z-API instance ${instKey}... returned error for ${endpoint}: ${JSON.stringify(data).slice(0, 200)}, trying next`);

            if (data.error === 'Instance not found' || r.status === 404 || r.status === 401) {
                deadInstances.set(inst.instance, Date.now() + DEAD_INSTANCE_TTL);
                console.log(`Z-API instance ${instKey}... marked as dead for 10 min`);
            }
        } catch (e) {
            console.log(`Z-API instance ${instKey}... failed for ${endpoint}: ${e.message}`);
            deadInstances.set(inst.instance, Date.now() + DEAD_INSTANCE_TTL);
        }
    }
    return { data: null, ok: false };
}

async function zapiCheckStatus() {
    for (const inst of ZAPI_INSTANCES) {
        try {
            const base = `https://api.z-api.io/instances/${inst.instance}/token/${inst.token}`;
            const r = await fetch(`${base}/status`, {
                headers: { 'Client-Token': inst.clientToken }
            });
            const data = await r.json();
            if (r.ok && (data.connected || data.smartphoneConnected)) {
                return { ...data, connected: true, activeInstance: inst.instance.slice(0, 8) + '...' };
            }
        } catch (e) {
            console.log(`Z-API instance ${inst.instance.slice(0,8)}... status check failed: ${e.message}`);
        }
    }
    return { connected: false };
}

async function zapiSendText(phone, message) {
    return zapiRequest('send-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message, delayMessage: 3 })
    });
}

async function zapiPhoneExists(phone) {
    const result = await zapiRequest(`phone-exists/${phone}`);
    if (result.ok && result.data?.exists !== undefined) {
        return { exists: result.data.exists === true, raw: result };
    }
    try {
        const contactResult = await zapiRequest(`contacts/${phone}`);
        if (contactResult.ok && contactResult.data) {
            _cacheContactName(phone, contactResult.data);
            if (contactResult.data.phone) {
                return { exists: true, raw: contactResult };
            }
        }
    } catch (e) {}
    return { exists: result.ok && result.data?.exists === true, raw: result };
}

// ==================== WhatsApp Name Cache ====================

const nameCache = new Map();
const NAME_CACHE_TTL = 60 * 60 * 1000;

function _isJustPhoneNumber(str, phone) {
    if (!str || typeof str !== 'string') return true;
    const cleaned = str.replace(/[\s\-\+\(\)\.]/g, '');
    if (/^\d+$/.test(cleaned)) return true;
    if (cleaned === phone) return true;
    if (str.trim() === '.' || str.trim() === '_') return true;
    return false;
}

function _extractName(phone, data) {
    const candidates = [data?.notify, data?.name, data?.short, data?.vname];
    for (const c of candidates) {
        if (c && typeof c === 'string' && c.trim() && !_isJustPhoneNumber(c, phone)) {
            return c.trim();
        }
    }
    return null;
}

function _cacheContactName(phone, data) {
    const name = _extractName(phone, data);
    if (name) {
        nameCache.set(phone, { name, expiresAt: Date.now() + NAME_CACHE_TTL });
    }
    return name;
}

async function _addContactToWhatsApp(phone) {
    const result = await zapiRequest('contacts/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ firstName: '.', phone }])
    });
    console.log(`👤 ContactAdd ${phone}: ok=${result.ok}`);
    return result.ok;
}

async function zapiContactName(phone) {
    const cached = nameCache.get(phone);
    if (cached && Date.now() < cached.expiresAt) {
        return cached.name;
    }

    console.log(`👤 ContactName: fetching contacts/${phone}...`);
    let result = await zapiRequest(`contacts/${phone}`);

    if (result.ok && result.data) {
        const name = _cacheContactName(phone, result.data);
        if (name) {
            console.log(`👤 ContactName OK for ${phone}: "${name}"`);
            return name;
        }
    }

    console.log(`👤 ContactName: adding contact ${phone} then retrying...`);
    const added = await _addContactToWhatsApp(phone);
    if (!added) {
        console.log(`👤 ContactName FAILED for ${phone}: could not add contact`);
        return null;
    }

    for (const delay of [3000, 5000]) {
        await new Promise(r => setTimeout(r, delay));
        result = await zapiRequest(`contacts/${phone}`);
        if (result.ok && result.data) {
            const d = result.data;
            console.log(`👤 ContactName RETRY (${delay}ms) for ${phone}: notify="${d.notify || ''}", name="${d.name || ''}", short="${d.short || ''}", vname="${d.vname || ''}", about="${d.about || ''}"`);
            const name = _cacheContactName(phone, result.data);
            if (name) {
                console.log(`👤 ContactName FOUND for ${phone}: "${name}"`);
                return name;
            }
        }
    }

    console.log(`👤 ContactName: pushname unavailable for ${phone}`);
    return null;
}

// ==================== Profile Picture with DB Cache + Auto-Recovery ====================

const pictureCache = new Map();
const PICTURE_CACHE_TTL = 30 * 60 * 1000;

function _validPicUrl(url) {
    return url && url !== 'null' && url !== null && typeof url === 'string' && url.startsWith('http');
}

async function _tryGetPicture(phone) {
    const result = await zapiRequest(`profile-picture?phone=${phone}`);
    if (result.ok && _validPicUrl(result.data?.link)) {
        _picFailCount = 0;
        return result.data.link;
    }

    if (result.data?.errorMessage === 'not-authorized') {
        _picFailCount++;
        console.log(`📸 profile-picture not-authorized (fail #${_picFailCount})`);
    }

    try {
        const contactResult = await zapiRequest(`contacts/${phone}`);
        if (contactResult.ok && contactResult.data) {
            _cacheContactName(phone, contactResult.data);
            if (_validPicUrl(contactResult.data.imgUrl)) {
                _picFailCount = 0;
                console.log(`📸 Picture via /contacts fallback for ${phone}`);
                return contactResult.data.imgUrl;
            }
        }
    } catch (e) {
        console.log(`📸 Contacts fallback failed for ${phone}: ${e.message}`);
    }

    return null;
}

async function _autoRecoverIfNeeded() {
    if (_picFailCount < PIC_FAIL_THRESHOLD) return;
    if (Date.now() - _lastRecoveryAt < RECOVERY_COOLDOWN) return;

    _lastRecoveryAt = Date.now();
    _picFailCount = 0;

    for (const inst of ZAPI_INSTANCES) {
        try {
            const base = `https://api.z-api.io/instances/${inst.instance}/token/${inst.token}`;
            const headers = { 'Client-Token': inst.clientToken };

            const statusR = await fetch(`${base}/status`, { headers });
            const status = await statusR.json();
            console.log(`🔄 Auto-recovery: status check → connected=${status.connected}, session=${status.session}`);

            if (!status.connected && !status.session) {
                console.log(`🔄 Auto-recovery: instance already disconnected, trying restore-session...`);
                const restoreR = await fetch(`${base}/restore-session`, { headers });
                const restoreData = await restoreR.json();
                console.log(`🔄 Auto-recovery: restore-session → ${JSON.stringify(restoreData)}`);
            } else {
                console.log(`🔄 Auto-recovery: ${PIC_FAIL_THRESHOLD} consecutive failures but instance still connected — skipping (not disconnecting)`);
            }
        } catch (e) {
            console.log(`🔄 Auto-recovery failed: ${e.message}`);
        }
    }
}

async function _saveToDbCache(phone, url) {
    try {
        await pool.query(`
            INSERT INTO profile_picture_cache (phone, picture_url, fetched_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (phone) DO UPDATE SET picture_url = $2, fetched_at = NOW()
        `, [phone, url]);
    } catch (e) {
        console.log(`📸 DB cache save failed for ${phone}: ${e.message}`);
    }
}

async function _getFromDbCache(phone) {
    try {
        const result = await pool.query(
            `SELECT picture_url, fetched_at FROM profile_picture_cache WHERE phone = $1`,
            [phone]
        );
        if (result.rows.length > 0) {
            return result.rows[0].picture_url;
        }
    } catch (e) {
        console.log(`📸 DB cache read failed for ${phone}: ${e.message}`);
    }
    return null;
}

async function zapiProfilePicture(phone) {
    const cached = pictureCache.get(phone);
    if (cached && Date.now() < cached.expiresAt) {
        return cached.url;
    }

    // Single attempt — no retry, no /contacts fallback to reduce Z-API calls and prevent bans
    const result = await zapiRequest(`profile-picture?phone=${phone}`);
    let url = null;
    if (result.ok && _validPicUrl(result.data?.link)) {
        url = result.data.link;
    }

    if (url) {
        pictureCache.set(phone, { url, expiresAt: Date.now() + PICTURE_CACHE_TTL });
        _saveToDbCache(phone, url);
        return url;
    }

    // Z-API failed — try DB cache as last resort
    const dbUrl = await _getFromDbCache(phone);
    if (dbUrl) {
        console.log(`📸 Picture from DB cache for ${phone}`);
        pictureCache.set(phone, { url: dbUrl, expiresAt: Date.now() + PICTURE_CACHE_TTL });
    }

    return dbUrl;
}

module.exports = {
    ZAPI_INSTANCES,
    zapiRequest,
    zapiCheckStatus,
    zapiSendText,
    zapiPhoneExists,
    zapiProfilePicture,
    zapiContactName
};
