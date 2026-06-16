import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';
import { avatarBg } from '../utils/avatarColor';

function Icon({ name, size = 18 }) {
  const paths = {
    bell:  "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
    plus:  "M12 5v14M5 12h14",
    moon:  "M21 12.8A8.5 8.5 0 1 1 11.2 3 6.5 6.5 0 0 0 21 12.8Z",
    sun:   "M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z",
    search:"m21 21-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z",
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

const NAV_ITEMS = [
  { to: '/', label: 'Savollar', exact: true },
  { to: '/olimpiadalar', label: 'Olimpiadalar', badge: 4 },
  { to: '/reyting', label: 'Reyting' },
];

export default function Layout({ children, theme, onThemeToggle, onCompose, query, onQuery }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [showAuth, setShowAuth] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = e => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

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
          <button className="icon-button bell-btn" title="Bildirishnomalar" type="button">
            <Icon name="bell" size={17} />
            <span className="bell-dot" />
          </button>

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

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
