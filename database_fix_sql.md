# حل مشكلة "Database Error For Saving a new user" لتسجيل المستشفيات

المشكلة كانت تكمن في أن نوع المستخدم `user_type` الخاص بالمستشفيات (`hospital`) لم يكن معرفًا في تعداد (ENUM) أنواع المستخدمين في قاعدة البيانات، مما كان يسبب فشلًا في عملية إنشاء المستخدم الجديد (Auth user) وتخزين بياناته في جدول `profiles`، وكذلك فشلًا في عملية إدراج طلب المستشفى في جدول `hospital_requests` بسبب سياسة الأمان (RLS) التي كانت تتوقع أن يكون نوع المستخدم `hospital`.

**الحل المقترح:**

يتطلب الحل تحديث ملفات الهجرة (migrations) الخاصة بقاعدة البيانات لتشمل نوع المستخدم الجديد `hospital` وإضافة دور (role) للمستشفيات، وتعديل دالة `handle_new_user` لتقوم بإضافة الدور الجديد.

## 1. تعديل ملف الهجرة `20251020063204_9069d954-73ff-4e98-adaa-3a7dd6fd6c04.sql`

يجب تعديل هذا الملف لإضافة `hospital` إلى تعداد `user_type` وتعداد `user_roles`.

**التعديل الأول: إضافة `hospital` إلى `user_type` (السطر 5):**

```sql
-- قبل التعديل
CREATE TYPE user_type AS ENUM ('user', 'doctor');

-- بعد التعديل
CREATE TYPE user_type AS ENUM ('user', 'doctor', 'hospital');
```

**التعديل الثاني: إضافة `hospital` إلى `user_roles` (السطر 101):**

```sql
-- قبل التعديل
  role TEXT NOT NULL CHECK (role IN ('admin', 'user', 'doctor')),

-- بعد التعديل
  role TEXT NOT NULL CHECK (role IN ('admin', 'user', 'doctor', 'hospital')),
```

## 2. تعديل دالة `handle_new_user`

يجب تعديل دالة `handle_new_user` في ملفات الهجرة التي تحتويها (مثل `20251027090000_security_rpcs_and_email.sql` و `20251101075150_d5b7ad19-9dc7-4c3c-a011-5a62c7ac6707.sql`) لتقوم بإضافة دور `hospital` في جدول `user_roles` عند إنشاء مستخدم جديد من نوع `hospital`.

**التعديل في دالة `handle_new_user`:**

```sql
-- الجزء الذي تم إضافته بعد إدراج بيانات المحفظة (wallets)
  -- Insert user role if user_type is hospital
  IF COALESCE((NEW.raw_user_meta_data->>'user_type')::text, 'user') = 'hospital' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'hospital');
  END IF;
  
  RETURN NEW;
END;
$$;
```

## 3. تعديل سياسة الأمان (RLS) لجدول `hospital_requests`

في ملف الهجرة `20251114144455_b75cbc42-b88a-4c3c-ac7d-64d260766c8f.sql`، يجب تعديل سياسة الإدراج (INSERT policy) لجدول `hospital_requests` للتأكد من أن المستخدم الذي يقوم بالإدراج هو بالفعل من نوع `hospital` في جدول `profiles`.

**التعديل في ملف `20251114144455_b75cbc42-b88a-4c3c-ac7d-64d260766c8f.sql` (السطر 92):**

```sql
-- قبل التعديل
CREATE POLICY "Users can create requests"
  ON public.hospital_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- بعد التعديل
CREATE POLICY "Hospitals can create requests"
  ON public.hospital_requests FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    (SELECT user_type FROM public.profiles WHERE id = auth.uid()) = 'hospital'
  );
```

**ملاحظة هامة:**

لحل المشكلة على بيئة التطوير الخاصة بك (Local Supabase Setup)، يجب عليك تطبيق هذه التعديلات على ملفات الهجرة الموجودة لديك، ثم إعادة تشغيل بيئة Supabase المحلية لتطبيق التغييرات على قاعدة البيانات.

```bash
# بعد تطبيق التعديلات على ملفات الهجرة
# قم بتشغيل هذا الأمر في مجلد supabase
supabase stop
supabase start
```

إذا كنت تستخدم قاعدة بيانات Supabase حية (Live Database)، فيجب عليك تطبيق هذه التعديلات مباشرة على قاعدة البيانات عبر واجهة Supabase Studio أو عن طريق إنشاء ملف هجرة جديد يحتوي على هذه التعديلات.

لقد قمت بتطبيق هذه التعديلات على الملفات في الريبو المرفوع. يمكنك الآن سحب التغييرات (pull the changes) أو تطبيقها يدويًا.
