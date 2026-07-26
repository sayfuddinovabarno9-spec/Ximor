import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';
import BrandMark from './BrandMark';
import LanguageSwitcher from './LanguageSwitcher';
import { avatarBg } from '../utils/avatarColor';
import { useLanguage } from '../context/LanguageContext';

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
    newspaper:"M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4M14 2v6h6M2 15h10M2 19h10M2 11h4",
    beaker:   "M9 3h6M10 3v6l-5 10a1 1 0 0 0 .9 1.5h12.2A1 1 0 0 0 19 19L14 9V3M8 15h8",
  };
  return (
    <svg aria-hidden fill="none" height={size} stroke="currentColor"
         strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
         viewBox="0 0 24 24" width={size}>
      <path d={paths[name]} />
    </svg>
  );
}

function Avatar({ image, initials, name, online = false }) {
  return (
    <span className="avatar" title={name}
          style={{ background: avatarBg(initials), color: '#fff', border: 'none' }}>
      {image ? <img alt="" src={image} /> : initials}
      {online && <span className="avatar__status" />}
    </span>
  );
}

function timeAgo(iso, t) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return t('time.now');
  if (diff < 3600) return t('time.minutesAgo', { count: Math.floor(diff / 60) });
  if (diff < 86400) return t('time.hoursAgo', { count: Math.floor(diff / 3600) });
  return t('time.daysAgo', { count: Math.floor(diff / 86400) });
}

const NAV_ITEMS = [
  { to: '/chat',         labelKey: 'nav.chat',      icon: 'home', exact: true },
  { to: '/messages',     labelKey: 'nav.messages',  icon: 'message' },
  { to: '/olimpiadalar', labelKey: 'nav.community', icon: 'person' },
  { to: '/reyting',      labelKey: 'nav.ranking',   icon: 'trophy' },
  { to: '/asboblar',     labelKey: 'nav.tools',     icon: 'beaker' },
  { to: '/yangiliklar',  labelKey: 'nav.news',      icon: 'newspaper' },
];

