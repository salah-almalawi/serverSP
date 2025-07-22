const Presentation = require('../models/presentation');
const Auth = require('../models/auth');
const fs = require('fs').promises; // استخدام fs.promises للعمليات غير المتزامنة
const path = require('path');

// @desc    Create new presentation
// @route   POST /api/presentations
// @access  Private
exports.createPresentation = async (req, res) => {
  try {
    // التحقق الأولي من وجود معرف المستخدم
    if (!req.userId) {
      return res.status(401).json({ message: "غير مصرح" }); // Unauthorized
    }

    // معالجة بيانات العرض التقديمي من الجسم (body)
    const presentationData = JSON.parse(req.body.presentationData);
    if (!presentationData) {
      throw new Error("بيانات العرض مطلوبة"); // Presentation data is required
    }

    // معالجة الملفات المتعددة (securityImages)
    const securityImagesPaths = [];
    if (req.files && req.files.securityImages) {
      req.files.securityImages.forEach(file => {
        securityImagesPaths.push(file.path);
      });
    }

    // معالجة الملفات المنفردة (filePart6 - filePart10)
    const fileParts = {};
    for (let i = 6; i <= 10; i++) {
      const fieldName = `filePart${i}`;
      if (req.files && req.files[fieldName] && req.files[fieldName][0]) {
        fileParts[fieldName] = req.files[fieldName][0].path;
      }
    }

    // إنشاء كائن العرض التقديمي الجديد
    const newPresentation = new Presentation({
      owner: req.userId,
      isDraft: true, // تعيين كمسودة افتراضياً
      ...presentationData, // دمج البيانات النصية
      ...fileParts, // دمج مسارات الملفات المنفردة
      securityOutput: {
        ...presentationData.securityOutput,
        images: securityImagesPaths // دمج مسارات صور الأمن
      }
    });

    // حفظ العرض التقديمي في قاعدة البيانات
    const savedPresentation = await newPresentation.save();

    // تحديث مستخدم الـ Auth لإضافة معرف العرض التقديمي
    await Auth.findByIdAndUpdate(
      req.userId,
      { $push: { presentationIDs: savedPresentation._id } }
    );

    // إرجاع استجابة النجاح
    res.status(201).json({
      message: "تم إنشاء العرض التقديمي بنجاح", // Presentation created successfully
      presentation: savedPresentation
    });

  } catch (err) {
    // معالجة الأخطاء
    if (err instanceof SyntaxError) {
      return res.status(400).json({ message: "بيانات JSON غير صالحة" }); // Invalid JSON data
    }
    console.error(err);
    res.status(500).json({ message: "خطأ في إنشاء العرض التقديمي" }); // Error creating presentation
  }
};

// دالة مساعدة لنقل الملفات إلى مجلد الأرشيف
const archiveFile = async (filePath) => {
  if (!filePath) return null; // لا تفعل شيئاً إذا كان المسار فارغاً

  const absoluteFilePath = path.join(process.cwd(), filePath); // تحويل المسار إلى مطلق
  if (await fs.access(absoluteFilePath).then(() => true).catch(() => false)) { // التحقق مما إذا كان الملف موجوداً
    const archiveDir = path.join(process.cwd(), 'uploads', 'archives', path.dirname(filePath).split(path.sep).pop()); // مجلد الأرشيف الخاص بالمستخدم
    const archivePath = path.join(archiveDir, path.basename(filePath));

    await fs.mkdir(archiveDir, { recursive: true }); // إنشاء مجلد الأرشيف إذا لم يكن موجوداً
    await fs.rename(absoluteFilePath, archivePath); // نقل الملف
    return archivePath; // إرجاع المسار الجديد للملف المؤرشف
  }
  return null; // الملف غير موجود
};

