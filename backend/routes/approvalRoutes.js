const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approvalController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.put('/procurement/:id/submit', approvalController.submitProcurement);
router.put('/procurement/:id/review', approvalController.reviewProcurement);
router.put('/procurement/:id/budget-check', approvalController.budgetCheckProcurement);
router.put('/procurement/:id/approve', approvalController.approveProcurement);
router.put('/procurement/:id/reject', approvalController.rejectProcurement);
router.put('/procurement/:id/request-revision', approvalController.requestRevisionProcurement);
router.put('/procurement/:id/issue-po', approvalController.issuePOProcurement);
router.put('/procurement/:id/update-delivery', approvalController.updateDeliveryProcurement);

// Approval history logs
router.get('/history', approvalController.getApprovalHistory);

module.exports = router;
