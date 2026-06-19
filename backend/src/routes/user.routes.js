const { Router } = require('express');
const userController = require('../controllers/user.controller');
const { auth, authorize } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');
const upload = require('../middleware/upload');

const router = Router();

router.get('/', auth, authorize('ADMIN'), userController.getAll);
router.get('/:id', auth, userController.getById);
router.post('/', auth, authorize('ADMIN'), auditLog('CREATE', 'USER'), userController.create);
router.put('/:id', auth, authorize('ADMIN'), auditLog('UPDATE', 'USER'), userController.update);
router.delete('/:id', auth, authorize('ADMIN'), auditLog('DELETE', 'USER'), userController.delete);
router.get('/:id/face-template', auth, userController.getFaceTemplate);
router.post('/:id/face-template', auth, upload.single('faceImage'), userController.saveFaceTemplate);

module.exports = router;
