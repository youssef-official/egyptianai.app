# 🚀 دليل إعداد Cloudflare R2 - بالعربية

## 📌 نظرة سريعة

تم إعداد التطبيق لاستخدام **Cloudflare R2** بدلاً من Supabase Storage لحفظ:
- ✅ صور البروفايلات
- ✅ صور إثبات الإيداع
- ✅ مستندات الأطباء (الشهادات وصور البطاقة الشخصية)

---

## 🎯 الخطوات الأساسية (5 دقائق)

### الخطوة 1: إنشاء Bucket في Cloudflare

1. اذهب إلى [Cloudflare Dashboard](https://dash.cloudflare.com)
2. من القائمة الجانبية، اضغط **R2** (أو **Object Storage**)
3. إذا لم يكن R2 مفعل لديك:
   - اضغط **Enable R2**
   - قد تحتاج لتفعيل الدفع (R2 له خطة مجانية)
4. اضغط **Create bucket**
5. **أدخل اسم Bucket بالضبط: `app-storage`** (هذا مهم جداً!)
6. اختر الموقع (Location) - أي موقع مناسب
7. اضغط **Create bucket**

### الخطوة 2: التحقق من API Tokens

التطبيق يستخدم المفاتيح التالية (موجودة في الكود):
- ✅ Account ID: `8cb0db3d90f1e157c16a59a6a5ebe212`
- ✅ Access Key ID: `625a91c9599cc24794da6480aa1b0c81`
- ✅ Secret Access Key: (مخزن في الكود)
- ✅ Endpoint: `https://8cb0db3d90f1e157c16a59a6a5ebe212.r2.cloudflarestorage.com`

**إذا لم يكن لديك API Token:**
1. في صفحة R2، اضغط **Manage R2 API Tokens**
2. اضغط **Create API Token**
3. اختر:
   - **Permissions**: `Object Read & Write`
   - **Bucket**: `app-storage`
4. اضغط **Create API Token**
5. انسخ المفاتيح واحفظها في مكان آمن

---

## ✅ اختبار الإعداد

بعد إنشاء الـ Bucket، جرب التالي:

### 1. رفع صورة بروفايل
```
1. افتح التطبيق
2. اذهب إلى صفحة البروفايل
3. اضغط على صورة البروفايل
4. اختر صورة (حجم أقل من 5MB)
5. يجب أن تظهر رسالة "تم بنجاح!"
```

### 2. رفع إثبات إيداع
```
1. اذهب إلى صفحة الإيداع
2. اختر طريقة الدفع
3. ارفع صورة إثبات الإيداع
4. يجب أن يعمل بنجاح
```

### 3. عرض الصور في لوحة المشرف
```
1. سجل دخول كمشرف
2. اذهب إلى لوحة المشرف
3. اضغط على "عرض إثبات الدفع"
4. يجب أن تظهر الصورة بشكل صحيح
```

---

## 🔧 إعدادات متقدمة (اختياري)

### جعل صور البروفايل عامة (Public)

1. اذهب إلى R2 → **app-storage** → **Settings**
2. في قسم **Public Access**، اضغط **Allow Access**
3. ستحصل على رابط مثل: `https://pub-xxxxx.r2.dev`
4. يمكنك استخدام هذا الرابط في `getR2PublicUrl()` للأداء الأفضل

**ملاحظة:** إثباتات الإيداع تبقى خاصة باستخدام Signed URLs

### ربط نطاق مخصص (Custom Domain)

1. في إعدادات الـ Bucket → **Settings** → **Custom Domains**
2. اضغط **Connect Domain**
3. أدخل subdomain مثل: `cdn.egyptianai.app`
4. اتبع التعليمات لإعداد DNS في Cloudflare
5. بعد الإعداد، يمكنك استخدام `getR2PublicUrl(path, 'https://cdn.egyptianai.app')`

---

## 📁 هيكل الملفات في R2

```
app-storage/
├── profile-images/          ← صور البروفايل
│   └── {user-id}/
│       └── {timestamp}.jpg
│
├── deposit-proofs/         ← صور إثبات الإيداع
│   └── {user-id}/
│       └── {timestamp}.jpg
│
└── doctor-documents/        ← مستندات الأطباء
    └── {user-id}/
        ├── certificates/
        ├── id-cards/
        └── ...
```

---

## ❗ حل المشاكل

### مشكلة: "Failed to upload file"
✅ **الحل:**
1. تحقق من اسم الـ Bucket: يجب أن يكون `app-storage` بالضبط
2. تحقق من صلاحيات الـ API Token (يجب أن تكون Read & Write)
3. تحقق من أن المفاتيح في `src/lib/r2-storage.ts` صحيحة

### مشكلة: الصور لا تظهر
✅ **الحل:**
1. افتح Console في المتصفح (F12)
2. ابحث عن أخطاء R2
3. تحقق من أن المسار في قاعدة البيانات صحيح
4. تأكد من أن Signed URL يتم إنشاؤه بشكل صحيح

### مشكلة: "Bucket not found"
✅ **الحل:**
1. تحقق من أن Bucket اسمه `app-storage` بالضبط
2. تأكد من أنك في الـ Account الصحيح
3. تحقق من الـ Account ID

### مشكلة: "Access Denied"
✅ **الحل:**
1. تحقق من صلاحيات الـ API Token
2. تأكد من أن Token مربوط بالـ Bucket `app-storage`
3. تحقق من أن Secret Access Key صحيح

---

## 🔍 التحقق من أن كل شيء يعمل

### ✅ قائمة التحقق:

- [ ] Bucket `app-storage` موجود في Cloudflare R2
- [ ] API Token له صلاحيات Read & Write على `app-storage`
- [ ] المفاتيح موجودة في `src/lib/r2-storage.ts`
- [ ] يمكن رفع صورة بروفايل بنجاح
- [ ] يمكن رفع إثبات إيداع بنجاح
- [ ] صور إثبات الإيداع تظهر في لوحة المشرف
- [ ] يمكن حذف الصور من لوحة المشرف

---

## 📞 الدعم

إذا واجهت مشكلة:
1. راجع ملف `CLOUDFLARE_R2_SETUP.md` للتفاصيل الإضافية
2. تحقق من [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
3. افحص Console في المتصفح للأخطاء
4. تأكد من أن جميع المفاتيح صحيحة

---

## 🎉 تم الإعداد بنجاح!

بعد إتمام جميع الخطوات والتحقق من أن كل شيء يعمل، التطبيق جاهز للاستخدام مع Cloudflare R2!

**ملاحظة:** الملفات القديمة في Supabase Storage ستستمر في العمل إذا كانت URLs كاملة. الملفات الجديدة ستُرفع تلقائياً إلى R2.
