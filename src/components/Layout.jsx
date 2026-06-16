import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';
import { avatarBg } from '../utils/avatarColor';

const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:3002';

function Icon({ name, size = 18 }) {
  const paths = {
    bell:     "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
    plus:     "M12 5v14M5 12h14",
    moon:     "M21 12.8A8.5 8.5 0 1 1 11.2 3 6.5 6.5 0 0 0 21 12.8Z",
    sun:      "M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z",
    search:   "m21 21-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z",
    flask:    "M9 3h6M9 3v7l-5 9a1 1 0 0 0 .9 1.5h12.2A1 1 0 0 0 21 19l-5-9V3M7.5 15h9",
    home:     "M3 12L12 3l9 9M5 10v9a1 1 0 0 0 1 1h4v-5h4v5h4a1 1 0 0 0 1-1v-9",
    trophy:   "M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM5 5H3v3a4 4 0 0 0 4 4M19 5h2v3a4 4 0 0 1-4 4",
    person:   "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
    check:    "M20 6 9 17l-5-5",
    message:  "M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z",
  };
  return (
    <svg aria-hidden fill="none" height={size} stroke="currentColor"
         strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
         viewBox="0 0 24 24" width={size}>
      <path d={paths[name]} />
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

function FlaskIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6M9 3v7l-5 9a1 1 0 0 0 .9 1.5h12.2A1 1 0 0 0 21 19l-5-9V3" />
      <path d="M7.5 15h9" opacity=".5" />
    </svg>
  );
}

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60)  return 'Hozir';
  if (diff < 3600) return `${Math.floor(diff/60)} daq oldin`;
  if (diff < 86400) return `${Math.floor(diff/3600)} soat oldin`;
  return `${Math.floor(diff/86400)} kun oldin`;
}

const NAV_ITEMS = [
  { to: '/',            label: 'Savollar',    icon: 'home',   exact: true },
  { to: '/olimpiadalar',label: 'Olimpiadalar',icon: 'trophy', badge: 4 },
  { to: '/reyting',    label: 'Reyting',      icon: 'trophy' },
];

