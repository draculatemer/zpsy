/**
 * RapidAPI whatsapp-data1: nome (leakCheckPro) e imagem de fallback quando Z-API não retorna foto.
 * Chave: RAPIDAPI_KEY (não commitar).
 *
 * Diagnóstico: logs no console; resposta JSON com _debug se WHATSAPP_CHECK_DEBUG=1 no .env.
 */

const RAPID_HOST = 'whatsapp-data1.p.rapidapi.com';
const REQUEST_TIMEOUT_MS = 25000;

function buildQueryString() {
    const qs = new URLSearchParams({
        base64: 'false',
        telegram: 'false',
        google: 'false',
        includeLeakCheckPro: 'true',
        fullAiReport: 'false',
        reverseImageSearch: 'false'
    });
    if (process.env.WHATSAPP_DATA_RAPID_FULL === '1' || process.env.WHATSAPP_DATA_RAPID_FULL === 'true') {
        qs.set('fullAiReport', 'true');
        qs.set('reverseImageSearch', 'true');
    }
    return qs.toString();
}

function getLeakCheckPro(data) {
    if (!data || typeof data !== 'object') return null;
    return data.leakCheckPro ?? data.leak_check_pro ?? data.LeakCheckPro ?? null;
}

/** `result` pode vir como array ou um único objeto */
function leakResultRows(lc) {
    if (!lc || typeof lc !== 'object') return [];
    const r = lc.result;
    if (Array.isArray(r)) return r;
    if (r && typeof r === 'object') return [r];
    return [];
}

function pickNameFromRapidTopLevel(data) {
    if (!data || typeof data !== 'object') return null;
    const c =
        data.name ||
        data.pushName ||
        data.push_name ||
        data.verifiedName ||
        data.verified_name ||
        data.whatsappName ||
        data.profileName;
    return c && String(c).trim() ? String(c).trim() : null;
}

function extractDisplayNameFromLeakCheck(data) {
    const lc = getLeakCheckPro(data);
    const rows = leakResultRows(lc);
    if (rows.length === 0) return null;
    if (lc.success === false && Number(lc.found) === 0) return null;

    const row = rows[0];
    if (!row || typeof row !== 'object') return null;

    const fn =
        row.first_name ?? row.firstName ?? row.given_name ?? row.givenName ?? row.nome ?? null;
    const ln =
        row.last_name ??
        row.lastName ??
        row.family_name ??
        row.familyName ??
        row.sobrenome ??
        null;
    const parts = [fn, ln]
        .map((s) => (s && String(s).trim()) || '')
        .filter(Boolean);
    if (parts.length) return parts.join(' ');

    const single =
        row.name ?? row.full_name ?? row.fullName ?? row.display_name ?? row.displayName ?? null;
    if (single && String(single).trim()) return String(single).trim();
    return null;
}

function extractDisplayNameFromRapid(data) {
    const fromLeak = extractDisplayNameFromLeakCheck(data);
    if (fromLeak) return fromLeak;
    return pickNameFromRapidTopLevel(data);
}

function pickRapidProfileImage(data) {
    const candidates = [data?.profilePic, data?.urlImage, data?.pictureHistory?.[0]?.url];
    for (const u of candidates) {
        if (u && typeof u === 'string' && u.startsWith('http')) return u;
    }
    return null;
}

async function _fetchRapidJson(phoneDigits) {
    const key = process.env.RAPIDAPI_KEY;
    if (!key) {
        return { ok: false, noKey: true, status: null, data: null, durationMs: 0, error: 'no_rapidapi_key', snippet: '' };
    }

    const url = `https://${RAPID_HOST}/number/${encodeURIComponent(phoneDigits)}?${buildQueryString()}`;
    const t0 = Date.now();
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), REQUEST_TIMEOUT_MS);
    try {
        const r = await fetch(url, {
            method: 'GET',
            headers: {
                'x-rapidapi-key': key,
                'x-rapidapi-host': RAPID_HOST,
                'Content-Type': 'application/json'
            },
            signal: ac.signal
        });
        const durationMs = Date.now() - t0;
        if (!r.ok) {
            const snippet = await r.text().catch(() => '');
            console.log(
                `📇 Rapid whatsapp-data HTTP ${r.status} para ${phoneDigits} body=${String(snippet).slice(0, 120)}`
            );
            return { ok: false, noKey: false, status: r.status, data: null, durationMs, error: `http_${r.status}`, snippet: String(snippet).slice(0, 200) };
        }
        const data = await r.json();
        return { ok: true, noKey: false, status: r.status, data, durationMs, error: null, snippet: '' };
    } catch (e) {
        const durationMs = Date.now() - t0;
        const err = e.name === 'AbortError' ? 'timeout' : e.message;
        console.log(`📇 Rapid whatsapp-data: ${err} (${phoneDigits})`);
        return { ok: false, noKey: false, status: null, data: null, durationMs, error: err, snippet: '' };
    } finally {
        clearTimeout(timer);
    }
}

