const { Router } = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const auditLog = require('../middleware/auditLog');

const router = Router();

router.post('/telegram', [
  body('id').notEmpty().withMessage('Telegram ID talab qilinadi'),
  body('first_name').notEmpty().withMessage('Ism talab qilinadi'),
], validate, authController.telegramLogin);

router.post('/email', [
  body('email').isEmail().withMessage('Email manzili notogri'),
  body('password').notEmpty().withMessage('Parol talab qilinadi'),
], validate, authController.emailLogin);

router.post('/refresh', authController.refreshToken);

router.get('/me', auth, authController.getMe);

router.post('/logout', auth, auditLog('LOGOUT', 'USER'), authController.logout);

module.exports = router;
