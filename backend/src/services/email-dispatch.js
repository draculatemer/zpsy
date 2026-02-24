/**
 * Email Dispatch Service
 * 
 * Manages batch dispatch of leads from PostgreSQL to ActiveCampaign
 * for recovery email campaigns.
 * 
 * Strategy:
 * - Pulls leads from DB by category (checkout_abandoned, sale_cancelled, funnel_abandon)
 * - Adds them to ActiveCampaign in controlled batches (respecting 5,000 contact limit)
 * - Applies the correct tag to trigger the automation
 * - Tracks dispatched leads to avoid duplicates
 * - Schedules automatic cleanup (remove from list) after email cycle
 */

const pool = require('../database');
const acService = require('./activecampaign');
const { AC_API_URL, AC_API_KEY } = require('../config');

// Dispatch status tracking
let dispatchStatus = {
    running: false,
    category: null,
    language: null,
    total: 0,
    processed: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    startedAt: null,
    lastUpdate: null,
    errors: [],
    batchId: null
};

/**
 * Get lead counts by category from the database
 */
async function getLeadCounts() {
    try {
        // Checkout Abandoned EN - leads who clicked checkout but have no approved transaction
        const checkoutAbandonEN = await pool.queryRetry(`
            SELECT COUNT(DISTINCT l.email) as count
            FROM leads l
            INNER JOIN funnel_events fe ON l.ip_address = fe.ip_address
            WHERE fe.event = 'checkout_clicked'
            AND l.email IS NOT NULL AND l.email != ''
            AND l.funnel_language = 'en'
            AND NOT EXISTS (
                SELECT 1 FROM transactions t 
                WHERE t.email = l.email AND t.status = 'approved'
            )
            AND NOT EXISTS (
                SELECT 1 FROM email_dispatch_log d 
                WHERE d.email = l.email AND d.category = 'checkout_abandoned' AND d.language = 'en'
            )
        `);

        // Checkout Abandoned ES
        const checkoutAbandonES = await pool.queryRetry(`
            SELECT COUNT(DISTINCT l.email) as count
            FROM leads l
            INNER JOIN funnel_events fe ON l.ip_address = fe.ip_address
            WHERE fe.event = 'checkout_clicked'
            AND l.email IS NOT NULL AND l.email != ''
            AND l.funnel_language = 'es'
            AND NOT EXISTS (
                SELECT 1 FROM transactions t 
                WHERE t.email = l.email AND t.status = 'approved'
            )
            AND NOT EXISTS (
                SELECT 1 FROM email_dispatch_log d 
                WHERE d.email = l.email AND d.category = 'checkout_abandoned' AND d.language = 'es'
            )
        `);

        // Sale Cancelled EN
        const saleCancelledEN = await pool.queryRetry(`
            SELECT COUNT(DISTINCT t.email) as count
            FROM transactions t
            WHERE t.status IN ('refunded', 'cancelled', 'chargeback')
            AND t.email IS NOT NULL AND t.email != ''
            AND t.funnel_language = 'en'
            AND NOT EXISTS (
                SELECT 1 FROM transactions t2 
                WHERE t2.email = t.email AND t2.status = 'approved'
            )
            AND NOT EXISTS (
                SELECT 1 FROM email_dispatch_log d 
                WHERE d.email = t.email AND d.category = 'sale_cancelled' AND d.language = 'en'
            )
        `);

        // Sale Cancelled ES
        const saleCancelledES = await pool.queryRetry(`
            SELECT COUNT(DISTINCT t.email) as count
            FROM transactions t
            WHERE t.status IN ('refunded', 'cancelled', 'chargeback')
            AND t.email IS NOT NULL AND t.email != ''
            AND t.funnel_language = 'es'
            AND NOT EXISTS (
                SELECT 1 FROM transactions t2 
                WHERE t2.email = t.email AND t2.status = 'approved'
            )
            AND NOT EXISTS (
                SELECT 1 FROM email_dispatch_log d 
                WHERE d.email = t.email AND d.category = 'sale_cancelled' AND d.language = 'es'
            )
        `);

        // Funnel Abandon EN - leads with email but no checkout click and no purchase
        const funnelAbandonEN = await pool.queryRetry(`
            SELECT COUNT(DISTINCT l.email) as count
            FROM leads l
            WHERE l.email IS NOT NULL AND l.email != ''
            AND l.funnel_language = 'en'
            AND NOT EXISTS (
                SELECT 1 FROM transactions t 
                WHERE t.email = l.email AND t.status = 'approved'
            )
            AND NOT EXISTS (
                SELECT 1 FROM funnel_events fe 
                WHERE fe.ip_address = l.ip_address AND fe.event = 'checkout_clicked'
            )
            AND NOT EXISTS (
                SELECT 1 FROM email_dispatch_log d 
                WHERE d.email = l.email AND d.category = 'funnel_abandon' AND d.language = 'en'
            )
        `);

        // Funnel Abandon ES
        const funnelAbandonES = await pool.queryRetry(`
            SELECT COUNT(DISTINCT l.email) as count
            FROM leads l
            WHERE l.email IS NOT NULL AND l.email != ''
            AND l.funnel_language = 'es'
            AND NOT EXISTS (
                SELECT 1 FROM transactions t 
                WHERE t.email = l.email AND t.status = 'approved'
            )
            AND NOT EXISTS (
                SELECT 1 FROM funnel_events fe 
                WHERE fe.ip_address = l.ip_address AND fe.event = 'checkout_clicked'
            )
            AND NOT EXISTS (
                SELECT 1 FROM email_dispatch_log d 
                WHERE d.email = l.email AND d.category = 'funnel_abandon' AND d.language = 'es'
            )
        `);

        return {
            checkout_abandoned: {
                en: parseInt(checkoutAbandonEN.rows[0]?.count || 0),
                es: parseInt(checkoutAbandonES.rows[0]?.count || 0)
            },
            sale_cancelled: {
                en: parseInt(saleCancelledEN.rows[0]?.count || 0),
                es: parseInt(saleCancelledES.rows[0]?.count || 0)
            },
            funnel_abandon: {
                en: parseInt(funnelAbandonEN.rows[0]?.count || 0),
                es: parseInt(funnelAbandonES.rows[0]?.count || 0)
            }
        };
    } catch (error) {
        console.error('Error getting lead counts:', error.message);
        throw error;
    }
}

