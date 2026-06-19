const { Router } = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const { auth, authorize } = require('../middleware/auth');

const router = Router();

router.get('/summary', auth, authorize('ADMIN'), dashboardController.getSummary);
router.get('/present-today', auth, authorize('ADMIN'), dashboardController.getPresentToday);
router.get('/absent-today', auth, authorize('ADMIN'), dashboardController.getAbsentToday);
router.get('/currently-working', auth, authorize('ADMIN'), dashboardController.getCurrentlyWorking);
router.get('/late-today', auth, authorize('ADMIN'), dashboardController.getLateToday);
router.get('/attendance-rate', auth, authorize('ADMIN'), dashboardController.getAttendanceRate);

module.exports = router;
