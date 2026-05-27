import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useForumStream } from '../hooks/useForumStream';
import { LatexLine, hasLatex } from '../components/Latex';
import AuthModal from '../components/AuthModal';
import Layout from '../components/Layout';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3002';

/* ── tiny shared helpers (duplicated from App.jsx so page is self-contained) */
const ELEMENT_SYMBOLS = new Set([
  "H","He","Li","Be","B","C","N","O","F","Ne","Na","Mg","Al","Si","P","S","Cl",
  "Ar","K","Ca","Sc","Ti","V","Cr","Mn","Fe","Co","Ni","Cu","Zn","Ga","Ge","As",
  "Se","Br","Kr","Rb","Sr","Y","Zr","Nb","Mo","Tc","Ru","Rh","Pd","Ag","Cd","In",
  "Sn","Sb","Te","I","Xe","Cs","Ba","La","Ce","Pr","Nd","Pm","Sm","Eu","Gd","Tb",
  "Dy","Ho","Er","Tm","Yb","Lu","Hf","Ta","W","Re","Os","Ir","Pt","Au","Hg","Tl",
  "Pb","Bi","Po","At","Rn","Fr","Ra","Ac","Th","Pa","U","Np","Pu",
]);
const SUB = {0:"₀",1:"₁",2:"₂",3:"₃",4:"₄",5:"₅",6:"₆",7:"₇",8:"₈",9:"₉"};
const SUP = {0:"⁰",1:"¹",2:"²",3:"³",4:"⁴",5:"⁵",6:"⁶",7:"⁷",8:"⁸",9:"⁹","+":"⁺","-":"⁻"};
const toSub = v => v.replace(/[0-9]/g, d => SUB[d]);
const toSup = v => v.replace(/[0-9+-]/g, c => SUP[c] ?? c);