/**
 * Get leads for a specific category and language
 */
async function getLeadsForDispatch(category, language, limit = 500) {
    let query;

    const langConditionL = `AND l.funnel_language = '${language}'`;
    const langConditionT = `AND t.funnel_language = '${language}'`;

    if (category === 'checkout_abandoned') {
        query = `
            SELECT DISTINCT ON (l.email) l.email, l.name, l.phone
            FROM leads l
            INNER JOIN funnel_events fe ON l.ip_address = fe.ip_address
            WHERE fe.event = 'checkout_clicked'
            AND l.email IS NOT NULL AND l.email != ''
            ${langConditionL}
            AND NOT EXISTS (
                SELECT 1 FROM transactions t 
                WHERE t.email = l.email AND t.status = 'approved'
            )
            AND NOT EXISTS (
                SELECT 1 FROM email_dispatch_log d 
                WHERE d.email = l.email AND d.category = 'checkout_abandoned' AND d.language = '${language}'
            )
            ORDER BY l.email, l.created_at DESC
            LIMIT ${limit}
        `;
    } else if (category === 'sale_cancelled') {
        query = `
            SELECT DISTINCT ON (t.email) t.email, t.customer_name as name, t.phone
            FROM transactions t
            WHERE t.status IN ('refunded', 'cancelled', 'chargeback')
            AND t.email IS NOT NULL AND t.email != ''
            ${langConditionT}
            AND NOT EXISTS (
                SELECT 1 FROM transactions t2 
                WHERE t2.email = t.email AND t2.status = 'approved'
            )
            AND NOT EXISTS (
                SELECT 1 FROM email_dispatch_log d 
                WHERE d.email = t.email AND d.category = 'sale_cancelled' AND d.language = '${language}'
            )
            ORDER BY t.email, t.created_at DESC
            LIMIT ${limit}
        `;
    } else if (category === 'funnel_abandon') {
        query = `
            SELECT DISTINCT ON (l.email) l.email, l.name, l.phone
            FROM leads l
            WHERE l.email IS NOT NULL AND l.email != ''
            ${langConditionL}
            AND NOT EXISTS (
                SELECT 1 FROM transactions t 
                WHERE t.email = l.email AND t.status = 'approved'
            )
            AND NOT EXISTS (
                SELECT 1 FROM funnel_events fe 
                WHERE fe.ip_address = l.ip_address AND fe.event = 'checkout_clicked'
            )
            AND NOT EXISTS (
                SELECT 1 FROM email_dispatch_log d 
                WHERE d.email = l.email AND d.category = 'funnel_abandon' AND d.language = '${language}'
            )
            ORDER BY l.email, l.created_at DESC
            LIMIT ${limit}
        `;
    }

    const result = await pool.queryRetry(query);
    return result.rows;
}

