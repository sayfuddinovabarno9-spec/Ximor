import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { avatarBg } from '../utils/avatarColor';

const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:3002';

function scoreTier(score) {
  if (score >= 15000) return { label: 'OLMOS',   color: '#22d3ee' };
  if (score >= 7000)  return { label: 'PLATINA', color: '#a78bfa' };
  if (score >= 3000)  return { label: 'OLTIN',   color: '#f59e0b' };
  if (score >= 1000)  return { label: 'KUMUSH',  color: '#94a3b8' };
  return { label: 'SHOGIRD', color: '#6b7280' };
}

function joinDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long' });
  } catch { return '—'; }
}

export default function ProfilePage({ theme, onThemeToggle }) {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('savollar');
  const [answers, setAnswers] = useState(null);
  const [answersLoading, setAnswersLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setProfile(null);
    fetch(`${BACKEND}/api/users/${username}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { setProfile(data); setLoading(false); })
      .catch(code => {
        setError(code === 404 ? 'Foydalanuvchi topilmadi' : 'Xato yuz berdi');
        setLoading(false);
      });
  }, [username]);

  useEffect(() => {
    if (tab !== 'javoblar' || answers !== null) return;
    setAnswersLoading(true);
    fetch(`${BACKEND}/api/users/${username}/answers`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setAnswers(data); setAnswersLoading(false); })
      .catch(() => { setAnswers([]); setAnswersLoading(false); });
  }, [tab, username, answers]);

  if (loading) return (
    <Layout theme={theme} onThemeToggle={onThemeToggle}>
      <div className="profile-shell">
        <div className="qp-loading">Yuklanmoqda…</div>
      </div>
    </Layout>
  );

  if (error || !profile) return (
    <Layout theme={theme} onThemeToggle={onThemeToggle}>
      <div className="profile-shell">
        <div className="qp-loading" style={{ color: 'var(--rose)' }}>
          {error || 'Foydalanuvchi topilmadi'}
        </div>
      </div>
    </Layout>
  );

  const t = scoreTier(profile.score);

  return (
    <Layout theme={theme} onThemeToggle={onThemeToggle}>
      <div className="profile-shell">

        {/* ── Profile header ── */}
        <div className="profile-header panel-card">
          <span className="profile-avatar"
                style={{ background: avatarBg(profile.initials), color: '#fff' }}>
            {profile.initials}
          </span>
          <div className="profile-meta">
            <div className="profile-name-row">
              <h1>{profile.name}</h1>
              <span className="tier-pill" style={{ '--tier-color': t.color }}>{t.label}</span>
            </div>
            <div className="profile-username">@{profile.username}</div>
            <div className="profile-role-row">
              <span className="profile-role">{profile.role}</span>
              <span className="profile-joined">· {joinDate(profile.created_at)} dan beri</span>
            </div>
          </div>
          <div className="profile-stats">
            <div className="profile-stat"><strong>{profile.score}</strong><span>Ball</span></div>
            <div className="profile-stat"><strong>{profile.topics_count}</strong><span>Savol</span></div>
            <div className="profile-stat"><strong>{profile.answers_count}</strong><span>Javob</span></div>
            <div className="profile-stat"><strong>{profile.accepted_count}</strong><span>Qabul</span></div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="profile-tabs">
          <button className={tab === 'savollar' ? 'is-active' : ''}
                  type="button" onClick={() => setTab('savollar')}>
            Savollar ({profile.topics_count})
          </button>
          <button className={tab === 'javoblar' ? 'is-active' : ''}
                  type="button" onClick={() => setTab('javoblar')}>
            Javoblar ({profile.answers_count})
          </button>
        </div>

        {/* ── Content ── */}
        {tab === 'savollar' && (
          <div className="profile-topics">
            {profile.recentTopics.length === 0 ? (
              <div className="profile-empty">Hali savol berilmagan</div>
            ) : profile.recentTopics.map(topic => (
              <div key={topic.id} className="profile-topic-card panel-card"
                   role="button" tabIndex={0}
                   onClick={() => navigate(`/q/${topic.id}`)}
                   onKeyDown={e => e.key === 'Enter' && navigate(`/q/${topic.id}`)}>
                <div className="ptc-title">{topic.title}</div>
                <div className="ptc-meta">
                  <span className="ptc-badge"
                        style={{
                          background: topic.solved ? '#16a34a22' : '#f59e0b22',
                          color: topic.solved ? '#16a34a' : '#f59e0b',
                        }}>
                    {topic.solved ? 'Yechildi' : 'Ochiq'}
                  </span>
                  <span>{topic.answers} javob</span>
                  <span>{topic.score} ball</span>
                  <span>{topic.views} ko'rishlar</span>
                  <span className="ptc-dot">{topic.activity}</span>
                </div>
                {topic.tags.length > 0 && (
                  <div className="ptc-tags">
                    {topic.tags.slice(0, 4).map(tag => (
                      <span key={tag} className="tag-chip">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'javoblar' && (
          answersLoading ? (
            <div className="profile-empty">Yuklanmoqda…</div>
          ) : !answers || answers.length === 0 ? (
            <div className="profile-empty">Hali javob berilmagan</div>
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
                      <span className="ptc-badge" style={{ background: '#16a34a22', color: '#16a34a' }}>
                        ✓ Qabul qilindi
                      </span>
                    )}
                    <span>{a.score} ball</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

      </div>
    </Layout>
  );
}
