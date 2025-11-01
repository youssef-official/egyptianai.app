import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const COMPANY_NAME = "منصة Egyptian AI";
const SUPPORT_EMAIL = Deno.env.get("SUPPORT_EMAIL") || "support@egyptianai.app";
const DEFAULT_LOGO_URL = "https://egyptianai.app/logo.png";
const LOGO_URL = Deno.env.get("BRANDING_LOGO_URL") || DEFAULT_LOGO_URL;
const FROM_EMAIL = `${COMPANY_NAME} <team@egyptianai.app>`;
const BASE_APP_URL = Deno.env.get("BASE_APP_URL") || "https://egyptianai.app";
const BASE_HOST = (() => {
  try {
    return new URL(BASE_APP_URL).hostname;
  } catch (_error) {
    return "egyptianai.app";
  }
})();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, Authorization, x-client-info, apikey, content-type, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

type Tone = "success" | "info" | "danger" | "warning";

interface Highlight {
  label: string;
  value: string;
}

interface TemplateContent {
  subject: string;
  preview: string;
  headline: string;
  greeting?: string;
  paragraphs: string[];
  highlights?: Highlight[];
  status?: { label: string; tone: Tone };
  footerNote?: string;
  cta?: { label: string; url: string };
}

const TONE_STYLES: Record<Tone | "default", { gradient: [string, string]; accent: string; chipBg: string }> = {
  default: { gradient: ["#6366F1", "#4338CA"], accent: "#4338CA", chipBg: "rgba(99, 102, 241, 0.18)" },
  success: { gradient: ["#059669", "#047857"], accent: "#047857", chipBg: "rgba(5, 150, 105, 0.18)" },
  info: { gradient: ["#0EA5E9", "#0284C7"], accent: "#0369A1", chipBg: "rgba(14, 165, 233, 0.20)" },
  danger: { gradient: ["#EF4444", "#B91C1C"], accent: "#B91C1C", chipBg: "rgba(239, 68, 68, 0.18)" },
  warning: { gradient: ["#F59E0B", "#D97706"], accent: "#B45309", chipBg: "rgba(245, 158, 11, 0.20)" },
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCurrency(value: unknown): string | null {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  try {
    return new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 2 }).format(amount);
  } catch (_error) {
    return `${amount.toFixed(2).replace(/\.00$/, "")} ج.م`;
  }
}