/**
 * Log a dispatched email to prevent duplicates
 */
async function logDispatch(email, category, language, batchId, acContactId, status = 'dispatched') {
    await pool.queryRetry(`
        INSERT INTO email_dispatch_log (email, category, language, batch_id, ac_contact_id, status, dispatched_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (email, category, language) DO UPDATE SET
            batch_id = $4, ac_contact_id = $5, status = $6, dispatched_at = NOW()
    `, [email, category, language, batchId, acContactId, status]);
}

/**
 * Create the dispatch log table if it doesn't exist
 */
async function ensureDispatchTable() {
    await pool.queryRetry(`
        CREATE TABLE IF NOT EXISTS email_dispatch_log (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            category VARCHAR(50) NOT NULL,
            language VARCHAR(10) NOT NULL,
            batch_id VARCHAR(50),
            ac_contact_id VARCHAR(50),
            status VARCHAR(20) DEFAULT 'dispatched',
            dispatched_at TIMESTAMP DEFAULT NOW(),
            cleanup_at TIMESTAMP,
            cleaned_up BOOLEAN DEFAULT FALSE,
            UNIQUE(email, category, language)
        );
        CREATE INDEX IF NOT EXISTS idx_dispatch_log_batch ON email_dispatch_log(batch_id);
        CREATE INDEX IF NOT EXISTS idx_dispatch_log_cleanup ON email_dispatch_log(cleanup_at, cleaned_up);
        CREATE INDEX IF NOT EXISTS idx_dispatch_log_status ON email_dispatch_log(status);
    `);
}

/**
 * Map category to AC event type
 */
function categoryToEventType(category) {
    const map = {
        'checkout_abandoned': 'checkout_abandoned',
        'sale_cancelled': 'sale_cancelled',
        'funnel_abandon': 'lead_captured'
    };
    return map[category] || category;
}

/**
 * Start a batch dispatch process
 */
async function startBatchDispatch(category, language, batchSize = 500) {
    if (dispatchStatus.running) {
        return { success: false, message: 'A dispatch is already running. Wait for it to finish.' };
    }

    // Ensure table exists
    await ensureDispatchTable();

    const batchId = `batch_${Date.now()}_${category}_${language}`;
    
    dispatchStatus = {
        running: true,
        category,
        language,
        total: 0,
        processed: 0,
        success: 0,
        failed: 0,
        skipped: 0,
        startedAt: new Date().toISOString(),
        lastUpdate: new Date().toISOString(),
        errors: [],
        batchId
    };

    // Run dispatch in background
    runDispatch(category, language, batchSize, batchId).catch(err => {
        console.error('Dispatch error:', err);
        dispatchStatus.running = false;
        dispatchStatus.errors.push(err.message);
    });

    return { success: true, batchId, message: `Dispatch started for ${category} ${language}` };
}

/**
 * Run the actual dispatch process (background)
 */
async function runDispatch(category, language, batchSize, batchId) {
    try {
        console.log(`📧 Starting batch dispatch: ${category} ${language} (batch: ${batchSize})`);

        // Get leads
        const leads = await getLeadsForDispatch(category, language, batchSize);
        dispatchStatus.total = leads.length;

        if (leads.length === 0) {
            dispatchStatus.running = false;
            dispatchStatus.lastUpdate = new Date().toISOString();
            console.log('📧 No leads to dispatch');
            return;
        }

        console.log(`📧 Found ${leads.length} leads to dispatch`);

        const eventType = categoryToEventType(category);

        // Process leads one by one with rate limiting
        for (let i = 0; i < leads.length; i++) {
            const lead = leads[i];
            
            try {
                // Add to ActiveCampaign and trigger automation
                const result = await acService.processEvent(eventType, language, {
                    email: lead.email,
                    name: lead.name || '',
                    phone: lead.phone || ''
                });

                if (result.success) {
                    await logDispatch(lead.email, category, language, batchId, result.contactId, 'dispatched');
                    dispatchStatus.success++;
                } else {
                    await logDispatch(lead.email, category, language, batchId, null, 'failed');
                    dispatchStatus.failed++;
                    if (dispatchStatus.errors.length < 10) {
                        dispatchStatus.errors.push(`${lead.email}: ${result.reason}`);
                    }
                }
            } catch (error) {
                dispatchStatus.failed++;
                if (dispatchStatus.errors.length < 10) {
                    dispatchStatus.errors.push(`${lead.email}: ${error.message}`);
                }
            }

            dispatchStatus.processed++;
            dispatchStatus.lastUpdate = new Date().toISOString();

            // Rate limiting: 2 contacts per second (AC API limit)
            if (i < leads.length - 1) {
                await new Promise(r => setTimeout(r, 500));
            }

            // Log progress every 50 contacts
            if ((i + 1) % 50 === 0) {
                console.log(`📧 Dispatch progress: ${i + 1}/${leads.length} (${dispatchStatus.success} ok, ${dispatchStatus.failed} failed)`);
            }
        }

        console.log(`✅ Dispatch complete: ${dispatchStatus.success} dispatched, ${dispatchStatus.failed} failed out of ${leads.length}`);
    } catch (error) {
        console.error('❌ Dispatch error:', error);
        dispatchStatus.errors.push(error.message);
    } finally {
        dispatchStatus.running = false;
        dispatchStatus.lastUpdate = new Date().toISOString();
    }
}