export default function Layout({ children, theme, onThemeToggle, onCompose, query, onQuery, searchPlaceholder }) {
  const { user, token, logout, authHeaders } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const menuRef = useRef(null);
  const bellRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!token) {
      setNotifications([]);
      setUnread(0);
      return;
    }
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

  const fetchMessageUnread = useCallback(async () => {
    if (!token) {
      setMessageUnreadCount(0);
      return;
    }
    try {
      const r = await fetch(`${BACKEND}/api/messages/conversations`, {
        headers: authHeaders(),
      });
      if (!r.ok) return;
      const data = await r.json();
      const total = (data.conversations || []).reduce(
        (sum, conversation) => sum + Number(conversation.unread_count || 0),
        0
      );
      setMessageUnreadCount(total);
    } catch {}
  }, [authHeaders, token]);

  useEffect(() => {
    fetchNotifications();
    fetchMessageUnread();
  }, [fetchNotifications, fetchMessageUnread]);

  // Re-fetch notifications on SSE notification event
  useEffect(() => {
    if (!token) return;
    const es = new EventSource(`${BACKEND}/api/forum/stream`);
    es.addEventListener('notification', () => {
      fetchNotifications();
      fetchMessageUnread();
    });
    return () => es.close();
  }, [token, fetchNotifications, fetchMessageUnread]);

  useEffect(() => {
    if (!token) return undefined;
    const timer = window.setInterval(fetchMessageUnread, 5000);
    const handleUnreadEvent = event => {
      const count = Number(event.detail?.count);
      if (Number.isFinite(count)) setMessageUnreadCount(count);
      else fetchMessageUnread();
    };
    window.addEventListener('ximor:messages-unread', handleUnreadEvent);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('ximor:messages-unread', handleUnreadEvent);
    };
  }, [fetchMessageUnread, token]);

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

  const navBadgeFor = item => {
    if (item.to === '/messages' && messageUnreadCount > 0) {
      return messageUnreadCount > 99 ? '99+' : messageUnreadCount;
    }
    return item.badge;
  };
  const staffRole = user?.is_admin
    ? { type: 'admin', label: t('nav.adminRole') }
    : user?.is_moderator
      ? { type: 'moderator', label: t('nav.moderatorRole') }
      : null;

  return (
    <div className="app" data-theme={theme}>
      <header className="topbar">
        <Link to="/" className="brand">
          <div className="brand-icon"><BrandMark /></div>
          <div className="brand-text">
            <strong>Ximor</strong>
            <small>{t('home.chemistryChat')}</small>
          </div>
        </Link>

        <nav className="topnav" aria-label={t('nav.main')}>
          {NAV_ITEMS.map(item => {
            const active = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            const badge = navBadgeFor(item);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`${active ? 'is-active' : ''} ${badge ? 'has-unread' : ''}`}
              >
                {t(item.labelKey)}
                {badge != null && (
                  <span className="nav-badge">{badge}</span>
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
            placeholder={searchPlaceholder || t('header.search')}
          />
          <span className="search-kbd">⌘K</span>
        </label>

        <div className="top-actions">
          <LanguageSwitcher />
          <button className="icon-button" title={t('header.theme')} type="button"
                  onClick={onThemeToggle}>
            <Icon name={theme === 'light' ? 'moon' : 'sun'} size={17} />
          </button>

          {/* ── Bell / Notifications ── */}
          <div className="bell-wrap" ref={bellRef}>
            <button className="icon-button bell-btn" title={t('header.notifications')}
                    type="button" onClick={user ? openBell : () => setShowAuth(true)}>
              <Icon name="bell" size={17} />
              {unread > 0 && <span className="bell-dot">{unread > 9 ? '9+' : unread}</span>}
              {unread === 0 && notifications.length > 0 && <span className="bell-dot bell-dot--empty" />}
            </button>

            {bellOpen && (
              <div className="notif-dropdown">
                <div className="notif-header">
                  <strong>{t('header.notifications')}</strong>
                  <span>{notifications.filter(n => !n.read).length > 0
                    ? t('header.newCount', { count: notifications.filter(n => !n.read).length })
                    : t('header.allRead')}</span>
                </div>
                {notifications.length === 0 ? (
                  <div className="notif-empty">
                    <Icon name="bell" size={20} />
                    <span>{t('header.noNotifications')}</span>
                  </div>
                ) : (
                  <ul className="notif-list">
                    {notifications.map(n => (
                      <li key={n.id}
                          className={`notif-item ${!n.read ? 'is-unread' : ''}`}
                          onClick={() => {
                            setBellOpen(false);
                            if (n.type === 'message') navigate('/messages');
                            else if (n.topic_id) navigate(`/q/${n.topic_id}`);
                          }}>
                        <span className="notif-icon">
                          {n.type === 'accept' ? <Icon name="check" size={14} /> : <Icon name="message" size={14} />}
                        </span>
                        <div className="notif-body">
                          <p>{n.message}</p>
                          <time>{timeAgo(n.created_at, t)}</time>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <button className="primary-button" type="button" onClick={handleCompose}>
            <Icon name="plus" size={16} /> {t('header.askQuestion')}
          </button>

          {user ? (
            <>
            {staffRole && (
              <Link
                className={`staff-status-pill staff-status-pill--${staffRole.type}`}
                title={staffRole.type === 'admin' ? t('nav.adminPanel') : t('nav.moderatorPanel')}
                to="/admin"
              >
                {staffRole.label}
              </Link>
            )}
            <div className="user-menu-wrap" ref={menuRef}>
              <button className="icon-button" type="button" title={user.name}
                      style={{ gap: 0 }} onClick={() => setMenuOpen(o => !o)}>
                <Avatar image={user.avatar_url} initials={user.initials} name={user.name} online />
              </button>
              {menuOpen && (
                <div className="user-dropdown">
                  <div className="user-dropdown-summary">
                    <div>
                      <strong>{user.name}</strong>
                      <span>@{user.username}</span>
                    </div>
                    <div className="user-dropdown-roles">
                      <span className="user-role-chip">{user.role}</span>
                      {staffRole && (
                        <span className={`staff-badge staff-badge--${staffRole.type}`}>
                          {staffRole.label}
                        </span>
                      )}
                    </div>
                  </div>
                  <Link to={`/u/${user.username}`} onClick={() => setMenuOpen(false)}>
                    <span>{t('nav.myProfile')}</span>
                    <span className="dropdown-kbd">@{user.username}</span>
                  </Link>
                  {(user.is_admin || user.is_moderator) && (
                    <Link to="/admin" onClick={() => setMenuOpen(false)} style={{ color: 'var(--amber)' }}>
                      <span>{user.is_admin ? t('nav.adminPanel') : t('nav.moderatorPanel')}</span>
                      <span className="dropdown-kbd">{user.is_admin ? '★' : 'Mod'}</span>
                    </Link>
                  )}
                  <button type="button" onClick={() => { logout(); setMenuOpen(false); }}>
                    {t('nav.logout')}
                  </button>
                </div>
              )}
            </div>
            </>
          ) : (
            <button className="avatar-btn" type="button" onClick={() => setShowAuth(true)}
                    title={t('nav.login')} style={{ background: 'var(--surface-soft)', border: '1.5px solid var(--line-strong)', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontWeight: 900, fontSize: 13, color: 'var(--muted)' }}>
              N
            </button>
          )}
        </div>
      </header>

      {children}

      {/* ── Mobile bottom nav ── */}
      <nav className="mobile-nav" aria-label={t('nav.mobile')}>
        <Link to="/chat" className={location.pathname === '/chat' ? 'is-active' : ''}>
          <Icon name="home" size={18} />
          <span>{t('nav.chat')}</span>
        </Link>
        <Link to="/messages" className={location.pathname.startsWith('/messages') ? 'is-active' : ''}>
          <Icon name="message" size={18} />
          <span>{t('nav.messages')}</span>
          {messageUnreadCount > 0 && (
            <b className="mobile-nav-badge">{messageUnreadCount > 99 ? '99+' : messageUnreadCount}</b>
          )}
        </Link>
        <Link to="/olimpiadalar" className={location.pathname.startsWith('/olimpiadalar') ? 'is-active' : ''}>
          <Icon name="person" size={18} />
          <span>{t('nav.community')}</span>
        </Link>
        <Link to="/reyting" className={location.pathname.startsWith('/reyting') ? 'is-active' : ''}>
          <Icon name="trophy" size={18} />
          <span>{t('nav.ranking')}</span>
        </Link>
        <Link to="/asboblar" className={location.pathname.startsWith('/asboblar') ? 'is-active' : ''}>
          <Icon name="beaker" size={18} />
          <span>{t('nav.tools')}</span>
        </Link>
        <Link to="/yangiliklar" className={location.pathname.startsWith('/yangiliklar') ? 'is-active' : ''}>
          <Icon name="newspaper" size={18} />
          <span>{t('nav.news')}</span>
        </Link>
        {user ? (
          <Link to={`/u/${user.username}`} className={location.pathname.startsWith('/u/') ? 'is-active' : ''}>
            <Icon name="person" size={18} />
            <span>{t('nav.profile')}</span>
          </Link>
        ) : (
          <button type="button" onClick={() => setShowAuth(true)}>
            <Icon name="person" size={18} />
            <span>{t('nav.login')}</span>
          </button>
        )}
      </nav>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