// @desc    Update presentation
// @route   PUT /api/presentations/:id
// @access  Private
exports.updatePresentation = async (req, res) => {
  // دالة مساعدة لحذف الملفات المرفوعة في حالة حدوث خطأ
  const cleanupUploadedFiles = async (files) => {
    if (files) {
      for (const key in files) {
        for (const file of files[key]) {
          try {
            await fs.unlink(file.path);
          } catch (unlinkErr) {
            console.error(`Failed to delete uploaded file ${file.path}:`, unlinkErr);
          }
        }
      }
    }
  };

  try {
    const presentation = req.presentation; // تم إرفاق العرض بواسطة ميدل وير checkOwnership

    let updateData;
    try {
      updateData = JSON.parse(req.body.updateData);
    } catch (jsonErr) {
      await cleanupUploadedFiles(req.files);
      return res.status(400).json({ message: "بيانات التحديث غير صالحة (JSON غير صحيح)" });
    }

    // التحقق من عدم وجود بيانات للتحديث أو ملفات مرفوعة
    if (Object.keys(updateData).length === 0 && (!req.files || Object.keys(req.files).length === 0)) {
      return res.status(400).json({ message: "لم تقدم أي بيانات للتحديث" });
    }

    // 1. معالجة تحديث حالة isDraft
    if (typeof updateData.isDraft === 'boolean') {
      presentation.isDraft = updateData.isDraft;
    }

    // 2. معالجة الملفات المنفردة (filePart6 - filePart10)
    for (let i = 6; i <= 10; i++) {
      const field = `filePart${i}`;
      if (req.files && req.files[field] && req.files[field][0]) {
        // أرشفة الملف القديم إذا كان موجوداً
        if (presentation[field]) {
          await archiveFile(presentation[field]);
        }
        presentation[field] = req.files[field][0].path; // حفظ المسار الجديد
      }
    }

    // 3. معالجة صور securityOutput
    if (req.files && req.files.securityImages) {
      // أرشفة جميع الصور القديمة بشكل متوازٍ
      await Promise.all(presentation.securityOutput.images.map(img => archiveFile(img)));
      
      // حفظ الصور الجديدة
      presentation.securityOutput.images = req.files.securityImages.map(
        file => file.path
      );
    }

    // 4. تحديث الحقول النصية (ديناميكي)
    const updatableFields = ['mubdee', 'typeSection', 'mission', 'readiness', 'conclusion', 'securityOutput'];
    updatableFields.forEach(field => {
      if (updateData[field] && typeof updateData[field] === 'object') {
        // دمج الكائنات للحقول المتداخلة
        presentation[field] = { ...presentation[field], ...updateData[field] };
      } else if (updateData[field] !== undefined) {
        // تحديث الحقول غير المتداخلة مباشرة
        presentation[field] = updateData[field];
      }
    });

    // حفظ التحديثات
    const updatedPresentation = await presentation.save();

    res.status(200).json({
      message: "تم تحديث العرض التقديمي بنجاح",
      presentation: updatedPresentation
    });

  } catch (err) {
    console.error("خطأ في تحديث العرض التقديمي:", err);
    // حذف الملفات المرفوعة في حالة حدوث خطأ
    await cleanupUploadedFiles(req.files);

    if (err instanceof SyntaxError) {
      return res.status(400).json({ message: "بيانات JSON غير صالحة" });
    }
    res.status(500).json({ message: "خطأ في الخادم أثناء تحديث العرض التقديمي: " + err.message });
  }
};

