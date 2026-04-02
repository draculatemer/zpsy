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

function _cacheContactName(phone, data) {
    const name = data?.notify || data?.name || data?.short || data?.vname || null;
    if (name && typeof name === 'string' && name.trim()) {
        nameCache.set(phone, { name: name.trim(), expiresAt: Date.now() + NAME_CACHE_TTL });
    }
    return name?.trim() || null;
}

async function zapiContactName(phone) {
    const cached = nameCache.get(phone);
    if (cached && Date.now() < cached.expiresAt) {
        console.log(`👤 ContactName CACHE HIT for ${phone}: "${cached.name}"`);
        return cached.name;
    }

    console.log(`👤 ContactName: fetching contacts/${phone} from Z-API...`);
    const result = await zapiRequest(`contacts/${phone}`);
    console.log(`👤 ContactName RAW response for ${phone}: ok=${result.ok}, data=${JSON.stringify(result.data)}`);

    if (result.ok && result.data) {
        const d = result.data;
        console.log(`👤 ContactName FIELDS for ${phone}: notify="${d.notify || ''}", name="${d.name || ''}", short="${d.short || ''}", vname="${d.vname || ''}", about="${d.about || ''}"`);
        const name = _cacheContactName(phone, result.data);
        console.log(`👤 ContactName FINAL for ${phone}: "${name || 'NULL'}"`);
        return name;
    }
    console.log(`👤 ContactName FAILED for ${phone}: Z-API returned ok=${result.ok}`);
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

    let url = await _tryGetPicture(phone);

    if (!url) {
        await new Promise(r => setTimeout(r, 1000));
        url = await _tryGetPicture(phone);
        if (url) console.log(`📸 Picture found on retry for ${phone}`);
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

    // Trigger auto-recovery in background if threshold reached
    setImmediate(() => _autoRecoverIfNeeded());

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
