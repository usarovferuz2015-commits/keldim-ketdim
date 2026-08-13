const { Router } = require('express');
const attendanceController = require('../controllers/attendance.controller');
const { auth, authorize } = require('../middleware/auth');
const validateAttendance = require('../middleware/validateAttendance');
const auditLog = require('../middleware/auditLog');

const router = Router();

router.post('/check-in', auth, validateAttendance, auditLog('CHECK_IN', 'ATTENDANCE'), attendanceController.checkIn);
router.post('/check-out', auth, validateAttendance, auditLog('CHECK_OUT', 'ATTENDANCE'), attendanceController.checkOut);
router.get('/my', auth, attendanceController.getMyAttendance);
router.get('/today', auth, attendanceController.getTodayStatus);
router.get('/stats', auth, attendanceController.getMyStats);
router.get('/', auth, attendanceController.getAll);
router.post(
  '/admin/correct',
  auth,
  authorize('ADMIN'),
  auditLog('ADMIN_ATTENDANCE_CORRECT', 'ATTENDANCE'),
  attendanceController.adminUpsertAttendance
);

module.exports = router;
