const db = require('../db/index');

// Fetch audit logs (restricted to Super Admin)
async function getAuditLogs(req, res) {
    try {
        const queryText = `
            SELECT l.*, u.name as user_display_name
            FROM audit_logs l
            LEFT JOIN users u ON l.user_id = u.id
            ORDER BY l.created_at DESC
            LIMIT 1000
        `;
        const result = await db.query(queryText);
        return res.json(result.rows);
    } catch (err) {
        console.error('Error fetching audit logs:', err);
        return res.status(500).json({ error: 'Failed to retrieve audit logs' });
    }
}

// Create new audit log (open to all authenticated users)
async function createAuditLog(req, res) {
    const { action, module, details } = req.body;
    const userId = req.user ? req.user.id : null;
    const userName = req.user ? req.user.name : 'system';

    if (!action || !module) {
        return res.status(400).json({ error: 'Action and module are required' });
    }

    try {
        await db.query(
            `INSERT INTO audit_logs (user_id, user_name, action, module, details) 
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, userName, action, module, details]
        );
        return res.status(201).json({ message: 'Audit log recorded' });
    } catch (err) {
        console.error('Error creating audit log:', err);
        return res.status(500).json({ error: 'Failed to record audit log' });
    }
}

module.exports = {
    getAuditLogs,
    createAuditLog
};
