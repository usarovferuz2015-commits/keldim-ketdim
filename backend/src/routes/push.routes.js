const { Router } = require('express');
const pushController = require('../controllers/push.controller');
const { auth } = require('../middleware/auth');

const router = Router();

router.get('/public-key', pushController.getPublicKey);
router.post('/subscribe', auth, pushController.subscribe);
router.post('/unsubscribe', auth, pushController.unsubscribe);

module.exports = router;
