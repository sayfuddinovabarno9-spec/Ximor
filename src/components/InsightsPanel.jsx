import { useEffect, useState } from 'react';
import { avatarBg } from '../utils/avatarColor';

const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:3002';

const FALLBACK_EXPERTS = [
  { name: "Aziza Karimova",      role: "Organik kimyo",   score: 18400, initials: "AK", username: "aziza_kimyo" },
  { name: "Sardor Yusupov",      role: "Anorganik kimyo", score: 12100, initials: "SY", username: "sardor_yu"   },
  { name: "Nilufar Rashidova",   role: "Analitik kimyo",  score: 9300,  initials: "NR", username: "nilufar_r"   },
  { name: "Farrux Toshpo'latov", role: "Fizikaviy kimyo", score: 7800,  initials: "FT", username: "farrux_t"    },
  { name: "Nodira Saidova",      role: "Olimpiadalar",    score: 6400,  initials: "NS", username: "nodira_s"    },
];

function formatScore(n) {
  if (typeof n === 'string') return n;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function TrophyIcon() {
  return (
    <svg fill="none" height={17} stroke="currentColor" strokeLinecap="round"
         strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={17}>
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM5 5H3v3a4 4 0 0 0 4 4M19 5h2v3a4 4 0 0 1-4 4" />
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

  const experts     = stats?.topExperts?.length ? stats.topExperts : FALLBACK_EXPERTS;
  const connections = stats?.connections ?? 0;

  return (
    <aside className="insights-panel">
      <div className="panel-card live-card">
        <div className="section-heading">
          <h3><span className="live-dot" />Jonli xona</h3>
          <span>{connections} ulanish</span>
        </div>
        <div className="live-grid">
          {experts.map(e => (
            <Avatar key={e.username ?? e.initials} initials={e.initials} name={e.name} />
          ))}
        </div>
      </div>

      <div className="panel-card">
        <div className="section-heading">
          <h3>Eng faol mentorlar</h3>
          <TrophyIcon />
        </div>
        <div className="expert-list">
          {experts.map((expert, i) => (
            <div className="expert-row" key={expert.username ?? expert.name}>
              <span className={`rank-badge rank-badge--${i + 1}`}>#{i + 1}</span>
              <Avatar initials={expert.initials} name={expert.name} />
              <div>
                <strong>{expert.name}</strong>
                <span>{expert.role}</span>
              </div>
              <b>{formatScore(expert.score)}</b>
            </div>
          ))}
        </div>
      </div>

      <div className="panel-card spotlight-card">
        <span className="eyebrow">Hafta chaqiruvi</span>
        <h3>Reaksiya marafoni</h3>
        <p>Har kuni bitta kimyo reaksiyasini to'liq mexanizm bilan yozing. Yakshanba — mentor tahlili.</p>
        <button className="primary-button" type="button" onClick={onSpotlightClick}>
          <SparkIcon />
          Ko'rish
        </button>
      </div>
    </aside>
  );
}
