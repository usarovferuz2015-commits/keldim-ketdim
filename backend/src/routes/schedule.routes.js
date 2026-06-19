const { Router } = require('express');
const scheduleController = require('../controllers/schedule.controller');
const { auth, authorize } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');

const router = Router();

router.get('/', auth, authorize('ADMIN'), scheduleController.getAll);
router.get('/my', auth, scheduleController.getMySchedule);
router.get('/:userId', auth, scheduleController.getByUserId);
router.post('/:userId', auth, authorize('ADMIN'), auditLog('CREATE', 'SCHEDULE'), scheduleController.create);
router.put('/:userId', auth, authorize('ADMIN'), auditLog('UPDATE', 'SCHEDULE'), scheduleController.update);
router.delete('/:userId', auth, authorize('ADMIN'), auditLog('DELETE', 'SCHEDULE'), scheduleController.delete);

module.exports = router;
