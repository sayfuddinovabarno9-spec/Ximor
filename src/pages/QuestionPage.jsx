import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useForumStream } from '../hooks/useForumStream';
import AnswerEditorTools from '../components/AnswerEditorTools';
import AuthModal from '../components/AuthModal';
import AttachmentGallery from '../components/AttachmentGallery';
import Layout from '../components/Layout';
import RichText from '../components/RichText';
import { avatarBg } from '../utils/avatarColor';
import copyToClipboard from '../utils/copyToClipboard';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3002';

function getAnswerCount(topic) {
  if (Array.isArray(topic?.answersList)) return topic.answersList.length;
  return Number(topic?.answers) || 0;
}

function getQuestionUrl(questionId) {
  return `${window.location.origin}/q/${questionId}`;
}

function getAnswerUrl(questionId, answerId) {
  return `${getQuestionUrl(questionId)}#answer-${answerId}`;
}

function Icon({ name, size=18 }) {
  const paths = {
    arrowLeft: "M19 12H5M12 5l-7 7 7 7",
    arrowUp:   "M12 19V5M5 12l7-7 7 7",
    arrowDown: "M12 5v14M19 12l-7 7-7-7",
    check:     "M20 6 9 17l-5-5",
    send:      "M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z",
    message:   "M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z",
    bookmark:  "M6 4h12v17l-6-4-6 4V4Z",
    link:      "M9 17H7A5 5 0 0 1 7 7h3M15 7h2a5 5 0 1 1 0 10h-3M8 12h8",
    pin:       "M12 17v5M5 17h14M6 3h12l-2 8 3 3H5l3-3-2-8Z",
    eye:       "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
    thumbsUp:  "M7 10v11M15 5.9 14 10h5.7a2 2 0 0 1 2 2.4l-1.4 7a2 2 0 0 1-2 1.6H7M7 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3M15 5.9V3a2 2 0 0 0-2-2l-3 9",
    thumbsDown:"M17 14V3M9 18.1 10 14H4.3a2 2 0 0 1-2-2.4l1.4-7A2 2 0 0 1 5.7 3H17M17 14h3a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-3M9 18.1V21a2 2 0 0 0 2 2l3-9",
    trash:     "M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 11v6M14 11v6",
    x:         "M18 6 6 18M6 6l12 12",
  };
  return (
    <svg aria-hidden fill="none" height={size} stroke="currentColor"
         strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
         viewBox="0 0 24 24" width={size}>
      <path d={paths[name]} />
    </svg>
  );
}

function Avatar({ initials, name, online=false }) {
  return (
    <span className="avatar" title={name}
      style={{ background: avatarBg(initials), color: '#fff', border: 'none' }}>
      {initials}
      {online && <span className="avatar__status" />}
    </span>
  );
}

