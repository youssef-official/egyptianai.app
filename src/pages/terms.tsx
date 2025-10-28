const TermsPage = () => {
  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-primary/10 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">الشروط والأحكام</h1>
        
        <div className="bg-card rounded-3xl shadow-medium p-6 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-3">1. استخدام الموقع</h2>
            <p className="text-muted-foreground">
              الموقع مخصص لتقديم استشارات طبية عن بُعد مع أطباء مصريين معتمدين. أي استخدام آخر يُعد مخالفًا للشروط.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">2. الحسابات</h2>
            <p className="text-muted-foreground">
              يجب عليك تسجيل حساب باستخدام بريدك الإلكتروني فقط. أي معلومات مزيفة تؤدي إلى إغلاق الحساب فورًا.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">3. المحادثات الطبية</h2>
            <p className="text-muted-foreground">
              • يمكن للمستخدم بدء محادثة مع طبيب حقيقي بعد الدفع المسبق.<br />
              • كل عملية محادثة تولد رقم تعريف فريد (ID) يتم استخدامه للتحقق لاحقًا.<br />
              • المنصة ليست بديلاً عن الاستشارة الطبية الفعلية، وإنما وسيلة تواصل رقمية فقط.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">4. سياسة الخصوصية</h2>
            <p className="text-muted-foreground">
              • يتم تخزين بيانات المستخدمين بشكل آمن.<br />
              • لا يتم مشاركة المعلومات مع أطراف خارجية دون إذن المستخدم.<br />
              • يمكن للمستخدم حذف حسابه في أي وقت.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">5. المدفوعات</h2>
            <p className="text-muted-foreground">
              يمكن الدفع من خلال المحافظ الإلكترونية (فودافون كاش، أورنج كاش)، أو العملات الرقمية (USDT, Bitcoin).
              بعد الدفع، يجب رفع إثبات العملية لتأكيد الحجز.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">6. المسؤولية</h2>
            <p className="text-muted-foreground">
              الموقع غير مسؤول عن أي تشخيص خاطئ يتم بناءً على معلومات غير صحيحة يقدمها المستخدم.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">7. التعديلات</h2>
            <p className="text-muted-foreground">
              يحق لإدارة الموقع تعديل هذه الشروط في أي وقت دون إشعار مسبق.
            </p>
          </section>

          <footer className="text-sm text-muted-foreground text-center pt-6 border-t">
            آخر تحديث: {new Date().toLocaleDateString("ar-EG")}<br />
            © {new Date().getFullYear()} AI Egyptian Doctor — جميع الحقوق محفوظة.
          </footer>
        </div>
      </div>
    </main>
  );
};

export default TermsPage;
