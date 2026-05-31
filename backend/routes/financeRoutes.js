const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');
const { verifyToken } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Multer storage setup for processing payment slips/evidence uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads/'));
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

router.use(verifyToken);

// Expenses (Ledger) endpoints
router.get('/expenses', financeController.getExpenses);
router.post('/expenses', financeController.createExpense);
router.delete('/expenses/:id', financeController.deleteExpense);

// Payment Claims endpoints
router.get('/claims', financeController.getPaymentClaims);
router.post('/claims', financeController.createPaymentClaim);
router.put('/claims/:id', financeController.updatePaymentClaim);
router.delete('/claims/:id', financeController.deletePaymentClaim);

// Approval and Gated Disbursement endpoints
router.put('/claims/:id/approve', financeController.approvePaymentClaim);
router.put('/claims/:id/disburse', upload.single('evidence'), financeController.disbursePaymentClaim);

module.exports = router;
