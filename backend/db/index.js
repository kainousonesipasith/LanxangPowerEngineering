const { Pool } = require('pg');
require('dotenv').config();

// Initialize PostgreSQL connection pool using environment parameters
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE || 'epc_laos',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432'),
});

pool.on('connect', () => {
    console.log('Database pool connected successfully.');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle database client', err);
});

module.exports = {
    query: (text, params) => {
        // Query logging wrapper
        const start = Date.now();
        return pool.query(text, params)
            .then(res => {
                const duration = Date.now() - start;
                console.log(`Executed query: ${text.substring(0, 100)}... [${duration}ms, rows: ${res.rowCount}]`);
                return res;
            })
            .catch(err => {
                console.error(`Error executing query: ${text.substring(0, 100)}...`, err);
                throw err;
            });
    },
    pool
};
