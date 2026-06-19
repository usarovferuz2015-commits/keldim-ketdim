const { Router } = require('express');
const locationController = require('../controllers/location.controller');
const { auth, authorize } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');

const router = Router();

router.get('/', auth, locationController.getAll);
router.get('/active', auth, locationController.getActive);
router.get('/:id', auth, locationController.getById);
router.post('/', auth, authorize('ADMIN'), auditLog('CREATE', 'LOCATION'), locationController.create);
router.put('/:id', auth, authorize('ADMIN'), auditLog('UPDATE', 'LOCATION'), locationController.update);
router.delete('/:id', auth, authorize('ADMIN'), auditLog('DELETE', 'LOCATION'), locationController.delete);

module.exports = router;
