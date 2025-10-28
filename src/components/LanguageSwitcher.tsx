import { SUPPORTED_LANGS, applyDirection } from '@/i18n';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value as keyof typeof SUPPORTED_LANGS;
    i18n.changeLanguage(lang);
    applyDirection(lang);
    localStorage.setItem('lang', lang);
  };

  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{t('common.language', 'Language')}</span>
      <select
        value={i18n.language}
        onChange={handleChange}
        className="text-xs rounded-full px-2 py-1 bg-secondary hover:bg-secondary/80 border"
      >
        {Object.entries(SUPPORTED_LANGS).map(([code, meta]) => (
          <option key={code} value={code}>
            {meta.native}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSwitcher;
