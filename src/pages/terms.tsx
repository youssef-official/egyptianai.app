export default function TermsPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-12 text-right" dir="rtl">
      <h1 className="text-4xl font-bold mb-6 text-blue-600">
        شروط الاستخدام - AI Egyptian Doctor
      </h1>

      <p className="text-gray-700 leading-relaxed mb-4">
        مرحبًا بك في منصة <strong>AI Egyptian Doctor</strong>. باستخدامك لهذه المنصة،
        فإنك توافق على الالتزام بجميع الشروط والأحكام الموضحة أدناه. نرجو قراءة هذه
        البنود بعناية قبل البدء باستخدام الموقع أو التطبيق.
      </p>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">1. التسجيل والحساب</h2>
        <p className="text-gray-700">
          • يتم التسجيل باستخدام حساب Google عبر Supabase Auth.<br />
          • يجب إدخال معلومات صحيحة ودقيقة أثناء التسجيل.<br />
          • لا يجوز للمستخدم إنشاء أكثر من حساب واحد.<br />
          • لا يمكن تغيير نوع الحساب بعد التسجيل (مستخدم / دكتور).
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">2. النظام المالي</h2>
        <p className="text-gray-700">
          • كل مستخدم يمتلك محفظة رقمية داخل المنصة.<br />
          • يمكن للمستخدمين شحن محافظهم بطرق الدفع المتاحة (فودافون كاش، إنستا باي...).<br />
          • الأطباء يمكنهم سحب أرباحهم بعد خصم عمولة بنسبة 10٪.<br />
          • المنصة لا تتحمل أي مسؤولية عن تأخير عمليات التحويل البنكي.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">3. التحدث مع الأطباء</h2>
        <p className="text-gray-700">
          • يمكن للمستخدم بدء محادثة مع طبيب حقيقي بعد الدفع المسبق.<br />
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
