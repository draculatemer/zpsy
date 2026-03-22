const ZAPI_INSTANCES = [
    {
        instance: process.env.ZAPI_INSTANCE_ID || '3EEA70039B0B31BFC5924A7638EE86FD',
        token: process.env.ZAPI_TOKEN || '448359FB9C302BCE8D09F8D0',
        clientToken: process.env.ZAPI_CLIENT_TOKEN || 'F74a6d1676b9444cf882101e1d8c2eb05S'
    },
    {
        instance: '3E7938F228CBB0978267A6F61CAAA8C7',
        token: '983F7A4EF1F159FAD3C42B05',
        clientToken: 'F0f2cc62f6c4f46088783537c957b7fd6S'
    }
];

async function zapiRequest(endpoint, options = {}) {
    for (const inst of ZAPI_INSTANCES) {
        try {
            const base = `https://api.z-api.io/instances/${inst.instance}/token/${inst.token}`;
            const url = `${base}/${endpoint}`;
            const headers = { 'Client-Token': inst.clientToken, ...options.headers };
            const r = await fetch(url, { ...options, headers });
            const data = await r.json();
            if (!data.error && r.ok) return { data, ok: true, instance: inst.instance.slice(0, 8) };
            console.log(`Z-API instance ${inst.instance.slice(0,8)}... returned error for ${endpoint}, trying next`);
        } catch (e) {
            console.log(`Z-API instance ${inst.instance.slice(0,8)}... failed for ${endpoint}: ${e.message}`);
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
    return { exists: result.ok && result.data?.exists === true, raw: result };
}

async function zapiProfilePicture(phone) {
    const result = await zapiRequest(`profile-picture?phone=${phone}`);
    if (result.ok && result.data?.link && result.data.link !== 'null' && result.data.link.startsWith('http')) {
        return result.data.link;
    }
    return null;
}

module.exports = {
    ZAPI_INSTANCES,
    zapiRequest,
    zapiCheckStatus,
    zapiSendText,
    zapiPhoneExists,
    zapiProfilePicture
};