/* ── QuestionPage ──────────────────────────────────────────────────────────── */
export default function QuestionPage() {
  const { id }              = useParams();
  const location            = useLocation();
  const navigate            = useNavigate();
  const { user, authHeaders } = useAuth();
  const { t } = useLanguage();

  // Theme must be first — before any early returns
  const [theme, setTheme]   = useState(() => localStorage.getItem('ximor_theme') || 'light');
  const toggleTheme = () => setTheme(t => {
    const next = t === 'light' ? 'dark' : 'light';
    localStorage.setItem('ximor_theme', next);
    return next;
  });

  const [topic, setTopic]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [answer, setAnswer]     = useState('');
  const [busy, setBusy]         = useState(false);
  const [votePending, setVotePending] = useState(false);
  const [voted, setVoted]       = useState(0);          // current user's vote on the topic
  const [answerVotes, setAnswerVotes] = useState({});   // { [answerId]: 1 | -1 | 0 }
  const [showAuth, setShowAuth] = useState(false);
  const [toast, setToast]       = useState('');
  const [copiedPermalink, setCopiedPermalink] = useState('');
  const [highlightAnswerId, setHighlightAnswerId] = useState('');
  const toastRef                = useRef(null);
  const answerRef               = useRef(null);
  const copiedTimerRef          = useRef(null);
  const highlightTimerRef       = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(''), 2200);
  };

  const handleCopyLink = async () => {
    try {
      await copyToClipboard(getQuestionUrl(id));
      setCopiedPermalink('question');
      clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopiedPermalink(''), 1800);
      showToast(t('question.questionLinkCopied'));
    } catch {
      showToast(t('question.copyFailed'));
    }
  };

  const handleCopyAnswerLink = async (answerId) => {
    try {
      await copyToClipboard(getAnswerUrl(id, answerId));
      setCopiedPermalink(`answer-${answerId}`);
      clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopiedPermalink(''), 1800);
      showToast(t('question.answerLinkCopied'));
    } catch {
      showToast(t('question.copyFailed'));
    }
  };

  /* Fetch topic on mount */
  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/forum/topics/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject('Topilmadi'))
      .then(data => { setTopic({ ...data, answers: getAnswerCount(data) }); setLoading(false); })
      .catch(e  => { setError(String(e)); setLoading(false); });
  }, [id]);

  useEffect(() => {
    if (!topic?.answersList?.length || !location.hash.startsWith('#answer-')) return;

    const answerId = decodeURIComponent(location.hash.replace('#answer-', ''));
    const target = document.getElementById(`answer-${answerId}`);
    if (!target) return;

    window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightAnswerId(answerId);
      clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = setTimeout(() => setHighlightAnswerId(''), 2600);
    });
  }, [location.hash, topic?.answersList?.length]);

  /* Hydrate per-user vote state after login or topic change */
  useEffect(() => {
    if (!user) {
      setVoted(0);
      setAnswerVotes({});
      return;
    }
    const headers = authHeaders();
    Promise.all([
      fetch(`${API}/api/forum/my-votes`, { headers }).then(r => r.ok ? r.json() : {}).catch(() => ({})),
      fetch(`${API}/api/forum/my-answer-votes`, { headers }).then(r => r.ok ? r.json() : {}).catch(() => ({})),
    ]).then(([topicVotes, ansVotes]) => {
      setVoted(topicVotes[Number(id)] ?? 0);
      setAnswerVotes(ansVotes);
    });
  }, [user?.id, id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* SSE — live updates for this specific topic */
  const onAnswer = useCallback(({ topicId, answer: a, answers }) => {
    if (String(topicId) !== String(id)) return;
    setTopic(prev => {
      if (!prev) return prev;
      const already = prev.answersList.some(x => x.id === a.id);
      const answersList = already ? prev.answersList : [...prev.answersList, a];
      return { ...prev, answers: answersList.length, answersList };
    });
  }, [id]);

  const onVote = useCallback(({ topicId, score }) => {
    if (String(topicId) !== String(id)) return;
    setTopic(prev => prev ? { ...prev, score } : prev);
  }, [id]);

  const onAccept = useCallback(({ topicId, answerId, solved = true, moderation_correctness }) => {
    if (String(topicId) !== String(id)) return;
    setTopic(prev => prev ? {
      ...prev, solved,
      answersList: prev.answersList.map(a => (
        a.id === answerId
          ? { ...a, accepted: true, moderation_correctness: moderation_correctness ?? a.moderation_correctness }
          : { ...a, accepted: false }
      )),
    } : prev);
  }, [id]);

  const onTopicModeration = useCallback(({ topicId, solved }) => {
    if (String(topicId) !== String(id)) return;
    setTopic(prev => prev ? {
      ...prev,
      solved,
      answersList: solved ? prev.answersList : prev.answersList.map(a => ({ ...a, accepted: false })),
    } : prev);
  }, [id]);

  // Live answer-score updates from other clients
  const onAnswerVoteSSE = useCallback(({ answerId, score }) => {
    setTopic(prev => prev ? {
      ...prev,
      answersList: prev.answersList.map(a => a.id === answerId ? { ...a, score } : a),
    } : prev);
  }, []);

  const onAnswerModeration = useCallback(({ topicId, answerId, accepted, topic_solved, moderation_helpfulness, moderation_correctness }) => {
    setTopic(prev => {
      if (!prev) return prev;
      if (topicId != null && String(topicId) !== String(id)) return prev;
      return {
        ...prev,
        solved: topic_solved ?? prev.solved,
        answersList: prev.answersList.map(a => (
          a.id === answerId
            ? {
                ...a,
                accepted: accepted ?? a.accepted,
                moderation_helpfulness,
                moderation_correctness,
              }
            : a
        )),
      };
    });
  }, [id]);

  const onAnswerDeleted = useCallback(({ topicId, answerId, answers, solved }) => {
    if (String(topicId) !== String(id)) return;
    setTopic(prev => {
      if (!prev) return prev;
      const answersList = prev.answersList.filter(a => a.id !== answerId);
      return {
        ...prev,
        answers: answersList.length,
        solved,
        answersList,
      };
    });
  }, [id]);

  useForumStream(
    () => {},
    null,
    onAnswer,
    onVote,
    onAccept,
    onAnswerVoteSSE,
    onTopicModeration,
    onAnswerModeration,
    onAnswerDeleted
  );

  /* Vote on the topic */
  const handleVote = async (direction) => {
    if (!user) { setShowAuth(true); return; }
    if (votePending) return;

    // Snapshot for revert
    const prevVoted = voted;
    const prevScore = topic?.score ?? 0;
    // Optimistic
    const toggling = voted === direction;
    setVoted(toggling ? 0 : direction);
    setTopic(prev => prev ? {
      ...prev,
      score: prev.score + (toggling ? -direction : direction - voted),
    } : prev);
    setVotePending(true);

    try {
      const response = await fetch(`${API}/api/forum/topics/${id}/vote`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ direction }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'vote failed');

      const serverScore = Number(result.score);
      const serverVoted = Number(result.voted);
      if (!Number.isFinite(serverScore) || ![-1, 0, 1].includes(serverVoted)) {
        throw new Error('invalid vote response');
      }

      setVoted(serverVoted);
      setTopic(prev => prev ? { ...prev, score: serverScore } : prev);
      showToast(serverVoted === 0 ? t('forum.voteRemoved') : t('forum.voteSaved'));
    } catch {
      setVoted(prevVoted);
      setTopic(prev => prev ? { ...prev, score: prevScore } : prev);
      showToast(t('forum.voteFailed'));
    } finally {
      setVotePending(false);
    }
  };

  /* Vote on an answer */
  const handleAnswerVote = (answerId, direction) => {
    if (!user) { setShowAuth(true); return; }
    const prevVoted = answerVotes[answerId] ?? 0;
    const prevScore = topic?.answersList.find(a => a.id === answerId)?.score ?? 0;
    // Optimistic
    const toggling = prevVoted === direction;
    const newVoted = toggling ? 0 : direction;
    const scoreDelta = toggling ? -direction : direction - prevVoted;
    setAnswerVotes(prev => ({ ...prev, [answerId]: newVoted }));
    setTopic(prev => prev ? {
      ...prev,
      answersList: prev.answersList.map(a =>
        a.id === answerId ? { ...a, score: a.score + scoreDelta } : a
      ),
    } : prev);
    // Persist
    fetch(`${API}/api/forum/answers/${answerId}/vote`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ delta: direction }),
    }).then(r => r.ok ? r.json() : Promise.reject())
      .then(({ score, voted: serverVoted }) => {
        setAnswerVotes(prev => ({ ...prev, [answerId]: serverVoted ?? newVoted }));
        setTopic(prev => prev ? {
          ...prev,
          answersList: prev.answersList.map(a => a.id === answerId ? { ...a, score } : a),
        } : prev);
      })
      .catch(() => {
        setAnswerVotes(prev => ({ ...prev, [answerId]: prevVoted }));
        setTopic(prev => prev ? {
          ...prev,
          answersList: prev.answersList.map(a =>
            a.id === answerId ? { ...a, score: prevScore } : a
          ),
        } : prev);
      });
  };

  /* Submit answer */
  const submitAnswer = async (e) => {
    e.preventDefault();
    if (!user) { setShowAuth(true); return; }
    if (!answer.trim() || busy) return;

    const newAnswer = {
      id:       Date.now(),
      author:   user.name,
      initials: user.initials,
      role:     user.role,
      accepted: false,
      score:    0,
      text:     answer.trim(),
    };

    setBusy(true);
    // Optimistic
    setTopic(prev => prev ? {
      ...prev,
      answers: prev.answersList.length + 1,
      answersList: [...prev.answersList, newAnswer],
    } : prev);
    setAnswer('');
    showToast(t('forum.answerSent'));

    try {
      await fetch(`${API}/api/forum/topics/${id}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(newAnswer),
      });
    } catch { /* optimistic update already applied */ }
    finally { setBusy(false); }
  };

  /* Accept answer */
  const handleAccept = (answerId) => {
    const snapshot = topic;
    fetch(`${API}/api/forum/topics/${id}/accept/${answerId}`, {
      method: 'POST',
      headers: authHeaders(),
    }).then(r => r.ok ? r.json() : Promise.reject())
      .catch(() => {
        setTopic(snapshot);
        showToast(t('question.genericError'));
      });
    setTopic(prev => prev ? {
      ...prev,
      solved: true,
      answersList: prev.answersList.map(a => (
        a.id === answerId
          ? { ...a, accepted: true, moderation_correctness: 'correct' }
          : { ...a, accepted: false }
      )),
    } : prev);
    showToast(t('question.answerAccepted'));
  };

  const handleSolvedToggle = () => {
    if (!user?.is_admin && !user?.is_moderator) return;
    const snapshot = topic;
    const solved = !topic.solved;
    setTopic(prev => prev ? {
      ...prev,
      solved,
      answersList: solved ? prev.answersList : prev.answersList.map(a => ({ ...a, accepted: false })),
    } : prev);
    fetch(`${API}/api/admin/topics/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ solved }),
    }).then(r => r.ok ? r.json() : Promise.reject())
      .then(() => showToast(solved ? t('question.questionSolved') : t('question.questionOpened')))
      .catch(() => {
        setTopic(snapshot);
        showToast(t('question.genericError'));
      });
  };

  const handleAnswerModeration = (answerId, field, value) => {
    if (!user?.is_admin && !user?.is_moderator) return;
    if (field === 'correctness' && value === 'correct') {
      handleAccept(answerId);
      return;
    }

    const snapshot = topic;
    const key = field === 'helpfulness' ? 'moderation_helpfulness' : 'moderation_correctness';
    const current = topic.answersList.find(a => a.id === answerId)?.[key] ?? null;
    const next = current === value ? null : value;

    setTopic(prev => {
      if (!prev) return prev;
      const answersList = prev.answersList.map(a => {
        if (a.id !== answerId) return a;
        return {
          ...a,
          [key]: next,
          accepted: field === 'correctness' && next === 'incorrect' ? false : a.accepted,
        };
      });
      const solved = field === 'correctness' && next === 'incorrect'
        ? answersList.some(a => a.accepted)
        : prev.solved;
      return { ...prev, solved, answersList };
    });

    fetch(`${API}/api/admin/answers/${answerId}/moderation`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ [field]: next }),
    }).then(r => r.ok ? r.json() : Promise.reject())
      .then(({ answer: updated }) => {
        setTopic(prev => prev ? {
          ...prev,
          solved: updated.topic_solved ?? prev.solved,
          answersList: prev.answersList.map(a => a.id === answerId ? { ...a, ...updated } : a),
        } : prev);
        showToast(t('question.answerMarked'));
      })
      .catch(() => {
        setTopic(snapshot);
        showToast(t('question.genericError'));
      });
  };

  const handleDeleteAnswer = (answerId) => {
    if (!user?.is_admin && !user?.is_moderator) return;
    if (!confirm(t('question.confirmDelete'))) return;

    const snapshot = topic;
    setTopic(prev => {
      if (!prev) return prev;
      const answersList = prev.answersList.filter(a => a.id !== answerId);
      return {
        ...prev,
        answers: answersList.length,
        solved: answersList.some(a => a.accepted),
        answersList,
      };
    });

    fetch(`${API}/api/admin/answers/${answerId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }).then(r => r.ok ? r.json() : Promise.reject())
      .then(({ answers, solved }) => {
        setTopic(prev => prev ? { ...prev, answers, solved } : prev);
        showToast(t('question.answerDeleted'));
      })
      .catch(() => {
        setTopic(snapshot);
        showToast(t('question.genericError'));
      });
  };

  /* ── Render ── */
  if (loading) return (
    <Layout theme={theme} onThemeToggle={toggleTheme}>
      <div className="qp-shell">
        <div className="qp-loading">{t('common.loading')}</div>
      </div>
    </Layout>
  );

  if (error || !topic) return (
    <Layout theme={theme} onThemeToggle={toggleTheme}>
      <div className="qp-shell">
        <button className="soft-button qp-back" onClick={() => navigate(-1)}>
          <Icon name="arrowLeft" size={16} /> {t('common.back')}
        </button>
        <div className="qp-loading" style={{ color: 'var(--rose)' }}>{t('question.notFound')}</div>
      </div>
    </Layout>
  );

  const isAuthor = user && (topic.user_id === user.id || topic.author === user.name);
  const canModerate = Boolean(user?.is_admin || user?.is_moderator);
  const answerCount = getAnswerCount(topic);

  return (
    <Layout theme={theme} onThemeToggle={toggleTheme}>
    <div className="qp-shell">
      {toast && <div className="toast">{toast}</div>}

      {/* Back */}
      <button className="soft-button qp-back" onClick={() => navigate(-1)}>
        <Icon name="arrowLeft" size={15} /> {t('question.forum')}
      </button>

      <div className="qp-layout">
        {/* ── Main column ── */}
        <main className="qp-main">

          {/* Question card */}
          <article className="qp-question">
            <div className="qp-vote-col">
              <button
                aria-busy={votePending}
                className={`qp-vote-btn ${voted===1?'is-active':''}`}
                disabled={votePending}
                onClick={() => handleVote(1)}
                title={t('forum.voteUp')}
              >
                <Icon name="arrowUp" size={18} />
              </button>
              <strong className="qp-score">{topic.score}</strong>
              <button
                aria-busy={votePending}
                className={`qp-vote-btn ${voted===-1?'is-danger':''}`}
                disabled={votePending}
                onClick={() => handleVote(-1)}
                title={t('forum.voteDown')}
              >
                <Icon name="arrowDown" size={18} />
              </button>
              {topic.solved && (
                <span className="qp-solved-badge" title={t('common.solved')}>
                  <Icon name="check" size={14} />
                </span>
              )}
            </div>

            <div className="qp-question-body">
              {/* Meta row */}
              <div className="topic-meta" style={{ marginBottom: 10 }}>
                {topic.pinned && (
                  <span
                    aria-label={t('forum.pinned')}
                    className="pinned-indicator"
                    data-tooltip={t('forum.pinned')}
                    role="img"
                  >
                    <Icon name="pin" size={14} />
                  </span>
                )}
                {topic.hot    && <span className="pill pill--hot">{t('forum.hot')} 🔥</span>}
                {topic.solved && <span className="pill pill--ok">{t('common.solved')} ✓</span>}
                <span>{topic.activity}</span>
              </div>

              <h1 className="qp-title">{topic.title}</h1>
              <div className="question-content">
                <RichText text={topic.summary} className="qp-summary" />
                <AttachmentGallery images={topic.images} size="large" />
              </div>

              {/* Tags */}
              {topic.tags?.length > 0 && (
                <div className="tag-row" style={{ marginTop: 14 }}>
                  {topic.tags.map(tag => (
                    <span className="tag-chip" key={tag}>#{tag}</span>
                  ))}
                </div>
              )}

              {canModerate && (
                <div className="qp-modbar">
                  <button
                    className={`soft-button ${topic.solved ? 'soft-button--success' : ''}`}
                    onClick={handleSolvedToggle}
                    type="button"
                  >
                    <Icon name={topic.solved ? 'x' : 'check'} size={15} />
                    {topic.solved ? t('question.markOpen') : t('question.markSolved')}
                  </button>
                </div>
              )}

              {/* Author footer */}
              <div className="qp-author-row">
                <div className="qp-meta-stats">
                  <span><Icon name="message" size={14} /> {answerCount} {t('forum.answers').toLowerCase()}</span>
                  <span><Icon name="eye" size={14} /> {topic.views} {t('forum.views').toLowerCase()}</span>
                  <button
                    aria-label={t('forum.copyLink')}
                    className={`permalink-button ${copiedPermalink === 'question' ? 'is-copied' : ''}`}
                    data-tooltip={copiedPermalink === 'question' ? t('forum.linkCopied') : t('forum.copyLink')}
                    onClick={handleCopyLink}
                    type="button"
                  >
                    <Icon name="link" size={17} />
                  </button>
                </div>
                <div className="qp-author-card">
                  <span className="qp-author-label">{t('question.asked')}</span>
                  <Avatar initials={topic.initials} name={topic.author} />
                  <div>
                    <strong>{topic.author}</strong>
                    <span>{topic.role}</span>
                  </div>
                </div>
              </div>
            </div>
          </article>

          {/* ── Answers ── */}
          <div className="qp-answers-head">
            <h2>{t('forum.answerCount', { count: answerCount })}</h2>
            {topic.solved && <span className="pill pill--ok">{t('common.solved')}</span>}
          </div>

          {topic.answersList.length === 0 ? (
            <div className="empty-state" style={{ minHeight: 140 }}>
              <Icon name="message" size={22} />
              <strong>{t('forum.noAnswers')}</strong>
              <span>{t('question.firstAnswer')}</span>
            </div>
          ) : (
            <div className="qp-answers-list">
              {[...topic.answersList]
                .sort((a, b) => (b.accepted - a.accepted) || (b.score - a.score))
                .map(ans => (
                  <article
                    id={`answer-${ans.id}`}
                    key={ans.id}
                    className={`qp-answer ${ans.accepted ? 'is-accepted' : ''} ${ans.moderation_correctness === 'incorrect' ? 'is-incorrect' : ''} ${highlightAnswerId === String(ans.id) ? 'is-linked' : ''}`}
                  >
                    <div className="qp-vote-col qp-vote-col--answer">
                      <button
                        className={`qp-vote-btn ${(answerVotes[ans.id] ?? 0) === 1 ? 'is-active' : ''}`}
                        onClick={() => handleAnswerVote(ans.id, 1)}
                        title={t('question.helpful')}
                      >
                        <Icon name="arrowUp" size={15} />
                      </button>
                      <span className="qp-answer-score">{ans.score}</span>
                      <button
                        className={`qp-vote-btn ${(answerVotes[ans.id] ?? 0) === -1 ? 'is-danger' : ''}`}
                        onClick={() => handleAnswerVote(ans.id, -1)}
                        title={t('question.unhelpful')}
                      >
                        <Icon name="arrowDown" size={15} />
                      </button>
                      {ans.accepted && (
                        <span className="qp-accepted-tick" title={t('question.accepted')}>
                          <Icon name="check" size={15} />
                        </span>
                      )}
                      {(isAuthor || canModerate) && !ans.accepted && (
                        <button
                          className="qp-accept-btn"
                          onClick={() => handleAccept(ans.id)}
                          title={t('question.acceptAnswer')}
                        >
                          <Icon name="check" size={14} />
                        </button>
                      )}
                    </div>

                    <div className="qp-answer-body">
                      <div className="qp-answer-meta">
                        <Avatar initials={ans.initials} name={ans.author} />
                        <strong>{ans.author}</strong>
                        <span>{ans.role}</span>
                        {ans.accepted && <span className="pill pill--ok">{t('question.accepted')}</span>}
                        {ans.moderation_correctness && !ans.accepted && (
                          <span className={`pill ${ans.moderation_correctness === 'correct' ? 'pill--ok' : 'pill--bad'}`}>
                            {t(`question.${ans.moderation_correctness}`)}
                          </span>
                        )}
                        {ans.moderation_helpfulness && (
                          <span className={`pill ${ans.moderation_helpfulness === 'helpful' ? 'pill--info' : 'pill--bad'}`}>
                            {t(`question.${ans.moderation_helpfulness}`)}
                          </span>
                        )}
                        <button
                          aria-label={t('question.copyAnswerLink')}
                          className={`permalink-button qp-answer-permalink ${copiedPermalink === `answer-${ans.id}` ? 'is-copied' : ''}`}
                          data-tooltip={copiedPermalink === `answer-${ans.id}` ? t('forum.linkCopied') : t('question.copyAnswerLink')}
                          onClick={() => handleCopyAnswerLink(ans.id)}
                          type="button"
                        >
                          <Icon name="link" size={15} />
                        </button>
                      </div>
                      <RichText className="qp-answer-text" text={ans.text} />
                      {canModerate && (
                        <div className="qp-mod-controls">
                          <button
                            aria-label={t('question.helpful')}
                            className={`qp-mod-chip ${ans.moderation_helpfulness === 'helpful' ? 'is-active' : ''}`}
                            data-tooltip={t('question.helpful')}
                            onClick={() => handleAnswerModeration(ans.id, 'helpfulness', 'helpful')}
                            type="button"
                          >
                            <Icon name="thumbsUp" size={14} />
                          </button>
                          <button
                            aria-label={t('question.unhelpful')}
                            className={`qp-mod-chip ${ans.moderation_helpfulness === 'unhelpful' ? 'is-danger' : ''}`}
                            data-tooltip={t('question.unhelpful')}
                            onClick={() => handleAnswerModeration(ans.id, 'helpfulness', 'unhelpful')}
                            type="button"
                          >
                            <Icon name="thumbsDown" size={14} />
                          </button>
                          <button
                            aria-label={t('question.correct')}
                            className={`qp-mod-chip ${ans.accepted || ans.moderation_correctness === 'correct' ? 'is-active' : ''}`}
                            data-tooltip={t('question.correct')}
                            onClick={() => handleAnswerModeration(ans.id, 'correctness', 'correct')}
                            type="button"
                          >
                            <Icon name="check" size={14} />
                          </button>
                          <button
                            aria-label={t('question.incorrect')}
                            className={`qp-mod-chip ${ans.moderation_correctness === 'incorrect' ? 'is-danger' : ''}`}
                            data-tooltip={t('question.incorrect')}
                            onClick={() => handleAnswerModeration(ans.id, 'correctness', 'incorrect')}
                            type="button"
                          >
                            <Icon name="x" size={14} />
                          </button>
                          <button
                            aria-label={t('question.delete')}
                            className="qp-mod-chip is-danger"
                            data-tooltip={t('question.delete')}
                            onClick={() => handleDeleteAnswer(ans.id)}
                            type="button"
                          >
                            <Icon name="trash" size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
            </div>
          )}

          {/* ── Answer box ── */}
          <div className="qp-answer-box">
            <h3>{t('forum.writeAnswer')}</h3>
            {user ? (
              <form onSubmit={submitAnswer}>
                <div className="qp-answerer">
                  <Avatar initials={user.initials} name={user.name} online />
                  <strong>{user.name}</strong>
                </div>
                <AnswerEditorTools onChange={setAnswer} textareaRef={answerRef} value={answer} />
                <textarea
                  ref={answerRef}
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  placeholder={t('forum.answerPlaceholder')}
                  rows={5}
                />
                {answer.trim() && (
                  <div className="latex-live-preview answer-live-preview">
                    <div className="latex-live-preview-label">{t('composer.previewLabel')}</div>
                    <RichText className="qp-answer-text" text={answer} />
                  </div>
                )}
                <button
                  className="primary-button"
                  disabled={!answer.trim() || busy}
                  type="submit"
                >
                  <Icon name="send" size={16} />
                  {busy ? t('forum.sending') : t('forum.sendAnswer')}
                </button>
              </form>
            ) : (
              <div className="qp-auth-prompt">
                <p>{t('question.signInToAnswer')}</p>
                <button className="primary-button" onClick={() => setShowAuth(true)}>
                  {t('question.loginOrRegister')}
                </button>
              </div>
            )}
          </div>
        </main>

        {/* ── Sidebar ── */}
        <aside className="qp-sidebar">
          <div className="panel-card">
            <div className="section-heading">
              <h3>{t('question.about')}</h3>
            </div>
            <div className="qp-sidebar-stats">
              <div><span>{t('question.asked')}</span><strong>{topic.author}</strong></div>
              <div><span>{t('question.activity')}</span><strong>{topic.activity}</strong></div>
              <div><span>{t('forum.views')}</span><strong>{topic.views}</strong></div>
              <div><span>{t('forum.answers')}</span><strong>{answerCount}</strong></div>
              <div><span>{t('question.status')}</span><strong>{topic.solved ? `✓ ${t('common.solved')}` : t('common.open')}</strong></div>
            </div>
          </div>

          {topic.tags?.length > 0 && (
            <div className="panel-card">
              <div className="section-heading"><h3>{t('question.tags')}</h3></div>
              <div className="tag-row">
                {topic.tags.map(tag => (
                  <span className="tag-chip" key={tag}>#{tag}</span>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
    </Layout>
  );
}
