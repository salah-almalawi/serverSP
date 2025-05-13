const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/authController');

router.post('/register', authCtrl.register);

// تسجيل الدخول
router.post('/login', authCtrl.login);

// تسجيل الخروج
router.post('/logout', authCtrl.logout);

module.exports = router;