const { Router } = require('express');
const holidayController = require('../controllers/holiday.controller');
const { auth, authorize } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');

const router = Router();

router.get('/', auth, holidayController.getAll);
router.get('/:id', auth, holidayController.getById);
router.post('/', auth, authorize('ADMIN'), auditLog('CREATE', 'HOLIDAY'), holidayController.create);
router.put('/:id', auth, authorize('ADMIN'), auditLog('UPDATE', 'HOLIDAY'), holidayController.update);
router.delete('/:id', auth, authorize('ADMIN'), auditLog('DELETE', 'HOLIDAY'), holidayController.delete);

module.exports = router;
