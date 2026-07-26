import { useEffect, useState } from 'react';
import { avatarBg } from '../utils/avatarColor';

const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:3002';

const FALLBACK_USERS = [
  { name: "Aziza Karimova",      score: 18400, initials: "AK", username: "aziza_kimyo" },
  { name: "Sardor Yusupov",      score: 12100, initials: "SY", username: "sardor_yu"   },
  { name: "Nilufar Rashidova",   score: 9300,  initials: "NR", username: "nilufar_r"   },
  { name: "Farrux Toshpo'latov", score: 7800,  initials: "FT", username: "farrux_t"    },
  { name: "Nodira Saidova",      score: 6400,  initials: "NS", username: "nodira_s"    },
];

const USER_BADGES = [
  'Eng faol javobchi',
  "Ko'p yordam bergan",
  'Foydali yechimlar',
  'Muhokamada faol',
  'Haftaning ishtirokchisi',
];

function formatScore(n) {
  if (typeof n === 'string') return n;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function UsersIcon() {
  return (
    <svg fill="none" height={17} stroke="currentColor" strokeLinecap="round"
         strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={17}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg fill="none" height={16} stroke="currentColor" strokeLinecap="round"
         strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={16}>
      <path d="M12 3l1.7 5.1L19 10l-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9L12 3Z" />
    </svg>
  );
}

function Avatar({ initials, name }) {
  return (
    <span className="avatar" title={name}
      style={{ background: avatarBg(initials), color: '#fff', border: 'none' }}>
      {initials}
    </span>
  );
}

export default function InsightsPanel({ onSpotlightClick }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch(`${BACKEND}/api/forum/stats`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStats(data); })
      .catch(() => {});
  }, []);

  const users       = stats?.topExperts?.length ? stats.topExperts : FALLBACK_USERS;
  const connections = stats?.connections ?? 0;

  return (
    <aside className="insights-panel">
      <div className="panel-card live-card">
        <div className="section-heading">
          <h3><span className="live-dot" />Jonli xona</h3>
          <span>{connections} ulanish</span>
        </div>
        <div className="live-grid">
          {users.map(e => (
            <Avatar key={e.username ?? e.initials} initials={e.initials} name={e.name} />
          ))}
        </div>
      </div>

      <div className="panel-card best-users-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Community</span>
            <h3>Eng faol foydalanuvchilar</h3>
          </div>
          <UsersIcon />
        </div>
        <div className="best-user-list">
          {users.map((user, i) => (
            <div className="best-user-row" key={user.username ?? user.name}>
              <span className={`rank-badge rank-badge--${i + 1}`}>{i + 1}</span>
              <Avatar initials={user.initials} name={user.name} />
              <div>
                <strong>{user.name}</strong>
                <span>{USER_BADGES[i] ?? 'Faol ishtirokchi'}</span>
              </div>
              <b>{formatScore(user.score)}</b>
            </div>
          ))}
        </div>
      </div>

      <div className="panel-card spotlight-card">
        <span className="eyebrow">Hafta chaqiruvi</span>
        <h3>Reaksiya marafoni</h3>
        <p>Har kuni bitta kimyo reaksiyasini to'liq mexanizm bilan yozing va community bilan muhokama qiling.</p>
        <button className="primary-button" type="button" onClick={onSpotlightClick}>
          <SparkIcon />
          Ko'rish
        </button>
      </div>
    </aside>
  );
}
