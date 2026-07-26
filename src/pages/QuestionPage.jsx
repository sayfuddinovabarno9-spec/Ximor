import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useForumStream } from '../hooks/useForumStream';
import AuthModal from '../components/AuthModal';
import AttachmentGallery from '../components/AttachmentGallery';
import Layout from '../components/Layout';
import RichText from '../components/RichText';
import { avatarBg } from '../utils/avatarColor';
import copyToClipboard from '../utils/copyToClipboard';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3002';

const HELPFULNESS_LABELS = {
  helpful: 'Foydali',
  unhelpful: 'Foydasiz',
};

const CORRECTNESS_LABELS = {
  correct: "To'g'ri",
  incorrect: "Noto'g'ri",
};

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
  const navigate            = useNavigate();
  const { user, authHeaders } = useAuth();

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
  const [voted, setVoted]       = useState(0);          // current user's vote on the topic
  const [answerVotes, setAnswerVotes] = useState({});   // { [answerId]: 1 | -1 | 0 }
  const [showAuth, setShowAuth] = useState(false);
  const [toast, setToast]       = useState('');
  const toastRef                = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(''), 2200);
  };

  const handleCopyLink = async () => {
    try {
      await copyToClipboard(window.location.href);
      showToast('Havola nusxalandi');
    } catch {
      showToast('Havolani nusxalab bo‘lmadi');
    }
  };

  /* Fetch topic on mount */
  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/forum/topics/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject('Topilmadi'))
      .then(data => { setTopic(data); setLoading(false); })
      .catch(e  => { setError(String(e)); setLoading(false); });
  }, [id]);

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
      return { ...prev, answers, answersList: already ? prev.answersList : [...prev.answersList, a] };
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

  useForumStream(
    () => {},
    null,
    onAnswer,
    onVote,
    onAccept,
    onAnswerVoteSSE,
    onTopicModeration,
    onAnswerModeration
  );

  /* Vote on the topic */
  const handleVote = (direction) => {
    if (!user) { setShowAuth(true); return; }
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
    // Persist — server uses topic_votes table to deduplicate
    fetch(`${API}/api/forum/topics/${id}/vote`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ direction }),
    }).then(r => r.ok ? r.json() : Promise.reject())
      .then(({ score, voted: serverVoted }) => {
        setVoted(serverVoted);
        setTopic(prev => prev ? { ...prev, score } : prev);
      })
      .catch(() => {
        setVoted(prevVoted);
        setTopic(prev => prev ? { ...prev, score: prevScore } : prev);
      });
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
      answers: prev.answers + 1,
      answersList: [...prev.answersList, newAnswer],
    } : prev);
    setAnswer('');
    showToast('Javob yuborildi');

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
        showToast('Xato yuz berdi');
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
    showToast('Javob qabul qilindi ✓');
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
      .then(() => showToast(solved ? 'Savol yechildi' : 'Savol ochiq qilindi'))
      .catch(() => {
        setTopic(snapshot);
        showToast('Xato yuz berdi');
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
        showToast('Javob belgilandi');
      })
      .catch(() => {
        setTopic(snapshot);
        showToast('Xato yuz berdi');
      });
  };

  /* ── Render ── */
  if (loading) return (
    <Layout theme={theme} onThemeToggle={toggleTheme}>
      <div className="qp-shell">
        <div className="qp-loading">Yuklanmoqda…</div>
      </div>
    </Layout>
  );

  if (error || !topic) return (
    <Layout theme={theme} onThemeToggle={toggleTheme}>
      <div className="qp-shell">
        <button className="soft-button qp-back" onClick={() => navigate(-1)}>
          <Icon name="arrowLeft" size={16} /> Orqaga
        </button>
        <div className="qp-loading" style={{ color: 'var(--rose)' }}>Savol topilmadi</div>
      </div>
    </Layout>
  );

  const isAuthor = user && (topic.user_id === user.id || topic.author === user.name);
  const canModerate = Boolean(user?.is_admin || user?.is_moderator);

  return (
    <Layout theme={theme} onThemeToggle={toggleTheme}>
    <div className="qp-shell">
      {toast && <div className="toast">{toast}</div>}

      {/* Back */}
      <button className="soft-button qp-back" onClick={() => navigate(-1)}>
        <Icon name="arrowLeft" size={15} /> Forum
      </button>

      <div className="qp-layout">
        {/* ── Main column ── */}
        <main className="qp-main">

          {/* Question card */}
          <article className="qp-question">
            <div className="qp-vote-col">
              <button
                className={`qp-vote-btn ${voted===1?'is-active':''}`}
                onClick={() => handleVote(1)}
                title="Yuqoriga ovoz"
              >
                <Icon name="arrowUp" size={18} />
              </button>
              <strong className="qp-score">{topic.score}</strong>
              <button
                className={`qp-vote-btn ${voted===-1?'is-danger':''}`}
                onClick={() => handleVote(-1)}
                title="Pastga ovoz"
              >
                <Icon name="arrowDown" size={18} />
              </button>
              {topic.solved && (
                <span className="qp-solved-badge" title="Yechilgan">
                  <Icon name="check" size={14} />
                </span>
              )}
            </div>

            <div className="qp-question-body">
              {/* Meta row */}
              <div className="topic-meta" style={{ marginBottom: 10 }}>
                {topic.pinned && (
                  <span
                    aria-label="Mahkamlangan mavzu"
                    className="pinned-indicator"
                    data-tooltip="Mahkamlangan mavzu"
                    role="img"
                  >
                    <Icon name="pin" size={14} />
                  </span>
                )}
                {topic.hot    && <span className="pill pill--hot">Qaynoq 🔥</span>}
                {topic.solved && <span className="pill pill--ok">Yechilgan ✓</span>}
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
                    {topic.solved ? 'Ochiq qilish' : 'Yechildi'}
                  </button>
                </div>
              )}

              {/* Author footer */}
              <div className="qp-author-row">
                <div className="qp-meta-stats">
                  <span><Icon name="message" size={14} /> {topic.answers} javob</span>
                  <span><Icon name="eye" size={14} /> {topic.views} ko'rish</span>
                  <button
                    aria-label="Savol havolasini nusxalash"
                    className="permalink-button"
                    data-tooltip="Savol havolasini nusxalash"
                    onClick={handleCopyLink}
                    type="button"
                  >
                    <Icon name="link" size={17} />
                  </button>
                </div>
                <div className="qp-author-card">
                  <span className="qp-author-label">So'radi</span>
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
            <h2>{topic.answersList.length} ta javob</h2>
            {topic.solved && <span className="pill pill--ok">Yechilgan</span>}
          </div>

          {topic.answersList.length === 0 ? (
            <div className="empty-state" style={{ minHeight: 140 }}>
              <Icon name="message" size={22} />
              <strong>Hali javob yo'q</strong>
              <span>Birinchi javob yozing!</span>
            </div>
          ) : (
            <div className="qp-answers-list">
              {[...topic.answersList]
                .sort((a, b) => (b.accepted - a.accepted) || (b.score - a.score))
                .map(ans => (
                  <article
                    key={ans.id}
                    className={`qp-answer ${ans.accepted ? 'is-accepted' : ''} ${ans.moderation_correctness === 'incorrect' ? 'is-incorrect' : ''}`}
                  >
                    <div className="qp-vote-col qp-vote-col--answer">
                      <button
                        className={`qp-vote-btn ${(answerVotes[ans.id] ?? 0) === 1 ? 'is-active' : ''}`}
                        onClick={() => handleAnswerVote(ans.id, 1)}
                        title="Foydali"
                      >
                        <Icon name="arrowUp" size={15} />
                      </button>
                      <span className="qp-answer-score">{ans.score}</span>
                      <button
                        className={`qp-vote-btn ${(answerVotes[ans.id] ?? 0) === -1 ? 'is-danger' : ''}`}
                        onClick={() => handleAnswerVote(ans.id, -1)}
                        title="Foydali emas"
                      >
                        <Icon name="arrowDown" size={15} />
                      </button>
                      {ans.accepted && (
                        <span className="qp-accepted-tick" title="Qabul qilingan javob">
                          <Icon name="check" size={15} />
                        </span>
                      )}
                      {(isAuthor || canModerate) && !ans.accepted && (
                        <button
                          className="qp-accept-btn"
                          onClick={() => handleAccept(ans.id)}
                          title="Bu javobni qabul qilish"
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
                        {ans.accepted && <span className="pill pill--ok">Qabul qilindi</span>}
                        {ans.moderation_correctness && !ans.accepted && (
                          <span className={`pill ${ans.moderation_correctness === 'correct' ? 'pill--ok' : 'pill--bad'}`}>
                            {CORRECTNESS_LABELS[ans.moderation_correctness]}
                          </span>
                        )}
                        {ans.moderation_helpfulness && (
                          <span className={`pill ${ans.moderation_helpfulness === 'helpful' ? 'pill--info' : 'pill--bad'}`}>
                            {HELPFULNESS_LABELS[ans.moderation_helpfulness]}
                          </span>
                        )}
                      </div>
                      <RichText className="qp-answer-text" text={ans.text} />
                      {canModerate && (
                        <div className="qp-mod-controls">
                          <button
                            aria-label="Foydali deb belgilash"
                            className={`qp-mod-chip ${ans.moderation_helpfulness === 'helpful' ? 'is-active' : ''}`}
                            data-tooltip="Foydali"
                            onClick={() => handleAnswerModeration(ans.id, 'helpfulness', 'helpful')}
                            type="button"
                          >
                            <Icon name="thumbsUp" size={14} />
                          </button>
                          <button
                            aria-label="Foydasiz deb belgilash"
                            className={`qp-mod-chip ${ans.moderation_helpfulness === 'unhelpful' ? 'is-danger' : ''}`}
                            data-tooltip="Foydasiz"
                            onClick={() => handleAnswerModeration(ans.id, 'helpfulness', 'unhelpful')}
                            type="button"
                          >
                            <Icon name="thumbsDown" size={14} />
                          </button>
                          <button
                            aria-label="To'g'ri javob deb belgilash"
                            className={`qp-mod-chip ${ans.accepted || ans.moderation_correctness === 'correct' ? 'is-active' : ''}`}
                            data-tooltip="To'g'ri"
                            onClick={() => handleAnswerModeration(ans.id, 'correctness', 'correct')}
                            type="button"
                          >
                            <Icon name="check" size={14} />
                          </button>
                          <button
                            aria-label="Noto'g'ri javob deb belgilash"
                            className={`qp-mod-chip ${ans.moderation_correctness === 'incorrect' ? 'is-danger' : ''}`}
                            data-tooltip="Noto'g'ri"
                            onClick={() => handleAnswerModeration(ans.id, 'correctness', 'incorrect')}
                            type="button"
                          >
                            <Icon name="x" size={14} />
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
            <h3>Javob yozish</h3>
            {user ? (
              <form onSubmit={submitAnswer}>
                <div className="qp-answerer">
                  <Avatar initials={user.initials} name={user.name} online />
                  <strong>{user.name}</strong>
                </div>
                <textarea
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  placeholder="Qisqa ishora, formula yoki to'liq yechim yozing…"
                  rows={5}
                />
                <button
                  className="primary-button"
                  disabled={!answer.trim() || busy}
                  type="submit"
                >
                  <Icon name="send" size={16} />
                  {busy ? 'Yuborilmoqda…' : 'Javob yuborish'}
                </button>
              </form>
            ) : (
              <div className="qp-auth-prompt">
                <p>Javob berish uchun tizimga kiring</p>
                <button className="primary-button" onClick={() => setShowAuth(true)}>
                  Kirish / Ro'yxatdan o'tish
                </button>
              </div>
            )}
          </div>
        </main>

        {/* ── Sidebar ── */}
        <aside className="qp-sidebar">
          <div className="panel-card">
            <div className="section-heading">
              <h3>Savol haqida</h3>
            </div>
            <div className="qp-sidebar-stats">
              <div><span>So'radi</span><strong>{topic.author}</strong></div>
              <div><span>Faollik</span><strong>{topic.activity}</strong></div>
              <div><span>Ko'rishlar</span><strong>{topic.views}</strong></div>
              <div><span>Javoblar</span><strong>{topic.answers}</strong></div>
              <div><span>Holat</span><strong>{topic.solved ? '✓ Yechilgan' : 'Ochiq'}</strong></div>
            </div>
          </div>

          {topic.tags?.length > 0 && (
            <div className="panel-card">
              <div className="section-heading"><h3>Teglar</h3></div>
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
