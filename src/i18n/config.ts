import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ar from './locales/ar.json';
import en from './locales/en.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import zh from './locales/zh.json';
import es from './locales/es.json';

const resources = {
  ar: { translation: ar },
  en: { translation: en },
  fr: { translation: fr },
  de: { translation: de },
  zh: { translation: zh },
  es: { translation: es },
};

// Detect language by IP
const detectLanguageByIP = async () => {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    const countryCode = data.country_code?.toLowerCase();
    
    const languageMap: { [key: string]: string } = {
      'eg': 'ar', 'sa': 'ar', 'ae': 'ar', 'jo': 'ar', 'lb': 'ar',
      'us': 'en', 'gb': 'en', 'ca': 'en', 'au': 'en',
      'fr': 'fr', 'be': 'fr', 'ch': 'fr',
      'de': 'de', 'at': 'de',
      'cn': 'zh', 'tw': 'zh', 'hk': 'zh',
      'es': 'es', 'mx': 'es', 'ar': 'es', 'co': 'es',
    };
    
    const detectedLang = languageMap[countryCode] || 'ar';
    if (!localStorage.getItem('language')) {
      localStorage.setItem('language', detectedLang);
      return detectedLang;
    }
  } catch (error) {
    console.error('Failed to detect language by IP:', error);
  }
  return localStorage.getItem('language') || 'ar';
};

// Initialize language detection
detectLanguageByIP().then(detectedLang => {
  i18n.changeLanguage(detectedLang);
});

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ar',
    lng: localStorage.getItem('language') || 'ar',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
