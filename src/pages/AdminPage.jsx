import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { avatarBg } from '../utils/avatarColor';
import { useLanguage } from '../context/LanguageContext';

const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:3002';

const ROLES = ['Shogird', 'Ishtirokchi', 'O\'rta daraja', 'Mutaxassis'];

function roleSelectValue(role) {
  return ROLES.includes(role) ? role : 'Mutaxassis';
}

function StatCard({ label, value, sub, color }) {
  const { t } = useLanguage();
  return (
    <div className="adm-stat" style={{ '--adm-color': color }}>
      <strong>{value?.toLocaleString() ?? '—'}</strong>
      <span>{label}</span>
      {sub != null && <small>{t('admin.today', { count: sub })}</small>}
    </div>
  );
}

function timeAgo(iso, t) {
  const d = (Date.now() - new Date(iso)) / 1000;
  if (d < 60) return t('time.now');
  if (d < 3600) return t('time.minutesAgo', { count: Math.floor(d / 60) });
  if (d < 86400) return t('time.hoursAgo', { count: Math.floor(d / 3600) });
  return t('time.daysAgo', { count: Math.floor(d / 86400) });
}

function PermissionBadge({ allowed }) {
  const { t } = useLanguage();
  return (
    <span className={`adm-badge ${allowed ? 'adm-badge--ok' : 'adm-badge--banned'}`}>
      {allowed ? t('admin.allowed') : t('admin.denied')}
    </span>
  );
}

