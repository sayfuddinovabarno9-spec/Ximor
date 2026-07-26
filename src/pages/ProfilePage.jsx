import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { avatarBg } from '../utils/avatarColor';
import { useLanguage } from '../context/LanguageContext';
import { formatQuestionCreatedAt } from '../utils/dateTime';

const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:3002';

function scoreTier(score, t) {
  if (score >= 15000) return { label: t('profile.tiers.diamond'), color: '#36584d' };
  if (score >= 7000) return { label: t('profile.tiers.platinum'), color: '#59616d' };
  if (score >= 3000) return { label: t('profile.tiers.gold'), color: '#7b6847' };
  if (score >= 1000) return { label: t('profile.tiers.silver'), color: '#858e99' };
  return { label: t('profile.tiers.learner'), color: '#5f6873' };
}

function joinDate(iso, language) {
  try {
    const locale = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' }[language] || 'uz-UZ';
    return new Date(iso).toLocaleDateString(locale, { year: 'numeric', month: 'long' });
  } catch { return '-'; }
}

function Icon({ name, size = 18 }) {
  const paths = {
    edit: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z",
    camera: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-3h8l2 3h3a2 2 0 0 1 2 2v11ZM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
    close: "M18 6 6 18M6 6l12 12",
    link: "M9 17H7A5 5 0 0 1 7 7h3M15 7h2a5 5 0 1 1 0 10h-3M8 12h8",
    map: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
    message: "M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z",
    target: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
    check: "M20 6 9 17l-5-5",
  };
  return (
    <svg aria-hidden fill="none" height={size} stroke="currentColor" strokeLinecap="round"
         strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={size}>
      <path d={paths[name]} />
    </svg>
  );
}

function ProfilePhoto({ className = '', profile, size = 'large' }) {
  return (
    <span
      className={`profile-photo profile-photo--${size} ${className}`}
      style={{ background: avatarBg(profile.initials), color: '#fff' }}
    >
      {profile.avatar_url ? <img alt="" src={profile.avatar_url} /> : profile.initials}
    </span>
  );
}

