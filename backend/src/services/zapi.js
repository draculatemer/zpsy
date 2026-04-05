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

// ==================== Profile Picture with DB Cache ====================

const pictureCache = new Map();
const PICTURE_CACHE_TTL = 30 * 60 * 1000;

function _validPicUrl(url) {
    return url && url !== 'null' && url !== null && typeof url === 'string' && url.startsWith('http');
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
    zapiProfilePicture
};
