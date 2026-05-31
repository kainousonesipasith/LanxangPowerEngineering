const express = require('express');
const router = express.Router();
const generalController = require('../controllers/generalController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

// Announcements
router.get('/announcements', generalController.getAnnouncements);
router.post('/announcements', generalController.createAnnouncement);

// Comments
router.get('/comments', generalController.getComments);
router.post('/comments', generalController.createComment);

// Weekly Reports
router.get('/reports/user-weekly', generalController.getUserWeeklyReports);
router.post('/reports/user-weekly', generalController.createUserWeeklyReport);
router.put('/reports/user-weekly/:id/review', generalController.reviewUserWeeklyReport);

// Weekly Plans
router.get('/reports/user-weekly-plans', generalController.getUserWeeklyPlans);
router.post('/reports/user-weekly-plans', generalController.createUserWeeklyPlan);
router.put('/reports/user-weekly-plans/:id/review', generalController.reviewUserWeeklyPlan);

module.exports = router;
