import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { avatarBg } from '../utils/avatarColor';
import { useLanguage } from '../context/LanguageContext';

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
  } catch { return '—'; }
}

export default function ProfilePage({ theme, onThemeToggle }) {
  const { language, t } = useLanguage();
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
        setError(code === 404 ? t('profile.notFound') : t('question.genericError'));
        setLoading(false);
      });
  }, [username, t]);

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
              <span className="tier-pill" style={{ '--tier-color': tier.color }}>{tier.label}</span>
            </div>
            <div className="profile-username">@{profile.username}</div>
            <div className="profile-role-row">
              <span className="profile-role">{profile.role}</span>
              <span className="profile-joined">· {t('profile.since', { date: joinDate(profile.created_at, language) })}</span>
            </div>
          </div>
          <div className="profile-stats">
            <div className="profile-stat"><strong>{profile.score}</strong><span>{t('profile.points')}</span></div>
            <div className="profile-stat"><strong>{profile.topics_count}</strong><span>{t('profile.questions')}</span></div>
            <div className="profile-stat"><strong>{profile.answers_count}</strong><span>{t('profile.answers')}</span></div>
            <div className="profile-stat"><strong>{profile.accepted_count}</strong><span>{t('profile.accepted')}</span></div>
          </div>
        </div>

        {/* ── Tabs ── */}
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

        {/* ── Content ── */}
        {tab === 'savollar' && (
          <div className="profile-topics">
            {profile.recentTopics.length === 0 ? (
              <div className="profile-empty">{t('profile.noQuestions')}</div>
            ) : profile.recentTopics.map(topic => (
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
                        ✓ {t('profile.acceptedBadge')}
                      </span>
                    )}
                    <span>{t('profile.pointCount', { count: a.score })}</span>
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
