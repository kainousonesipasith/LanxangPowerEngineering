const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

// Task mappings
router.get('/', taskController.getTasks);
router.post('/', taskController.createTask);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

// Milestone mappings
router.get('/milestones', taskController.getMilestones);
router.post('/milestones', taskController.createMilestone);
router.put('/milestones/:id', taskController.updateMilestone);
router.delete('/milestones/:id', taskController.deleteMilestone);

module.exports = router;
