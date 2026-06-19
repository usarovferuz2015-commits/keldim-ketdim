const { Router } = require('express');
const adminController = require('../controllers/admin.controller');
const { auth, authorize } = require('../middleware/auth');

const router = Router();

router.get('/stats', auth, authorize('ADMIN'), adminController.getSystemStats);
router.get('/audit-logs', auth, authorize('ADMIN'), adminController.getAuditLogs);
router.post('/bulk-sync-sheets', auth, authorize('ADMIN'), adminController.bulkSyncSheets);
router.post('/seed-sample-data', auth, authorize('ADMIN'), adminController.seedSampleData);

module.exports = router;