// @desc    Get a single presentation by ID
// @route   GET /api/presentations/:id
// @access  Private
exports.getPresentation = async (req, res) => {
  try {
    // العرض التقديمي تم إرفاقه بالطلب بواسطة ميدل وير checkOwnership
    const presentation = await Presentation.findById(req.params.id)
      .populate('owner', 'username') // استرجاع معلومات المالك الأساسية
      .lean(); // تحويل إلى كائن عادي لسهولة التعديل

    if (!presentation) {
      return res.status(404).json({ message: "العرض التقديمي غير موجود" });
    }

    // إضافة المسار الكامل للملفات
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    const fileFields = ['filePart6', 'filePart7', 'filePart8', 'filePart9', 'filePart10'];
    fileFields.forEach(field => {
      if (presentation[field]) {
        presentation[field] = `${baseUrl}/${presentation[field]}`;
      }
    });
    
    // معالجة الصور في securityOutput
    if (presentation.securityOutput?.images) {
      presentation.securityOutput.images = presentation.securityOutput.images.map(
        img => `${baseUrl}/${img}`
      );
    }

    // تنسيق بيانات الاستعداد (Readiness)
    const readinessFields = ['officers', 'personnel', 'civilians', 'contractors', 'femalePersonnel'];
    
    if (presentation.readiness?.humanResources) {
      readinessFields.forEach(field => {
        if (presentation.readiness.humanResources[field]) {
          presentation.readiness.humanResources[field] = 
            parseInt(presentation.readiness.humanResources[field]);
        }
      });
    }
    
    const arrayFields = ['weapons', 'vehicles', 'navalAssets', 'electronicSystems'];
    arrayFields.forEach(field => {
      if (presentation.readiness?.[field]) {
        presentation.readiness[field] = presentation.readiness[field].map(item => ({
          ...item,
          total: parseInt(item.total),
          outOfService: parseInt(item.outOfService)
        }));
      }
    });

    // إعداد Cache-Control
    res.setHeader('Cache-Control', 'private, max-age=300');

    res.status(200).json({
      message: "تم جلب العرض التقديمي بنجاح",
      presentation: presentation
    });

  } catch (err) {
    console.error("خطأ في جلب العرض التقديمي:", err);
    if (err.name === 'CastError') {
      return res.status(400).json({ message: "معرف العرض غير صالح" });
    }
    res.status(500).json({ message: "خطأ في الخادم أثناء جلب العرض التقديمي" });
  }
};

// @desc    Get all presentations for the current user
// @route   GET /api/presentations
// @access  Private
exports.listPresentations = async (req, res) => {
  try {
    const userId = req.userId;

    // بناء كائن التصفية
    const filter = { owner: userId };
    if (req.query.isDraft !== undefined) {
      filter.isDraft = req.query.isDraft === 'true';
    }

    // تهيئة خيارات التقسيم إلى صفحات
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    const MAX_LIMIT = 100; // الحد الأقصى للنتائج

    if (limit > MAX_LIMIT) {
      return res.status(400).json({ message: `لا يمكن جلب أكثر من ${MAX_LIMIT} عرض في مرة واحدة` });
    }
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;

    const skip = (page - 1) * limit;

    // تهيئة خيارات الترتيب
    const sortField = req.query.sort || 'createdAt';
    const sortOrder = req.query.order === 'asc' ? 1 : -1;
    const sortOptions = { [sortField]: sortOrder };

    console.log('Presentation object:', Presentation);
    // استخدام aggregate مع $facet لجلب البيانات والإحصائيات في استعلام واحد
    const result = await Presentation.aggregate([
      { $match: filter },
      { $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $sort: sortOptions },
            { $skip: skip },
            { $limit: limit },
            { $project: { _id: 1, isDraft: 1, createdAt: 1, updatedAt: 1 } }
          ]
      }}
    ]);

    const totalPresentations = result[0].metadata[0] ? result[0].metadata[0].total : 0;
    const presentations = result[0].data;

    // جلب إحصائيات إضافية (يمكن دمجها في aggregate إذا لزم الأمر)
    const draftCount = await Presentation.countDocuments({ ...filter, isDraft: true });
    const publishedCount = totalPresentations - draftCount;

    // توليد روابط للعروض
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const presentationsWithLinks = presentations.map(pres => ({
      ...pres,
      link: `${baseUrl}/api/presentations/${pres._id}`
    }));

    // تجهيز بيانات التقسيم إلى صفحات
    const totalPages = Math.ceil(totalPresentations / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // إعداد Cache-Control
    res.setHeader('Cache-Control', 'private, max-age=60');

    res.status(200).json({
      message: "تم جلب العروض بنجاح",
      data: {
        totalPresentations,
        draftCount,
        publishedCount,
        pagination: {
          currentPage: page,
          totalPages,
          limit,
          hasNextPage,
          hasPrevPage
        },
        presentations: presentationsWithLinks
      }
    });

  } catch (err) {
    console.error("خطأ في جلب العروض:", err);
    if (err.name === 'CastError') {
      return res.status(400).json({ message: "معلمات غير صالحة" });
    }
    res.status(500).json({ message: "خطأ في الخادم أثناء جلب العروض" });
  }
};