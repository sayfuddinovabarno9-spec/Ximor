import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { avatarBg } from '../utils/avatarColor';

const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:3002';

const ROLES = ['Shogird', 'Ishtirokchi', 'O\'rta daraja', 'Mutaxassis', 'Organik kimyo', 'Anorganik kimyo', 'Analitik kimyo', 'Fizikaviy kimyo', 'Moderator'];

const PERMISSIONS = [
  { area: 'Staff', label: 'Admin yaratish', admin: true, moderator: false },
  { area: 'Staff', label: 'Moderator tayinlash', admin: true, moderator: false },
  { area: 'Staff', label: 'Rol nomini o\'zgartirish', admin: true, moderator: false },
  { area: 'Users', label: 'Oddiy foydalanuvchini bloklash', admin: true, moderator: true },
  { area: 'Users', label: 'Blokni olib tashlash', admin: true, moderator: true },
  { area: 'Questions', label: 'Savolni yechildi deb belgilash', admin: true, moderator: true },
  { area: 'Questions', label: 'Savolni ochiq qilish', admin: true, moderator: true },
  { area: 'Answers', label: 'Javobni foydali yoki foydasiz belgilash', admin: true, moderator: true },
  { area: 'Answers', label: 'Javobni to\'g\'ri yoki noto\'g\'ri belgilash', admin: true, moderator: true },
  { area: 'Answers', label: 'Javobni o\'chirish', admin: true, moderator: true },
  { area: 'Topics', label: 'Mavzuni mahkamlash yoki qaynoq qilish', admin: true, moderator: false },
  { area: 'Topics', label: 'Mavzuni o\'chirish', admin: true, moderator: false },
  { area: 'Notify', label: 'Umumiy e\'lon yuborish', admin: true, moderator: false },
];

function StatCard({ label, value, sub, color }) {
  return (
    <div className="adm-stat" style={{ '--adm-color': color }}>
      <strong>{value?.toLocaleString() ?? '—'}</strong>
      <span>{label}</span>
      {sub != null && <small>+{sub} bugun</small>}
    </div>
  );
}

function timeAgo(iso) {
  const d = (Date.now() - new Date(iso)) / 1000;
  if (d < 60)    return 'Hozir';
  if (d < 3600)  return `${Math.floor(d/60)} daq`;
  if (d < 86400) return `${Math.floor(d/3600)} soat`;
  return `${Math.floor(d/86400)} kun`;
}

function PermissionBadge({ allowed }) {
  return (
    <span className={`adm-badge ${allowed ? 'adm-badge--ok' : 'adm-badge--banned'}`}>
      {allowed ? 'Bor' : "Yo'q"}
    </span>
  );
}