function prepareProfileImage(file, kind) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read failed'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('image failed'));
      image.onload = () => {
        const max = kind === 'cover' ? 1800 : 640;
        const scale = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight));
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        context.fillStyle = '#fff';
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', kind === 'cover' ? 0.78 : 0.84));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function EditProfileModal({ authHeaders, onClose, onSaved, profile }) {
  const { t } = useLanguage();
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    username: profile.username || '',
    name: profile.name || '',
    role: profile.role || '',
    headline: profile.headline || '',
    bio: profile.bio || '',
    location: profile.location || '',
    website: profile.website || '',
    study_goal: profile.study_goal || '',
    interests: (profile.interests || []).join(', '),
    avatar_url: profile.avatar_url || '',
    cover_url: profile.cover_url || '',
  });

  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));

  const handleImage = async (event, key, kind) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    try {
      const src = await prepareProfileImage(file, kind);
      update(key, src);
    } catch {
      setError(t('profile.imageError'));
    } finally {
      event.target.value = '';
    }
  };

  const save = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`${BACKEND}/api/users/me/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          ...form,
          interests: form.interests.split(',').map(item => item.trim()).filter(Boolean),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || t('profile.editError'));
      onSaved(data.user);
    } catch (err) {
      setError(err.message || t('profile.editError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="profile-edit-modal" onClick={event => event.stopPropagation()} onSubmit={save}>
        <div className="profile-edit-head">
          <div>
            <span className="eyebrow">{t('profile.publicProfile')}</span>
            <h2>{t('profile.editProfile')}</h2>
          </div>
          <button aria-label={t('common.close')} className="icon-button" type="button" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="profile-photo-tools">
          <div className="profile-cover-preview" style={{ backgroundImage: form.cover_url ? `url(${form.cover_url})` : undefined }}>
            <button className="soft-button" type="button" onClick={() => coverInputRef.current?.click()}>
              <Icon name="camera" size={16} />
              {t('profile.coverPhoto')}
            </button>
            {form.cover_url && (
              <button className="soft-button" type="button" onClick={() => update('cover_url', '')}>
                {t('profile.removePhoto')}
              </button>
            )}
          </div>
          <div className="profile-avatar-tool">
            <ProfilePhoto profile={{ ...profile, avatar_url: form.avatar_url, initials: profile.initials }} />
            <div>
              <button className="soft-button" type="button" onClick={() => avatarInputRef.current?.click()}>
                <Icon name="camera" size={16} />
                {t('profile.avatarPhoto')}
              </button>
              {form.avatar_url && (
                <button className="soft-button" type="button" onClick={() => update('avatar_url', '')}>
                  {t('profile.removePhoto')}
                </button>
              )}
            </div>
          </div>
          <input accept="image/*" hidden ref={coverInputRef} type="file" onChange={event => handleImage(event, 'cover_url', 'cover')} />
          <input accept="image/*" hidden ref={avatarInputRef} type="file" onChange={event => handleImage(event, 'avatar_url', 'avatar')} />
        </div>

        <div className="profile-edit-grid">
          <label>
            {t('profile.displayName')}
            <input value={form.name} onChange={event => update('name', event.target.value)} />
          </label>
          <label>
            {t('profile.username')}
            <input value={form.username} onChange={event => update('username', event.target.value)} />
          </label>
          <label>
            {t('profile.role')}
            <input value={form.role} onChange={event => update('role', event.target.value)} />
          </label>
          <label>
            {t('profile.headline')}
            <input value={form.headline} onChange={event => update('headline', event.target.value)} />
          </label>
          <label>
            {t('profile.location')}
            <input value={form.location} onChange={event => update('location', event.target.value)} />
          </label>
          <label>
            {t('profile.website')}
            <input value={form.website} onChange={event => update('website', event.target.value)} placeholder="https://example.com" />
          </label>
          <label className="profile-edit-wide">
            {t('profile.studyGoal')}
            <input value={form.study_goal} onChange={event => update('study_goal', event.target.value)} />
          </label>
          <label className="profile-edit-wide">
            {t('profile.interestsLabel')}
            <input value={form.interests} onChange={event => update('interests', event.target.value)} placeholder={t('profile.interestsHint')} />
          </label>
          <label className="profile-edit-wide">
            {t('profile.bio')}
            <textarea value={form.bio} onChange={event => update('bio', event.target.value)} rows={4} />
          </label>
        </div>

        {error && <div className="profile-edit-error">{error}</div>}

        <div className="modal-actions">
          <button className="soft-button" type="button" onClick={onClose}>{t('composer.cancel')}</button>
          <button className="primary-button" disabled={saving || !form.name.trim() || !form.username.trim()} type="submit">
            {saving ? t('profile.saving') : t('profile.saveChanges')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ProfilePage({ theme, onThemeToggle }) {
  const { language, t } = useLanguage();
  const { username } = useParams();
  const navigate = useNavigate();
  const { user, token, authHeaders, updateLocalUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('savollar');
  const [answers, setAnswers] = useState(null);
  const [answersLoading, setAnswersLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    setProfile(null);
    fetch(`${BACKEND}/api/users/${username}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { setProfile(data); setLoading(false); })
      .catch(code => {
        setError(code === 404 ? t('profile.notFound') : t('question.genericError'));
        setLoading(false);
      });
  }, [username, t]);

  useEffect(() => {
    setAnswers(null);
  }, [username]);

  useEffect(() => {
    if (tab !== 'javoblar' || answers !== null) return;
    setAnswersLoading(true);
    fetch(`${BACKEND}/api/users/${username}/answers`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setAnswers(data); setAnswersLoading(false); })
      .catch(() => { setAnswers([]); setAnswersLoading(false); });
  }, [tab, username, answers]);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
  };

  const handleSaved = (nextUser) => {
    updateLocalUser(nextUser);
    setProfile(current => ({ ...current, ...nextUser, interests: nextUser.interests || [] }));
    setEditing(false);
    showToast(t('profile.profileUpdated'));
    if (nextUser.username !== username) navigate(`/u/${nextUser.username}`, { replace: true });
  };

  if (loading) return (
    <Layout theme={theme} onThemeToggle={onThemeToggle}>
      <div className="profile-shell">
        <div className="qp-loading">{t('common.loading')}</div>
      </div>
    </Layout>
  );

  if (error || !profile) return (
    <Layout theme={theme} onThemeToggle={onThemeToggle}>
      <div className="profile-shell">
        <div className="qp-loading" style={{ color: 'var(--rose)' }}>
          {error || t('profile.notFound')}
        </div>
      </div>
    </Layout>
  );

  const tier = scoreTier(profile.score, t);
  const isOwnProfile = user?.id === profile.id || user?.username?.toLowerCase() === profile.username?.toLowerCase();
  const profileIsAdmin = Boolean(profile.is_admin || (isOwnProfile && user?.is_admin));
  const profileIsModerator = Boolean(profile.is_moderator || (isOwnProfile && user?.is_moderator));
  const staffRole = profileIsAdmin
    ? { type: 'admin', label: t('nav.adminRole') }
    : profileIsModerator
      ? { type: 'moderator', label: t('nav.moderatorRole') }
      : null;
  const solvedRate = profile.answers_count > 0
    ? Math.round((profile.accepted_count / profile.answers_count) * 100)
    : 0;
  const interests = Array.isArray(profile.interests) ? profile.interests : [];

  return (
    <Layout theme={theme} onThemeToggle={onThemeToggle}>
      <div className="profile-shell profile-shell--wide">
        {toast && <div className="toast">{toast}</div>}

        <div className="profile-hero panel-card">
          <div className="profile-cover" style={{ backgroundImage: profile.cover_url ? `url(${profile.cover_url})` : undefined }} />
          <div className="profile-header profile-header--advanced">
            <ProfilePhoto profile={profile} />
            <div className="profile-meta">
              <div className="profile-name-row">
                <h1>{profile.name}</h1>
                <span className="tier-pill" style={{ '--tier-color': tier.color }}>{tier.label}</span>
              </div>
              <div className="profile-username">@{profile.username}</div>
              <div className="profile-role-row">
                <span className="profile-role">{profile.role}</span>
                {staffRole && (
                  <span className={`staff-badge staff-badge--${staffRole.type}`}>
                    {staffRole.label}
                  </span>
                )}
                <span className="profile-joined">· {t('profile.since', { date: joinDate(profile.created_at, language) })}</span>
              </div>
              {profile.headline && <p className="profile-headline">{profile.headline}</p>}
            </div>
            <div className="profile-actions">
              {isOwnProfile ? (
                <button className="primary-button" type="button" onClick={() => setEditing(true)}>
                  <Icon name="edit" size={16} />
                  {t('profile.editProfile')}
                </button>
              ) : (
                <Link className="primary-button" to={token ? '/messages' : '/chat'}>
                  <Icon name="message" size={16} />
                  {t('profile.messageUser')}
                </Link>
              )}
            </div>
          </div>

          <div className="profile-stats profile-stats--advanced">
            <div className="profile-stat"><strong>{profile.score}</strong><span>{t('profile.points')}</span></div>
            <div className="profile-stat"><strong>{profile.topics_count}</strong><span>{t('profile.questions')}</span></div>
            <div className="profile-stat"><strong>{profile.answers_count}</strong><span>{t('profile.answers')}</span></div>
            <div className="profile-stat"><strong>{profile.accepted_count}</strong><span>{t('profile.accepted')}</span></div>
          </div>
        </div>

        <div className="profile-grid">
          <aside className="profile-side">
            <section className="profile-card panel-card">
              <h2>{t('profile.about')}</h2>
              <p>{profile.bio || t('profile.noBio')}</p>
            </section>

            <section className="profile-card panel-card">
              <h2>{t('profile.profileDetails')}</h2>
              <div className="profile-detail-list">
                {profile.location && <span><Icon name="map" size={15} /> {profile.location}</span>}
                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noreferrer">
                    <Icon name="link" size={15} /> {profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                )}
                {profile.study_goal && <span><Icon name="target" size={15} /> {profile.study_goal}</span>}
                {!profile.location && !profile.website && !profile.study_goal && <span>{t('profile.noDetails')}</span>}
              </div>
            </section>

            <section className="profile-card panel-card">
              <h2>{t('profile.interestsLabel')}</h2>
              {interests.length ? (
                <div className="profile-interest-list">
                  {interests.map(item => <span key={item}>#{item}</span>)}
                </div>
              ) : (
                <p>{t('profile.noInterests')}</p>
              )}
            </section>

            <section className="profile-card profile-progress-card panel-card">
              <h2>{t('profile.contribution')}</h2>
              <div className="profile-progress-row">
                <span>{t('profile.solvedRate')}</span>
                <strong>{solvedRate}%</strong>
              </div>
              <div className="profile-progress"><span style={{ width: `${Math.min(solvedRate, 100)}%` }} /></div>
              <div className="profile-progress-row">
                <span>{t('profile.completed')}</span>
                <strong>{profile.accepted_count}/{profile.answers_count}</strong>
              </div>
            </section>
          </aside>

          <main className="profile-main">
            <div className="profile-tabs">
              <button className={tab === 'savollar' ? 'is-active' : ''}
                      type="button" onClick={() => setTab('savollar')}>
                {t('profile.questionsTab', { count: profile.topics_count })}
              </button>
              <button className={tab === 'javoblar' ? 'is-active' : ''}
                      type="button" onClick={() => setTab('javoblar')}>
                {t('profile.answersTab', { count: profile.answers_count })}
              </button>
            </div>

            {tab === 'savollar' && (
              <div className="profile-topics">
                {profile.recentTopics.length === 0 ? (
                  <div className="profile-empty">{t('profile.noQuestions')}</div>
                ) : profile.recentTopics.map(topic => {
                  const createdAt = formatQuestionCreatedAt(topic.created_at, language);
                  return (
                    <div key={topic.id} className="profile-topic-card panel-card"
                         role="button" tabIndex={0}
                         onClick={() => navigate(`/q/${topic.id}`)}
                         onKeyDown={e => e.key === 'Enter' && navigate(`/q/${topic.id}`)}>
                      <div className="ptc-title">{topic.title}</div>
                      <div className="ptc-meta">
                        <span className="ptc-badge"
                              style={{
                                background: topic.solved
                                  ? 'color-mix(in srgb, var(--green) 14%, var(--surface))'
                                  : 'color-mix(in srgb, var(--amber) 14%, var(--surface))',
                                color: topic.solved ? 'var(--green)' : 'var(--amber)',
                              }}>
                          {topic.solved ? t('common.solved') : t('common.open')}
                        </span>
                        <span>{t('profile.answerCount', { count: topic.answers })}</span>
                        <span>{t('profile.pointCount', { count: topic.score })}</span>
                        <span>{t('profile.viewCount', { count: topic.views })}</span>
                        {createdAt && (
                          <time
                            className="ptc-dot"
                            dateTime={topic.created_at}
                            title={`${t('question.createdAt')}: ${createdAt}`}
                          >
                            {createdAt}
                          </time>
                        )}
                      </div>
                      {topic.tags.length > 0 && (
                        <div className="ptc-tags">
                          {topic.tags.slice(0, 4).map(tag => (
                            <span key={tag} className="tag-chip">#{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {tab === 'javoblar' && (
              answersLoading ? (
                <div className="profile-empty">{t('common.loading')}</div>
              ) : !answers || answers.length === 0 ? (
                <div className="profile-empty">{t('profile.noAnswers')}</div>
              ) : (
                <div className="profile-topics">
                  {answers.map(a => (
                    <div key={a.id} className="profile-topic-card panel-card"
                         role="button" tabIndex={0}
                         onClick={() => navigate(`/q/${a.topic_id}`)}
                         onKeyDown={e => e.key === 'Enter' && navigate(`/q/${a.topic_id}`)}>
                      <div className="ptc-title" style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 4 }}>
                        {a.topic_title}
                      </div>
                      <div className="ptc-answer-text">{a.text}</div>
                      <div className="ptc-meta" style={{ marginTop: 8 }}>
                        {a.accepted && (
                          <span className="ptc-badge" style={{ background: 'color-mix(in srgb, var(--green) 14%, var(--surface))', color: 'var(--green)' }}>
                            <Icon name="check" size={13} /> {t('profile.acceptedBadge')}
                          </span>
                        )}
                        <span>{t('profile.pointCount', { count: a.score })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </main>
        </div>
      </div>

      {editing && (
        <EditProfileModal
          authHeaders={authHeaders}
          onClose={() => setEditing(false)}
          onSaved={handleSaved}
          profile={profile}
        />
      )}
    </Layout>
  );
}
