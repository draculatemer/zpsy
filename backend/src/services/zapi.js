const ZAPI_INSTANCES = [
    {
        instance: '3E7938F228CBB0978267A6F61CAAA8C7',
        token: '983F7A4EF1F159FAD3C42B05',
        clientToken: 'F0f2cc62f6c4f46088783537c957b7fd6S'
    }
];

// Track dead instances to skip them for 10 minutes instead of retrying every call
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

async function zapiPhoneExists(phone) {
    const result = await zapiRequest(`phone-exists/${phone}`);
    if (result.ok && result.data?.exists !== undefined) {
        return { exists: result.data.exists === true, raw: result };
    }
    // Fallback: /contacts endpoint also confirms existence
    try {
        const contactResult = await zapiRequest(`contacts/${phone}`);
        if (contactResult.ok && contactResult.data?.phone) {
            return { exists: true, raw: contactResult };
        }
    } catch (e) {}
    return { exists: result.ok && result.data?.exists === true, raw: result };
}

// In-memory cache for profile pictures (survives Z-API intermittent failures)
const pictureCache = new Map();
const PICTURE_CACHE_TTL = 30 * 60 * 1000;

function _validPicUrl(url) {
    return url && url !== 'null' && url !== null && typeof url === 'string' && url.startsWith('http');
}

async function _tryGetPicture(phone) {
    // Method 1: profile-picture endpoint
    const result = await zapiRequest(`profile-picture?phone=${phone}`);
    if (result.ok && _validPicUrl(result.data?.link)) {
        return result.data.link;
    }

    // Method 2: /contacts/:phone (works even when profile-picture returns "not-authorized")
    try {
        const contactResult = await zapiRequest(`contacts/${phone}`);
        if (contactResult.ok && _validPicUrl(contactResult.data?.imgUrl)) {
            console.log(`📸 Picture via /contacts fallback for ${phone}`);
            return contactResult.data.imgUrl;
        }
    } catch (e) {
        console.log(`📸 Contacts fallback failed for ${phone}: ${e.message}`);
    }

    return null;
}

async function zapiProfilePicture(phone) {
    // Check cache first
    const cached = pictureCache.get(phone);
    if (cached && Date.now() < cached.expiresAt) {
        console.log(`📸 Picture from cache for ${phone}`);
        return cached.url;
    }

    // First attempt
    let url = await _tryGetPicture(phone);

    // Retry once after 1s if first attempt failed (Z-API is intermittent)
    if (!url) {
        await new Promise(r => setTimeout(r, 1000));
        url = await _tryGetPicture(phone);
        if (url) console.log(`📸 Picture found on retry for ${phone}`);
    }

    // Cache successful results for 30 min
    if (url) {
        pictureCache.set(phone, { url, expiresAt: Date.now() + PICTURE_CACHE_TTL });
    }

    return url;
}

module.exports = {
    ZAPI_INSTANCES,
    zapiRequest,
    zapiCheckStatus,
    zapiSendText,
    zapiPhoneExists,
    zapiProfilePicture
};