export default function AdminPage({ theme, onThemeToggle }) {
  const { user, authHeaders } = useAuth();
  const navigate = useNavigate();
  const isAdmin = Boolean(user?.is_admin);
  const canModerate = Boolean(user?.is_admin || user?.is_moderator);
  const [tab,    setTab]    = useState('overview');
  const [stats,  setStats]  = useState(null);
  const [users,  setUsers]  = useState([]);
  const [topics, setTopics] = useState([]);
  const [activity, setActivity] = useState(null);
  const [announce,  setAnnounce]  = useState('');
  const [announceStatus, setAnnounceStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [toast, setToast] = useState('');

  const api = useCallback(async (path, opts = {}) => {
    const r = await fetch(`${BACKEND}/api/admin${path}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(opts.headers || {}) },
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }, [authHeaders]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  useEffect(() => {
    if (!canModerate) return;
    api('/stats').then(setStats).catch(() => {});
    api('/activity').then(setActivity).catch(() => {});
  }, [canModerate, api]);

  useEffect(() => {
    if (tab === 'users' && !users.length) {
      setLoading(true);
      api('/users').then(d => { setUsers(d); setLoading(false); }).catch(() => setLoading(false));
    }
    if (tab === 'content' && !topics.length) {
      setLoading(true);
      api('/topics').then(d => { setTopics(d); setLoading(false); }).catch(() => setLoading(false));
    }
  }, [tab, api, users.length, topics.length]);

  if (!user) {
    return (
      <Layout theme={theme} onThemeToggle={onThemeToggle}>
        <div className="adm-gate">Kirish kerak</div>
      </Layout>
    );
  }

  if (!canModerate) {
    return (
      <Layout theme={theme} onThemeToggle={onThemeToggle}>
        <div className="adm-gate adm-gate--denied">
          <span style={{ fontSize: '2rem' }}>🚫</span>
          <strong>Moderator huquqi yo'q</strong>
          <p>Bu sahifaga faqat admin yoki moderatorlar kira oladi.</p>
          <button className="primary-button" onClick={() => navigate('/')}>Bosh sahifaga</button>
        </div>
      </Layout>
    );
  }

  // ── User actions ──────────────────────────────────────────────────────────
  const userAction = async (id, fields, label) => {
    try {
      await api(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(fields) });
      setUsers(prev => prev.map(u => {
        if (u.id !== id) return u;
        const updated = { ...u };
        if ('is_admin' in fields) updated.is_admin = fields.is_admin;
        if ('is_moderator' in fields) updated.is_moderator = fields.is_moderator;
        if ('banned'   in fields) updated.banned_at = fields.banned ? new Date().toISOString() : null;
        if ('role'     in fields) updated.role = fields.role;
        return updated;
      }));
      showToast(label);
    } catch { showToast('Xato yuz berdi'); }
  };

  // ── Topic actions ─────────────────────────────────────────────────────────
  const topicAction = async (id, fields, label) => {
    try {
      await api(`/topics/${id}`, { method: 'PATCH', body: JSON.stringify(fields) });
      setTopics(prev => prev.map(t => t.id === id ? { ...t, ...fields } : t));
      showToast(label);
    } catch { showToast('Xato'); }
  };

  const deleteTopic = async (id) => {
    if (!confirm('Bu mavzuni o\'chirasizmi? Bu amalni qaytarib bo\'lmaydi.')) return;
    try {
      await api(`/topics/${id}`, { method: 'DELETE' });
      setTopics(prev => prev.filter(t => t.id !== id));
      showToast('Mavzu o\'chirildi');
    } catch { showToast('Xato'); }
  };

  // ── Announce ──────────────────────────────────────────────────────────────
  const sendAnnounce = async () => {
    if (!announce.trim()) return;
    setAnnounceStatus('sending');
    try {
      const r = await api('/announce', { method: 'POST', body: JSON.stringify({ message: announce }) });
      setAnnounceStatus(`✓ ${r.sent} foydalanuvchiga yuborildi`);
      setAnnounce('');
    } catch { setAnnounceStatus('Xato yuz berdi'); }
  };

  const filteredUsers = userSearch.trim()
    ? users.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.username.toLowerCase().includes(userSearch.toLowerCase()))
    : users;

  return (
    <Layout theme={theme} onThemeToggle={onThemeToggle}>
      <main className="adm-shell">
        {toast && <div className="toast">{toast}</div>}

        {/* Header */}
        <div className="adm-header">
          <div>
            <h1>Admin Panel</h1>
            <p>{isAdmin ? 'Ximor boshqaruv markazi' : 'Moderator boshqaruv markazi'}</p>
          </div>
          <button className="soft-button" onClick={() => navigate('/chat')}>← Forum</button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="adm-stats-row">
            <StatCard label="Foydalanuvchilar" value={stats.users}   sub={stats.today?.users}   color="#36584d" />
            <StatCard label="Mavzular"          value={stats.topics}  sub={stats.today?.topics}  color="#59616d" />
            <StatCard label="Javoblar"          value={stats.answers} sub={stats.today?.answers} color="#4d5b55" />
            <StatCard label="Moderatorlar"      value={stats.moderators} color="#6c6258" />
            <StatCard label="Bloklangan"        value={stats.banned}  color="#8f4242" />
          </div>
        )}

        {/* Tabs */}
        <div className="adm-tabs">
          {[
            { id: 'overview', label: 'Ko\'rinish' },
            { id: 'users',    label: 'Foydalanuvchilar' },
            { id: 'content',  label: 'Kontent' },
            { id: 'permissions', label: 'Huquqlar' },
            isAdmin ? { id: 'announce', label: 'E\'lon' } : null,
          ].filter(Boolean).map(t => (
            <button
              key={t.id}
              className={tab === t.id ? 'is-active' : ''}
              onClick={() => setTab(t.id)}
            >{t.label}</button>
          ))}
        </div>

        {/* ── Overview ── */}
        {tab === 'overview' && activity && (
          <div className="adm-overview">
            <div className="adm-panel">
              <h3>So'nggi mavzular</h3>
              <ul className="adm-activity-list">
                {activity.topics.map(t => (
                  <li key={t.id}>
                    <span className="adm-act-icon">📝</span>
                    <div className="adm-act-body">
                      <button className="adm-link" onClick={() => navigate(`/q/${t.id}`)}>{t.title}</button>
                      <span>{t.author} · {timeAgo(t.created_at)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="adm-panel">
              <h3>So'nggi javoblar</h3>
              <ul className="adm-activity-list">
                {activity.answers.map(a => (
                  <li key={a.id}>
                    <span className="adm-act-icon">💬</span>
                    <div className="adm-act-body">
                      <button className="adm-link" onClick={() => navigate(`/q/${a.topic_id}`)}>{a.topic_title}</button>
                      <span>{a.author} · {timeAgo(a.created_at)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ── Users ── */}
        {tab === 'users' && (
          <div className="adm-panel">
            <div className="adm-panel-toolbar">
              <h3>Barcha foydalanuvchilar ({users.length})</h3>
              <input
                className="adm-search"
                placeholder="Ism yoki username bo'yicha qidirish..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
              />
            </div>
            {loading ? (
              <div className="adm-loading">Yuklanmoqda…</div>
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Foydalanuvchi</th>
                      <th>Ball</th>
                      <th>Mavzular</th>
                      <th>Javoblar</th>
                      <th>Holat</th>
                      <th>Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => {
                      const isSelf = u.id === user.id;
                      const isStaff = u.is_admin || u.is_moderator;
                      const canBlockUser = !isSelf && (isAdmin || !isStaff);
                      return (
                      <tr key={u.id} className={u.banned_at ? 'adm-row--banned' : u.is_admin ? 'adm-row--admin' : u.is_moderator ? 'adm-row--moderator' : ''}>
                        <td>
                          <div className="adm-user-cell">
                            <span className="avatar" style={{ background: avatarBg(u.initials), color: '#fff', fontSize: 11, width: 28, height: 28, minWidth: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                              {u.initials}
                            </span>
                            <div>
                              <button className="adm-link" onClick={() => navigate(`/u/${u.username}`)}>{u.name}</button>
                              <span className="adm-muted">@{u.username}</span>
                            </div>
                            {u.is_admin && <span className="adm-badge adm-badge--admin">Admin</span>}
                            {!u.is_admin && u.is_moderator && <span className="adm-badge adm-badge--mod">Moderator</span>}
                            {u.banned_at && <span className="adm-badge adm-badge--banned">Bloklangan</span>}
                          </div>
                        </td>
                        <td><strong>{u.score?.toLocaleString()}</strong></td>
                        <td>{u.topics_count}</td>
                        <td>{u.answers_count}</td>
                        <td>
                          {isAdmin ? (
                            <select
                              className="adm-role-select"
                              value={u.role}
                              onChange={e => userAction(u.id, { role: e.target.value }, 'Rol o\'zgartirildi')}
                            >
                              {ROLES.map(r => <option key={r}>{r}</option>)}
                            </select>
                          ) : (
                            <span className="adm-muted">{u.role}</span>
                          )}
                        </td>
                        <td>
                          <div className="adm-actions">
                            {!isSelf && (
                              <>
                                {isAdmin && (
                                  <>
                                    <button
                                      className={`adm-btn ${u.is_admin ? 'adm-btn--active' : ''}`}
                                      onClick={() => userAction(u.id, { is_admin: !u.is_admin }, u.is_admin ? 'Admin huquqi olindi' : 'Admin qilindi')}
                                      title={u.is_admin ? 'Admin huquqini olish' : 'Admin qilish'}
                                    >
                                      {u.is_admin ? '★' : '☆'}
                                    </button>
                                    <button
                                      className={`adm-btn ${u.is_moderator ? 'adm-btn--mod-active' : ''}`}
                                      onClick={() => {
                                        const nextModerator = !u.is_moderator;
                                        userAction(
                                          u.id,
                                          { is_moderator: nextModerator, ...(nextModerator ? { role: 'Moderator' } : {}) },
                                          u.is_moderator ? 'Moderator huquqi olindi' : 'Moderator qilindi'
                                        );
                                      }}
                                      title={u.is_moderator ? 'Moderator huquqini olish' : 'Moderator qilish'}
                                    >
                                      Mod
                                    </button>
                                  </>
                                )}
                                {canBlockUser && (
                                  <button
                                    className={`adm-btn ${u.banned_at ? 'adm-btn--unban' : 'adm-btn--ban'}`}
                                    onClick={() => userAction(u.id, { banned: !u.banned_at }, u.banned_at ? 'Blok olib tashlandi' : 'Foydalanuvchi bloklandi')}
                                  >
                                    {u.banned_at ? 'Ochish' : 'Bloklash'}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Content ── */}
        {tab === 'content' && (
          <div className="adm-panel">
            <div className="adm-panel-toolbar">
              <h3>Mavzular ({topics.length})</h3>
              <span className="adm-muted">So'nggi 50 ta</span>
            </div>
            {loading ? (
              <div className="adm-loading">Yuklanmoqda…</div>
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Sarlavha</th>
                      <th>Muallif</th>
                      <th>Ball</th>
                      <th>Javob</th>
                      <th>Holat</th>
                      <th>Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topics.map(t => (
                      <tr key={t.id}>
                        <td>
                          <button className="adm-link" onClick={() => navigate(`/q/${t.id}`)} style={{ maxWidth: 300, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                            {t.title}
                          </button>
                          <span className="adm-muted">{timeAgo(t.created_at)}</span>
                        </td>
                        <td>{t.author}</td>
                        <td>{t.score}</td>
                        <td>{t.answers}</td>
                        <td>
                          <div className="adm-flags">
                            {t.pinned && <span className="adm-badge adm-badge--pin">📌</span>}
                            {t.hot    && <span className="adm-badge adm-badge--hot">🔥</span>}
                            {t.solved && <span className="adm-badge adm-badge--ok">✓</span>}
                          </div>
                        </td>
                        <td>
                          <div className="adm-actions">
                            {isAdmin && (
                              <>
                                <button
                                  className={`adm-btn ${t.pinned ? 'adm-btn--active' : ''}`}
                                  onClick={() => topicAction(t.id, { pinned: !t.pinned }, t.pinned ? 'Mahkamlanmadi' : 'Mahkamlandi')}
                                  title="Mahkamlash"
                                >📌</button>
                                <button
                                  className={`adm-btn ${t.hot ? 'adm-btn--active' : ''}`}
                                  onClick={() => topicAction(t.id, { hot: !t.hot }, t.hot ? 'Qaynoq bekor' : 'Qaynoq qilindi')}
                                  title="Qaynoq"
                                >🔥</button>
                              </>
                            )}
                            <button
                              className={`adm-btn ${t.solved ? 'adm-btn--solved' : ''}`}
                              onClick={() => topicAction(t.id, { solved: !t.solved }, t.solved ? 'Savol ochiq qilindi' : 'Savol yechildi')}
                              title={t.solved ? 'Ochiq qilish' : 'Yechilgan qilish'}
                            >
                              {t.solved ? 'Ochiq' : 'Yechildi'}
                            </button>
                            {isAdmin && (
                            <button
                              className="adm-btn adm-btn--danger"
                              onClick={() => deleteTopic(t.id)}
                              title="O'chirish"
                            >🗑</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Permissions ── */}
        {tab === 'permissions' && (
          <div className="adm-panel">
            <div className="adm-panel-toolbar">
              <h3>Rol huquqlari</h3>
              <span className="adm-muted">Admin moderatorlarni tayinlaydi</span>
            </div>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Bo'lim</th>
                    <th>Huquq</th>
                    <th>Admin</th>
                    <th>Moderator</th>
                  </tr>
                </thead>
                <tbody>
                  {PERMISSIONS.map(permission => (
                    <tr key={`${permission.area}-${permission.label}`}>
                      <td><span className="adm-muted">{permission.area}</span></td>
                      <td>{permission.label}</td>
                      <td><PermissionBadge allowed={permission.admin} /></td>
                      <td><PermissionBadge allowed={permission.moderator} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Announce ── */}
        {tab === 'announce' && isAdmin && (
          <div className="adm-panel adm-announce">
            <h3>Barcha foydalanuvchilarga e'lon yuborish</h3>
            <p className="adm-muted">E'lon barcha ro'yxatdan o'tgan foydalanuvchilarning bildirishnomalariga yuboriladi.</p>
            <textarea
              className="adm-announce-area"
              placeholder="E'lon matnini kiriting... (max 500 belgi)"
              value={announce}
              maxLength={500}
              onChange={e => setAnnounce(e.target.value)}
            />
            <div className="adm-announce-footer">
              <span className="adm-muted">{announce.length}/500</span>
              <button
                className="primary-button"
                disabled={!announce.trim() || announceStatus === 'sending'}
                onClick={sendAnnounce}
              >
                {announceStatus === 'sending' ? 'Yuborilmoqda…' : '📢 Yuborish'}
              </button>
            </div>
            {announceStatus && announceStatus !== 'sending' && (
              <div className="adm-announce-result">{announceStatus}</div>
            )}
          </div>
        )}
      </main>
    </Layout>
  );
}
