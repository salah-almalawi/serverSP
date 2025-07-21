const bcrypt = require('bcryptjs');
const Auth = require('../models/auth');
const jwtHelpers = require('../utils/jwtHelpers');
const TokenBlocklist = require('../models/tokenBlocklist');


// دالة تسجيل الدخول
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        // البحث عن المستخدم في قاعدة البيانات
        const user = await Auth.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
        }
        // مقارنة كلمة المرور المدخلة مع المشفّرة
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
        }
        // إصدار التوكن
        const token = jwtHelpers.sign({ sub: user._id });
        res.json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'خطأ في الخادم أثناء تسجيل الدخول' });
    }
};

// دالة التسجيل الجديدة
exports.register = async (req, res) => {
    try {
        const { username, password } = req.body;

        // تحقق من وجود المستخدم مسبقاً
        let user = await Auth.findOne({ username });
        if (user) {
            return res.status(400).json({ message: 'اسم المستخدم موجود بالفعل' });
        }

        // تشفير كلمة المرور
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(password, salt);

        // إنشاء وحفظ المستخدم الجديد
        user = new Auth({ username, password: hashed });
        await user.save();

        // إصدار التوكن
        const token = jwtHelpers.sign({ sub: user._id });
        res.status(201).json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'خطأ في الخادم أثناء التسجيل' });
    }
};

// دالة تسجيل الخروج
exports.logout = async (req, res) => {
    try {
        const authHeader = req.headers['authorization'] || req.headers['Authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(400).json({ message: 'لم يتم توفير التوكن أو التنسيق غير صحيح' });
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(400).json({ message: 'توكن غير صالح' });
        }

        // التحقق مما إذا كان التوكن موجودًا بالفعل في قائمة الحظر
        const existingToken = await TokenBlocklist.findOne({ token });
        if (existingToken) {
            return res.status(200).json({ message: 'أنت مسجل الخروج بالفعل' });
        } else {
            const blocklistedToken = new TokenBlocklist({ token });
            await blocklistedToken.save();
            return res.json({ message: 'تم تسجيل الخروج بنجاح' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'خطأ في الخادم أثناء تسجيل الخروج' });
    }
};

exports.me = async (req, res) => {
    try {
        // البحث عن المستخدم باستخدام الـ id الموجود في التوكن
        const user = await Auth.findById(req.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'المستخدم غير موجود' });
        }
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'خطأ في الخادم أثناء جلب بيانات المستخدم' });
    }
};
