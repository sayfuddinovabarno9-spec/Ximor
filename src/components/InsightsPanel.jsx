import { avatarBg } from '../utils/avatarColor';

const EXPERTS = [
  { name: "Aziza Karimova",      role: "Organik kimyo",    score: "18.4k", initials: "AK", rank: 1, online: true  },
  { name: "Sardor Yusupov",      role: "Anorganik kimyo",  score: "12.1k", initials: "SY", rank: 2, online: true  },
  { name: "Nilufar Rashidova",   role: "Analitik kimyo",   score: "9.3k",  initials: "NR", rank: 3, online: false },
  { name: "Farrux Toshpo'latov", role: "Fizikaviy kimyo",  score: "7.8k",  initials: "FT", rank: 4, online: false },
  { name: "Nodira Saidova",      role: "Olimpiadalar",     score: "6.4k",  initials: "NS", rank: 5, online: false },
];

const LIVE_USERS = ["AK", "JI", "NS", "MU", "SE", "IS", "MA", "AZ"];

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

function Avatar({ initials, name, online = false }) {
  return (
    <span className="avatar" title={name}
      style={{ background: avatarBg(initials), color: '#fff', border: 'none' }}>
      {initials}
      {online && <span className="avatar__status" />}
    </span>
  );
}

export default function InsightsPanel({ onSpotlightClick }) {
  return (
    <aside className="insights-panel">
      <div className="panel-card live-card">
        <div className="section-heading">
          <h3><span className="live-dot" />Jonli xona</h3>
          <span>42 onlayn</span>
        </div>
        <div className="live-grid">
          {LIVE_USERS.map((initials, i) => (
            <Avatar initials={initials} key={initials} name={initials} online={i < 5} />
          ))}
        </div>
      </div>

      <div className="panel-card">
        <div className="section-heading">
          <h3>Eng faol mentorlar</h3>
          <TrophyIcon />
        </div>
        <div className="expert-list">
          {EXPERTS.map((expert) => (
            <div className="expert-row" key={expert.name}>
              <span className={`rank-badge rank-badge--${expert.rank}`}>#{expert.rank}</span>
              <Avatar initials={expert.initials} name={expert.name} online={expert.online} />
              <div>
                <strong>{expert.name}</strong>
                <span>{expert.role}</span>
              </div>
              <b>{expert.score}</b>
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
