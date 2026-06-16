import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import InsightsPanel from '../components/InsightsPanel';
import AuthModal from '../components/AuthModal';
import { useAuth } from '../context/AuthContext';

const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:3002';

const FILTERS = [
  { id: 'all',        label: 'Hammasi',    short: '∑',  color: '#0f766e' },
  { id: 'respublika', label: 'Respublika', short: 'Re', color: '#2563eb' },
  { id: 'xalqaro',   label: 'Xalqaro',    short: 'Xa', color: '#7c3aed' },
  { id: 'onlayn',    label: 'Onlayn',     short: 'On', color: '#0284c7' },
  { id: 'tezkor',    label: 'Tezkor',     short: 'Tz', color: '#9a6a20' },
];

const OY = ['YAN','FEV','MAR','APR','MAY','IYUN','IYUL','AVG','SEP','OKT','NOY','DEK'];
const TYPE_LABELS = { respublika: 'Respublika', xalqaro: 'Xalqaro', onlayn: 'Onlayn', tezkor: 'Tezkor' };

function mapTournament(t) {
  const d = new Date(t.start_date);
  return {
    ...t,
    target: t.start_date,
    label:  `${d.getUTCDate()} ${OY[d.getUTCMonth()]}`,
    meta:   `${t.location} · ${TYPE_LABELS[t.type] || t.type}`,
  };
}

function useCountdown(targetStr) {
  const calc = () => {
    const diff = Math.max(0, new Date(targetStr) - Date.now());
    return {
      days:  Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      mins:  Math.floor((diff % 3600000) / 60000),
      secs:  Math.floor((diff % 60000) / 1000),
    };
  };
  const [val, setVal] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setVal(calc()), 1000);
    return () => clearInterval(id);
  }, [targetStr]);
  return val;
}

function CountdownBox({ value, label }) {
  return (
    <div className="cdbox">
      <strong>{String(value).padStart(2, '0')}</strong>
      <span>{label}</span>
    </div>
  );
}

function NextTournament({ t, onRegister }) {
  const { days, hours, mins, secs } = useCountdown(t.target);
  const isFull = t.participants_count >= t.max_participants;
  return (
    <div className="next-tournament">
      <span className="eyebrow next-label">Eng yaqin</span>
      <h3>{t.title}</h3>
      <p className="next-meta">{t.meta} · {t.label.toLowerCase()}</p>
      <div className="countdown-row">
        <CountdownBox value={days}  label="KUN" />
        <CountdownBox value={hours} label="SOAT" />
        <CountdownBox value={mins}  label="DAQ" />
        <CountdownBox value={secs}  label="SONIYA" />
      </div>
      <div className="next-reg-row">
        <span className="next-reg-count">
          {t.participants_count} / {t.max_participants} ishtirokchi
        </span>
        <button
          className={`soft-button${t.is_registered ? ' soft-button--success' : ''}`}
          disabled={isFull && !t.is_registered}
          onClick={() => onRegister(t.id)}
        >
          {t.is_registered ? '✓ Yozildingiz' : isFull ? 'Joylar tugadi' : 'Yozilish'}
        </button>
      </div>
    </div>
  );
}

function TournamentCard({ t, onRegister }) {
  const { days, hours } = useCountdown(t.target);
  return (
    <article className="tournament-card">
      <span className="tournament-date">{t.label}</span>
      <h4>{t.title}</h4>
      <p>{t.meta}</p>
      <p className="tournament-prize">{t.prize} · {t.participants_count}/{t.max_participants}</p>
      <div className="tournament-footer">
        <div className="mini-countdown">
          <span><strong>{days}</strong> kun</span>
          <span><strong>{String(hours).padStart(2,'0')}</strong> soat</span>
        </div>
        <button
          className={`soft-button${t.is_registered ? ' soft-button--success' : ''}`}
          onClick={() => onRegister(t.id)}
        >
          {t.is_registered ? '✓' : 'Yozilish'}
        </button>
      </div>
    </article>
  );
}

