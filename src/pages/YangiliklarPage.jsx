import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useLanguage } from '../context/LanguageContext';

const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:3002';

const PLACEHOLDER_COLORS = [
  '#36584d',
  '#4d5b55',
  '#59616d',
  '#6c6258',
];

function placeholderColorFor(idx) {
  return PLACEHOLDER_COLORS[idx % PLACEHOLDER_COLORS.length];
}

function formatDate(rfc, language, t) {
  try {
    const d = new Date(rfc);
    const diff = (Date.now() - d) / 1000;
    if (diff < 3600) return t('time.minutesAgo', { count: Math.floor(diff / 60) });
    if (diff < 86400) return t('time.hoursAgo', { count: Math.floor(diff / 3600) });
    if (diff < 604800) return t('time.daysAgo', { count: Math.floor(diff / 86400) });
    const locale = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-GB' }[language] || 'en-GB';
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return ''; }
}

function NewsCardSkeleton() {
  return (
    <div className="news-card news-card--skeleton">
      <div className="news-card-img news-card-img--skeleton" />
      <div className="news-card-body">
        <div className="skel skel--title" />
        <div className="skel skel--line" />
        <div className="skel skel--line skel--short" />
        <div className="skel skel--meta" />
      </div>
    </div>
  );
}

function NewsCard({ article, idx }) {
  const { language, t } = useLanguage();
  const [imgError, setImgError] = useState(false);
  const showImg = article.image && !imgError;
  const initial = article.title?.[0]?.toUpperCase() || '?';

  return (
    <a
      className="news-card"
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="news-card-img" style={!showImg ? { background: placeholderColorFor(idx) } : {}}>
        {showImg ? (
          <img
            src={article.image}
            alt={article.title}
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <span className="news-card-initial">{initial}</span>
        )}
      </div>
      <div className="news-card-body">
        <p className="news-card-title">{article.title}</p>
        <p className="news-card-desc">{article.description}</p>
        <div className="news-card-meta">
          <span className="news-badge">{article.source}</span>
          <time>{formatDate(article.date, language, t)}</time>
        </div>
      </div>
    </a>
  );
}

export default function YangiliklarPage({ theme, onThemeToggle }) {
  const { t } = useLanguage();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${BACKEND}/api/news`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        setArticles(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  return (
    <Layout theme={theme} onThemeToggle={onThemeToggle}>
      <main className="news-shell">
        <div className="news-header">
          <div className="news-header-text">
            <h1>{t('news.title')}</h1>
            <p>{t('news.intro')}</p>
          </div>
        </div>

        {error ? (
          <div className="news-error">{t('news.error')}</div>
        ) : (
          <div className="news-grid">
            {loading
              ? Array.from({ length: 12 }).map((_, i) => <NewsCardSkeleton key={i} />)
              : articles.map((a, i) => <NewsCard key={a.url} article={a} idx={i} />)
            }
          </div>
        )}
      </main>
    </Layout>
  );
}
