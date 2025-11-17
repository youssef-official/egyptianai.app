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

type ToneKey = Tone | "default";

interface Highlight {
  label: string;
  value: string;
}

interface CtaContent {
  label: string;
  url: string;
}

interface TemplateContent {
  subject: string;
  preview: string;
  headline: string;
  greeting?: string;
  paragraphs?: string[];
  highlights?: Highlight[];
  status?: { label: string; tone: Tone };
  footerNote?: string;
  cta?: CtaContent;
  secondaryCta?: CtaContent;
  customHtml?: string;
  emoji?: string;
  heroImage?: { url: string; alt: string };
  heroBadge?: { label: string; tone: ToneKey };
}

const TONE_STYLES: Record<ToneKey, { gradient: [string, string]; accent: string; chipBg: string; pillBg: string }> = {
  default: { gradient: ["#6366F1", "#4338CA"], accent: "#4338CA", chipBg: "rgba(99, 102, 241, 0.18)", pillBg: "rgba(99, 102, 241, 0.12)" },
  success: { gradient: ["#059669", "#047857"], accent: "#047857", chipBg: "rgba(5, 150, 105, 0.18)", pillBg: "rgba(5, 150, 105, 0.12)" },
  info: { gradient: ["#0EA5E9", "#0369A1"], accent: "#0369A1", chipBg: "rgba(14, 165, 233, 0.20)", pillBg: "rgba(14, 165, 233, 0.12)" },
  danger: { gradient: ["#EF4444", "#B91C1C"], accent: "#B91C1C", chipBg: "rgba(239, 68, 68, 0.18)", pillBg: "rgba(239, 68, 68, 0.12)" },
  warning: { gradient: ["#F59E0B", "#D97706"], accent: "#B45309", chipBg: "rgba(245, 158, 11, 0.20)", pillBg: "rgba(245, 158, 11, 0.14)" },
};

const ALLOWED_TONES: Tone[] = ["success", "info", "danger", "warning"];