function parseFormula(raw) {
  const stateMatch = raw.match(/(\((?:aq|s|l|g)\))$/i);
  const state = stateMatch?.[1];
  const token = (state ? raw.slice(0, -state.length) : raw).replace(/[•.]/g,'·');
  if (!token) return null;
  const pieces = []; let elCount = 0; let i = 0; let afterDot = false;
  while (i < token.length) {
    const c = token[i];
    if (c==='·') { pieces.push({text:'·',type:'dot'}); afterDot=true; i++; continue; }
    if (/[0-9]/.test(c)) {
      let n=''; while(/[0-9]/.test(token[i])) { n+=token[i]; i++; }
      if ((token[i]==='+'||token[i]==='-')&&i===token.length-1) { pieces.push({text:toSup(n+token[i]),type:'sup'}); i++; }
      else if (afterDot||(pieces.length===0&&/[A-Z([]/.test(token[i]||''))) pieces.push({text:n,type:'coeff'});
      else pieces.push({text:toSub(n),type:'sub'});
      afterDot=false; continue;
    }
    if (c==='^') { i++; let ch=''; while(/[0-9+-]/.test(token[i])) { ch+=token[i]; i++; } if(!ch) return null; pieces.push({text:toSup(ch),type:'sup'}); afterDot=false; continue; }
    if ((c==='+'||c==='-')&&i===token.length-1) { pieces.push({text:toSup(c),type:'sup'}); i++; afterDot=false; continue; }
    if ('()[]'.includes(c)) { pieces.push({text:c,type:'plain'}); i++; afterDot=false; continue; }
    if (/[A-Z]/.test(c)) {
      let sym=c; if(/[a-z]/.test(token[i+1]||'')) sym+=token[i+1];
      if (!ELEMENT_SYMBOLS.has(sym)) return null;
      pieces.push({text:sym,type:'element'}); elCount++; i+=sym.length; afterDot=false; continue;
    }
    return null;
  }
  if (!elCount || !(/[0-9()[\]^+\-·]/.test(token)||elCount>1)) return null;
  if (state) pieces.push({text:state.toLowerCase(),type:'state'});
  return pieces;
}

function renderToken(part, key) {
  const arrows = {"->":"→","=>":"→","<-":"←","<->":"⇌","=":"→","⇌":"⇌","→":"→","←":"←"};
  if (arrows[part]) return <span className="chem-arrow" key={key}>{arrows[part]}</span>;
  if (part==='+') return <span className="chem-plus" key={key}>+</span>;
  if (/^\((aq|s|l|g)\)$/i.test(part)) return <span className="chem-state" key={key}>{part.toLowerCase()}</span>;
  const f = parseFormula(part);
  if (!f) return <span key={key}>{part}</span>;
  return <span className="chem-formula" key={key}>{f.map((p,i)=><span className={`chem-part chem-part--${p.type}`} key={i}>{p.text}</span>)}</span>;
}

function renderLine(line, li) {
  return line.split(/(<->|->|=>|<-|=|⇌|→|←|\+|\((?:aq|s|l|g)\)|\d*[A-Z][A-Za-z0-9()[\]^·.-]*(?:[0-9]*[+\-](?![0-9A-Z]))?)/g)
    .map((p,i) => p ? renderToken(p,`${li}-${i}`) : null);
}
function isChem(line) { return /(->|=>|<->|=|⇌|→|←)|\d*[A-Z][A-Za-z0-9()[\]^·.-]*/.test(line); }

function RichText({ text, className='' }) {
  if (!text) return null;
  return (
    <div className={`rich-text ${className}`}>
      {text.split('\n').map((line,li) => {
        const chem = isChem(line);
        const latex = hasLatex(line);
        return (
          <p className={chem?'chem-line':''} key={li}>
            {latex
              ? <LatexLine text={line} renderText={(chunk,i) => renderLine(chunk,`${li}-plain-${i}`)} />
              : renderLine(line,li)}
          </p>
        );
      })}
    </div>
  );
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
    eye:       "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
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
    <span className="avatar" title={name}>
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

  const [topic, setTopic]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy]     = useState(false);
  const [voted, setVoted]   = useState(0);
  const [showAuth, setShowAuth] = useState(false);
  const [toast, setToast]   = useState('');
  const toastRef            = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(''), 2200);
  };

  /* Fetch topic on mount */
  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/forum/topics/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject('Topilmadi'))
      .then(data => { setTopic(data); setLoading(false); })
      .catch(e  => { setError(String(e)); setLoading(false); });
  }, [id]);

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

  const onAccept = useCallback(({ topicId, answerId }) => {
    if (String(topicId) !== String(id)) return;
    setTopic(prev => prev ? {
      ...prev, solved: true,
      answersList: prev.answersList.map(a => a.id === answerId ? { ...a, accepted: true } : a),
    } : prev);
  }, [id]);

  useForumStream(() => {}, null, onAnswer, onVote, onAccept);

  /* Vote */
  const handleVote = (direction) => {
    if (!user) { setShowAuth(true); return; }
    const alreadyVoted = voted === direction;
    const delta = alreadyVoted ? -direction : direction - voted;
    setVoted(alreadyVoted ? 0 : direction);
    setTopic(prev => prev ? { ...prev, score: prev.score + delta } : prev);
    fetch(`${API}/api/forum/topics/${id}/vote`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ delta }),
    }).catch(() => {});
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
    fetch(`${API}/api/forum/topics/${id}/accept/${answerId}`, {
      method: 'POST',
      headers: authHeaders(),
    }).catch(() => {});
    setTopic(prev => prev ? {
      ...prev, solved: true,
      answersList: prev.answersList.map(a => a.id === answerId ? { ...a, accepted: true } : a),
    } : prev);
    showToast('Javob qabul qilindi ✓');
  };

  /* ── Render ── */
  if (loading) return (
    <div className="qp-shell">
      <div className="qp-loading">Yuklanmoqda…</div>
    </div>
  );

  if (error || !topic) return (
    <div className="qp-shell">
      <button className="soft-button" onClick={() => navigate('/')} style={{ width: 'max-content' }}>
        <Icon name="arrowLeft" size={16} /> Orqaga
      </button>
      <div className="qp-loading" style={{ color: 'var(--rose)' }}>Savol topilmadi</div>
    </div>
  );

  const isAuthor = user && topic.author === user.name;

  const [theme, setTheme] = useState(() => localStorage.getItem('ximor_theme') || 'light');
  const toggleTheme = () => setTheme(t => {
    const next = t === 'light' ? 'dark' : 'light';
    localStorage.setItem('ximor_theme', next);
    return next;
  });

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
                {topic.pinned && <span className="pill pill--gold">Mahkamlangan</span>}
                {topic.hot    && <span className="pill pill--hot">Qaynoq 🔥</span>}
                {topic.solved && <span className="pill pill--ok">Yechilgan ✓</span>}
                <span>{topic.difficulty}</span>
                <span>{topic.activity}</span>
              </div>

              <h1 className="qp-title">{topic.title}</h1>
              <RichText text={topic.summary} className="qp-summary" />

              {/* Tags */}
              {topic.tags?.length > 0 && (
                <div className="tag-row" style={{ marginTop: 14 }}>
                  {topic.tags.map(tag => (
                    <span className="tag-chip" key={tag}>#{tag}</span>
                  ))}
                </div>
              )}

              {/* Author footer */}
              <div className="qp-author-row">
                <div className="qp-meta-stats">
                  <span><Icon name="message" size={14} /> {topic.answers} javob</span>
                  <span><Icon name="eye" size={14} /> {topic.views} ko'rish</span>
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
                    className={`qp-answer ${ans.accepted ? 'is-accepted' : ''}`}
                  >
                    <div className="qp-vote-col qp-vote-col--answer">
                      <span className="qp-answer-score">{ans.score}</span>
                      {ans.accepted && (
                        <span className="qp-accepted-tick" title="Qabul qilingan javob">
                          <Icon name="check" size={15} />
                        </span>
                      )}
                      {isAuthor && !topic.solved && !ans.accepted && (
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
                      </div>
                      <p className="qp-answer-text">{ans.text}</p>
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
              <div><span>Daraja</span><strong>{topic.difficulty}</strong></div>
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
