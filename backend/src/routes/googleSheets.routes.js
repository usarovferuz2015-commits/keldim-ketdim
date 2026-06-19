const { Router } = require('express');
const googleSheetsController = require('../controllers/googleSheets.controller');
const { auth, authorize } = require('../middleware/auth');

const router = Router();

router.post('/sync', auth, authorize('ADMIN'), googleSheetsController.syncNow);
router.get('/status', auth, authorize('ADMIN'), googleSheetsController.getSyncStatus);
router.put('/config', auth, authorize('ADMIN'), googleSheetsController.updateConfig);

module.exports = router;
