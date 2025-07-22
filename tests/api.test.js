
const request = require('supertest');
const app = require('../app'); // تأكد من أن هذا المسار صحيح لتطبيق Express الخاص بك
const mongoose = require('mongoose');
const Auth = require('../models/auth');
const Presentation = require('../models/presentation');
const TokenBlocklist = require('../models/tokenBlocklist');
const path = require('path');
const fs = require('fs').promises;

// متغيرات بيئة للاختبار
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/test_db'; // قاعدة بيانات اختبار
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
process.env.BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let token;
let userId;
let presentationId;
const testUsername = 'testuser';
const testPassword = 'testpassword';

beforeAll(async () => {
    // الاتصال بقاعدة بيانات الاختبار
    if (mongoose.connection.readyState === 0) { // 0 = disconnected
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
    }

    // تنظيف قاعدة البيانات قبل كل مجموعة اختبار
    await Auth.deleteMany({});
    await Presentation.deleteMany({});
    await TokenBlocklist.deleteMany({});
});

afterAll(async () => {
    // إغلاق الاتصال بقاعدة البيانات بعد الانتهاء من جميع الاختبارات
    await mongoose.connection.close();
});

describe('Auth API', () => {
    it('يجب أن يسجل مستخدمًا جديدًا بنجاح', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                username: testUsername,
                password: testPassword,
            });
        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('token');
        token = res.body.token; // حفظ التوكن للاختبارات اللاحقة
    });

    it('يجب أن يسجل الدخول لمستخدم موجود بنجاح', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                username: testUsername,
                password: testPassword,
            });
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('token');
        token = res.body.token; // تحديث التوكن
    });

    it('يجب أن يرفض تسجيل الدخول ببيانات اعتماد غير صحيحة', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                username: testUsername,
                password: 'wrongpassword',
            });
        expect(res.statusCode).toEqual(401);
        expect(res.body).toHaveProperty('message', 'اسم المستخدم أو كلمة المرور غير صحيحة');
    });

    it('يجب أن يجلب بيانات المستخدم الحالي بنجاح', async () => {
        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('username', testUsername);
        userId = res.body._id; // حفظ معرف المستخدم
    });

    it('يجب أن يسجل الخروج للمستخدم بنجاح', async () => {
        const res = await request(app)
            .post('/api/auth/logout')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message', 'تم تسجيل الخروج بنجاح');
        // التحقق من أن التوكن قد تم حظره
        const blocked = await TokenBlocklist.findOne({ token });
        expect(blocked).not.toBeNull();
    });

    it('يجب أن يرفض جلب بيانات المستخدم بعد تسجيل الخروج', async () => {
        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`); // استخدام التوكن المحظور
        expect(res.statusCode).toEqual(401);
    });
});

describe('Presentation API', () => {
    // إعادة تسجيل الدخول للحصول على توكن صالح لاختبارات العروض التقديمية
    beforeEach(async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                username: testUsername,
                password: testPassword,
            });
        token = res.body.token;
    });

    it('يجب أن ينشئ عرضًا تقديميًا جديدًا بنجاح', async () => {
        const presentationData = {
            mubdee: "مقدم العرض التجريبي",
            typeSection: "نوع القسم التجريبي",
            mission: "مهمة تجريبية",
            readiness: {
                humanResources: { officers: 1, personnel: 2, civilians: 3, contractors: 4, femalePersonnel: 5 },
                weapons: [{ name: "سلاح تجريبي", total: 10, outOfService: 1 }],
                vehicles: [],
                navalAssets: [],
                electronicSystems: []
            },
            conclusion: "خاتمة تجريبية",
            securityOutput: { images: [] }
        };

        // إنشاء ملفات وهمية للاختبار
        const dummyImagePath = path.join(__dirname, 'dummy_image.png');
        await fs.writeFile(dummyImagePath, 'dummy image content');
        const dummyFilePartPath = path.join(__dirname, 'dummy_file.txt');
        await fs.writeFile(dummyFilePartPath, 'dummy file content');

        const res = await request(app)
            .post('/api/presentations')
            .set('Authorization', `Bearer ${token}`)
            .field('presentationData', JSON.stringify(presentationData))
            .attach('securityImages', dummyImagePath)
            .attach('filePart6', dummyFilePartPath)
            .attach('filePart7', dummyFilePartPath)
            .attach('filePart8', dummyFilePartPath)
            .attach('filePart9', dummyFilePartPath)
            .attach('filePart10', dummyFilePartPath);

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('message', 'تم إنشاء العرض التقديمي بنجاح');
        expect(res.body.presentation).toHaveProperty('_id');
        presentationId = res.body.presentation._id; // حفظ معرف العرض
        
        // تنظيف الملفات الوهمية
        await fs.unlink(dummyImagePath);
        await fs.unlink(dummyFilePartPath);
    });

    it('يجب أن يجلب جميع العروض التقديمية للمستخدم الحالي', async () => {
        const res = await request(app)
            .get('/api/presentations')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body.data.presentations).toBeInstanceOf(Array);
        expect(res.body.data.presentations.length).toBeGreaterThan(0);
    });

    it('يجب أن يجلب عرضًا تقديميًا محددًا بواسطة المعرف', async () => {
        const res = await request(app)
            .get(`/api/presentations/${presentationId}`)
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body.presentation).toHaveProperty('_id', presentationId);
    });

    it('يجب أن يرفض جلب عرض تقديمي غير موجود', async () => {
        const res = await request(app)
            .get('/api/presentations/nonexistentid123456789012') // معرف غير موجود
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toEqual(404);
        expect(res.body).toHaveProperty('message', 'العرض التقديمي غير موجود');
    });

    it('يجب أن يحدث عرضًا تقديميًا موجودًا بنجاح', async () => {
        const updateData = {
            mubdee: "مقدم العرض المحدث",
            isDraft: false,
            readiness: {
                humanResources: { officers: 2 }
            }
        };

        const res = await request(app)
            .put(`/api/presentations/${presentationId}`)
            .set('Authorization', `Bearer ${token}`)
            .field('updateData', JSON.stringify(updateData));

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message', 'تم تحديث العرض التقديمي بنجاح');
        expect(res.body.presentation.mubdee).toEqual('مقدم العرض المحدث');
        expect(res.body.presentation.isDraft).toEqual(false);
        expect(res.body.presentation.readiness.humanResources.officers).toEqual(2);
    });

    // اختبار حذف العرض التقديمي (إذا كان هناك مسار حذف)
    // بما أنه لا يوجد مسار حذف صريح في routes/presentation.js، لن أضيف هذا الاختبار حاليًا.
    // إذا أضفت مسار حذف لاحقًا، يمكنك إضافة اختبار مماثل:
    /*
    it('يجب أن يحذف عرضًا تقديميًا بنجاح', async () => {
        const res = await request(app)
            .delete(`/api/presentations/${presentationId}`)
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message', 'تم حذف العرض التقديمي بنجاح');
        // التحقق من أنه لم يعد موجودًا
        const getRes = await request(app)
            .get(`/api/presentations/${presentationId}`)
            .set('Authorization', `Bearer ${token}`);
        expect(getRes.statusCode).toEqual(404);
    });
    */
});
