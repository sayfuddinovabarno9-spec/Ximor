import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import InsightsPanel from '../components/InsightsPanel';
import { avatarBg } from '../utils/avatarColor';
import { useLanguage } from '../context/LanguageContext';

const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:3002';

const PERIODS = [
  { id: 'hafta', labelKey: 'ranking.periods.week' },
  { id: 'oy', labelKey: 'ranking.periods.month' },
  { id: 'chorak', labelKey: 'ranking.periods.quarter' },
  { id: 'yil', labelKey: 'ranking.periods.year' },
  { id: 'hammasi', labelKey: 'ranking.periods.all' },
];

const TIERS = [
  { id: 'olmos', labelKey: 'profile.tiers.diamond', range: '15k+', color: '#36584d' },
  { id: 'platina', labelKey: 'profile.tiers.platinum', range: '7-15k', color: '#59616d' },
  { id: 'oltin', labelKey: 'profile.tiers.gold', range: '3-7k', color: '#7b6847' },
  { id: 'kumush', labelKey: 'profile.tiers.silver', range: '1-3k', color: '#858e99' },
];

const TIER_COLORS = {
  olmos:   '#36584d',
  platina: '#59616d',
  oltin:   '#7b6847',
  kumush:  '#858e99',
  shogird: '#5f6873',
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
  const { t } = useLanguage();
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
            <span className="panel-label">{t('ranking.period')}</span>
            <div className="category-list">
              {PERIODS.map(p => (
                <button
                  key={p.id}
                  className={period === p.id ? 'is-active' : ''}
                  onClick={() => setPeriod(p.id)}
                  type="button"
                >
                  <span>{t(p.labelKey)}</span>
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
                <span>{t('forum.masteryLevel')} · IV</span>
              </div>
            </div>
            <div className="mastery-bar-wrap">
              <div className="mastery-bar" />
            </div>
            <div className="mastery-stats">
              <div className="mastery-stat"><strong>245</strong><span>{t('forum.upvotes')}</span></div>
              <div className="mastery-stat"><strong>38</strong><span>{t('forum.answers')}</span></div>
              <div className="mastery-stat"><strong>50</strong><span>{t('forum.shared')}</span></div>
            </div>
          </div>

          <div className="panel-card">
            <div className="section-heading">
              <h3>{t('ranking.rules')}</h3>
            </div>
            <ul className="prep-list">
              <li>{t('ranking.acceptedRule')} → <strong>50 {t('profile.points').toLowerCase()}</strong></li>
              <li>{t('ranking.upvoteRule')} → <strong>5 {t('profile.points').toLowerCase()}</strong></li>
              <li>{t('ranking.olympiadRule')} → <strong>500 {t('profile.points').toLowerCase()}</strong></li>
              <li>{t('ranking.mentorRule')} → <strong>2× {t('ranking.coefficient')}</strong></li>
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
                {t('ranking.leaders')}
              </div>
              <h1>
                {t('ranking.mostActive')}<br />
                <span className="hero-accent">{t('ranking.chemists')}</span>
              </h1>
              <p>
                {t('ranking.intro')}
              </p>
            </div>
            <div className="tier-legend">
              {TIERS.map(tier => (
                <div key={tier.id} className="tier-badge" style={{ '--tier-color': tier.color }}>
                  <span className="tier-label">{t(tier.labelKey)}</span>
                  <span className="tier-range">{tier.range}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard table */}
          <div className="panel-card leaderboard">
            {loading ? (
              <div className="qp-loading" style={{ padding: '32px 0' }}>{t('common.loading')}</div>
            ) : (
              <table className="lb-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t('ranking.user')}</th>
                    <th>{t('ranking.points')}</th>
                    <th>{t('ranking.accepted')}</th>
                    <th>{t('ranking.change')}</th>
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

        <InsightsPanel onSpotlightClick={() => navigate('/chat?q=reaksiya')} />
      </main>
    </Layout>
  );
}