/**
 * Get current dispatch status
 */
function getDispatchStatus() {
    return { ...dispatchStatus };
}

/**
 * Get dispatch history from the database
 */
async function getDispatchHistory(limit = 20) {
    await ensureDispatchTable();
    
    const result = await pool.queryRetry(`
        SELECT 
            batch_id,
            category,
            language,
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'dispatched') as success,
            COUNT(*) FILTER (WHERE status = 'failed') as failed,
            MIN(dispatched_at) as started_at,
            MAX(dispatched_at) as finished_at
        FROM email_dispatch_log
        GROUP BY batch_id, category, language
        ORDER BY MAX(dispatched_at) DESC
        LIMIT $1
    `, [limit]);

    return result.rows;
}

/**
 * Cleanup contacts that have completed their email cycle
 * Should be called periodically (e.g., daily via cron)
 * Removes contacts from AC lists after 7 days (enough time for 4 emails)
 */
async function cleanupCompletedContacts() {
    await ensureDispatchTable();

    // Find contacts dispatched more than 7 days ago that haven't been cleaned up
    const result = await pool.queryRetry(`
        SELECT id, email, category, language, ac_contact_id
        FROM email_dispatch_log
        WHERE status = 'dispatched'
        AND cleaned_up = FALSE
        AND dispatched_at < NOW() - INTERVAL '7 days'
        LIMIT 100
    `);

    if (result.rows.length === 0) {
        console.log('📧 No contacts to cleanup');
        return { cleaned: 0 };
    }

    console.log(`📧 Cleaning up ${result.rows.length} completed contacts`);

    let cleaned = 0;
    for (const row of result.rows) {
        try {
            if (row.ac_contact_id) {
                // Remove recovery tags
                const eventType = categoryToEventType(row.category);
                const tagMapping = acService.TAG_MAP[eventType];
                if (tagMapping && tagMapping[row.language]) {
                    await acService.removeTagFromContact(row.ac_contact_id, tagMapping[row.language]);
                }

                // Unsubscribe from recovery list
                const listMapping = acService.LIST_MAP[eventType];
                if (listMapping && listMapping[row.language]) {
                    // Get list ID
                    const listId = await acService.getOrCreateList(listMapping[row.language]);
                    if (listId) {
                        await acService.apiRequest('POST', 'contactLists', {
                            contactList: {
                                list: String(listId),
                                contact: String(row.ac_contact_id),
                                status: 2 // 2 = unsubscribed
                            }
                        });
                    }
                }
            }

            await pool.queryRetry(`
                UPDATE email_dispatch_log SET cleaned_up = TRUE, cleanup_at = NOW() WHERE id = $1
            `, [row.id]);
            cleaned++;
        } catch (error) {
            console.error(`Failed to cleanup ${row.email}:`, error.message);
        }

        // Rate limit
        await new Promise(r => setTimeout(r, 300));
    }

    console.log(`✅ Cleaned up ${cleaned} contacts`);
    return { cleaned };
}

module.exports = {
    getLeadCounts,
    getLeadsForDispatch,
    startBatchDispatch,
    getDispatchStatus,
    getDispatchHistory,
    cleanupCompletedContacts,
    ensureDispatchTable
};
