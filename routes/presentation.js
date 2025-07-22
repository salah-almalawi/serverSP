const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const { checkOwnership } = require('../middlewares/checkOwnership'); // استيراد checkOwnership
const upload = require('../middlewares/upload/uploadConfig'); // استيراد كائن Multer المهيأ
const presentationController = require('../controllers/presentationController');

// مسار إنشاء عرض تقديمي جديد (POST)
router.post(
  '/',
  protect,
  upload.array('securityImages', 10),
  upload.single('filePart6'),
  upload.single('filePart7'),
  upload.single('filePart8'),
  upload.single('filePart9'),
  upload.single('filePart10'),
  presentationController.createPresentation
);

// مسار تحديث عرض تقديمي (PUT)
router.put(
  '/:id',
  protect,
  checkOwnership, // التحقق من الملكية قبل الرفع
  upload.array('securityImages', 10),
  upload.single('filePart6'),
  upload.single('filePart7'),
  upload.single('filePart8'),
  upload.single('filePart9'),
  upload.single('filePart10'),
  presentationController.updatePresentation
);

// مسار جلب عرض تقديمي محدد (GET)
router.get(
  '/:id',
  protect,
  checkOwnership, // التحقق من الملكية
  presentationController.getPresentation
);

// مسار جلب جميع العروض التقديمية للمستخدم الحالي (GET)
router.get(
  '/',
  protect,
  presentationController.listPresentations
);

module.exports = router;
