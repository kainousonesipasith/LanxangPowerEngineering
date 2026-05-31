const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey123!';

// Middleware to verify the JWT token and load user info into the request
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ error: 'Authorization header is missing' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Token is missing' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { id, username, role, name, email }
        next();
    } catch (err) {
        console.error('JWT verification error:', err);
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
}

// Middleware to restrict access by role
function requireRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const role = req.user.role;
        // If super_admin, bypass all role restrictions
        if (role === 'super_admin') {
            return next();
        }

        if (allowedRoles.includes(role)) {
            return next();
        }

        return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
    };
}

module.exports = {
    verifyToken,
    requireRole
};
