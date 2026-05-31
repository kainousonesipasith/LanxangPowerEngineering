const express = require('express');
const router = express.Router();
const procurementController = require('../controllers/procurementController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', procurementController.getProcurements);
router.post('/', procurementController.createProcurement);
router.put('/:id', procurementController.updateProcurement);
router.delete('/:id', procurementController.deleteProcurement);

module.exports = router;
