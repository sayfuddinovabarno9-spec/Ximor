import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { avatarBg } from '../utils/avatarColor';
import { useLanguage } from '../context/LanguageContext';
import { formatQuestionCreatedAt } from '../utils/dateTime';

const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:3002';
const PROFILE_ROLES = ['Shogird', 'Ishtirokchi', 'O\'rta daraja', 'Mutaxassis'];

function profileRoleValue(role) {
  return PROFILE_ROLES.includes(role) ? role : 'Mutaxassis';
}

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

const COVER_PRESETS = [
  {
    id: 'lab',
    labelKey: 'profile.coverPresetLab',
    colors: ['#d7e7e0', '#f7f9f7', '#f0d28c'],
    accent: '#36584d',
    pattern: 'molecule',
    preview: 'linear-gradient(135deg, #d7e7e0 0%, #f7f9f7 58%, #f0d28c 100%)',
  },
  {
    id: 'orbit',
    labelKey: 'profile.coverPresetOrbit',
    colors: ['#223b54', '#5f8f9d', '#f3c363'],
    accent: '#ffffff',
    pattern: 'orbit',
    preview: 'linear-gradient(135deg, #223b54 0%, #5f8f9d 58%, #f3c363 100%)',
  },
  {
    id: 'notebook',
    labelKey: 'profile.coverPresetNotebook',
    colors: ['#f7f7f2', '#dfe9ee', '#b9d2bd'],
    accent: '#49665e',
    pattern: 'grid',
    preview: 'linear-gradient(135deg, #f7f7f2 0%, #dfe9ee 48%, #b9d2bd 100%)',
  },
  {
    id: 'crystal',
    labelKey: 'profile.coverPresetCrystal',
    colors: ['#2f2c4a', '#896b8c', '#e2b46f'],
    accent: '#f7f0df',
    pattern: 'crystal',
    preview: 'linear-gradient(135deg, #2f2c4a 0%, #896b8c 55%, #e2b46f 100%)',
  },
  {
    id: 'reaction',
    labelKey: 'profile.coverPresetReaction',
    colors: ['#164a48', '#4f8b71', '#f5eee1'],
    accent: '#e86d4f',
    pattern: 'wave',
    preview: 'linear-gradient(135deg, #164a48 0%, #4f8b71 52%, #f5eee1 100%)',
  },
];

const AVATAR_PRESETS = [
  {
    id: 'chemist',
    labelKey: 'profile.avatarPresetChemist',
    colors: ['#284942', '#b8d9c9'],
    skin: '#deb083',
    hair: '#212526',
    accent: '#d95f4f',
    coat: '#f4f1e8',
  },
  {
    id: 'neon',
    labelKey: 'profile.avatarPresetNeon',
    colors: ['#24243e', '#4b88a2'],
    skin: '#c89167',
    hair: '#171b24',
    accent: '#f2c85b',
    coat: '#dbe9ef',
  },
  {
    id: 'mint',
    labelKey: 'profile.avatarPresetMint',
    colors: ['#d9efe3', '#6c9b8f'],
    skin: '#e2b88e',
    hair: '#4b3c35',
    accent: '#36584d',
    coat: '#ffffff',
  },
  {
    id: 'violet',
    labelKey: 'profile.avatarPresetViolet',
    colors: ['#4d3f68', '#d19a7a'],
    skin: '#d5a078',
    hair: '#262033',
    accent: '#f6e7a4',
    coat: '#f7f0f5',
  },
  {
    id: 'graphite',
    labelKey: 'profile.avatarPresetGraphite',
    colors: ['#263238', '#8aa39b'],
    skin: '#c98f67',
    hair: '#15191c',
    accent: '#7fd1ae',
    coat: '#edf2ee',
  },
  {
    id: 'solar',
    labelKey: 'profile.avatarPresetSolar',
    colors: ['#6f3f36', '#f0c36c'],
    skin: '#e0a978',
    hair: '#352622',
    accent: '#36584d',
    coat: '#fff7e8',
  },
];

