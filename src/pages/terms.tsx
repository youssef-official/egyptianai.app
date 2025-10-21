// src/pages/terms.tsx
import Head from "next/head";

export default function TermsPage() {
  return (
    <>
      <Head>
        <title>الشروط والأحكام - AI Egyptian Doctor</title>
      </Head>

      <main className="max-w-3xl mx-auto p-6 text-gray-800">
        <h1 className="text-3xl font-bold mb-6">الشروط والأحكام</h1>
        <p className="mb-4">
          باستخدامك لموقع <strong>AI Egyptian Doctor</strong>، فإنك توافق على جميع الشروط الموضحة في هذه الصفحة.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3">1. استخدام الموقع</h2>
        <p className="mb-4">
          الموقع مخصص لتقديم استشارات طبية عن بُعد مع أطباء مصريين معتمدين. أي استخدام آخر يُعد مخالفًا للشروط.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3">2. الحسابات</h2>
        <p className="mb-4">
          يجب عليك تسجيل حساب باستخدام Google عبر Supabase. أي معلومات مزيفة تؤدي إلى إغلاق الحساب فورًا.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3">3. الخصوصية</h2>
        <p className="mb-4">
          نحن نحترم خصوصيتك ولا نشارك بياناتك مع أي جهة خارجية دون موافقتك.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3">4. المدفوعات</h2>
        <p className="mb-4">
          يمكن الدفع من خلال المحافظ الإلكترونية (فودافون كاش، أورنج كاش)، أو العملات الرقمية (USDT, Bitcoin).
          بعد الدفع، يجب رفع إثبات العملية لتأكيد الحجز.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3">5. المسؤولية</h2>
        <p className="mb-4">
          الموقع غير مسؤول عن أي تشخيص خاطئ يتم بناءً على معلومات غير صحيحة يقدمها المستخدم.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3">6. التعديلات</h2>
        <p className="mb-4">
          يحق لإدارة الموقع تعديل هذه الشروط في أي وقت دون إشعار مسبق.
        </p>

        <footer className="mt-10 text-sm text-gray-500">
          آخر تحديث: {new Date().toLocaleDateString("ar-EG")}
        </footer>
      </main>
    </>
  );
}          • يمكن للمستخدم بدء محادثة مع طبيب حقيقي بعد الدفع المسبق.<br />
          • كل عملية محادثة تولد رقم تعريف فريد (ID) يتم استخدامه للتحقق لاحقًا.<br />
          • المنصة ليست بديلاً عن الاستشارة الطبية الفعلية، وإنما وسيلة تواصل رقمية فقط.<br />
          • يتحمل المستخدم المسؤولية الكاملة عن قراراته الناتجة عن المحادثة.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">4. سياسة الخصوصية</h2>
        <p className="text-gray-700">
          • يتم تخزين بيانات المستخدمين بشكل آمن داخل قاعدة بيانات Supabase.<br />
          • لا يتم مشاركة المعلومات مع أطراف خارجية دون إذن المستخدم.<br />
          • يمكن للمستخدم حذف حسابه في أي وقت من صفحة الإعدادات.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">5. مسؤولية المنصة</h2>
        <p className="text-gray-700">
          • المنصة وسيط رقمي بين الطبيب والمستخدم فقط.<br />
          • لا تتحمل إدارة الموقع أي مسؤولية عن سوء استخدام النظام أو البيانات.<br />
          • جميع العمليات المالية يتم مراجعتها من قبل الإدارة قبل التنفيذ.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">6. التعديلات</h2>
        <p className="text-gray-700">
          تحتفظ منصة <strong>AI Egyptian Doctor</strong> بحق تعديل هذه الشروط في أي وقت.
          سيتم إشعار المستخدمين بأي تغييرات جوهرية عبر البريد الإلكتروني أو إشعار داخل التطبيق.
        </p>
      </section>

      <p className="text-sm text-gray-500 mt-10">
        آخر تحديث: {new Date().toLocaleDateString('ar-EG')} <br />
        © {new Date().getFullYear()} AI Egyptian Doctor — جميع الحقوق محفوظة.
      </p>
    </main>
  );
}
