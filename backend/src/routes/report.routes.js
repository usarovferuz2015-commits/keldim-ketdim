const { Router } = require('express');
const reportController = require('../controllers/report.controller');
const { auth, authorize } = require('../middleware/auth');

const router = Router();

router.get('/daily', auth, authorize('ADMIN'), reportController.dailyReport);
router.get('/weekly', auth, authorize('ADMIN'), reportController.weeklyReport);
router.get('/monthly', auth, authorize('ADMIN'), reportController.monthlyReport);
router.get('/employee/:userId', auth, reportController.employeeReport);
router.get('/export/excel', auth, authorize('ADMIN'), reportController.exportExcel);
router.get('/export/pdf', auth, authorize('ADMIN'), reportController.exportPdf);

module.exports = router;
