const LOCALES = {
  uz: 'uz-UZ',
  ru: 'ru-RU',
  en: 'en-US',
};

export function formatQuestionCreatedAt(value, language = 'uz') {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(LOCALES[language] || LOCALES.uz, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