export default function Layout({ children, theme, onThemeToggle, onCompose, query, onQuery }) {
  const { user, token, logout, authHeaders } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const menuRef = useRef(null);
  const bellRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch(`${BACKEND}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) return;
      const data = await r.json();
      setNotifications(data.notifications || []);
      setUnread(data.unread || 0);
    } catch {}
  }, [token]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Re-fetch notifications on SSE notification event
  useEffect(() => {
    if (!token) return;
    const es = new EventSource(`${BACKEND}/api/forum/stream`);
    es.addEventListener('notification', () => fetchNotifications());
    return () => es.close();
  }, [token, fetchNotifications]);

  useEffect(() => {
    if (!menuOpen && !bellOpen) return;
    const handler = e => {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false);
      if (!bellRef.current?.contains(e.target)) setBellOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen, bellOpen]);

  const openBell = async () => {
    setBellOpen(o => !o);
    if (!bellOpen && unread > 0) {
      setUnread(0);
      try {
        await fetch(`${BACKEND}/api/notifications/read`, {
          method: 'POST',
          headers: authHeaders(),
        });
      } catch {}
    }
  };

  const handleCompose = () => {
    if (!user) { setShowAuth(true); return; }
    onCompose?.();
  };

  return (
    <div className="app" data-theme={theme}>
      <header className="topbar">
        <Link to="/" className="brand">
          <div className="brand-icon"><FlaskIcon /></div>
          <div className="brand-text">
            <strong>So'ra!</strong>
            <small>Beyond Curriculum · Kimyo</small>
          </div>
        </Link>

        <nav className="topnav" aria-label="Asosiy bo'limlar">
          {NAV_ITEMS.map(item => {
            const active = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to} className={active ? 'is-active' : ''}>
                {item.label}
                {item.badge != null && (
                  <span className="nav-badge">{item.badge}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <label className="search-box">
          <Icon name="search" size={17} />
          <input
            value={query ?? ''}
            onChange={e => onQuery?.(e.target.value)}
            placeholder="Savol, teg yoki reaksiya qidiring"
          />
          <span className="search-kbd">⌘K</span>
        </label>

        <div className="top-actions">
          <button className="icon-button" title="Mavzuni almashtirish" type="button"
                  onClick={onThemeToggle}>
            <Icon name={theme === 'light' ? 'moon' : 'sun'} size={17} />
          </button>

          {/* ── Bell / Notifications ── */}
          <div className="bell-wrap" ref={bellRef}>
            <button className="icon-button bell-btn" title="Bildirishnomalar"
                    type="button" onClick={user ? openBell : () => setShowAuth(true)}>
              <Icon name="bell" size={17} />
              {unread > 0 && <span className="bell-dot">{unread > 9 ? '9+' : unread}</span>}
              {unread === 0 && notifications.length > 0 && <span className="bell-dot bell-dot--empty" />}
            </button>

            {bellOpen && (
              <div className="notif-dropdown">
                <div className="notif-header">
                  <strong>Bildirishnomalar</strong>
                  <span>{notifications.filter(n => !n.read).length > 0 ? `${notifications.filter(n=>!n.read).length} yangi` : 'hammasi o\'qilgan'}</span>
                </div>
                {notifications.length === 0 ? (
                  <div className="notif-empty">
                    <Icon name="bell" size={20} />
                    <span>Hali bildirishnoma yo'q</span>
                  </div>
                ) : (
                  <ul className="notif-list">
                    {notifications.map(n => (
                      <li key={n.id}
                          className={`notif-item ${!n.read ? 'is-unread' : ''}`}
                          onClick={() => { setBellOpen(false); if (n.topic_id) navigate(`/q/${n.topic_id}`); }}>
                        <span className="notif-icon">
                          {n.type === 'accept' ? <Icon name="check" size={14} /> : <Icon name="message" size={14} />}
                        </span>
                        <div className="notif-body">
                          <p>{n.message}</p>
                          <time>{timeAgo(n.created_at)}</time>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <button className="primary-button" type="button" onClick={handleCompose}>
            <Icon name="plus" size={16} /> Savol berish
          </button>

          {user ? (
            <div className="user-menu-wrap" ref={menuRef}>
              <button className="icon-button" type="button" title={user.name}
                      style={{ gap: 0 }} onClick={() => setMenuOpen(o => !o)}>
                <Avatar initials={user.initials} name={user.name} online />
              </button>
              {menuOpen && (
                <div className="user-dropdown">
                  <Link to={`/u/${user.username}`} onClick={() => setMenuOpen(false)}>
                    <span>Profilim</span>
                    <span className="dropdown-kbd">@{user.username}</span>
                  </Link>
                  <button type="button" onClick={() => { logout(); setMenuOpen(false); }}>
                    Chiqish
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="avatar-btn" type="button" onClick={() => setShowAuth(true)}
                    title="Kirish" style={{ background: 'var(--surface-soft)', border: '1.5px solid var(--line-strong)', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontWeight: 900, fontSize: 13, color: 'var(--muted)' }}>
              N
            </button>
          )}
        </div>
      </header>

      {children}

      {/* ── Mobile bottom nav ── */}
      <nav className="mobile-nav" aria-label="Mobil navigatsiya">
        <Link to="/" className={location.pathname === '/' ? 'is-active' : ''}>
          <Icon name="home" size={18} />
          <span>Savollar</span>
        </Link>
        <Link to="/olimpiadalar" className={location.pathname.startsWith('/olimpiadalar') ? 'is-active' : ''}>
          <Icon name="trophy" size={18} />
          <span>Olimpiadalar</span>
        </Link>
        <Link to="/reyting" className={location.pathname.startsWith('/reyting') ? 'is-active' : ''}>
          <Icon name="trophy" size={18} />
          <span>Reyting</span>
        </Link>
        {user ? (
          <Link to={`/u/${user.username}`} className={location.pathname.startsWith('/u/') ? 'is-active' : ''}>
            <Icon name="person" size={18} />
            <span>Profil</span>
          </Link>
        ) : (
          <button type="button" onClick={() => setShowAuth(true)}>
            <Icon name="person" size={18} />
            <span>Kirish</span>
          </button>
        )}
      </nav>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