function CalendarIcon() {
  return (
    <svg fill="none" height={16} stroke="currentColor" strokeLinecap="round"
         strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={16}>
      <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

export default function OlimpiadalarPage({ theme, onThemeToggle }) {
  const navigate = useNavigate();
  const { user, authHeaders } = useAuth();
  const [filter, setFilter] = useState('all');
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    const headers = user ? authHeaders() : {};
    fetch(`${BACKEND}/api/tournaments`, { headers })
      .then(r => r.json())
      .then(data => { setTournaments(data.map(mapTournament)); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  async function handleRegister(tournamentId) {
    if (!user) { setShowAuth(true); return; }
    try {
      const res = await fetch(`${BACKEND}/api/tournaments/${tournamentId}/register`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      });
      if (res.ok || res.status === 409) {
        setTournaments(prev => prev.map(t =>
          t.id === tournamentId
            ? { ...t, is_registered: true, participants_count: t.is_registered ? t.participants_count : t.participants_count + 1 }
            : t
        ));
      }
    } catch {}
  }

  const filtered  = filter === 'all' ? tournaments : tournaments.filter(t => t.type === filter);
  const nextT     = filtered[0];
  const restCards = filtered.slice(1);

  return (
    <Layout theme={theme} onThemeToggle={onThemeToggle}>
      <main className="olimp-layout" id="olimpiadalar">

        {/* ── Left sidebar ── */}
        <aside className="side-panel">
          <div className="panel-section">
            <span className="panel-label">Filtr</span>
            <div className="category-list">
              {FILTERS.map(f => (
                <button
                  key={f.id}
                  className={filter === f.id ? 'is-active' : ''}
                  onClick={() => setFilter(f.id)}
                  type="button"
                >
                  <span className="category-mark" style={{ '--category-color': f.color }}>{f.short}</span>
                  <span>{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="panel-card mastery-widget">
            <svg width="0" height="0" style={{ position: 'absolute' }}>
              <defs>
                <linearGradient id="ringGradO" x1="0" y1="0" x2="1" y2="1">
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
                    style={{ stroke: 'url(#ringGradO)' }} />
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
              <h3>Olimpiada tayyorlovi</h3>
            </div>
            <ul className="prep-list">
              <li>Saralash bosqichi har bahor</li>
              <li>Final iyun oxirida</li>
              <li>Mentor tahlili — yakshanba</li>
            </ul>
          </div>
        </aside>

        {/* ── Center feed ── */}
        <section className="feed">
          {/* Hero */}
          <div className="olimp-hero">
            <div className="olimp-hero-copy">
              <div className="hero-eyebrow">
                <span className="hero-eyebrow-dot" />
                Xalqaro & Milliy
              </div>
              <h1>
                Olimpiadalar va<br />
                <span className="hero-accent">tezkor turnirlar</span>
              </h1>
              <p>
                Mendeleev, IChO milliy saralashlari va onlayn So'ra! turnirlari.
                Qatnashish bepul, har bir savol uchun reyting va kumush/oltin nishon.
              </p>
              <div className="olimp-hero-actions">
                <button className="primary-button" type="button"
                        onClick={() => nextT && handleRegister(nextT.id)}>
                  Hozir qatnashish
                </button>
                <button className="soft-button" type="button">
                  <CalendarIcon />
                  Jadval to'liq
                </button>
              </div>
            </div>
          </div>

          {/* Next + upcoming split */}
          {loading ? (
            <div className="qp-loading" style={{ padding: '40px 0' }}>Yuklanmoqda…</div>
          ) : (
            <div className="olimp-split">
              {nextT ? (
                <NextTournament t={nextT} onRegister={handleRegister} />
              ) : (
                <div className="profile-empty">Ushbu bo'limda turnirlar topilmadi.</div>
              )}
              <div className="upcoming-section">
                <div className="section-heading" style={{ marginBottom: 10 }}>
                  <span className="eyebrow" style={{ margin: 0 }}>2026 mavsumi</span>
                  <h3>Kelayotgan turnirlar</h3>
                </div>
                <div className="tournament-grid">
                  {restCards.map(t => (
                    <TournamentCard key={t.id} t={t} onRegister={handleRegister} />
                  ))}
                  {restCards.length === 0 && nextT && (
                    <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                      Boshqa turnirlar topilmadi.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        <InsightsPanel onSpotlightClick={() => navigate('/?q=reaksiya')} />
      </main>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </Layout>
  );
}