async function fetchWhatsappDataRapid(phoneDigits) {
    const r = await _fetchRapidJson(phoneDigits);
    return r.ok ? r.data : null;
}

/**
 * @returns {Promise<{ name: string|null, fallbackImage: string|null, diag: object }>}
 */
async function enrichWhatsappProfileFromRapid(phoneDigits) {
    const diag = {
        rapid: {
            attempted: false,
            skippedReason: null,
            durationMs: null,
            httpStatus: null,
            hadJsonBody: false,
            topLevelKeys: null,
            leakCheckProPresent: false,
            leakSuccess: null,
            leakFound: null,
            leakResultCount: 0,
            firstLeakRowKeys: null,
            nameExtracted: false,
            fallbackImageUsed: false,
            error: null,
            rapidFullMode:
                process.env.WHATSAPP_DATA_RAPID_FULL === '1' || process.env.WHATSAPP_DATA_RAPID_FULL === 'true'
        }
    };

    const fetched = await _fetchRapidJson(phoneDigits);
    diag.rapid.durationMs = fetched.durationMs;
    diag.rapid.httpStatus = fetched.status;
    diag.rapid.error = fetched.error;

    if (fetched.noKey) {
        diag.rapid.skippedReason = 'no_rapidapi_key';
        console.log(`📇 Rapid ${phoneDigits}: busca NÃO executada (sem RAPIDAPI_KEY)`);
        return { name: null, fallbackImage: null, diag };
    }

    diag.rapid.attempted = true;

    if (!fetched.ok || !fetched.data) {
        console.log(
            `📇 Rapid ${phoneDigits}: busca executada → falha (${diag.rapid.error || 'unknown'}) em ${diag.rapid.durationMs}ms`
        );
        return { name: null, fallbackImage: null, diag };
    }

    const data = fetched.data;
    diag.rapid.hadJsonBody = true;
    diag.rapid.httpStatus = fetched.status;

    if (data && typeof data === 'object') {
        diag.rapid.topLevelKeys = Object.keys(data);
    }

    const lc = getLeakCheckPro(data);
    diag.rapid.leakCheckProPresent = !!lc;
    if (lc && typeof lc === 'object') {
        diag.rapid.leakSuccess = lc.success;
        diag.rapid.leakFound = lc.found;
        const rows = leakResultRows(lc);
        diag.rapid.leakResultCount = rows.length;
        if (rows[0] && typeof rows[0] === 'object') {
            diag.rapid.firstLeakRowKeys = Object.keys(rows[0]);
        }
    }

    const name = extractDisplayNameFromRapid(data);
    const fallbackImage = pickRapidProfileImage(data);
    diag.rapid.nameExtracted = !!name;
    diag.rapid.fallbackImageUsed = !!fallbackImage;

    console.log(
        `📇 Rapid ${phoneDigits}: busca OK em ${diag.rapid.durationMs}ms | leakCheckPro=${diag.rapid.leakCheckProPresent} ` +
            `success=${diag.rapid.leakSuccess} found=${diag.rapid.leakFound} rows=${diag.rapid.leakResultCount} ` +
            `name=${name ? `"${name}"` : 'VAZIO'} fallbackImg=${fallbackImage ? 'sim' : 'não'}`
    );

    if (diag.rapid.leakCheckProPresent && diag.rapid.leakResultCount === 0) {
        console.log(
            `📇 Rapid ${phoneDigits}: leakCheckPro sem linhas — API respondeu mas sem registro LeakCheck para este número (nome fica vazio).`
        );
    }

    return { name, fallbackImage, diag };
}

module.exports = {
    enrichWhatsappProfileFromRapid,
    fetchWhatsappDataRapid,
    extractDisplayNameFromLeakCheck,
    extractDisplayNameFromRapid,
    pickRapidProfileImage
};
