# دليل إعداد Cloudflare R2 Storage

## 📋 المتطلبات

قبل البدء، تأكد أن لديك:
- حساب Cloudflare مع الـ Account ID المقدم
- مفاتيح API (Access Key ID و Secret Access Key)
- معرف الـ S3 API endpoint

## 🚀 خطوات الإعداد

### 1. إنشاء Bucket في Cloudflare R2

1. سجل الدخول إلى [Cloudflare Dashboard](https://dash.cloudflare.com)
2. من القائمة الجانبية، اختر **R2** 
3. إذا لم يكن لديك R2 مفعل، اضغط على **Enable R2**
4. بعد تفعيل R2، اضغط على **Create bucket**
5. أدخل اسم الـ bucket: **`app-storage`** (هذا مهم جداً - يجب أن يكون الاسم مطابق)
6. اختر موقع التخزين (Location) - يمكنك اختيار الأقرب لمستخدميك
7. اضغط **Create bucket**

### 2. إنشاء R2 API Token (إذا لم يكن لديك)

إذا لم يكن لديك مفاتيح API بعد:

1. في صفحة R2، اضغط على **Manage R2 API Tokens**
2. اضغط **Create API Token**
3. اختر **Object Read & Write** للصلاحيات
4. اختر الـ Bucket: **app-storage**
5. اضغط **Create API Token**
6. **احفظ المفاتيح فوراً** - لن تتمكن من رؤيتها مرة أخرى:
   - Access Key ID
   - Secret Access Key

### 3. الحصول على Account ID

1. في Cloudflare Dashboard
2. اختر أي موقع (Zone) من القائمة الجانبية
3. انتقل إلى **Overview**
4. في الجانب الأيمن ستجد **Account ID** - انسخه

### 4. إعداد الـ Bucket للوصول العام (اختياري - للصور العامة)

إذا كنت تريد أن تكون صور البروفايل عامة (غير محمية):

1. اذهب إلى **R2** → **app-storage**
2. اضغط على **Settings**
3. في قسم **Public Access**, اضغط **Allow Access**
4. ستحصل على رابط مثل: `https://pub-xxxxx.r2.dev`

**ملاحظة:** للصور الخاصة (إثباتات الدفع)، يجب استخدام Signed URLs (وهذا موجود في الكود)

### 5. ربط نطاق مخصص (Custom Domain) - اختياري

إذا أردت استخدام نطاقك الخاص لعرض الصور:

1. في إعدادات الـ Bucket → **Settings**
2. في قسم **Custom Domains**، اضغط **Connect Domain**
3. أدخل النطاق الفرعي (subdomain) مثل: `cdn.yourdomain.com`
4. اتبع التعليمات لإعداد DNS

## ✅ التحقق من الإعداد

بعد إتمام الخطوات:

1. تأكد من أن Bucket اسمه **`app-storage`** بالضبط
2. تأكد من أن لديك:
   - ✅ Account ID: `8cb0db3d90f1e157c16a59a6a5ebe212`
   - ✅ Access Key ID
   - ✅ Secret Access Key
   - ✅ S3 API Endpoint: `https://8cb0db3d90f1e157c16a59a6a5ebe212.r2.cloudflarestorage.com`

## 📁 هيكل الملفات في R2

الملفات سيتم تخزينها بالشكل التالي:

```
app-storage/
├── profile-images/          # صور البروفايل
│   └── {user-id}/
│       └── {timestamp}.jpg
├── deposit-proofs/          # صور إثبات الإيداع
│   └── {user-id}/
│       └── {timestamp}.jpg
└── doctor-documents/         # مستندات الأطباء
    └── {user-id}/
        ├── certificates/
        ├── id-cards/
        └── ...
```

## 🔧 إعدادات الأمان

### للصور العامة (صور البروفايل):
- يمكن استخدام Public Access أو Signed URLs
- الكود الحالي يستخدم Signed URLs للـ Privacy

### للصور الخاصة (إثباتات الدفع):
- **يجب** استخدام Signed URLs فقط
- الكود الحالي يقوم بذلك تلقائياً

## 🧪 اختبار الإعداد

بعد الإعداد، اختبر التطبيق:

1. **رفع صورة بروفايل:**
   - اذهب إلى صفحة البروفايل
   - اضغط على صورة البروفايل
   - اختر صورة

2. **رفع إثبات إيداع:**
   - اذهب إلى صفحة الإيداع
   - اختر طريقة الدفع
   - ارفع صورة الإثبات

3. **عرض الصور في لوحة المشرف:**
   - اذهب إلى لوحة المشرف
   - اضغط على "عرض إثبات الدفع"
   - يجب أن تظهر الصورة بشكل صحيح

## ❗ حل المشاكل الشائعة

### الصور لا تظهر:
1. تأكد من اسم الـ Bucket: **`app-storage`**
2. تحقق من صحة المفاتيح API
3. تحقق من أن Account ID صحيح

### خطأ في الرفع:
1. تحقق من صلاحيات الـ API Token (يجب أن تكون Read & Write)
2. تحقق من أن الـ Bucket موجود
3. تحقق من حجم الملف (الحد الأقصى 5MB للصور)

### خطأ في Signed URLs:
1. تأكد من أن المفاتيح API صحيحة
2. تحقق من أن الـ endpoint صحيح

## 📞 الدعم

إذا واجهت مشاكل:
1. راجع [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
2. تحقق من Console في المتصفح للأخطاء
3. تأكد من أن جميع المفاتيح صحيحة في `src/lib/r2-storage.ts`

## 🔄 الترقية من Supabase Storage

إذا كان لديك ملفات قديمة في Supabase Storage:
1. سيتم رفع الملفات الجديدة تلقائياً إلى R2
2. الملفات القديمة ستستمر في العمل (إذا كانت URLs كاملة)
3. يمكنك نقل الملفات القديمة يدوياً إذا أردت

---

✅ **بعد إتمام جميع الخطوات، التطبيق جاهز للاستخدام!**
