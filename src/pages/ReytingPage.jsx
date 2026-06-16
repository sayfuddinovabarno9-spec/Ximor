import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import InsightsPanel from '../components/InsightsPanel';
import { avatarBg } from '../utils/avatarColor';

const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:3002';

const PERIODS = [
  { id: 'hafta',   label: 'Bu hafta' },
  { id: 'oy',      label: 'Bu oy' },
  { id: 'chorak',  label: 'Bu chorak' },
  { id: 'yil',     label: 'Yillik' },
  { id: 'hammasi', label: 'Hamma vaqt' },
];

const TIERS = [
  { id: 'olmos',   label: 'OLMOS',   range: '15k+',   color: '#22d3ee' },
  { id: 'platina', label: 'PLATINA', range: '7-15k',  color: '#a78bfa' },
  { id: 'oltin',   label: 'OLTIN',   range: '3-7k',   color: '#f59e0b' },
  { id: 'kumush',  label: 'KUMUSH',  range: '1-3k',   color: '#94a3b8' },
];

const TIER_COLORS = {
  olmos:   '#22d3ee',
  platina: '#a78bfa',
  oltin:   '#f59e0b',
  kumush:  '#94a3b8',
  shogird: '#6b7280',
};

function scoreTier(score) {
  if (score >= 15000) return 'olmos';
  if (score >= 7000)  return 'platina';
  if (score >= 3000)  return 'oltin';
  if (score >= 1000)  return 'kumush';
  return 'shogird';
}

function mapUser(u) {
  return {
    ...u,
    specialty:  u.role,
    accepted:   u.accepted_count,
    tier:       scoreTier(u.score),
    trendDir:   'same',
    trend:      0,
  };
}

function Avatar({ initials, name }) {
  return (
    <span className="avatar" title={name}
      style={{ background: avatarBg(initials), color: '#fff', border: 'none' }}>
      {initials}
    </span>
  );
}

function TrendCell({ dir }) {
  if (dir === 'same') return <span className="trend trend--same">= 0</span>;
  if (dir === 'up')   return <span className="trend trend--up">↑</span>;
  return <span className="trend trend--down">↓</span>;
}

function TrophyIcon() {
  return (
    <svg fill="none" height={22} stroke="currentColor" strokeLinecap="round"
         strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={22}>
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM5 5H3v3a4 4 0 0 0 4 4M19 5h2v3a4 4 0 0 1-4 4" />
    </svg>
  );
}

export default function ReytingPage({ theme, onThemeToggle }) {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('hafta');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${BACKEND}/api/leaderboard?period=${period}`)
      .then(r => r.json())
      .then(data => { setLeaderboard(data.map(mapUser)); setLoading(false); })
      .catch(() => setLoading(false));
  }, [period]);

  return (
    <Layout theme={theme} onThemeToggle={onThemeToggle}>
      <main className="reyting-layout" id="reyting">

        {/* ── Left sidebar ── */}
        <aside className="side-panel">
          <div className="panel-section">
            <span className="panel-label">Davr</span>
            <div className="category-list">
              {PERIODS.map(p => (
                <button
                  key={p.id}
                  className={period === p.id ? 'is-active' : ''}
                  onClick={() => setPeriod(p.id)}
                  type="button"
                >
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="panel-card mastery-widget">
            <svg width="0" height="0" style={{ position: 'absolute' }}>
              <defs>
                <linearGradient id="ringGradR" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" />
                  <stop offset="100%" stopColor="var(--blue)" />
                </linearGradient>
              </defs>
            </svg>
            <div className="mastery-top">
              <div className="mastery-ring">
                <svg width="52" height="52" viewBox="0 0 52 52">
                  <circle className="mastery-ring-bg" cx="26" cy="26" r="18" />
                  <circle className="mastery-ring-fill" cx="26" cy="26" r="18"
                    style={{ stroke: 'url(#ringGradR)' }} />
                </svg>
                <span className="mastery-pct">78%</span>
              </div>
              <div className="mastery-info">
                <strong>Elementalist</strong>
                <span>Mastery darajasi · IV</span>
              </div>
            </div>
            <div className="mastery-bar-wrap">
              <div className="mastery-bar" />
            </div>
            <div className="mastery-stats">
              <div className="mastery-stat"><strong>245</strong><span>Upvotes</span></div>
              <div className="mastery-stat"><strong>38</strong><span>Javoblar</span></div>
              <div className="mastery-stat"><strong>50</strong><span>Ulashdi</span></div>
            </div>
          </div>

          <div className="panel-card">
            <div className="section-heading">
              <h3>Reyting qoidalari</h3>
            </div>
            <ul className="prep-list">
              <li>Javob qabul → <strong>50 ball</strong></li>
              <li>Upvote → <strong>5 ball</strong></li>
              <li>Olimpiada g'olibligi → <strong>500 ball</strong></li>
              <li>Mentor tasdig'i → <strong>2× koeffitsient</strong></li>
            </ul>
          </div>
        </aside>

        {/* ── Center ── */}
        <section className="feed">
          {/* Hero */}
          <div className="reyting-hero">
            <div className="reyting-hero-copy">
              <div className="hero-eyebrow">
                <TrophyIcon />
                Hafta yetakchilar
              </div>
              <h1>
                Eng faol<br />
                <span className="hero-accent">kimyogarlar reytingi</span>
              </h1>
              <p>
                Reyting javob qabul qilingan miqdori, savol yechilishi va
                mentor tasdig'i asosida har soatda yangilanadi.
                Top-10 hafta yakuni bilan oltin nishon oladi.
              </p>
            </div>
            <div className="tier-legend">
              {TIERS.map(t => (
                <div key={t.id} className="tier-badge" style={{ '--tier-color': t.color }}>
                  <span className="tier-label">{t.label}</span>
                  <span className="tier-range">{t.range}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard table */}
          <div className="panel-card leaderboard">
            {loading ? (
              <div className="qp-loading" style={{ padding: '32px 0' }}>Yuklanmoqda…</div>
            ) : (
              <table className="lb-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Foydalanuvchi</th>
                    <th>Ball</th>
                    <th>Qabul</th>
                    <th>O'zg.</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map(u => (
                    <tr key={u.id}
                        className={u.rank <= 3 ? `lb-top lb-top--${u.rank}` : ''}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/u/${u.username}`)}>
                      <td className="lb-rank">
                        {u.rank <= 3 ? (
                          <span className={`rank-badge rank-badge--${u.rank}`}>#{u.rank}</span>
                        ) : (
                          <span className="lb-rank-num">{u.rank}</span>
                        )}
                      </td>
                      <td className="lb-user">
                        <Avatar initials={u.initials} name={u.name} />
                        <div className="lb-user-info">
                          <strong>{u.name}</strong>
                          <span>
                            <span className="tier-pill" style={{ '--tier-color': TIER_COLORS[u.tier] }}>
                              {u.tier.toUpperCase()}
                            </span>
                            {u.specialty}
                          </span>
                        </div>
                      </td>
                      <td className="lb-score">{u.score.toLocaleString()}</td>
                      <td className="lb-accepted">{u.accepted}</td>
                      <td><TrendCell dir={u.trendDir} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <InsightsPanel onSpotlightClick={() => navigate('/?q=reaksiya')} />
      </main>
    </Layout>
  );
}