const DEFAULT_HERO_IMAGES: Record<string, { url: string; alt: string }> = {
  default: {
    url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
    alt: "فريق الرعاية الطبية في منصة Egyptian AI",
  },
  welcome: {
    url: "https://images.unsplash.com/photo-1526256262350-7da7584cf5eb?auto=format&fit=crop&w=1200&q=80",
    alt: "ترحيب بالمستخدمين الجدد",
  },
  deposit_received: {
    url: "https://images.unsplash.com/photo-1523289333742-be147dfb046f?auto=format&fit=crop&w=1200&q=80",
    alt: "طلب إيداع قيد المراجعة",
  },
  deposit_approved: {
    url: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
    alt: "إضافة رصيد ناجحة",
  },
  deposit_rejected: {
    url: "https://images.unsplash.com/photo-1504712598893-24159a89200e?auto=format&fit=crop&w=1200&q=80",
    alt: "تنبيه بخصوص الإيداع",
  },
  withdraw_received: {
    url: "https://images.unsplash.com/photo-1521790797524-b2497295b8a0?auto=format&fit=crop&w=1200&q=80",
    alt: "طلب سحب قيد المتابعة",
  },
  withdraw_approved: {
    url: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80",
    alt: "تحويل مالي ناجح",
  },
  withdraw_rejected: {
    url: "https://images.unsplash.com/photo-1525253086316-d0c936c814f8?auto=format&fit=crop&w=1200&q=80",
    alt: "تنبيه بخصوص طلب السحب",
  },
  doctor_request_approved: {
    url: "https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&w=1200&q=80",
    alt: "اعتماد طبيب جديد",
  },
  doctor_request_rejected: {
    url: "https://images.unsplash.com/photo-1519494080410-f9aa76cb4283?auto=format&fit=crop&w=1200&q=80",
    alt: "طلب طبيب يحتاج تحديث",
  },
  doctor_request_received: {
    url: "https://images.unsplash.com/photo-1550831107-1553da8c8464?auto=format&fit=crop&w=1200&q=80",
    alt: "تم استلام طلبك كطبيب",
  },
  transfer_sent: {
    url: "https://images.unsplash.com/photo-1454165205744-3b78555e5572?auto=format&fit=crop&w=1200&q=80",
    alt: "تحويل صادر من محفظتك",
  },
  transfer_received: {
    url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
    alt: "رصيد جديد في محفظتك",
  },
  custom: {
    url: "https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=1200&q=80",
    alt: "رسالة خاصة من منصة Egyptian AI",
  },
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function sanitizeUrl(value?: string | null): string | null {
  const raw = optionalString(value);
  if (!raw) return null;
  try {
    const candidate = new URL(raw, BASE_APP_URL);
    const protocol = candidate.protocol.toLowerCase();
    if (protocol === "http:" || protocol === "https:") {
      return candidate.href;
    }
  } catch (_error) {
    // ignore invalid URLs
  }
  return null;
}

function sanitizeCustomHtml(html?: string | null): string | null {
  const raw = optionalString(html);
  if (!raw) return null;
  let clean = raw
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<link[\s\S]*?>/gi, "")
    .replace(/<meta[\s\S]*?>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/<input[\s\S]*?>/gi, "")
    .replace(/<button[\s\S]*?<\/button>/gi, "");

  clean = clean
    .replace(/on[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/on[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/on[a-z]+\s*=\s*[^\s>]+/gi, "")
    .replace(/javascript:\s*/gi, "")
    .replace(/data:(?!image\/(?:png|jpeg|jpg|gif))/gi, "");

  return clean.trim() ? clean : null;
}

function sanitizeTone(value: unknown, fallback: Tone = "info"): Tone {
  const tone = optionalString(value)?.toLowerCase();
  if (tone && ALLOWED_TONES.includes(tone as Tone)) {
    return tone as Tone;
  }
  return fallback;
}

function sanitizeParagraphs(paragraphs: (string | null | undefined)[] = []): string[] {
  return paragraphs
    .map((paragraph) => optionalString(paragraph))
    .filter((paragraph): paragraph is string => Boolean(paragraph));
}

function buildTextVersion(content: TemplateContent): string {
  const lines: string[] = [];
  lines.push(content.headline);
  if (content.greeting) lines.push(content.greeting);
  if (content.heroBadge) lines.push(`مستجد: ${content.heroBadge.label}`);
  if (content.paragraphs?.length) {
    lines.push(...content.paragraphs);
  }

  if (content.highlights?.length) {
    for (const highlight of content.highlights) {
      lines.push(`${highlight.label}: ${highlight.value}`);
    }
  }

  if (content.customHtml) {
    const plain = stripHtmlTags(content.customHtml);
    if (plain) lines.push(plain);
  }

  if (content.cta) {
    lines.push(`رابط هام: ${content.cta.label} — ${content.cta.url}`);
  }
  if (content.secondaryCta) {
    lines.push(`رابط إضافي: ${content.secondaryCta.label} — ${content.secondaryCta.url}`);
  }

  if (content.footerNote) {
    lines.push(content.footerNote);
  }

  lines.push(`— فريق ${COMPANY_NAME}`);
  lines.push(`للتواصل: ${SUPPORT_EMAIL}`);

  return lines.join("\n\n");
}

function resolveHeroImage(type: string, data: Record<string, any>): { url: string; alt: string } | undefined {
  const override = sanitizeUrl(data?.hero_image);
  if (override) {
    return {
      url: override,
      alt: optionalString(data?.hero_alt) || "صورة من بريد Egyptian AI",
    };
  }
  const entry = DEFAULT_HERO_IMAGES[type] || DEFAULT_HERO_IMAGES.default;
  return entry;
}

function renderEmail(content: TemplateContent): string {
  const toneStyle = TONE_STYLES[content.status?.tone ?? "default"];
  const headerGradient = `linear-gradient(135deg, ${toneStyle.gradient[0]} 0%, ${toneStyle.gradient[1]} 100%)`;
  const currentYear = new Date().getFullYear();
  const preview = escapeHtml(content.preview || content.paragraphs?.[0] || COMPANY_NAME);

  const greetingHtml = content.greeting
    ? `<p style="margin:0 0 18px; font-size:16px; color:#1f2937; font-weight:700;">${escapeHtml(content.greeting)}</p>`
    : "";

  const heroBadgeToneStyle = content.heroBadge ? TONE_STYLES[content.heroBadge.tone] : undefined;
  const heroBadgeHtml = content.heroBadge
    ? `<div style="display:inline-block; margin-bottom:14px; padding:7px 18px; border-radius:999px; background:${heroBadgeToneStyle?.pillBg || TONE_STYLES.default.pillBg}; color:${heroBadgeToneStyle?.accent || TONE_STYLES.default.accent}; font-size:12px; font-weight:700;">${escapeHtml(content.heroBadge.label)}</div>`
    : "";

  const heroSection = content.heroImage || content.heroBadge
    ? `<div style="margin-bottom:28px; text-align:center;">
        ${heroBadgeHtml}
        ${content.heroImage ? `<img src="${escapeHtml(content.heroImage.url)}" alt="${escapeHtml(content.heroImage.alt)}" style="width:100%; max-width:520px; border-radius:22px; display:block; margin:0 auto; box-shadow:0 20px 45px rgba(15, 23, 42, 0.16);" />` : ""}
      </div>`
    : "";

  const paragraphsHtml = content.paragraphs?.length
    ? content.paragraphs
        .map(
          (paragraph) =>
            `<p style="margin:0 0 16px; font-size:15px; line-height:1.9; color:#1f2937;">${escapeHtml(paragraph)}</p>`
        )
        .join("")
    : "";

  const highlightsHtml = content.highlights?.length
    ? `
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:22px 0; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden;">
          ${content.highlights
            .map(
              (highlight, index, arr) => `
                <tr>
                  <td style="padding:14px 18px; font-size:13px; color:#475569; font-weight:700; background-color:#f8fafc; border-bottom:${index === arr.length - 1 ? "none" : "1px solid #e2e8f0"}; width:38%;">
                    ${escapeHtml(highlight.label)}
                  </td>
                  <td style="padding:14px 18px; font-size:14px; color:#1f2937; background-color:#ffffff; border-bottom:${index === arr.length - 1 ? "none" : "1px solid #e2e8f0"};">
                    ${escapeHtml(highlight.value)}
                  </td>
                </tr>
              `
            )
            .join("")}
        </table>
      `
    : "";

  const customHtmlSection = content.customHtml
    ? `<div style="margin:24px 0 0; font-size:15px; line-height:1.8; color:#1f2937;">${content.customHtml}</div>`
    : "";

  const ctaHtml = content.cta
    ? `<a href="${escapeHtml(content.cta.url)}" style="display:inline-block; margin:28px 0 8px; padding:13px 28px; border-radius:999px; background:${toneStyle.accent}; color:#ffffff; font-size:15px; font-weight:700; text-decoration:none;">${escapeHtml(content.cta.label)}</a>`
    : "";

  const secondaryCtaHtml = content.secondaryCta
    ? `<div style="margin-top:6px;"><a href="${escapeHtml(content.secondaryCta.url)}" style="color:${toneStyle.accent}; font-size:14px; font-weight:600; text-decoration:none;">${escapeHtml(content.secondaryCta.label)}</a></div>`
    : "";

  const footerNoteHtml = content.footerNote
    ? `<div style="margin-top:24px; padding:16px 18px; border-radius:14px; background-color:#f1f5f9; color:#475569; font-size:13px;">${escapeHtml(content.footerNote)}</div>`
    : "";

  const statusHtml = content.status
    ? `<span style="display:inline-block; margin-top:16px; padding:8px 20px; border-radius:999px; background:${toneStyle.chipBg}; color:${toneStyle.accent}; font-size:13px; font-weight:700;">${escapeHtml(content.status.label)}</span>`
    : "";

  const emojiHtml = content.emoji
    ? `<div style="width:68px; height:68px; margin:0 auto 18px; border-radius:24px; background:${toneStyle.pillBg}; display:flex; align-items:center; justify-content:center; font-size:36px;">${escapeHtml(content.emoji)}</div>`
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
        .content-padding { padding: 28px 22px !important; }
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background-color:#ecf1fb; font-family:'Tajawal','Cairo','Helvetica Neue',Arial,sans-serif;">
    <div style="display:none; max-height:0; overflow:hidden; font-size:1px; color:#ecf1fb;">${preview}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0; padding:28px 14px; background-color:#ecf1fb;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="640" class="email-container" style="max-width:640px; background-color:#ffffff; border-radius:24px; overflow:hidden; box-shadow:0 24px 60px rgba(15, 23, 42, 0.12);">
            <tr>
              <td style="padding:26px 32px; background:#0f172a;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color:#e2e8f0; font-size:13px; font-weight:600;">${escapeHtml(COMPANY_NAME)}</td>
                    <td style="text-align:left; font-size:13px;">
                      <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color:#94a3b8; text-decoration:none; font-weight:600;">الدعم الفني</a>
                      <span style="margin:0 8px; color:#475569;">•</span>
                      <a href="${escapeHtml(BASE_APP_URL)}" style="color:#94a3b8; text-decoration:none; font-weight:600;">زيارة الموقع</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:40px 32px 36px; text-align:center; background:${headerGradient}; color:#ffffff;">
                <div style="margin-bottom:16px;">
                  <img src="${escapeHtml(LOGO_URL)}" alt="${escapeHtml(COMPANY_NAME)}" style="max-width:120px;" />
                </div>
                ${emojiHtml}
                <h1 style="margin:0; font-size:28px; letter-spacing:0.02em; font-weight:800;">${escapeHtml(content.headline)}</h1>
                ${statusHtml}
              </td>
            </tr>
            <tr>
              <td class="content-padding" style="padding:34px 36px 38px;">
                ${heroSection}
                ${greetingHtml}
                ${paragraphsHtml}
                ${highlightsHtml}
                ${customHtmlSection}
                ${ctaHtml}
                ${secondaryCtaHtml}
                <p style="margin:28px 0 0; color:#1f2937; font-weight:700;">مع خالص التحية،</p>
                <p style="margin:6px 0; color:#1f2937;">فريق ${escapeHtml(COMPANY_NAME)}</p>
                <p style="margin:8px 0 0; color:#64748b; font-size:13px;">للتواصل معنا: <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color:${toneStyle.accent}; text-decoration:none; font-weight:600;">${escapeHtml(SUPPORT_EMAIL)}</a></p>
                ${footerNoteHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 28px; text-align:center; background-color:#0f172a; color:#e2e8f0; font-size:12px;">
                <p style="margin:0 0 8px;">© ${currentYear} ${escapeHtml(COMPANY_NAME)}. جميع الحقوق محفوظة.</p>
                <p style="margin:0;"><a href="${escapeHtml(BASE_APP_URL)}" style="color:#94a3b8; text-decoration:none;">${escapeHtml(BASE_HOST)}</a></p>
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
  const customHtml = sanitizeCustomHtml(data?.html || data?.custom_html);
  const customEmoji = optionalString(data?.emoji) || optionalString(data?.icon);
  const footerNote = optionalString(data?.footer_note);
  const heroImage = resolveHeroImage(type, data);

  switch (type) {
    case "welcome": {
      return {
        subject: "مرحباً بك في Egyptian AI",
        preview: "حسابك أصبح جاهزاً ويمكنك البدء فوراً في استخدام المنصة.",
        headline: "مرحباً بك في عائلتنا الطبية",
        greeting: name ? `مرحباً ${name}!` : "مرحباً بك!",
        paragraphs: sanitizeParagraphs([
          "يسعدنا انضمامك إلى منصتنا للحصول على تجربة طبية رقمية متكاملة.",
          "يمكنك البدء في استكشاف الأطباء والخدمات الطبية المتاحة فوراً.",
        ]),
        status: { label: "حسابك مفعل", tone: "success" },
        footerNote: footerNote || "ننصحك بإكمال بياناتك الشخصية لتعزيز ثقتك لدى الأطباء وتسهيل التواصل.",
        cta: { label: "بدء استخدام المنصة", url: sanitizeUrl(data?.cta_url) || `${BASE_APP_URL}/` },
        secondaryCta: sanitizeUrl(data?.cta_secondary_url) && optionalString(data?.cta_secondary_label)
          ? { label: data.cta_secondary_label!, url: sanitizeUrl(data?.cta_secondary_url)! }
          : undefined,
      customHtml: customHtml || undefined,
        emoji: customEmoji || "✨",
        heroImage,
        heroBadge: { label: "حساب جديد", tone: "success" },
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
        headline: "طلب الإيداع قيد المراجعة",
        greeting: friendlyGreeting,
        paragraphs: sanitizeParagraphs([
          "استلمنا طلب الإيداع الخاص بك وتم تحويله إلى الفريق المالي للتدقيق.",
          "ستصلك رسالة فور اعتماد العملية أو طلب معلومات إضافية إن لزم الأمر.",
        ]),
        highlights,
        status: { label: "قيد المراجعة", tone: "info" },
        footerNote: footerNote || "يرجى الاحتفاظ بإيصال الدفع لحين تأكيد العملية بالكامل.",
        customHtml: customHtml || undefined,
        emoji: customEmoji || "🧾",
        heroImage,
        heroBadge: { label: "بانتظار الاعتماد", tone: "info" },
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
          "تم اعتماد عملية الإيداع بنجاح وأصبح رصيدك متاحاً للاستخدام فوراً.",
          "يمكنك الآن حجز الاستشارات أو استكشاف الخدمات المتاحة داخل المنصة.",
        ]),
        highlights,
        status: { label: "تمت الموافقة", tone: "success" },
        footerNote: footerNote || "تستطيع متابعة تفاصيل محفظتك من خلال صفحة المحفظة في أي وقت.",
        cta: sanitizeUrl(data?.cta_url)
          ? { label: optionalString(data?.cta_label) || "عرض المحفظة", url: sanitizeUrl(data?.cta_url)! }
          : { label: "عرض المحفظة", url: `${BASE_APP_URL}/wallet` },
        customHtml: customHtml || undefined,
        emoji: customEmoji || "💰",
        heroImage,
        heroBadge: { label: amountText ? `+ ${amountText}` : "الرصيد جاهز", tone: "success" },
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
          "نأسف لتعذر اعتماد طلب الإيداع في الوقت الحالي.",
          "برجاء مراجعة التفاصيل أدناه وإعادة المحاولة بعد استكمال المتطلبات.",
        ]),
        highlights,
        status: { label: "لم يتم الاعتماد", tone: "danger" },
        footerNote: footerNote || "يسعد فريق الدعم بمراجعة أي استفسار لديك حول العملية.",
        customHtml: customHtml || undefined,
        emoji: customEmoji || "⚠️",
        heroImage,
        heroBadge: { label: "يلزم المراجعة", tone: "danger" },
      };
    }
    case "withdraw_received": {
      const highlights: Highlight[] = [];
      if (amountText) highlights.push({ label: "المبلغ الصافي", value: amountText });
      if (reference) highlights.push({ label: "رقم الطلب", value: reference });

      return {
        subject: "تم استلام طلب السحب",
        preview: amountText ? `استلمنا طلب السحب الخاص بك بقيمة ${amountText}.` : "استلمنا طلب السحب الخاص بك وجاري مراجعته.",
        headline: "طلب السحب قيد المراجعة",
        greeting: friendlyGreeting,
        paragraphs: sanitizeParagraphs([
          "استلمنا طلب السحب الخاص بك وسيتم مراجعته خلال فترة قصيرة.",
          "سنقوم بإبلاغك فور اعتماد التحويل أو الحاجة لأي معلومات إضافية.",
        ]),
        highlights,
        status: { label: "قيد المراجعة", tone: "info" },
        footerNote: footerNote || "عادة ما تتم الموافقة خلال 24 ساعة عمل كحد أقصى.",
        customHtml: customHtml || undefined,
        emoji: customEmoji || "📩",
        heroImage,
        heroBadge: { label: "قيد التنفيذ", tone: "info" },
      };
    }
    case "withdraw_approved": {
      const highlights: Highlight[] = [];
      if (amountText) highlights.push({ label: "المبلغ المحول", value: amountText });
      if (notes) highlights.push({ label: "ملاحظات إضافية", value: notes });

      return {
        subject: "تم اعتماد طلب السحب",
        preview: amountText ? `وافقنا على تحويل ${amountText} إلى حسابك.` : "تم اعتماد طلب السحب وسيتم تحويل المبلغ لحسابك.",
        headline: "تم تحويل المبلغ",
        greeting: friendlyGreeting,
        paragraphs: sanitizeParagraphs([
          "تم اعتماد طلب السحب الخاص بك وسيصل المبلغ لحسابك خلال المدة المتعارف عليها.",
          "يسعدنا استمرارك كجزء من مجتمع الأطباء بالمنصة.",
        ]),
        highlights,
        status: { label: "تم التحويل", tone: "success" },
        footerNote: footerNote || "في حال تأخر وصول المبلغ نرجو التواصل معنا فوراً.",
        customHtml: customHtml || undefined,
        emoji: customEmoji || "💸",
        heroImage,
        heroBadge: { label: "تم التحويل", tone: "success" },
      };
    }
    case "withdraw_rejected": {
      const highlights: Highlight[] = [];
      if (amountText) highlights.push({ label: "المبلغ المطلوب", value: amountText });
      if (notes) highlights.push({ label: "سبب الرفض", value: notes });

      return {
        subject: "تعذر إتمام طلب السحب",
        preview: "يوجد تحديث بخصوص طلب السحب الخاص بك – يرجى مراجعة التفاصيل.",
        headline: "طلب السحب يحتاج مراجعة",
        greeting: friendlyGreeting,
        paragraphs: sanitizeParagraphs([
          "نعتذر عن عدم إمكانية إتمام طلب السحب في الوقت الحالي.",
          "بعد تصحيح الملاحظات يمكن تقديم الطلب مجدداً بكل سهولة.",
        ]),
        highlights,
        status: { label: "لم يتم التحويل", tone: "danger" },
        footerNote: footerNote || "فريقنا متواجد لمساعدتك في معرفة الخطوات المطلوبة لاستكمال العملية.",
        customHtml: customHtml || undefined,
        emoji: customEmoji || "🚫",
        heroImage,
        heroBadge: { label: "لم يتم التحويل", tone: "danger" },
      };
    }
    case "doctor_request_received": {
      const specialization = optionalString(data?.specialization) || optionalString(data?.specialization_ar);

      const highlights: Highlight[] = [];
      if (specialization) highlights.push({ label: "التخصص", value: specialization });

      return {
        subject: "تم استلام طلبك كطبيب",
        preview: "طلبك قيد المراجعة وسنتواصل معك قريباً.",
        headline: "طلبك تحت المراجعة",
        greeting: name ? `د/ ${name}` : friendlyGreeting,
        paragraphs: sanitizeParagraphs([
          "وصلنا طلبك للانضمام كطبيب، وبدأ الفريق في مراجعته فوراً.",
          "سنتواصل معك خلال مدة قصيرة في حال احتجنا أي مستندات إضافية أو بعد اعتماد الطلب.",
        ]),
        highlights,
        status: { label: "قيد المراجعة", tone: "info" },
        footerNote: footerNote || "يمكنك متابعة حالة الطلب من خلال لوحة التحكم الخاصة بك في أي وقت.",
        customHtml: customHtml || undefined,
        emoji: customEmoji || "📝",
        heroImage,
        heroBadge: { label: "قيد المراجعة", tone: "info" },
        cta: { label: "متابعة حالة الطلب", url: sanitizeUrl(data?.cta_url) || `${BASE_APP_URL}/doctor-application` },
      };
    }
    case "doctor_request_approved": {
      const specialization = optionalString(data?.specialization) || optionalString(data?.specialization_ar);
      const highlights: Highlight[] = [];
      if (specialization) highlights.push({ label: "التخصص", value: specialization });
      if (notes) highlights.push({ label: "ملاحظات إضافية", value: notes });

      return {
        subject: "تم قبول طلبك كطبيب",
        preview: "يمكنك الآن الدخول إلى لوحة الطبيب وبدء تقديم الاستشارات.",
        headline: "مرحباً بك ضمن أطبائنا",
        greeting: name ? `د/ ${name} العزيز` : "دكتورنا العزيز",
        paragraphs: sanitizeParagraphs([
          "يشرفنا انضمامك إلى شبكة الأطباء لدينا، وتم تفعيل حسابك بنجاح.",
          "يمكنك الآن إكمال ملفك الطبي وإتاحة مواعيد الاستشارات للمرضى.",
        ]),
        highlights,
        status: { label: "طبيب معتمد", tone: "success" },
        footerNote: footerNote || "ننصحك بإضافة نبذة تعريفية وصور معتمدة لبناء ثقة أعلى مع المرضى.",
        cta: { label: "الدخول إلى لوحة الطبيب", url: sanitizeUrl(data?.cta_url) || `${BASE_APP_URL}/doctor-dashboard` },
        customHtml: customHtml || undefined,
        emoji: customEmoji || "🩺",
        heroImage,
        heroBadge: { label: "طبيب معتمد", tone: "success" },
      };
    }
    case "doctor_request_rejected": {
      const highlights: Highlight[] = [];
      if (notes) highlights.push({ label: "سبب الرفض", value: notes });

      return {
        subject: "تحديث بشأن طلب التسجيل كطبيب",
        preview: "نعتذر عن قبول الطلب حالياً – التفاصيل داخل الرسالة.",
        headline: "طلب التسجيل يحتاج تعديل",
        greeting: friendlyGreeting,
        paragraphs: sanitizeParagraphs([
          "بعد مراجعة طلبك، نعتذر عن عدم إمكانية الموافقة عليه في الوقت الحالي.",
          "يمكنك إعادة التقديم بمجرد استكمال المتطلبات المذكورة.",
        ]),
        highlights,
        status: { label: "الطلب مرفوض مؤقتاً", tone: "warning" },
        footerNote: footerNote || "يسعد فريق الدعم بإرشادك إلى المطلوب لإعادة التقديم بنجاح.",
        customHtml: customHtml || undefined,
        emoji: customEmoji || "📋",
        heroImage,
        heroBadge: { label: "تحديث مطلوب", tone: "warning" },
      };
    }
    case "transfer_sent": {
      const pointsValue = Number(data?.points ?? data?.amount);
      const pointsText = Number.isFinite(pointsValue) ? `${pointsValue.toLocaleString("ar-EG")} نقطة` : optionalString(data?.amount_text);
      const receiverName = optionalString(data?.receiver_name) || optionalString(data?.receiver_full_name) || optionalString(data?.receiver_username);
      const receiverEmail = optionalString(data?.receiver_email);
      const transactionId = optionalString(data?.transaction_id) || optionalString(data?.tx_id);

      const highlights: Highlight[] = [];
      if (pointsText) highlights.push({ label: "المبلغ المحوّل", value: pointsText });
      if (receiverName) highlights.push({ label: "المستلم", value: receiverName });
      if (receiverEmail) highlights.push({ label: "بريد المستلم", value: receiverEmail });
      if (transactionId) highlights.push({ label: "رقم العملية", value: transactionId });

      return {
        subject: "تم خصم رصيد من محفظتك",
        preview: pointsText ? `تم تحويل ${pointsText}${receiverName ? ` إلى ${receiverName}` : ""}.` : "تم تنفيذ تحويل من محفظتك.",
        headline: "تم تنفيذ عملية التحويل",
        greeting: friendlyGreeting,
        paragraphs: sanitizeParagraphs([
          receiverName
            ? `تم تحويل ${pointsText || "المبلغ المطلوب"} إلى ${receiverName}.`
            : `تم تحويل ${pointsText || "المبلغ المطلوب"} بنجاح من محفظتك.`,
          "يمكنك الرجوع إلى سجل العمليات داخل محفظتك في أي وقت.",
        ]),
        highlights,
        status: { label: "تم الخصم", tone: "warning" },
        footerNote: footerNote || "إذا لم تكن أنت من أجرى هذه العملية، يرجى التواصل مع الدعم فوراً.",
        cta: { label: "عرض محفظتي", url: sanitizeUrl(data?.cta_url) || `${BASE_APP_URL}/wallet` },
        customHtml: customHtml || undefined,
        emoji: customEmoji || "↗️",
        heroImage,
        heroBadge: { label: pointsText ? `-${pointsText}` : "تحويل صادر", tone: "warning" },
      };
    }
    case "transfer_received": {
      const pointsValue = Number(data?.points ?? data?.amount);
      const pointsText = Number.isFinite(pointsValue) ? `${pointsValue.toLocaleString("ar-EG")} نقطة` : optionalString(data?.amount_text);
      const senderName = optionalString(data?.sender_name) || optionalString(data?.sender_full_name) || optionalString(data?.sender_username);
      const senderEmail = optionalString(data?.sender_email);
      const transactionId = optionalString(data?.transaction_id) || optionalString(data?.tx_id);

      const highlights: Highlight[] = [];
      if (pointsText) highlights.push({ label: "المبلغ المضاف", value: pointsText });
      if (senderName) highlights.push({ label: "من", value: senderName });
      if (senderEmail) highlights.push({ label: "بريد المرسل", value: senderEmail });
      if (transactionId) highlights.push({ label: "رقم العملية", value: transactionId });

      return {
        subject: "تم إضافة رصيد إلى محفظتك",
        preview: pointsText ? `استلمت ${pointsText}${senderName ? ` من ${senderName}` : ""}.` : "استلمت رصيداً جديداً في محفظتك.",
        headline: "رصيد جديد في محفظتك",
        greeting: friendlyGreeting,
        paragraphs: sanitizeParagraphs([
          senderName
            ? `تم إضافة ${pointsText || "المبلغ"} إلى محفظتك من ${senderName}.`
            : `تم إضافة ${pointsText || "المبلغ"} إلى محفظتك بنجاح.`,
          "يمكنك الآن استخدام الرصيد الجديد في أي من خدمات المنصة.",
        ]),
        highlights,
        status: { label: "تم الإيداع", tone: "success" },
        footerNote: footerNote || "استمتع بخدمات المنصة، ولا تتردد في التواصل معنا عند الحاجة.",
        cta: { label: "عرض محفظتي", url: sanitizeUrl(data?.cta_url) || `${BASE_APP_URL}/wallet` },
        customHtml: customHtml || undefined,
        emoji: customEmoji || "💎",
        heroImage,
        heroBadge: { label: pointsText ? `+ ${pointsText}` : "رصيد مضاف", tone: "success" },
      };
    }
    case "custom": {
      const subject = optionalString(data?.subject) || "رسالة من منصة Egyptian AI";
      const message = optionalString(data?.message) || "";
      const paragraphs = message
        ? sanitizeParagraphs(message.split(/\r?\n\r?\n|\r?\n/))
        : undefined;
      const preview = optionalString(data?.preview) || paragraphs?.[0] || "لدينا رسالة جديدة لك من فريق Egyptian AI.";
      const ctaLabel = optionalString(data?.cta_label);
      const ctaUrl = sanitizeUrl(data?.cta_url);
      const secondaryLabel = optionalString(data?.cta_secondary_label);
      const secondaryUrl = sanitizeUrl(data?.cta_secondary_url);
      const statusLabel = optionalString(data?.status_label);
      const statusTone = statusLabel ? sanitizeTone(data?.status_tone) : undefined;
      const heroBadgeLabel = optionalString(data?.hero_badge_label);
      const heroBadgeTone = heroBadgeLabel ? (data?.hero_badge_tone ? (TONE_STYLES[sanitizeTone(data?.hero_badge_tone)] ? sanitizeTone(data?.hero_badge_tone) : "info") : "info") : undefined;

      return {
        subject,
        preview,
        headline: optionalString(data?.headline) || subject,
        greeting: optionalString(data?.greeting) || friendlyGreeting,
        paragraphs,
        footerNote: footerNote || optionalString(data?.footerNote) || undefined,
        cta: ctaLabel && ctaUrl ? { label: ctaLabel, url: ctaUrl } : undefined,
        secondaryCta: secondaryLabel && secondaryUrl ? { label: secondaryLabel, url: secondaryUrl } : undefined,
        customHtml: customHtml || undefined,
        emoji: customEmoji || "✉️",
        status: statusLabel && statusTone ? { label: statusLabel, tone: statusTone } : undefined,
        heroImage,
        heroBadge: heroBadgeLabel ? { label: heroBadgeLabel, tone: heroBadgeTone || "info" } : undefined,
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
