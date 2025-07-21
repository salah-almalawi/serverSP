const upload = require('./uploadConfig');

// ميدل وير لرفع عدة ملفات
const uploadMultiple = (fieldName, maxCount) => {
    return (req, res, next) => {
        upload.array(fieldName, maxCount)(req, res, (err) => {
            if (err) {
                // التعامل مع الأخطاء الناتجة عن Multer
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ message: 'File size too large. Max 5MB allowed per file.' });
                }
                if (err.message === 'Invalid file type. Only JPEG, PNG, and PDF are allowed.') {
                    return res.status(400).json({ message: err.message });
                }
                if (err.message === 'User ID not found in request. Authentication middleware might be missing or failed.') {
                    return res.status(401).json({ message: err.message });
                }
                return res.status(500).json({ message: err.message || 'File upload failed.' });
            }
            next(); // الانتقال إلى الميدل وير التالي
        });
    };
};

module.exports = uploadMultiple;