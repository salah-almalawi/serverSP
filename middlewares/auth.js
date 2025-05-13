// middlewares/auth.js
const jwtHelpers = require('../utils/jwtHelpers');

exports.check = (req, res, next) => {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader) {
        return res.status(401).json({ message: 'تحقق من أنك تمتلك التوكن المطلوب.' });
    }

    // استخراج التوكن بعد كلمة Bearer
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ message: 'صيغة التوكن غير صحيحة.' });
    }
    const token = parts[1].trim();

    try {
        const payload = jwtHelpers.verify(token);
        // استخدم sub من التوكن كمعرف المستخدم
        req.userId = payload.sub || payload.id;
        req.userRoles = payload.roles || [];
        return next();
    } catch (err) {
        return res.status(401).json({ message: 'التوكن غير صالح أو منتهي الصلاحية.' });
    }
};