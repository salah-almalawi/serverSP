const multer = require('multer');
const path = require('path');
const fs = require('fs');

// دالة لتحديد مسار التخزين واسم الملف
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // التأكد من وجود معرف المستخدم (user ID) في الطلب
        if (!req.user || !req.user.id) {
            return cb(new Error('User ID not found in request. Authentication middleware might be missing or failed.'), null);
        }
        const userId = req.user.id;
        let subfolder = 'others'; // مجلد افتراضي لأنواع الملفات غير المحددة

        // تحديد المجلد الفرعي بناءً على نوع الملف
        if (file.mimetype.startsWith('image/')) {
            subfolder = 'images';
        } else if (file.mimetype === 'application/pdf') {
            subfolder = 'pdfs';
        } else if (file.mimetype === 'application/vnd.google-earth.kml+xml') {
            subfolder = 'kmls';
        } else if (file.mimetype === 'application/vnd.google-earth.kmz') {
            subfolder = 'kmzs';
        }

        const userUploadPath = path.join(__dirname, '../../uploads', userId);
        const finalUploadPath = path.join(userUploadPath, subfolder); // مسار مجلد المستخدم + المجلد الفرعي لنوع الملف

        fs.mkdirSync(finalUploadPath, { recursive: true }); // إنشاء المجلدات إذا لم تكن موجودة
        cb(null, finalUploadPath);
    },
    filename: (req, file, cb) => {
        // إنشاء اسم ملف فريد باستخدام التاريخ واسم الملف الأصلي
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

// دالة لتصفية أنواع الملفات المسموح بها
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg',
        'image/png',
        'application/pdf',
        'application/vnd.google-earth.kml+xml', // KML
        'application/vnd.google-earth.kmz'      // KMZ
    ]; // أنواع الملفات المسموح بها

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true); // قبول الملف
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, PDF, KML, and KMZ are allowed.'), false); // رفض الملف
    }
};

// إعدادات Multer العامة
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 1024 * 1024 * 20 // حجم الملف الأقصى 20 ميجابايت
    }
});

module.exports = upload;