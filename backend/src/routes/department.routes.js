const { Router } = require('express');
const departmentController = require('../controllers/department.controller');
const { auth, authorize } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');

const router = Router();

router.get('/', auth, departmentController.getAll);
router.get('/:id', auth, departmentController.getById);
router.post('/', auth, authorize('ADMIN'), auditLog('CREATE', 'DEPARTMENT'), departmentController.create);
router.put('/:id', auth, authorize('ADMIN'), auditLog('UPDATE', 'DEPARTMENT'), departmentController.update);
router.delete('/:id', auth, authorize('ADMIN'), auditLog('DELETE', 'DEPARTMENT'), departmentController.delete);
router.get('/:id/employees', auth, departmentController.getEmployees);

module.exports = router;
