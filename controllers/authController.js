const bcrypt = require('bcryptjs');
const Users = require('../models/users');
const jwtHelpers = require('../utils/jwtHelpers');
const TokenBlocklist = require('../models/tokenBlocklist');


// دالة تسجيل الدخول
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        // البحث عن المستخدم في قاعدة البيانات
        const user = await Users.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        // مقارنة كلمة المرور المدخلة مع المشفّرة
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        // إصدار التوكن
        const token = jwtHelpers.sign({ sub: user._id });
        res.json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// دالة التسجيل الجديدة
exports.register = async (req, res) => {
    try {
        const { username, password } = req.body;

        // تحقق من وجود المستخدم مسبقاً
        let user = await Users.findOne({ username });
        if (user) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        // تشفير كلمة المرور
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(password, salt);

        // إنشاء وحفظ المستخدم الجديد
        user = new Users({ username, password: hashed });
        await user.save();

        // إصدار التوكن
        const token = jwtHelpers.sign({ sub: user._id });
        res.status(201).json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};



// دالة تسجيل الخروج
exports.logout = async (req, res) => {
    try {
        const authHeader = req.headers['authorization'] || req.headers['Authorization'];
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            if (token) {
                const blocklistedToken = new TokenBlocklist({ token });
                await blocklistedToken.save();
            }
        }
        res.json({ message: 'Logged out successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.me = async (req, res) => {
    try {
        // البحث عن المستخدم باستخدام الـ id الموجود في التوكن
        const user = await Users.findById(req.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
