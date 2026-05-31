const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken);
router.use(requireRole(['super_admin']));

router.get('/export', backupController.exportBackup);
router.post('/restore', backupController.restoreBackup);

module.exports = router;
