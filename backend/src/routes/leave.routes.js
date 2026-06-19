const { Router } = require('express');
const leaveController = require('../controllers/leave.controller');
const { auth, authorize } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');

const router = Router();

router.get('/', auth, authorize('ADMIN'), leaveController.getAll);
router.get('/my', auth, leaveController.getMyLeaves);
router.get('/:id', auth, leaveController.getById);
router.post('/', auth, auditLog('CREATE', 'LEAVE'), leaveController.create);
router.put('/:id/status', auth, authorize('ADMIN'), auditLog('UPDATE', 'LEAVE'), leaveController.updateStatus);
router.delete('/:id', auth, auditLog('DELETE', 'LEAVE'), leaveController.delete);

module.exports = router;
