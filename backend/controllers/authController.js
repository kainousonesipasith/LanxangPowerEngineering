const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/index');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey123!';

async function login(req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        // Query user with joined role name
        const userQuery = `
            SELECT u.id, u.username, u.password_hash, u.name, u.email, u.department, u.avatar, u.status, u.phone, r.name as role 
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE LOWER(u.username) = LOWER($1) OR LOWER(u.email) = LOWER($1)
        `;
        const userRes = await db.query(userQuery, [username.trim()]);

        if (userRes.rowCount === 0) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const user = userRes.rows[0];

        if (user.status !== 'active') {
            return res.status(403).json({ error: 'Account is disabled. Please contact the administrator.' });
        }

        // Compare password hash
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            // Log failed login attempt
            await db.query(
                `INSERT INTO audit_logs (user_id, user_name, action, module, details) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [user.id, user.name, 'LOGIN_FAILED', 'auth', `Failed login attempt for user: ${user.username}`]
            );
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Generate JWT token
        const payload = {
            id: user.id,
            username: user.username,
            role: user.role,
            name: user.name,
            email: user.email
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' }); // Valid for 30 days offline use

        // Log successful login
        await db.query(
            `INSERT INTO audit_logs (user_id, user_name, action, module, details) 
             VALUES ($1, $2, $3, $4, $5)`,
            [user.id, user.name, 'USER_LOGIN', 'auth', `User logged in successfully: ${user.username} (${user.role.toUpperCase()})`]
        );

        // Respond with token and user details
        return res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                name: user.name,
                email: user.email,
                department: user.department,
                avatar: user.avatar,
                phone: user.phone
            }
        });

    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Internal server error during login' });
    }
}

async function getProfile(req, res) {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const userQuery = `
            SELECT u.id, u.username, u.name, u.email, u.department, u.avatar, u.status, u.phone, r.name as role 
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = $1
        `;
        const userRes = await db.query(userQuery, [req.user.id]);
        if (userRes.rowCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.json(userRes.rows[0]);
    } catch (err) {
        console.error('Get profile error:', err);
        return res.status(500).json({ error: 'Internal server error fetching user profile' });
    }
}

module.exports = {
    login,
    getProfile
};
