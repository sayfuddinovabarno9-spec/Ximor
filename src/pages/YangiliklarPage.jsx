import { useEffect, useState } from 'react';
import Layout from '../components/Layout';

const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:3002';

const GRAD_PALETTES = [
  ['#0f766e', '#0284c7'],
  ['#7c3aed', '#2563eb'],
  ['#b42318', '#9a6a20'],
  ['#0284c7', '#0f766e'],
  ['#16a34a', '#0f766e'],
  ['#9a6a20', '#b42318'],
  ['#2563eb', '#7c3aed'],
  ['#0f766e', '#16a34a'],
];

function gradientFor(idx) {
  const [a, b] = GRAD_PALETTES[idx % GRAD_PALETTES.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

function formatDate(rfc) {
  try {
    const d = new Date(rfc);
    const diff = (Date.now() - d) / 1000;
    if (diff < 3600)  return `${Math.floor(diff / 60)} daq oldin`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} soat oldin`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} kun oldin`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
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
      <div className="news-card-img" style={!showImg ? { background: gradientFor(idx) } : {}}>
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
          <time>{formatDate(article.date)}</time>
        </div>
      </div>
    </a>
  );
}

export default function YangiliklarPage({ theme, onThemeToggle }) {
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
        setError("Yangiliklar yuklanmadi. Qayta urinib ko’ring.");
        setLoading(false);
      });
  }, []);

  return (
    <Layout theme={theme} onThemeToggle={onThemeToggle}>
      <main className="news-shell">
        <div className="news-header">
          <div className="news-header-text">
            <h1>Dunyo kimyo yangiliklari</h1>
            <p>ScienceDaily orqali dunyo bo'ylab kimyo fani so'nggi kashfiyotlari</p>
          </div>
        </div>

        {error ? (
          <div className="news-error">{error}</div>
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
