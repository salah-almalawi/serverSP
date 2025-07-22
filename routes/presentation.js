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
  upload.fields([
    { name: 'securityImages', maxCount: 10 },
    { name: 'filePart6', maxCount: 1 },
    { name: 'filePart7', maxCount: 1 },
    { name: 'filePart8', maxCount: 1 },
    { name: 'filePart9', maxCount: 1 },
    { name: 'filePart10', maxCount: 1 }
  ]),
  presentationController.createPresentation
);

// مسار تحديث عرض تقديمي (PUT)
router.put(
  '/:id',
  protect,
  checkOwnership, // التحقق من الملكية قبل الرفع
  upload.fields([
    { name: 'securityImages', maxCount: 10 },
    { name: 'filePart6', maxCount: 1 },
    { name: 'filePart7', maxCount: 1 },
    { name: 'filePart8', maxCount: 1 },
    { name: 'filePart9', maxCount: 1 },
    { name: 'filePart10', maxCount: 1 }
  ]),
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
