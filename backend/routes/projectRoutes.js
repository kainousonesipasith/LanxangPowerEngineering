const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Project operations
router.get('/', verifyToken, projectController.getProjects);
router.post('/', verifyToken, requireRole(['super_admin']), projectController.createProject);
router.put('/:id', verifyToken, requireRole(['super_admin']), projectController.updateProject);
router.delete('/:id', verifyToken, requireRole(['super_admin']), projectController.deleteProject);

module.exports = router;