export default function AdminPage({ theme, onThemeToggle }) {
  const { user, authHeaders, updateLocalUser } = useAuth();
  const { t } = useLanguage();
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
  const [setupStatus, setSetupStatus] = useState('');
  const [setupBusy, setSetupBusy] = useState(false);
  const [permissions, setPermissions] = useState([]);
  const [permissionBusy, setPermissionBusy] = useState('');

  const hasPermission = useCallback((permissionKey) => {
    if (isAdmin) return true;
    return permissions.some(permission => permission.key === permissionKey && permission.moderator);
  }, [isAdmin, permissions]);

  const hasAnyPermission = useCallback((permissionKeys) => (
    isAdmin || permissionKeys.some(hasPermission)
  ), [hasPermission, isAdmin]);

  const canManageUsers = hasAnyPermission([
    'staff.create_admin',
    'staff.assign_moderator',
    'staff.change_role',
    'users.ban',
    'users.unban',
  ]);
  const canAnnounce = hasPermission('notify.announce');

  const api = useCallback(async (path, opts = {}) => {
    const r = await fetch(`${BACKEND}/api/admin${path}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(opts.headers || {}) },
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }, [authHeaders]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const claimFirstAdmin = async () => {
    if (setupBusy) return;
    setSetupBusy(true);
    setSetupStatus(t('admin.firstAdminWorking'));
    try {
      const response = await fetch(`${BACKEND}/api/auth/bootstrap-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: '{}',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setSetupStatus(data.error || t('admin.firstAdminError'));
        setSetupBusy(false);
        return;
      }
      if (data.token) localStorage.setItem('ximor_token', data.token);
      if (data.user) updateLocalUser(data.user);
      setSetupStatus(t('admin.firstAdminDone'));
      window.setTimeout(() => window.location.reload(), 500);
    } catch {
      setSetupStatus(t('admin.firstAdminError'));
      setSetupBusy(false);
    }
  };

  useEffect(() => {
    if (!canModerate) return;
    api('/stats').then(setStats).catch(() => {});
    api('/activity').then(setActivity).catch(() => {});
    api('/permissions').then(setPermissions).catch(() => {});
  }, [canModerate, api]);

  useEffect(() => {
    if (tab === 'users' && canManageUsers && !users.length) {
      setLoading(true);
      api('/users').then(d => { setUsers(d); setLoading(false); }).catch(() => setLoading(false));
    }
    if (tab === 'content' && !topics.length) {
      setLoading(true);
      api('/topics').then(d => { setTopics(d); setLoading(false); }).catch(() => setLoading(false));
    }
  }, [tab, api, users.length, topics.length, canManageUsers]);

  if (!user) {
    return (
      <Layout theme={theme} onThemeToggle={onThemeToggle}>
        <div className="adm-gate">{t('admin.loginRequired')}</div>
      </Layout>
    );
  }

  if (!canModerate) {
    return (
      <Layout theme={theme} onThemeToggle={onThemeToggle}>
        <div className="adm-gate adm-gate--denied">
          <span style={{ fontSize: '2rem' }}>🚫</span>
          <strong>{t('admin.noPermission')}</strong>
          <p>{t('admin.deniedText')}</p>
          <div className="adm-bootstrap-card">
            <strong>{t('admin.firstAdminTitle')}</strong>
            <p>{t('admin.firstAdminText')}</p>
            <button className="primary-button" disabled={setupBusy} onClick={claimFirstAdmin} type="button">
              {setupBusy ? t('admin.firstAdminWorking') : t('admin.firstAdminAction')}
            </button>
            {setupStatus && <span className="adm-setup-status">{setupStatus}</span>}
          </div>
          <button className="soft-button" onClick={() => navigate('/')}>{t('admin.home')}</button>
        </div>
      </Layout>
    );
  }

  // ── User actions ──────────────────────────────────────────────────────────
  const userAction = async (id, fields, label) => {
    try {
      const result = await api(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(fields) });
      setUsers(prev => prev.map(u => {
        if (u.id !== id) return u;
        if (result.user) return { ...u, ...result.user };
        const updated = { ...u };
        if ('is_admin' in fields) updated.is_admin = fields.is_admin;
        if ('is_moderator' in fields) updated.is_moderator = fields.is_moderator;
        if ('banned'   in fields) updated.banned_at = fields.banned ? new Date().toISOString() : null;
        if ('role'     in fields) updated.role = fields.role;
        return updated;
      }));
      if (result.user?.id === user.id) updateLocalUser(result.user);
      if ('is_admin' in fields || 'is_moderator' in fields || 'banned' in fields) {
        api('/stats').then(setStats).catch(() => {});
      }
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

  const toggleModeratorPermission = async (permission) => {
    if (!isAdmin || permissionBusy) return;
    const nextValue = !permission.moderator;
    setPermissionBusy(permission.key);
    setPermissions(prev => prev.map(item => (
      item.key === permission.key ? { ...item, moderator: nextValue } : item
    )));
    try {
      const result = await api(`/permissions/${permission.key}`, {
        method: 'PATCH',
        body: JSON.stringify({ moderator: nextValue }),
      });
      setPermissions(result.permissions || []);
      showToast(nextValue ? 'Moderator huquqi yoqildi' : 'Moderator huquqi o\'chirildi');
    } catch {
      setPermissions(prev => prev.map(item => (
        item.key === permission.key ? { ...item, moderator: permission.moderator } : item
      )));
      showToast('Xato yuz berdi');
    } finally {
      setPermissionBusy('');
    }
  };

  const filteredUsers = userSearch.trim()
    ? users.filter(u => {
        const q = userSearch.toLowerCase();
        return (
          u.name.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q)
        );
      })
    : users;

  return (
    <Layout theme={theme} onThemeToggle={onThemeToggle}>
      <main className="adm-shell">
        {toast && <div className="toast">{toast}</div>}

        {/* Header */}
        <div className="adm-header">
          <div>
            <h1>Admin Panel</h1>
            <p>{isAdmin ? t('admin.adminCenter') : t('admin.moderatorCenter')}</p>
          </div>
          <button className="soft-button" onClick={() => navigate('/forum')}>← {t('question.forum')}</button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="adm-stats-row">
            <StatCard label={t('admin.users')} value={stats.users} sub={stats.today?.users} color="#36584d" />
            <StatCard label={t('admin.topics')} value={stats.topics} sub={stats.today?.topics} color="#59616d" />
            <StatCard label={t('admin.answers')} value={stats.answers} sub={stats.today?.answers} color="#4d5b55" />
            <StatCard label={t('admin.moderators')} value={stats.moderators} color="#6c6258" />
            <StatCard label={t('admin.banned')} value={stats.banned} color="#8f4242" />
          </div>
        )}

        {/* Tabs */}
        <div className="adm-tabs">
          {[
            { id: 'overview', labelKey: 'admin.overview' },
            canManageUsers ? { id: 'users', labelKey: 'admin.users' } : null,
            { id: 'content', labelKey: 'admin.content' },
            { id: 'permissions', labelKey: 'admin.permissions' },
            canAnnounce ? { id: 'announce', labelKey: 'admin.announcement' } : null,
          ].filter(Boolean).map(item => (
            <button
              key={item.id}
              className={tab === item.id ? 'is-active' : ''}
              onClick={() => setTab(item.id)}
            >{t(item.labelKey)}</button>
          ))}
        </div>

        {/* ── Overview ── */}
        {tab === 'overview' && activity && (
          <div className="adm-overview">
            <div className="adm-panel">
              <h3>{t('admin.recentTopics')}</h3>
              <ul className="adm-activity-list">
                {activity.topics.map(topicItem => (
                  <li key={topicItem.id}>
                    <span className="adm-act-icon">📝</span>
                    <div className="adm-act-body">
                      <button className="adm-link" onClick={() => navigate(`/q/${topicItem.id}`)}>{topicItem.title}</button>
                      <span>{topicItem.author} · {timeAgo(topicItem.created_at, t)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="adm-panel">
              <h3>{t('admin.recentAnswers')}</h3>
              <ul className="adm-activity-list">
                {activity.answers.map(a => (
                  <li key={a.id}>
                    <span className="adm-act-icon">💬</span>
                    <div className="adm-act-body">
                      <button className="adm-link" onClick={() => navigate(`/q/${a.topic_id}`)}>{a.topic_title}</button>
                      <span>{a.author} · {timeAgo(a.created_at, t)}</span>
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
              <h3>{t('admin.allUsers', { count: users.length })}</h3>
              <input
                className="adm-search"
                placeholder={t('admin.searchUsers')}
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
              />
            </div>
            {loading ? (
              <div className="adm-loading">{t('common.loading')}</div>
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>{t('admin.user')}</th>
                      <th>{t('admin.points')}</th>
                      <th>{t('admin.topics')}</th>
                      <th>{t('admin.answers')}</th>
                      <th>{t('admin.status')}</th>
                      <th>{t('admin.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => {
                      const isSelf = u.id === user.id;
                      const isStaff = u.is_admin || u.is_moderator;
                      const canChangeAdmin = !isSelf && hasPermission('staff.create_admin') && (isAdmin || !u.is_admin);
                      const canChangeModerator = !isSelf && hasPermission('staff.assign_moderator') && (isAdmin || !u.is_admin);
                      const canChangeRole = hasPermission('staff.change_role') && (isAdmin || !isStaff);
                      const canBlockUser = !isSelf && !u.banned_at && hasPermission('users.ban') && (isAdmin || !isStaff);
                      const canUnblockUser = !isSelf && u.banned_at && hasPermission('users.unban') && (isAdmin || !isStaff);
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
                              {u.email && <span className="adm-muted">{u.email}</span>}
                            </div>
                            {u.is_admin && <span className="adm-badge adm-badge--admin">Admin</span>}
                            {!u.is_admin && u.is_moderator && <span className="adm-badge adm-badge--mod">Moderator</span>}
                            {u.banned_at && <span className="adm-badge adm-badge--banned">{t('admin.banned')}</span>}
                          </div>
                        </td>
                        <td><strong>{u.score?.toLocaleString()}</strong></td>
                        <td>{u.topics_count}</td>
                        <td>{u.answers_count}</td>
                        <td>
                          {canChangeRole ? (
                            <select
                              className="adm-role-select"
                              value={roleSelectValue(u.role)}
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
                                {(canChangeAdmin || canChangeModerator) && (
                                  <>
                                    {canChangeAdmin && (
                                      <button
                                        className={`adm-btn ${u.is_admin ? 'adm-btn--active' : ''}`}
                                        onClick={() => userAction(u.id, { is_admin: !u.is_admin }, u.is_admin ? 'Admin huquqi olindi' : 'Admin qilindi')}
                                        title={u.is_admin ? 'Admin huquqini olish' : 'Admin qilish'}
                                      >
                                        {u.is_admin ? '★' : '☆'}
                                      </button>
                                    )}
                                    {canChangeModerator && (
                                      <button
                                        className={`adm-btn ${u.is_moderator ? 'adm-btn--mod-active' : ''}`}
                                        onClick={() => {
                                          const nextModerator = !u.is_moderator;
                                          userAction(
                                            u.id,
                                            { is_moderator: nextModerator },
                                            u.is_moderator ? 'Moderator huquqi olindi' : 'Moderator qilindi'
                                          );
                                        }}
                                        title={u.is_moderator ? 'Moderator huquqini olish' : 'Moderator qilish'}
                                      >
                                        Mod
                                      </button>
                                    )}
                                  </>
                                )}
                                {(canBlockUser || canUnblockUser) && (
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
              <h3>{t('admin.topics')} ({topics.length})</h3>
              <span className="adm-muted">{t('admin.recent50')}</span>
            </div>
            {loading ? (
              <div className="adm-loading">{t('common.loading')}</div>
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>{t('admin.title')}</th>
                      <th>{t('admin.author')}</th>
                      <th>{t('admin.points')}</th>
                      <th>{t('admin.answer')}</th>
                      <th>{t('admin.status')}</th>
                      <th>{t('admin.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topics.map(topicItem => {
                      const canFeatureTopic = hasPermission('topic.feature');
                      const canToggleSolved = hasPermission(topicItem.solved ? 'question.open' : 'question.solve');
                      const canDeleteQuestion = hasPermission('question.delete');
                      return (
                      <tr key={topicItem.id}>
                        <td>
                          <button className="adm-link" onClick={() => navigate(`/q/${topicItem.id}`)} style={{ maxWidth: 300, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                            {topicItem.title}
                          </button>
                          <span className="adm-muted">{timeAgo(topicItem.created_at, t)}</span>
                        </td>
                        <td>{topicItem.author}</td>
                        <td>{topicItem.score}</td>
                        <td>{topicItem.answers}</td>
                        <td>
                          <div className="adm-flags">
                            {topicItem.pinned && <span className="adm-badge adm-badge--pin">📌</span>}
                            {topicItem.hot && <span className="adm-badge adm-badge--hot">🔥</span>}
                            {topicItem.solved && <span className="adm-badge adm-badge--ok">✓</span>}
                          </div>
                        </td>
                        <td>
                          <div className="adm-actions">
                            {canFeatureTopic && (
                              <>
                                <button
                                  className={`adm-btn ${topicItem.pinned ? 'adm-btn--active' : ''}`}
                                  onClick={() => topicAction(topicItem.id, { pinned: !topicItem.pinned }, topicItem.pinned ? 'Mahkamlanmadi' : 'Mahkamlandi')}
                                  title={t('forum.pinned')}
                                >📌</button>
                                <button
                                  className={`adm-btn ${topicItem.hot ? 'adm-btn--active' : ''}`}
                                  onClick={() => topicAction(topicItem.id, { hot: !topicItem.hot }, topicItem.hot ? 'Qaynoq bekor' : 'Qaynoq qilindi')}
                                  title={t('forum.hot')}
                                >🔥</button>
                              </>
                            )}
                            {canToggleSolved && (
                              <button
                                className={`adm-btn ${topicItem.solved ? 'adm-btn--solved' : ''}`}
                                onClick={() => topicAction(topicItem.id, { solved: !topicItem.solved }, topicItem.solved ? 'Savol ochiq qilindi' : 'Savol yechildi')}
                                title={topicItem.solved ? t('question.markOpen') : t('question.markSolved')}
                              >
                                {topicItem.solved ? t('common.open') : t('common.solved')}
                              </button>
                            )}
                            {canDeleteQuestion && (
                              <button
                                className="adm-btn adm-btn--danger"
                                onClick={() => deleteTopic(topicItem.id)}
                                title={t('question.delete')}
                              >🗑</button>
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

        {/* ── Permissions ── */}
        {tab === 'permissions' && (
          <div className="adm-panel">
            <div className="adm-panel-toolbar">
              <h3>{t('admin.roleRights')}</h3>
              <span className="adm-muted">{t('admin.adminAssigns')}</span>
            </div>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>{t('admin.section')}</th>
                    <th>{t('admin.right')}</th>
                    <th>Admin</th>
                    <th>Moderator</th>
                  </tr>
                </thead>
                <tbody>
                  {permissions.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
                        <div className="adm-loading">{t('common.loading')}</div>
                      </td>
                    </tr>
                  ) : permissions.map(permission => (
                    <tr key={permission.key}>
                      <td><span className="adm-muted">{permission.area}</span></td>
                      <td>{permission.label}</td>
                      <td><PermissionBadge allowed={permission.admin} /></td>
                      <td>
                        {isAdmin ? (
                          <button
                            aria-pressed={permission.moderator}
                            className={`adm-permission-toggle ${permission.moderator ? 'is-on' : 'is-off'}`}
                            disabled={permissionBusy === permission.key}
                            onClick={() => toggleModeratorPermission(permission)}
                            title={permission.moderator ? t('admin.turnOffRight') : t('admin.turnOnRight')}
                            type="button"
                          >
                            <PermissionBadge allowed={permission.moderator} />
                          </button>
                        ) : (
                          <PermissionBadge allowed={permission.moderator} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Announce ── */}
        {tab === 'announce' && canAnnounce && (
          <div className="adm-panel adm-announce">
            <h3>{t('admin.sendAnnouncement')}</h3>
            <p className="adm-muted">{t('admin.announcementHelp')}</p>
            <textarea
              className="adm-announce-area"
              placeholder={t('admin.announcementPlaceholder')}
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
                {announceStatus === 'sending' ? t('admin.sending') : `📢 ${t('admin.send')}`}
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
