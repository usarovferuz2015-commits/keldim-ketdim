const { Router } = require('express');
const faceController = require('../controllers/face.controller');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = Router();

router.post('/verify', auth, upload.single('image'), faceController.verifyFace);
router.post('/register', auth, upload.single('image'), faceController.registerFace);
router.post('/liveness', auth, upload.single('image'), faceController.detectLiveness);
router.post('/detect', auth, upload.single('image'), faceController.detectFace);

module.exports = router;
