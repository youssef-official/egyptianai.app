import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const SUPPORTED_LANGS = {
  ar: { native: 'العربية', dir: 'rtl' },
  en: { native: 'English', dir: 'ltr' },
  fr: { native: 'Français', dir: 'ltr' },
  de: { native: 'Deutsch', dir: 'ltr' },
  it: { native: 'Italiano', dir: 'ltr' },
  zh: { native: '中文', dir: 'ltr' },
} as const;

const resources = {
  ar: {
    translation: {
      common: {
        home: 'الرئيسية',
        doctors: 'الأطباء',
        wallet: 'المحفظة',
        profile: 'حسابي',
        myPanel: 'لوحتي',
        back: 'العودة',
        balance: 'رصيد النقاط',
        points: 'نقطة',
        deposit: 'إيداع',
        transfer: 'تحويل',
        history: 'السجل',
        logout: 'تسجيل خروج',
        language: 'اللغة',
      },
      auth: {
        welcomeBack: 'مرحبًا بعودتك',
        createAccount: 'أنشئ حسابك',
        email: 'البريد الإلكتروني',
        password: 'كلمة المرور',
        login: 'تسجيل الدخول',
        signup: 'إنشاء حساب',
        noAccount: 'ليس لديك حساب؟ أنشئ حساباً',
        haveAccount: 'لديك حساب؟ سجل دخولك'
      },
      wallet: {
        accountBalance: 'رصيد الحساب',
        latest: 'السجل',
        recent: 'آخر الاستشارات وعمليات الإيداع'
      },
      index: {
        myWallet: 'محفظتي',
        openWallet: 'فتح المحفظة'
      },
      transfer: {
        title: 'تحويل رصيد',
        current: 'الرصيد الحالي',
        amountPts: 'النقاط',
        submit: 'تحويل الرصيد'
      },
      deposit: {
        title: 'إيداع النقاط',
        chooseAndUpload: 'اختر الطريقة وأرفق إثبات الدفع',
        amountPts: 'عدد النقاط',
        submit: 'إرسال طلب الإيداع'
      }
    }
  },
  en: {
    translation: {
      common: {
        home: 'Home', doctors: 'Doctors', wallet: 'Wallet', profile: 'Profile', myPanel: 'My Panel', back: 'Back', balance: 'Points Balance', points: 'pts', deposit: 'Deposit', transfer: 'Transfer', history: 'History', logout: 'Logout', language: 'Language'
      },
      auth: {
        welcomeBack: 'Welcome back', createAccount: 'Create your account', email: 'Email', password: 'Password', login: 'Sign in', signup: 'Sign up', noAccount: "Don't have an account? Create one", haveAccount: 'Have an account? Sign in'
      },
      wallet: { accountBalance: 'Account Balance', latest: 'History', recent: 'Recent consultations and deposits' },
      index: { myWallet: 'My Wallet', openWallet: 'Open Wallet' },
      transfer: { title: 'Transfer Points', current: 'Current balance', amountPts: 'Points', submit: 'Transfer' },
      deposit: { title: 'Deposit Points', chooseAndUpload: 'Choose method and upload proof', amountPts: 'Points amount', submit: 'Submit deposit request' }
    }
  },
  fr: { translation: { common: { home: 'Accueil', doctors: 'Médecins', wallet: 'Portefeuille', profile: 'Profil', myPanel: 'Mon panneau', back: 'Retour', balance: 'Solde de points', points: 'pts', deposit: 'Dépôt', transfer: 'Transfert', history: 'Historique', logout: 'Déconnexion', language: 'Langue' } } },
  de: { translation: { common: { home: 'Start', doctors: 'Ärzte', wallet: 'Wallet', profile: 'Profil', myPanel: 'Mein Panel', back: 'Zurück', balance: 'Punktestand', points: 'Pkt', deposit: 'Einzahlen', transfer: 'Überweisen', history: 'Verlauf', logout: 'Abmelden', language: 'Sprache' } } },
  it: { translation: { common: { home: 'Home', doctors: 'Dottori', wallet: 'Portafoglio', profile: 'Profilo', myPanel: 'Pannello', back: 'Indietro', balance: 'Saldo punti', points: 'pt', deposit: 'Deposita', transfer: 'Trasferisci', history: 'Storico', logout: 'Esci', language: 'Lingua' } } },
  zh: { translation: { common: { home: '首页', doctors: '医生', wallet: '钱包', profile: '我的', myPanel: '面板', back: '返回', balance: '积分余额', points: '分', deposit: '充值', transfer: '转账', history: '记录', logout: '退出', language: '语言' } } },
};

const saved = localStorage.getItem('lang') as keyof typeof SUPPORTED_LANGS | null;
const fallbackLng: keyof typeof SUPPORTED_LANGS = saved && SUPPORTED_LANGS[saved] ? saved : 'ar';

i18n.use(initReactI18next).init({
  resources,
  lng: fallbackLng,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

// apply direction and lang attribute
export function applyDirection(lang: keyof typeof SUPPORTED_LANGS) {
  const dir = SUPPORTED_LANGS[lang]?.dir || 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lang);
}

applyDirection(fallbackLng);

async function detectLanguageByIP() {
  if (saved) return; // respect user's saved choice
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const resp = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    clearTimeout(timeout);
    if (!resp.ok) throw new Error('ip api error');
    const data = await resp.json();
    const langStr: string | undefined = data.languages || data.language || '';
    const browserLangs = Array.isArray((navigator as any).languages) ? (navigator as any).languages : [(navigator as any).language];
    const candidates = [
      ...(langStr ? String(langStr).split(',').map((s: string) => s.trim()) : []),
      ...(browserLangs || []),
    ].map((l: string) => l.toLowerCase());
    const mapToSupported = (l: string): keyof typeof SUPPORTED_LANGS | null => {
      if (l.startsWith('ar')) return 'ar';
      if (l.startsWith('fr')) return 'fr';
      if (l.startsWith('de')) return 'de';
      if (l.startsWith('it')) return 'it';
      if (l.startsWith('zh') || l.includes('cn')) return 'zh';
      if (l.startsWith('en')) return 'en';
      return null;
    };
    for (const c of candidates) {
      const mapped = mapToSupported(c);
      if (mapped) {
        await i18n.changeLanguage(mapped);
        applyDirection(mapped);
        localStorage.setItem('lang', mapped);
        return;
      }
    }
  } catch (_) {
    // ignore and keep fallback
  }
}

detectLanguageByIP();

export default i18n;