function optionalString(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function sanitizeParagraphs(paragraphs: (string | null | undefined)[]): string[] {
  return paragraphs
    .map((paragraph) => optionalString(paragraph))
    .filter((paragraph): paragraph is string => Boolean(paragraph));
}

function buildTextVersion(content: TemplateContent): string {
  const lines: string[] = [];
  lines.push(content.headline);
  if (content.greeting) lines.push(content.greeting);
  lines.push(...content.paragraphs);

  if (content.highlights) {
    for (const highlight of content.highlights) {
      lines.push(`${highlight.label}: ${highlight.value}`);
    }
  }

  if (content.footerNote) {
    lines.push(content.footerNote);
  }

  lines.push(`— فريق ${COMPANY_NAME}`);
  lines.push(`للتواصل: ${SUPPORT_EMAIL}`);

  return lines.join("\n\n");
}

function renderEmail(content: TemplateContent): string {
  const toneStyle = content.status ? TONE_STYLES[content.status.tone] : TONE_STYLES.default;
  const headerGradient = `linear-gradient(135deg, ${toneStyle.gradient[0]} 0%, ${toneStyle.gradient[1]} 100%)`;
  const currentYear = new Date().getFullYear();
  const preview = escapeHtml(content.preview || content.paragraphs[0] || COMPANY_NAME);
  const greetingHtml = content.greeting
    ? `<p style="margin:0 0 16px; font-size:16px; color:#1f2937; font-weight:600;">${escapeHtml(content.greeting)}</p>`
    : "";
  const paragraphsHtml = content.paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px; font-size:15px; line-height:1.9; color:#1f2937;">${escapeHtml(paragraph)}</p>`
    )
    .join("");

  const highlightRows = content.highlights?.length
    ? content.highlights
        .map(
          (highlight, index, arr) => `
            <tr>
              <td style="padding:12px 16px; font-size:14px; color:#475569; font-weight:600; background-color:#f8fafc; border-bottom:${index === arr.length - 1 ? "none" : "1px solid #e2e8f0"}; width:35%;">
                ${escapeHtml(highlight.label)}
              </td>
              <td style="padding:12px 16px; font-size:14px; color:#1f2937; background-color:#ffffff; border-bottom:${index === arr.length - 1 ? "none" : "1px solid #e2e8f0"};">
                ${escapeHtml(highlight.value)}
              </td>
            </tr>
          `
        )
        .join("")
    : "";

  const highlightsHtml = highlightRows
    ? `
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0; border:1px solid #e2e8f0; border-radius:14px; overflow:hidden;">
          ${highlightRows}
        </table>
      `
    : "";

  const statusHtml = content.status
    ? `<span style="display:inline-block; margin-top:18px; padding:8px 18px; border-radius:999px; background:${toneStyle.chipBg}; color:${toneStyle.accent}; font-size:13px; font-weight:600;">${escapeHtml(content.status.label)}</span>`
    : "";

  const ctaHtml = content.cta
    ? `<a href="${escapeHtml(content.cta.url)}" style="display:inline-block; margin:24px 0 8px; padding:14px 28px; background:${toneStyle.accent}; color:#ffffff; font-size:15px; font-weight:700; text-decoration:none; border-radius:999px;">${escapeHtml(content.cta.label)}</a>`
    : "";

  const footerNoteHtml = content.footerNote
    ? `<div style="margin-top:24px; padding:16px 18px; border-radius:12px; background-color:#f1f5f9; color:#475569; font-size:13px;">${escapeHtml(content.footerNote)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(content.subject)}</title>
    <style>
      @media (max-width: 640px) {
        .email-container { width: 100% !important; border-radius: 0 !important; }
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f6fb; font-family:'Tajawal','Cairo','Helvetica Neue',Arial,sans-serif;">
    <div style="display:none; max-height:0; overflow:hidden; font-size:1px; color:#f4f6fb;">${preview}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0; padding:32px 16px; background-color:#f4f6fb;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="620" class="email-container" style="max-width:620px; background-color:#ffffff; border-radius:22px; overflow:hidden; box-shadow:0 20px 50px rgba(15, 23, 42, 0.1);">
            <tr>
              <td style="padding:36px 32px 32px; text-align:center; background:${headerGradient}; color:#ffffff;">
                <img src="${escapeHtml(LOGO_URL)}" alt="${escapeHtml(COMPANY_NAME)}" style="max-width:110px; margin-bottom:18px;" />
                <h1 style="margin:0; font-size:26px; letter-spacing:0.03em; font-weight:800;">${escapeHtml(content.headline)}</h1>
                ${statusHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px;">
                ${greetingHtml}
                ${paragraphsHtml}
                ${highlightsHtml}
                ${ctaHtml}
                <p style="margin:24px 0 0; color:#1f2937; font-weight:600;">مع خالص التحية،</p>
                <p style="margin:4px 0 0; color:#1f2937;">فريق ${escapeHtml(COMPANY_NAME)}</p>
                <p style="margin:12px 0 0; color:#64748b; font-size:13px;">للتواصل معنا: <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color:${toneStyle.accent}; text-decoration:none;">${escapeHtml(SUPPORT_EMAIL)}</a></p>
                ${footerNoteHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 28px; text-align:center; background-color:#0f172a; color:#e2e8f0; font-size:12px;">
                <p style="margin:0 0 8px;">© ${currentYear} ${escapeHtml(COMPANY_NAME)}. جميع الحقوق محفوظة.</p>
                <p style="margin:0;">
                  <a href="${escapeHtml(BASE_APP_URL)}" style="color:#94a3b8; text-decoration:none;">${escapeHtml(BASE_HOST)}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function createTemplate(type: string, data: Record<string, any>): TemplateContent | null {
  const name = optionalString(data?.name) || optionalString(data?.full_name) || optionalString(data?.display_name);
  const friendlyGreeting = name ? `أهلاً ${name}` : "أهلاً بك";
  const amountText = formatCurrency(data?.amount ?? data?.net_amount ?? data?.netAmount);
  const method = optionalString(data?.method);
  const reference = optionalString(data?.reference) || optionalString(data?.transaction_id);
  const notes = optionalString(data?.notes);

  switch (type) {
    case "welcome": {
      const paragraphs = sanitizeParagraphs([
        "يسعدنا انضمامك إلى منصتنا والحصول على أفضل التجارب الطبية الرقمية.",
        "حسابك أصبح جاهزاً الآن، ويمكنك البدء فوراً في حجز الاستشارات أو تصفح الأطباء المعتمدين لدينا.",
      ]);

      return {
        subject: "مرحباً بك في Egyptian AI",
        preview: "حسابك أصبح جاهزاً ويمكنك البدء فوراً في استخدام المنصة.",
        headline: "مرحباً بك في عائلتنا الطبية",
        greeting: name ? `مرحباً ${name}!` : "مرحباً بك!",
        paragraphs,
        status: { label: "حسابك مفعل", tone: "success" },
        footerNote: "ننصحك بإكمال بياناتك الشخصية داخل المنصة لضمان تجربة سلسة ومتكاملة.",
        cta: { label: "بدء استخدام المنصة", url: `${BASE_APP_URL}/` },
      };
    }
    case "deposit_received": {
      const highlights: Highlight[] = [];
      if (amountText) highlights.push({ label: "المبلغ", value: amountText });
      if (method) highlights.push({ label: "طريقة الدفع", value: method });
      if (reference) highlights.push({ label: "رقم العملية", value: reference });

      return {
        subject: "تم استلام طلب الإيداع",
        preview: amountText ? `استلمنا طلب الإيداع بقيمة ${amountText} وجاري مراجعته.` : "استلمنا طلب الإيداع الخاص بك وجاري مراجعته.",
        headline: "تم استلام طلب الإيداع",
        greeting: friendlyGreeting,
        paragraphs: sanitizeParagraphs([
          "استلمنا طلب الإيداع الخاص بك وبدأ فريقنا في مراجعته والتأكد من تفاصيل العملية.",
          "سنعلمك فور الانتهاء من المراجعة بالموافقة أو في حال الحاجة لأي معلومات إضافية.",
        ]),
        highlights,
        status: { label: "قيد المراجعة", tone: "info" },
        footerNote: "يرجى الاحتفاظ بإيصال الدفع لحين اعتماد العملية بالكامل.",
      };
    }
    case "deposit_approved": {
      const highlights: Highlight[] = [];
      if (amountText) highlights.push({ label: "المبلغ المضاف", value: amountText });
      if (notes) highlights.push({ label: "ملاحظات الفريق", value: notes });

      return {
        subject: "تم اعتماد الإيداع وإضافة الرصيد",
        preview: amountText ? `أضفنا ${amountText} إلى محفظتك داخل المنصة.` : "تمت إضافة الرصيد إلى محفظتك داخل المنصة.",
        headline: "مبروك! تم إضافة الرصيد",
        greeting: friendlyGreeting,
        paragraphs: sanitizeParagraphs([
          "تم اعتماد عملية الإيداع بنجاح، وأصبح رصيدك متاحاً للاستخدام فوراً داخل المنصة.",
          "يمكنك الآن البدء في حجز الاستشارات أو شراء الخدمات الطبية المتاحة.",
        ]),
        highlights,
        status: { label: "تمت الموافقة", tone: "success" },
        footerNote: "يمكنك مراجعة تفاصيل محفظتك في أي وقت من خلال صفحة المحفظة داخل التطبيق.",
        cta: { label: "عرض المحفظة", url: `${BASE_APP_URL}/wallet` },
      };
    }
    case "deposit_rejected": {
      const highlights: Highlight[] = [];
      if (amountText) highlights.push({ label: "المبلغ", value: amountText });
      if (notes) highlights.push({ label: "سبب الرفض", value: notes });

      return {
        subject: "تعذر اعتماد الإيداع",
        preview: "تعذر إتمام عملية الإيداع الحالية – التفاصيل مذكورة داخل الرسالة.",
        headline: "تعذر إتمام عملية الإيداع",
        greeting: friendlyGreeting,
        paragraphs: sanitizeParagraphs([
          "نأسف لإبلاغك بأنه تعذر اعتماد طلب الإيداع في الوقت الحالي.",
          "تجد تفاصيل السبب بالأسفل، ويمكنك إعادة المحاولة بعد مراجعة البيانات المطلوبة.",
        ]),
        highlights,
        status: { label: "لم يتم الاعتماد", tone: "danger" },
        footerNote: "فريق الدعم لدينا متواجد دائماً لمساعدتك على إتمام العملية بنجاح.",
      };
    }
    case "withdraw_received": {
      const highlights: Highlight[] = [];
      if (amountText) highlights.push({ label: "المبلغ الصافي المطلوب", value: amountText });
      if (reference) highlights.push({ label: "رقم الطلب", value: reference });

      return {
        subject: "تم استلام طلب السحب",
        preview: amountText ? `استلمنا طلب السحب الخاص بك بقيمة ${amountText}.` : "استلمنا طلب السحب الخاص بك وجاري مراجعته.",
        headline: "طلب السحب قيد المراجعة",
        greeting: friendlyGreeting,
        paragraphs: sanitizeParagraphs([
          "استلمنا طلب السحب الخاص بك، وسيتم مراجعته من قبل الفريق المالي بأسرع وقت ممكن.",
          "سنبلغك فور اعتماد التحويل أو في حال احتجنا لأي بيانات إضافية.",
        ]),
        highlights,
        status: { label: "قيد المراجعة", tone: "info" },
        footerNote: "عادة ما تتم الموافقة خلال 24 ساعة عمل كحد أقصى.",
      };
    }
    case "withdraw_approved": {
      const highlights: Highlight[] = [];
      if (amountText) highlights.push({ label: "المبلغ المحول", value: amountText });
      if (notes) highlights.push({ label: "ملاحظات الفريق", value: notes });

      return {
        subject: "تم اعتماد طلب السحب",
        preview: amountText ? `وافقنا على تحويل ${amountText} إلى حسابك.` : "تم اعتماد طلب السحب وسيتم تحويل المبلغ لحسابك.",
        headline: "تم تحويل المبلغ",
        greeting: friendlyGreeting,
        paragraphs: sanitizeParagraphs([
          "تم اعتماد طلب السحب الخاص بك، وسيصل المبلغ إلى حسابك خلال فترة وجيزة بحسب البنك أو المحفظة المستخدمة.",
          "نشكر لك ثقتك في المنصة ونتمنى لك يوماً سعيداً.",
        ]),
        highlights,
        status: { label: "تم التحويل", tone: "success" },
        footerNote: "في حال لم يصلك المبلغ خلال المدة المتوقعة، يرجى التواصل معنا فوراً.",
      };
    }
    case "withdraw_rejected": {
      const highlights: Highlight[] = [];
      if (amountText) highlights.push({ label: "المبلغ المطلوب", value: amountText });
      if (notes) highlights.push({ label: "سبب الرفض", value: notes });

      return {
        subject: "تعذر إتمام طلب السحب",
        preview: "يوجد تحديث بخصوص طلب السحب الخاص بك – يرجى مراجعة التفاصيل.",
        headline: "تعذر إتمام طلب السحب",
        greeting: friendlyGreeting,
        paragraphs: sanitizeParagraphs([
          "نعتذر عن عدم القدرة على إتمام طلب السحب في الوقت الحالي.",
          "ستجد تفاصيل السبب في الأسفل، ويمكنك تقديم طلب جديد بعد معالجة الملاحظات المذكورة.",
        ]),
        highlights,
        status: { label: "لم يتم التحويل", tone: "danger" },
        footerNote: "إذا كنت بحاجة للمساعدة أو التوضيح، يسعدنا تواصلك معنا في أي وقت.",
      };
    }
    case "doctor_request_approved": {
      const specialization = optionalString(data?.specialization) || optionalString(data?.specialization_ar);
      const highlights: Highlight[] = [];
      if (specialization) highlights.push({ label: "التخصص", value: specialization });
      if (notes) highlights.push({ label: "ملاحظات إضافية", value: notes });

      return {
        subject: "تم قبول طلبك كطبيب في Egyptian AI",
        preview: "يمكنك الآن الدخول إلى لوحة الطبيب وبدء تقديم الاستشارات.",
        headline: "مرحباً بك ضمن أطبائنا المعتمدين",
        greeting: name ? `د/ ${name} العزيز` : "دكتورنا العزيز",
        paragraphs: sanitizeParagraphs([
          "يسعدنا إبلاغك بقبول طلبك للانضمام كطبيب داخل المنصة.",
          "يمكنك الآن الدخول إلى لوحة التحكم الخاصة بالأطباء لإكمال بياناتك وتفعيل مواعيدك.",
        ]),
        highlights,
        status: { label: "طبيب معتمد", tone: "success" },
        footerNote: "ننصحك بإكمال ملفك الطبي وإضافة تفاصيل الاستشارات لبدء استقبال المرضى فوراً.",
        cta: { label: "الانتقال إلى لوحة الطبيب", url: `${BASE_APP_URL}/doctor-dashboard` },
      };
    }
    case "doctor_request_rejected": {
      const highlights: Highlight[] = [];
      if (notes) highlights.push({ label: "سبب الرفض", value: notes });

      return {
        subject: "تحديث بشأن طلب التسجيل كطبيب",
        preview: "نعتذر عن قبول الطلب حالياً – التفاصيل داخل الرسالة.",
        headline: "طلب التسجيل يحتاج إلى تعديل",
        greeting: friendlyGreeting,
        paragraphs: sanitizeParagraphs([
          "بعد مراجعة طلبك، نعتذر عن عدم إمكانية الموافقة عليه في الوقت الحالي.",
          "يمكنك إعادة التقديم بمجرد تلافي الملاحظات المذكورة.",
        ]),
        highlights,
        status: { label: "الطلب مرفوض مؤقتاً", tone: "warning" },
        footerNote: "يسعد فريقنا بمساعدتك في حال احتجت لمعرفة المتطلبات اللازمة لإعادة التقديم.",
      };
    }
    case "custom": {
      const subject = optionalString(data?.subject) || "رسالة من منصة Egyptian AI";
      const message = optionalString(data?.message) || "";
      const paragraphs = message
        ? sanitizeParagraphs(message.split(/\r?\n\r?\n|\r?\n/))
        : [];
      const preview = paragraphs[0] || "لدينا رسالة جديدة لك من فريق Egyptian AI.";

      return {
        subject,
        preview,
        headline: subject,
        greeting: optionalString(data?.greeting) || friendlyGreeting,
        paragraphs: paragraphs.length ? paragraphs : ["يسعدنا تواصلك معنا، ونرسل لك التفاصيل التالية:"],
        footerNote: optionalString(data?.footerNote) || "لا تتردد في الرد على هذه الرسالة إذا كان لديك أي استفسار.",
      };
    }
    default:
      return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, to, data = {} } = await req.json();

    if (!RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY secret. قم بإضافة المفتاح في Supabase.");
    }

    if (!type || !to) {
      return new Response(JSON.stringify({ error: "نوع البريد أو البريد المستلم غير موجود" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const template = createTemplate(type, data);

    if (!template) {
      return new Response(JSON.stringify({ error: "نوع البريد غير مدعوم" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = renderEmail(template);
    const text = buildTextVersion(template);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: template.subject,
        html,
        text,
        reply_to: SUPPORT_EMAIL,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(errorBody || "Resend API error");
    }

    const result = await response.json();

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-email function:", error);
    return new Response(JSON.stringify({ error: error.message || "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
