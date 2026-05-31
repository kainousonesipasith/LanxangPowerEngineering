const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken);

// Retrieve logs (Super Admin only)
router.get('/', requireRole(['super_admin']), auditController.getAuditLogs);

// Create log (all authenticated users)
router.post('/', auditController.createAuditLog);

module.exports = router;
