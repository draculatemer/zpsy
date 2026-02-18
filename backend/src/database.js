/**
 * Database pool configuration
 */
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 15,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000
});

// Prevent crash when Railway proxy drops idle connections (ECONNRESET)
pool.on('error', (err) => {
    console.error('⚠️ Unexpected database pool error (connection will be replaced):', err.message);
});

module.exports = pool;
