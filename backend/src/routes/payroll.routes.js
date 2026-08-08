const { Router } = require('express');
const payrollController = require('../controllers/payroll.controller');
const { auth, authorize } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');

const router = Router();

// Admin: istalgan xodim (yoki barchasi) uchun; Xodim: faqat o'zi uchun
router.get('/summary', auth, payrollController.getSummary);
router.get('/daily', auth, payrollController.getDaily);
router.get('/overtime-approvals', auth, payrollController.getOvertimeApprovals);
router.post(
  '/overtime-approval',
  auth,
  authorize('ADMIN'),
  auditLog('APPROVE_OVERTIME', 'OVERTIME_APPROVAL'),
  payrollController.approveOvertime
);

module.exports = router;
