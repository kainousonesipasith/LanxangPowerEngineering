const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// User operations, all restricted to Super Admins
router.use(verifyToken);
router.use(requireRole(['super_admin']));

router.get('/', userController.getUsers);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.put('/:id/status', userController.toggleStatus);
router.delete('/:id', userController.deleteUser);

module.exports = router;
