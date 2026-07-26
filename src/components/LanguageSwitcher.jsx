import { LANGUAGES, useLanguage } from '../context/LanguageContext';

export default function LanguageSwitcher({ className = '' }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className={`language-switcher ${className}`.trim()} role="group" aria-label={t('common.language')}>
      {LANGUAGES.map((item) => (
        <button
          aria-pressed={language === item.code}
          className={language === item.code ? 'is-active' : ''}
          data-tooltip={item.name}
          key={item.code}
          onClick={() => setLanguage(item.code)}
          type="button"
        >
          {item.short}
        </button>
      ))}
    </div>
  );
}
