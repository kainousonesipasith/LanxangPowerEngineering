const db = require('../db/index');

// List of all tables in dependency order (dependencies must be truncated first or created last)
const TABLES = [
    'project_members',
    'comments',
    'approvals',
    'attachments',
    'tasks',
    'milestones',
    'payment_claims',
    'expenses',
    'procurement_requests',
    'weekly_reports',
    'user_weekly_reports',
    'user_weekly_plans',
    'announcements',
    'projects',
    'users',
    'roles',
    'audit_logs'
];

// Export all tables to JSON
async function exportBackup(req, res) {
    const { id: userId, name: userName } = req.user;
    try {
        const backupData = {};

        // Query each table in reverse order
        for (const tableName of TABLES) {
            const result = await db.query(`SELECT * FROM ${tableName}`);
            backupData[tableName] = result.rows;
        }

        // Add backup date info
        backupData.exported_at = new Date().toISOString();
        backupData.version = 'v5-pg';

        await db.query(
            `INSERT INTO audit_logs (user_id, user_name, action, module, details) 
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, userName, 'DATABASE_BACKUP', 'system', 'Database backup file exported successfully']
        );

        return res.json(backupData);
    } catch (err) {
        console.error('Backup export error:', err);
        return res.status(500).json({ error: 'Failed to export database backup' });
    }
}

// Restore database from JSON upload
async function restoreBackup(req, res) {
    const { id: userId, name: userName } = req.user;
    const backupData = req.body;

    if (!backupData || typeof backupData !== 'object') {
        return res.status(400).json({ error: 'Invalid backup file contents' });
    }

    const client = await db.pool.connect();

    try {
        console.log('Starting transactional database restore...');
        await client.query('BEGIN');

        // 1. Truncate all tables in dependency order with CASCADE
        for (const tableName of TABLES) {
            await client.query(`TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE`);
        }
        console.log('All tables truncated successfully.');

        // 2. Re-insert data in reverse table dependency order (independent tables first)
        const reversedTables = [...TABLES].reverse();

        for (const tableName of reversedTables) {
            const rows = backupData[tableName];
            if (!rows || !Array.isArray(rows) || rows.length === 0) {
                console.log(`Skipping table "${tableName}" - no records to restore.`);
                continue;
            }

            console.log(`Restoring ${rows.length} rows to table "${tableName}"...`);

            // Read the column names from the first row
            const columns = Object.keys(rows[0]);
            const colNames = columns.join(', ');

            for (const row of rows) {
                const values = columns.map(col => row[col]);
                const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');

                const insertQuery = `INSERT INTO ${tableName} (${colNames}) VALUES (${placeholders})`;
                await client.query(insertQuery, values);
            }
        }

        // 3. Log restore action inside the transaction so it persists in the new database
        await client.query(
            `INSERT INTO audit_logs (user_id, user_name, action, module, details) 
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, userName, 'DATABASE_RESTORE', 'system', 'Database successfully restored from JSON backup file']
        );

        await client.query('COMMIT');
        console.log('Database restore transaction committed.');
        return res.json({ message: 'Database successfully restored from backup' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error during database restore:', err);
        return res.status(500).json({ error: 'Database restore failed and was rolled back. ' + err.message });
    } finally {
        client.release();
    }
}

module.exports = {
    exportBackup,
    restoreBackup
};
