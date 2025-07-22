const Presentation = require('../models/presentation');

exports.checkOwnership = async (req, res, next) => {
    try {
        const presentation = await Presentation.findById(req.params.id);

        if (!presentation) {
            return res.status(404).json({ message: "العرض غير موجود" });
        }

        // مقارنة معرف المالك بمعرف المستخدم الحالي
        if (presentation.owner.toString() !== req.userId.toString()) {
            return res.status(403).json({ message: "غير مصرح لك بتعديل هذا العرض" });
        }

        // إرفاق العرض بالطلب لاستخدامه في المتحكم (controller)
        req.presentation = presentation;
        next();
    } catch (error) {
        console.error("خطأ في ميدل وير التحقق من الملكية:", error);
        res.status(500).json({ message: "خطأ في الخادم أثناء التحقق من الملكية" });
    }
};