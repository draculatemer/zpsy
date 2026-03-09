/**
 * Google Ads Conversion Tracking service
 * Sends Purchase conversion events server-side when postbacks arrive.
 * Config (conversion_id, conversion_label) is stored in the database
 * and manageable via the admin panel - no code changes needed when
 * Google Ads accounts are recreated.
 */

const pool = require('../database');

// Cache config for 5 minutes to avoid DB hits on every postback
let configCache = {};
let configCacheTime = 0;
const CONFIG_CACHE_TTL = 5 * 60 * 1000;

let catchupRunning = false;
let catchupLastRun = 0;
const CATCHUP_MIN_INTERVAL = 30000;

async function getConfigForLanguage(language) {
    const now = Date.now();
    if (now - configCacheTime < CONFIG_CACHE_TTL && configCache[language] !== undefined) {
        return configCache[language];
    }

    try {
        const result = await pool.query(
            `SELECT conversion_id, conversion_label, is_active FROM gads_config WHERE language = $1`,
            [language]
        );

        // Refresh entire cache
        const allResult = await pool.query(`SELECT language, conversion_id, conversion_label, is_active FROM gads_config`);
        configCache = {};
        for (const row of allResult.rows) {
            configCache[row.language] = row;
        }
        configCacheTime = now;

        return configCache[language] || null;
    } catch (err) {
        console.error('Google Ads: Error loading config:', err.message);
        return null;
    }
}

function invalidateConfigCache() {
    configCacheTime = 0;
    configCache = {};
}

/**
 * Send a Purchase conversion to Google Ads via the server-side
 * conversion tracking endpoint.
 */
async function sendGoogleAdsConversion(transactionData) {
    const { transaction_id, email, value, currency, funnel_language, gclid } = transactionData;
    const language = funnel_language || 'en';

    const config = await getConfigForLanguage(language);

    if (!config || !config.is_active) {
        return { sent: false, reason: 'no_active_config' };
    }

    const { conversion_id, conversion_label } = config;

    // Extract numeric ID from "AW-123456789" format
    const numericId = conversion_id.replace('AW-', '').replace('aw-', '');

    try {
        // Google Ads server-side conversion via the standard endpoint
        const url = new URL(`https://www.googleadservices.com/pagead/conversion/${numericId}/`);
        url.searchParams.set('label', conversion_label);
        url.searchParams.set('value', String(value || 0));
        url.searchParams.set('currency', currency || 'USD');
        url.searchParams.set('transaction_id', transaction_id);
        url.searchParams.set('remarketing_only', '0');

        if (gclid) {
            url.searchParams.set('gclid', gclid);
        }

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: { 'User-Agent': 'ZapSpy-Server/1.0' }
        });

        const success = response.ok;

        // Log the result
        try {
            await pool.query(`
                INSERT INTO gads_purchase_logs 
                    (transaction_id, conversion_id, conversion_label, email, value, currency, funnel_language, success, error_message, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
                ON CONFLICT (transaction_id) DO NOTHING
            `, [
                transaction_id,
                conversion_id,
                conversion_label,
                email,
                value,
                currency || 'USD',
                language,
                success,
                success ? null : `HTTP ${response.status}`
            ]);
        } catch (logErr) {
            console.error('Google Ads: Error logging conversion:', logErr.message);
        }

        if (success) {
            console.log(`✅ Google Ads: Purchase sent for ${transaction_id} (${conversion_id}/${conversion_label}) value=${value} ${currency}`);
        } else {
            console.error(`❌ Google Ads: Purchase failed for ${transaction_id} - HTTP ${response.status}`);
        }

        return { sent: success, conversion_id, conversion_label };
    } catch (err) {
        console.error(`❌ Google Ads: Network error for ${transaction_id}:`, err.message);

        try {
            await pool.query(`
                INSERT INTO gads_purchase_logs 
                    (transaction_id, conversion_id, conversion_label, email, value, currency, funnel_language, success, error_message, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8, NOW())
                ON CONFLICT (transaction_id) DO NOTHING
            `, [transaction_id, conversion_id, conversion_label, email, value, currency || 'USD', language, err.message]);
        } catch (logErr) { /* ignore */ }

        return { sent: false, error: err.message };
    }
}

/**
 * Catch-up: find approved transactions without a Google Ads log entry
 * and send conversions for them. Same pattern as Facebook CAPI catch-up.
 */
async function sendMissingGoogleAdsPurchases() {
    if (catchupRunning) {
        console.log('⏳ Google Ads CATCH-UP: Already running, skipping');
        return;
    }

    const now = Date.now();
    if (now - catchupLastRun < CATCHUP_MIN_INTERVAL) {
        console.log('⏳ Google Ads CATCH-UP: Last run < 30s ago, skipping');
        return;
    }

    catchupRunning = true;
    catchupLastRun = now;

    try {
        // Check if any language has an active config at all
        const activeConfigs = await pool.query(`SELECT language FROM gads_config WHERE is_active = true`);
        if (activeConfigs.rows.length === 0) {
            return;
        }
        const activeLanguages = activeConfigs.rows.map(r => r.language);

        const missingResult = await pool.query(`
            SELECT t.transaction_id, t.email, t.value, t.funnel_language, t.funnel_source, t.created_at,
                   COALESCE(t.gclid, l.gclid) AS gclid
            FROM transactions t
            LEFT JOIN gads_purchase_logs g ON t.transaction_id = g.transaction_id
            LEFT JOIN leads l ON LOWER(t.email) = LOWER(l.email)
            WHERE t.status = 'approved'
              AND g.transaction_id IS NULL
              AND t.created_at >= NOW() - INTERVAL '7 days'
              AND t.email IS NOT NULL
              AND t.funnel_language = ANY($1)
            ORDER BY t.created_at DESC
        `, [activeLanguages]);

        if (missingResult.rows.length === 0) {
            return;
        }

        console.log(`📤 Google Ads CATCH-UP: Found ${missingResult.rows.length} missing conversions. Sending...`);

        const brlToUsdRate = parseFloat(process.env.CONVERSION_BRL_TO_USD || '0.18');
        let sent = 0;
        let failed = 0;

        for (const tx of missingResult.rows) {
            const valueRaw = parseFloat(tx.value) || 0;
            const isPerfectPay = tx.transaction_id?.startsWith('PP_');
            const isBRL = !isPerfectPay;
            const valueUSD = isBRL ? Math.round((valueRaw * brlToUsdRate) * 100) / 100 : valueRaw;

            const result = await sendGoogleAdsConversion({
                transaction_id: tx.transaction_id,
                email: tx.email,
                value: valueUSD,
                currency: 'USD',
                funnel_language: tx.funnel_language || 'en',
                gclid: tx.gclid || null
            });

            if (result.sent) sent++;
            else failed++;
        }

        console.log(`✅ Google Ads CATCH-UP: ${sent} sent, ${failed} failed out of ${missingResult.rows.length}`);
    } catch (err) {
        console.error('❌ Google Ads CATCH-UP error:', err.message);
    } finally {
        catchupRunning = false;
    }
}

module.exports = {
    getConfigForLanguage,
    sendGoogleAdsConversion,
    sendMissingGoogleAdsPurchases,
    invalidateConfigCache
};