function paintLinearGradient(context, width, height, colors) {
  const gradient = context.createLinearGradient(0, 0, width, height);
  colors.forEach((color, index) => {
    gradient.addColorStop(index / Math.max(colors.length - 1, 1), color);
  });
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

function drawCoverPattern(context, width, height, preset) {
  context.save();
  context.lineCap = 'round';

  if (preset.pattern === 'molecule') {
    context.strokeStyle = 'rgba(54, 88, 77, .24)';
    context.lineWidth = 5;
    const points = [[130, 235], [285, 135], [475, 202], [690, 104], [870, 178], [1045, 86]];
    points.forEach(([x, y], index) => {
      if (index > 0) {
        const [px, py] = points[index - 1];
        context.beginPath();
        context.moveTo(px, py);
        context.lineTo(x, y);
        context.stroke();
      }
      context.fillStyle = index % 2 ? preset.accent : 'rgba(255,255,255,.78)';
      context.beginPath();
      context.arc(x, y, index % 2 ? 22 : 16, 0, Math.PI * 2);
      context.fill();
    });
  }

  if (preset.pattern === 'orbit') {
    context.translate(width * .5, height * .53);
    context.strokeStyle = 'rgba(255,255,255,.34)';
    context.lineWidth = 4;
    [-24, 26, 74].forEach((rotation, index) => {
      context.save();
      context.rotate(rotation * Math.PI / 180);
      context.beginPath();
      context.ellipse(0, 0, 420 - index * 48, 92 + index * 4, 0, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    });
    context.fillStyle = preset.accent;
    context.beginPath();
    context.arc(265, -78, 18, 0, Math.PI * 2);
    context.fill();
  }

  if (preset.pattern === 'grid') {
    context.strokeStyle = 'rgba(73, 102, 94, .18)';
    context.lineWidth = 2;
    for (let x = 60; x < width; x += 76) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }
    for (let y = 42; y < height; y += 58) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }
    context.fillStyle = 'rgba(73, 102, 94, .11)';
    context.fillRect(0, 0, 170, height);
  }

  if (preset.pattern === 'crystal') {
    const shards = [[90, 312, 255, 46, 410, 330], [455, 340, 610, 62, 790, 330], [780, 318, 985, 35, 1160, 332]];
    shards.forEach((shape, index) => {
      context.fillStyle = index === 1 ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.14)';
      context.beginPath();
      context.moveTo(shape[0], shape[1]);
      context.lineTo(shape[2], shape[3]);
      context.lineTo(shape[4], shape[5]);
      context.closePath();
      context.fill();
      context.strokeStyle = 'rgba(255,255,255,.24)';
      context.lineWidth = 3;
      context.stroke();
    });
  }

  if (preset.pattern === 'wave') {
    context.strokeStyle = 'rgba(255,255,255,.34)';
    context.lineWidth = 7;
    for (let i = 0; i < 4; i += 1) {
      context.beginPath();
      context.moveTo(-40, 95 + i * 58);
      for (let x = -40; x <= width + 80; x += 120) {
        context.quadraticCurveTo(x + 60, 52 + i * 58, x + 120, 95 + i * 58);
      }
      context.stroke();
    }
    context.fillStyle = preset.accent;
    context.beginPath();
    context.arc(width - 160, 112, 34, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function renderCoverPreset(preset) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 360;
  const context = canvas.getContext('2d');
  if (!context) return '';
  paintLinearGradient(context, canvas.width, canvas.height, preset.colors);
  drawCoverPattern(context, canvas.width, canvas.height, preset);
  return canvas.toDataURL('image/jpeg', 0.82);
}

function renderAvatarPreset(preset, initials = '') {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 640;
  const context = canvas.getContext('2d');
  if (!context) return '';

  paintLinearGradient(context, canvas.width, canvas.height, preset.colors);
  context.fillStyle = 'rgba(255,255,255,.16)';
  context.beginPath();
  context.arc(520, 110, 86, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(116, 510, 118, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = preset.coat;
  context.beginPath();
  context.moveTo(175, 630);
  context.quadraticCurveTo(320, 430, 465, 630);
  context.closePath();
  context.fill();
  context.fillStyle = preset.accent;
  context.fillRect(300, 475, 40, 150);

  context.fillStyle = preset.skin;
  context.beginPath();
  context.arc(320, 284, 132, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = preset.hair;
  context.beginPath();
  context.moveTo(186, 273);
  context.quadraticCurveTo(214, 102, 370, 145);
  context.quadraticCurveTo(468, 172, 453, 286);
  context.quadraticCurveTo(384, 232, 306, 226);
  context.quadraticCurveTo(238, 222, 186, 273);
  context.fill();

  context.strokeStyle = '#1d2528';
  context.lineWidth = 12;
  context.beginPath();
  context.arc(270, 302, 35, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.arc(370, 302, 35, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.moveTo(305, 302);
  context.lineTo(335, 302);
  context.stroke();

  context.strokeStyle = 'rgba(29,37,40,.62)';
  context.lineWidth = 8;
  context.beginPath();
  context.moveTo(280, 382);
  context.quadraticCurveTo(320, 408, 362, 382);
  context.stroke();

  const badgeText = String(initials || '?').slice(0, 2).toUpperCase();
  context.fillStyle = 'rgba(255,255,255,.86)';
  context.beginPath();
  context.arc(505, 500, 58, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = preset.accent;
  context.font = '700 34px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(badgeText, 505, 501);

  return canvas.toDataURL('image/jpeg', 0.86);
}

function EditProfileModal({ authHeaders, onClose, onSaved, profile }) {
  const { t } = useLanguage();
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedCover, setSelectedCover] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [form, setForm] = useState({
    username: profile.username || '',
    name: profile.name || '',
    role: profileRoleValue(profile.role),
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
      if (key === 'cover_url') setSelectedCover('');
      if (key === 'avatar_url') setSelectedAvatar('');
    } catch {
      setError(t('profile.imageError'));
    } finally {
      event.target.value = '';
    }
  };

  const selectCoverPreset = (preset) => {
    const src = renderCoverPreset(preset);
    if (!src) return;
    update('cover_url', src);
    setSelectedCover(preset.id);
  };

  const selectAvatarPreset = (preset) => {
    const src = renderAvatarPreset(preset, profile.initials);
    if (!src) return;
    update('avatar_url', src);
    setSelectedAvatar(preset.id);
  };

  const removeImage = (key) => {
    update(key, '');
    if (key === 'cover_url') setSelectedCover('');
    if (key === 'avatar_url') setSelectedAvatar('');
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
              <button className="soft-button" type="button" onClick={() => removeImage('cover_url')}>
                {t('profile.removePhoto')}
              </button>
            )}
          </div>
          <div className="profile-preset-section">
            <h3>{t('profile.coverSamples')}</h3>
            <div className="profile-cover-presets">
              {COVER_PRESETS.map(preset => (
                <button
                  aria-label={t(preset.labelKey)}
                  className={`profile-cover-preset ${selectedCover === preset.id ? 'is-selected' : ''}`}
                  key={preset.id}
                  onClick={() => selectCoverPreset(preset)}
                  type="button"
                >
                  <span style={{ background: preset.preview }} />
                  <b>{t(preset.labelKey)}</b>
                </button>
              ))}
            </div>
          </div>
          <div className="profile-avatar-tool">
            <ProfilePhoto profile={{ ...profile, avatar_url: form.avatar_url, initials: profile.initials }} />
            <div>
              <button className="soft-button" type="button" onClick={() => avatarInputRef.current?.click()}>
                <Icon name="camera" size={16} />
                {t('profile.avatarPhoto')}
              </button>
              {form.avatar_url && (
                <button className="soft-button" type="button" onClick={() => removeImage('avatar_url')}>
                  {t('profile.removePhoto')}
                </button>
              )}
            </div>
          </div>
          <div className="profile-preset-section">
            <h3>{t('profile.avatarSamples')}</h3>
            <div className="profile-avatar-presets">
              {AVATAR_PRESETS.map(preset => (
                <button
                  aria-label={t(preset.labelKey)}
                  className={`profile-avatar-preset ${selectedAvatar === preset.id ? 'is-selected' : ''}`}
                  key={preset.id}
                  onClick={() => selectAvatarPreset(preset)}
                  style={{
                    '--preset-bg': `linear-gradient(135deg, ${preset.colors[0]}, ${preset.colors[1]})`,
                    '--preset-skin': preset.skin,
                    '--preset-hair': preset.hair,
                    '--preset-accent': preset.accent,
                    '--preset-coat': preset.coat,
                  }}
                  type="button"
                >
                  <span className="profile-avatar-preset-face">
                    <i />
                  </span>
                  <b>{t(preset.labelKey)}</b>
                </button>
              ))}
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
            <select value={form.role} onChange={event => update('role', event.target.value)}>
              {PROFILE_ROLES.map(role => <option key={role}>{role}</option>)}
            </select>
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
                <Link className="primary-button" to={token ? '/messages' : '/forum'}>
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
