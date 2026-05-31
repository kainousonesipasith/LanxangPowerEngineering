const bcrypt = require('bcryptjs');
const db = require('../db/index');

// Get all users (Super Admin only, or simplified lists for selection)
async function getUsers(req, res) {
    try {
        const queryText = `
            SELECT u.id, u.username, u.name, u.email, u.department, u.avatar, u.status, u.phone, u.created_at, r.name as role 
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            ORDER BY u.id ASC
        `;
        const result = await db.query(queryText);
        return res.json(result.rows);
    } catch (err) {
        console.error('Error fetching users:', err);
        return res.status(500).json({ error: 'Failed to retrieve users' });
    }
}

// Create new user (Super Admin only)
async function createUser(req, res) {
    const { username, password, name, email, role, department, avatar, phone } = req.body;

    if (!username || !password || !name || !email || !role) {
        return res.status(400).json({ error: 'Username, password, name, email, and role are required' });
    }

    try {
        // Verify unique username/email
        const checkUser = await db.query(
            `SELECT id FROM users WHERE username = $1 OR email = $2`,
            [username.trim(), email.trim()]
        );
        if (checkUser.rowCount > 0) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        // Get role ID
        const roleRes = await db.query(`SELECT id FROM roles WHERE name = $1`, [role]);
        if (roleRes.rowCount === 0) {
            return res.status(400).json({ error: 'Invalid role specified' });
        }
        const roleId = roleRes.rows[0].id;

        // Hash password
        const passHash = await bcrypt.hash(password, 10);

        // Insert user
        const insertQuery = `
            INSERT INTO users (username, password_hash, name, email, role_id, department, avatar, status, phone) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8)
            RETURNING id, username, name, email
        `;
        const result = await db.query(insertQuery, [username.trim(), passHash, name, email, roleId, department, avatar, phone]);

        // Log audit
        await db.query(
            `INSERT INTO audit_logs (user_id, user_name, action, module, details) 
             VALUES ($1, $2, $3, $4, $5)`,
            [req.user.id, req.user.name, 'USER_CREATED', 'admin', `Created user: ${username} (${role})`]
        );

        return res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating user:', err);
        return res.status(500).json({ error: 'Failed to create user' });
    }
}

// Update user details (Super Admin only)
async function updateUser(req, res) {
    const { id } = req.params;
    const { username, password, name, email, role, department, avatar, phone, status } = req.body;

    if (!username || !name || !email || !role) {
        return res.status(400).json({ error: 'Username, name, email, and role are required' });
    }

    try {
        // Get user first
        const userRes = await db.query(`SELECT * FROM users WHERE id = $1`, [id]);
        if (userRes.rowCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userRes.rows[0];

        // Verify username/email unique for other users
        const checkUser = await db.query(
            `SELECT id FROM users WHERE (username = $1 OR email = $2) AND id != $3`,
            [username.trim(), email.trim(), id]
        );
        if (checkUser.rowCount > 0) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        // Get role ID
        const roleRes = await db.query(`SELECT id FROM roles WHERE name = $1`, [role]);
        if (roleRes.rowCount === 0) {
            return res.status(400).json({ error: 'Invalid role specified' });
        }
        const roleId = roleRes.rows[0].id;

        // Construct update details
        let passHash = user.password_hash;
        if (password && password.trim() !== '') {
            passHash = await bcrypt.hash(password, 10);
        }

        const updateQuery = `
            UPDATE users 
            SET username = $1, password_hash = $2, name = $3, email = $4, role_id = $5, department = $6, avatar = $7, phone = $8, status = $9
            WHERE id = $10
        `;
        await db.query(updateQuery, [username.trim(), passHash, name, email, roleId, department, avatar, phone, status || 'active', id]);

        // Log audit
        await db.query(
            `INSERT INTO audit_logs (user_id, user_name, action, module, details) 
             VALUES ($1, $2, $3, $4, $5)`,
            [req.user.id, req.user.name, 'USER_UPDATED', 'admin', `Updated user details for: ${username}`]
        );

        return res.json({ message: 'User updated successfully' });
    } catch (err) {
        console.error('Error updating user:', err);
        return res.status(500).json({ error: 'Failed to update user' });
    }
}

// Toggle user status: active/inactive (Super Admin only)
async function toggleStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body;

    if (status !== 'active' && status !== 'inactive') {
        return res.status(400).json({ error: 'Status must be active or inactive' });
    }

    try {
        await db.query(`UPDATE users SET status = $1 WHERE id = $2`, [status, id]);

        // Log audit
        await db.query(
            `INSERT INTO audit_logs (user_id, user_name, action, module, details) 
             VALUES ($1, $2, $3, $4, $5)`,
            [req.user.id, req.user.name, 'USER_STATUS_TOGGLED', 'admin', `Toggled user ${id} status to ${status}`]
        );

        return res.json({ message: `User status changed to ${status}` });
    } catch (err) {
        console.error('Error toggling user status:', err);
        return res.status(500).json({ error: 'Failed to change user status' });
    }
}

// Delete user permanently or soft delete (Super Admin only)
async function deleteUser(req, res) {
    const { id } = req.params;

    try {
        const userRes = await db.query(`SELECT username, name FROM users WHERE id = $1`, [id]);
        if (userRes.rowCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userRes.rows[0];

        // Delete project memberships and user
        await db.query(`DELETE FROM project_members WHERE user_id = $1`, [id]);
        await db.query(`DELETE FROM users WHERE id = $1`, [id]);

        // Log audit
        await db.query(
            `INSERT INTO audit_logs (user_id, user_name, action, module, details) 
             VALUES ($1, $2, $3, $4, $5)`,
            [req.user.id, req.user.name, 'USER_DELETED', 'admin', `Deleted user: ${user.username} (${user.name})`]
        );

        return res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error('Error deleting user:', err);
        return res.status(500).json({ error: 'Failed to delete user' });
    }
}

module.exports = {
    getUsers,
    createUser,
    updateUser,
    toggleStatus,
    deleteUser
};
