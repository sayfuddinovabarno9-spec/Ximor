import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';

function Icon({ name, size = 18 }) {
  const paths = {
    menu:  "M4 6h16M4 12h16M4 18h16",
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
    <span className="avatar" title={name}>
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

export default function Layout({ children, theme, onThemeToggle, onCompose, query, onQuery }) {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const [showAuth, setShowAuth] = useState(false);

  const handleCompose = () => {
    if (!user) { setShowAuth(true); return; }
    onCompose?.();
  };

  return (
    <div className="app" data-theme={theme}>
      <header className="topbar">
        {/* Brand */}
        <Link to="/" className="brand" style={{ textDecoration: 'none' }}>
          <div className="brand-icon"><FlaskIcon /></div>
          <div className="brand-text">
            <strong>So'ra!</strong>
            <small>Beyond Curriculum</small>
          </div>
        </Link>

        {/* Nav */}
        <nav className="topnav" aria-label="Asosiy bo'limlar">
          <Link to="/">Forum</Link>
          <a href="#olympiads">Olimpiadalar</a>
          <a href="#rating">Reyting</a>
        </nav>

        {/* Search */}
        <label className="search-box">
          <Icon name="search" size={17} />
          <input
            value={query ?? ''}
            onChange={e => onQuery?.(e.target.value)}
            placeholder="Savol, teg yoki reaksiya qidiring"
          />
        </label>

        {/* Actions */}
        <div className="top-actions">
          <button className="icon-button" title="Mavzuni almashtirish" type="button"
                  onClick={onThemeToggle}>
            <Icon name={theme === 'light' ? 'moon' : 'sun'} size={17} />
          </button>
          <button className="icon-button" title="Bildirishnomalar" type="button">
            <Icon name="bell" size={17} />
          </button>

          {user ? (
            <>
              <button className="primary-button" type="button" onClick={handleCompose}>
                <Icon name="plus" size={16} /> Savol berish
              </button>
              <button className="icon-button" title={`${user.name} — chiqish`}
                      type="button" onClick={logout} style={{ gap: 0 }}>
                <Avatar initials={user.initials} name={user.name} online />
              </button>
            </>
          ) : (
            <button className="primary-button" type="button" onClick={() => setShowAuth(true)}>
              Kirish
            </button>
          )}
        </div>
      </header>

      {children}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
