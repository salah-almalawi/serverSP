const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/authController');
const authMiddleware = require('../middlewares/auth');


router.post('/register', authCtrl.register);

// تسجيل الدخول
router.post('/login', authCtrl.login);

// تسجيل الخروج
router.post('/logout', authCtrl.logout);


router.get('/me', authMiddleware.check, authCtrl.me);


module.exports = router;