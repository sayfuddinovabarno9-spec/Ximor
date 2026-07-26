import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Routes, Route, useNavigate, useSearchParams } from "react-router-dom";
import "./App.css";
import { useForumStream } from "./hooks/useForumStream";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useLanguage } from "./context/LanguageContext";
import AnswerEditorTools from "./components/AnswerEditorTools";
import AuthModal from "./components/AuthModal";
import AttachmentGallery from "./components/AttachmentGallery";
import RichText from "./components/RichText";
import Layout from "./components/Layout";
import InsightsPanel from "./components/InsightsPanel";
import QuestionPage from "./pages/QuestionPage";
import OlimpiadalarPage from "./pages/OlimpiadalarPage";
import ReytingPage from "./pages/ReytingPage";
import ProfilePage from "./pages/ProfilePage";
import YangiliklarPage from "./pages/YangiliklarPage";
import AdminPage from "./pages/AdminPage";
import ToolsPage from "./pages/ToolsPage";
import HomePage from "./pages/HomePage";
import MessagesPage from "./pages/MessagesPage";
import { avatarBg } from "./utils/avatarColor";
import copyToClipboard from "./utils/copyToClipboard";
import { formatQuestionCreatedAt } from "./utils/dateTime";
import { prepareForumImage } from "./utils/forumImage";

const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:3002';

const CATEGORIES = [
  { id: "all",       labelKey: "forum.all",        short: "∑",  color: "#36584d", count: 0 },
  { id: "organik",   labelKey: "forum.organic",    short: "Or", color: "#4d5b55", count: 0 },
  { id: "anorganik", labelKey: "forum.inorganic",  short: "An", color: "#5c625f", count: 0 },
  { id: "fizikaviy", labelKey: "forum.physical",   short: "Fk", color: "#59616d", count: 0 },
  { id: "analitik",  labelKey: "forum.analytical", short: "Al", color: "#6c6258", count: 0 },
  { id: "dtm",       labelKey: "nav.olympiads",    short: "DT", color: "#7b6847", count: 0 },
];

const SORTS = [
  { id: "recent", labelKey: "forum.recent", icon: "clock" },
  { id: "hot", labelKey: "forum.hot", icon: "flame" },
  { id: "unanswered", labelKey: "forum.unanswered", icon: "message" },
  { id: "saved", labelKey: "forum.saved", icon: "bookmark" },
];

const TRENDING_TAGS = [
  "organik-kimyo",
  "reaksiya-mexanizmi",
  "elektrolit",
  "oksidlanish",
  "kataliz",
  "DTM-kimyo",
  "olimpiada",
  "titrlash",
];

const INITIAL_TOPICS = [
  {
    id: 1,
    pinned: true,
    solved: true,
    category: "all",
    title: "Forumga xush kelibsiz — kimyo savollarini birga yechamiz",
    summary:
      "Bu yerda organik, anorganik, analitik va fizikaviy kimyo bo'yicha savollarni muhokama qilamiz. Savolingizga urinish, kuzatuv va aniq formulani ilova qiling.",
    formula: "savol + urinish + formula = tez va foydali javob",
    tags: ["qoidalar", "boshlash", "kimyo"],
    author: "Ximor jamoasi",
    initials: "Xi",
    role: "Moderator",
    score: 412,
    answers: 18,
    views: "9.7k",
    activity: "Bugun",
    difficulty: "Boshlang'ich",
    participants: ["AK", "SY", "NR"],
    saved: false,
    voted: 0,
    answersList: [
      {
        author: "Aziza Karimova",
        initials: "AK",
        role: "Organik kimyo",
        accepted: true,
        score: 94,
        text: "Eng foydali savollar o'z urinishidan boshlanadi. Qayergacha kelganingizni ko'rsatsangiz, aniq nuqtadan yordam beramiz.",
      },
    ],
  },
  {
    id: 2,
    hot: true,
    solved: true,
    category: "organik",
    title: "Grignard reaktivi bilan C–C bog' hosil qilish mexanizmi",
    summary:
      "1-bromobutan va formaldegid ishlatilganda asosiy mahsulot nima bo'ladi? Nukleofil qo'shilish bosqichini tushunmoqchiman.",
    formula: "CH3CH2CH2CH2MgBr + HCHO -> CH3(CH2)4OH",
    tags: ["organik-kimyo", "reaksiya-mexanizmi", "grignard"],
    author: "KimyoTalaba",
    initials: "KT",
    role: "Shogird",
    score: 312,
    answers: 45,
    views: "2.4k",
    activity: "2 soat oldin",
    difficulty: "Murakkab",
    participants: ["AK", "SY", "NR"],
    saved: false,
    voted: 0,
    answersList: [
      {
        author: "Aziza Karimova",
        initials: "AK",
        role: "Organik kimyo",
        accepted: true,
        score: 89,
        text: "Grignard birikma karbonil uglerodiga hujum qiladi. Formaldegid bilan yakunda bitta uglerodga uzaygan birlamchi spirt hosil bo'ladi.",
      },
      {
        author: "Sardor Yusupov",
        initials: "SY",
        role: "Anorganik kimyo",
        accepted: false,
        score: 67,
        text: "Bosqichlar: organomagniy hosil bo'lishi → karbonilga qo'shilish → gidroliz. Suvni reaksiyadan oldin kiritmaslik muhim.",
      },
    ],
  },
  {
    id: 3,
    hot: true,
    solved: false,
    category: "anorganik",
    title: "H2SO4 konsentrlangan va suyultirilganda mis bilan reaksiyasi farqi",
    summary:
      "Konsentrlangan H2SO4 misni eritadi, suyultirilgani esa eritmasligi aytiladi. Mexanizm nima, mahsulotlar farqi qanday?",
    formula: "Cu + 2H2SO4(konts) -> CuSO4 + SO2(g) + 2H2O",
    tags: ["anorganik", "kislota", "oksidlanish"],
    author: "Doniyor",
    initials: "DO",
    role: "10-sinf",
    score: 187,
    answers: 9,
    views: "1.1k",
    activity: "Bugun",
    difficulty: "O'rta",
    participants: ["AK", "NR"],
    saved: false,
    voted: 0,
    answersList: [
      {
        author: "Nilufar Rashidova",
        initials: "NR",
        role: "Analitik kimyo",
        accepted: false,
        score: 54,
        text: "Konsentrlanganda H2SO4 kuchli oksidlovchi vazifasini bajaradi. Suyultirilganda esa vodorod ajralishi uchun Cu standart potensiali yetarli emas.",
      },
    ],
  },
  {
    id: 4,
    solved: false,
    category: "analitik",
    title: "Titrlashda ekvivalentlik nuqtasini aniqroq topish usuli",
    summary:
      "HCl - NaOH titrlashida indikator rangi o'zgarishi ba'zan noto'g'ri nuqtada ko'rinadi. pH metr bilan qanday to'g'rilash mumkin?",
    formula: "n(HCl) = n(NaOH)  =>  C1V1 = C2V2",
    tags: ["titrlash", "analitik", "DTM-kimyo"],
    author: "Shahlo",
    initials: "SH",
    role: "11-sinf",
    score: 143,
    answers: 6,
    views: 890,
    activity: "Kecha",
    difficulty: "O'rta",
    participants: ["NR", "AK"],
    saved: true,
    voted: 0,
    answersList: [],
  },
  {
    id: 5,
    solved: true,
    category: "fizikaviy",
    title: "Le Chatelier printsipi — bosim oshirilganda muvozanat qayoqqa siljiydi?",
    summary:
      "N2 + 3H2 ⇌ 2NH3 reaksiyasida bosim 2 baravarga oshirilsa, muvozanat qaysi tomonga siljiydi va konsentratsiya qanday o'zgaradi?",
    formula: "N2 + 3H2 <-> 2NH3  (mol soni: 4 -> 2)",
    tags: ["muvozanat", "kataliz", "fizikaviy"],
    author: "Bobur",
    initials: "BO",
    role: "DTM tayyorgarlik",
    score: 224,
    answers: 14,
    views: "1.6k",
    activity: "3 kun oldin",
    difficulty: "O'rta",
    participants: ["AK", "SY"],
    saved: false,
    voted: 0,
    answersList: [
      {
        author: "Sardor Yusupov",
        initials: "SY",
        role: "Anorganik kimyo",
        accepted: true,
        score: 78,
        text: "Bosim oshganda muvozanat mol soni kamroq tomonga siljiydi. Bu yerda mahsulot tomoni (2 mol) — shuning uchun NH3 hosil bo'lishi ko'payadi.",
      },
    ],
  },
  {
    id: 6,
    solved: false,
    category: "dtm",
    title: "DTM 2024 kimyo — 38-savol: ekvivalent massa hisoblash",
    summary:
      "Fe2O3 ning kislota bilan reaksiyasida ekvivalent massasi qanday hisoblanadi? Men 160/6 dedim, to'g'rimi?",
    formula: "M(ekv) = M / n(e-)  =>  Fe2O3: 160 / 6 = 26.7 g/mol",
    tags: ["DTM-kimyo", "ekvivalent", "olimpiada"],
    author: "Malika",
    initials: "ML",
    role: "Abituriyent",
    score: 98,
    answers: 3,
    views: 540,
    activity: "Bugun",
    difficulty: "Boshlang'ich",
    participants: ["NR"],
    saved: false,
    voted: 0,
    answersList: [],
  },
];

const DEMO_TOPIC_AGES = [
  18 * 60 * 1000,
  2 * 60 * 60 * 1000,
  4 * 60 * 60 * 1000,
  26 * 60 * 60 * 1000,
  3 * 24 * 60 * 60 * 1000,
  7 * 60 * 60 * 1000,
];

function withTopicCreatedAt(topic, index = 0) {
  const createdAt = topic.created_at || topic.createdAt;
  if (createdAt) return { ...topic, created_at: createdAt };

  const age = DEMO_TOPIC_AGES[index % DEMO_TOPIC_AGES.length] || 0;
  return { ...topic, created_at: new Date(Date.now() - age).toISOString() };
}

function Icon({ name, size = 18 }) {
  const paths = {
    menu: "M4 6h16M4 12h16M4 18h16",
    search: "m21 21-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z",
    bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
    plus: "M12 5v14M5 12h14",
    send: "M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z",
    close: "M18 6 6 18M6 6l12 12",
    arrowUp: "M12 19V5M5 12l7-7 7 7",
    arrowDown: "M12 5v14M19 12l-7 7-7-7",
    bookmark: "M6 4h12v17l-6-4-6 4V4Z",
    link: "M9 17H7A5 5 0 0 1 7 7h3M15 7h2a5 5 0 1 1 0 10h-3M8 12h8",
    pin: "M12 17v5M5 17h14M6 3h12l-2 8 3 3H5l3-3-2-8Z",
    message: "M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z",
    flame: "M8.5 14.5A4.5 4.5 0 0 0 13 19c2.8 0 5-2.2 5-5 0-4-4-6-4-10-2 2.5-6 4.3-6 10.5Z",
    star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.8 6.5 20.7l1-6.2L3 10.1l6.2-.9L12 3Z",
    trophy: "M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM5 5H3v3a4 4 0 0 0 4 4M19 5h2v3a4 4 0 0 1-4 4",
    clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2",
    check: "M20 6 9 17l-5-5",
    filter: "M4 5h16M7 12h10M10 19h4",
    moon: "M21 12.8A8.5 8.5 0 1 1 11.2 3 6.5 6.5 0 0 0 21 12.8Z",
    sun: "M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z",
    layout: "M4 5h16v5H4V5ZM4 14h7v5H4v-5ZM15 14h5v5h-5v-5Z",
    spark: "M12 3l1.7 5.1L19 10l-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9L12 3Z",
    eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
    image: "M21 15V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4ZM3 16l5-5 4 4 3-3 6 6M8.5 8.5h.01",
  };

  return (
    <svg
      aria-hidden="true"
      className="icon"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width={size}
    >
      <path d={paths[name]} />
    </svg>
  );
}

function FlaskIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6M9 3v7l-5 9a1 1 0 0 0 .9 1.5h12.2A1 1 0 0 0 21 19l-5-9V3" />
      <path d="M7.5 15h9" opacity=".5" />
    </svg>
  );
}

function Avatar({ initials, name, online = false }) {
  return (
    <span className="avatar" title={name}
      style={{ background: avatarBg(initials), color: '#fff', border: 'none' }}>
      {initials}
      {online && <span className="avatar__status" />}
    </span>
  );
}

function CategoryMark({ categoryId }) {
  const category = CATEGORIES.find((item) => item.id === categoryId) || CATEGORIES[0];
  return (
    <span className="category-mark" style={{ "--category-color": category.color }}>
      {category.short}
    </span>
  );
}

function TopicCard({ density, onOpen, onSave, onVote, onTagClick, topic, votePending }) {
  const { language, t } = useLanguage();
  const category = CATEGORIES.find((item) => item.id === topic.category) || CATEGORIES[0];
  const [copied, setCopied] = useState(false);
  const createdAt = formatQuestionCreatedAt(topic.created_at, language);

  const handleCopyLink = async () => {
    try {
      await copyToClipboard(`${window.location.origin}/q/${topic.id}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <article className={`topic-card topic-card--${density}`} onClick={() => onOpen(topic.id)}>
      <div className="vote-rail" onClick={(event) => event.stopPropagation()}>
        <button
          aria-label={t('forum.upvote')}
          aria-busy={votePending}
          className={topic.voted === 1 ? "is-active" : ""}
          disabled={votePending}
          title={t('forum.voteUp')}
          onClick={() => onVote(topic.id, 1)}
        >
          <Icon name="arrowUp" size={17} />
        </button>
        <strong>{topic.score}</strong>
        <button
          aria-label={t('forum.downvote')}
          aria-busy={votePending}
          className={topic.voted === -1 ? "is-danger" : ""}
          disabled={votePending}
          title={t('forum.voteDown')}
          onClick={() => onVote(topic.id, -1)}
        >
          <Icon name="arrowDown" size={17} />
        </button>
      </div>

      <div className="topic-body">
        <div className="topic-meta">
          <CategoryMark categoryId={topic.category} />
          <span style={{ color: category.color }}>{t(category.labelKey)}</span>
          <span>{topic.activity}</span>
          {createdAt && (
            <time
              className="topic-created-time"
              dateTime={topic.created_at}
              title={`${t('question.createdAt')}: ${createdAt}`}
            >
              <Icon name="clock" size={13} />
              {createdAt}
            </time>
          )}
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
          {topic.hot && <span className="pill pill--hot">{t('forum.hot')}</span>}
          {topic.solved && <span className="pill pill--ok">{t('common.solved')}</span>}
        </div>

        <h2>{topic.title}</h2>
        <div className="question-content">
          <RichText className="topic-summary" text={topic.summary} />
          <AttachmentGallery images={topic.images} />
        </div>

        <div className="topic-footer">
          <div className="tag-row" onClick={e => e.stopPropagation()}>
            {topic.tags.map((tag) => (
              <button key={tag} className="tag-chip" type="button"
                      onClick={() => onTagClick?.(tag)}>
                #{tag}
              </button>
            ))}
          </div>

          <div className="topic-actions" onClick={(event) => event.stopPropagation()}>
            <span title={t('forum.answers')}>
              <Icon name="message" size={16} /> {topic.answers}
            </span>
            <span title={t('forum.views')}>
              <Icon name="eye" size={16} /> {topic.views}
            </span>
            <div className="avatar-stack">
              {topic.participants.slice(0, 4).map((initials) => (
                <Avatar key={initials} initials={initials} name={initials} />
              ))}
            </div>
            <button
              aria-label={t('forum.copyLink')}
              className={`permalink-button ${copied ? "is-copied" : ""}`}
              data-tooltip={copied ? t('forum.linkCopied') : t('forum.copyLink')}
              onClick={handleCopyLink}
              type="button"
            >
              <Icon name="link" size={17} />
            </button>
            <button
              aria-label={t('common.save')}
              className={`icon-button ${topic.saved ? "is-saved" : ""}`}
              title={t('common.save')}
              onClick={() => onSave(topic.id)}
            >
              <Icon name="bookmark" size={17} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function ThreadDrawer({
  answerVotes = {},
  onAddAnswer,
  onAnswerVote,
  onClose,
  onSave,
  onVote,
  pendingAnswerVoteIds = new Set(),
  topic,
}) {
  const { language, t } = useLanguage();
  const [answer, setAnswer] = useState("");
  const answerRef = useRef(null);
  const createdAt = formatQuestionCreatedAt(topic?.created_at, language);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!topic) return null;

  const submitAnswer = (event) => {
    event.preventDefault();
    if (!answer.trim()) return;
    onAddAnswer(topic.id, answer.trim());
    setAnswer("");
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside aria-modal="true" className="thread-drawer" onClick={(event) => event.stopPropagation()} role="dialog">
        <div className="drawer-header">
          <div>
            <span className="eyebrow">{t('forum.discussion')}</span>
            <h2>{topic.title}</h2>
          </div>
          <button aria-label={t('common.close')} className="icon-button" title={t('common.close')} onClick={onClose}>
            <Icon name="close" size={19} />
          </button>
        </div>

        <div className="drawer-topic">
          <div className="drawer-votes">
            <button
              aria-label={t('forum.upvote')}
              className={topic.voted === 1 ? "is-active" : ""}
              onClick={() => onVote(topic.id, 1)}
            >
              <Icon name="arrowUp" size={18} />
            </button>
            <strong>{topic.score}</strong>
            <button
              aria-label={t('forum.downvote')}
              className={topic.voted === -1 ? "is-danger" : ""}
              onClick={() => onVote(topic.id, -1)}
            >
              <Icon name="arrowDown" size={18} />
            </button>
          </div>
          <div>
            <div className="topic-meta">
              <CategoryMark categoryId={topic.category} />
              <span>{topic.author}</span>
              <span>{topic.role}</span>
              <span>{topic.activity}</span>
              {createdAt && (
                <time
                  className="topic-created-time"
                  dateTime={topic.created_at}
                  title={`${t('question.createdAt')}: ${createdAt}`}
                >
                  <Icon name="clock" size={13} />
                  {createdAt}
                </time>
              )}
            </div>
            <div className="question-content">
              <RichText className="topic-summary" text={topic.summary} />
              <AttachmentGallery images={topic.images} size="large" />
            </div>
            <div className="tag-row">
              {topic.tags.map((tag) => (
                <span key={tag} className="tag-chip">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="drawer-actions">
          <button className="soft-button" onClick={() => onSave(topic.id)}>
            <Icon name="bookmark" size={17} />
            {topic.saved ? t('common.saved') : t('common.save')}
          </button>
          <button className="soft-button">
            <Icon name="star" size={17} />
            {t('forum.follow')}
          </button>
        </div>

        <section className="answers-list">
          <div className="section-heading">
            <h3>{t('forum.answerCount', { count: topic.answersList.length || topic.answers })}</h3>
            <span>{t('forum.usefulFirst')}</span>
          </div>
          {topic.answersList.length === 0 ? (
            <div className="empty-answer">
              <Icon name="message" size={22} />
              <strong>{t('forum.noAnswers')}</strong>
              <span>{t('forum.noAnswersHint')}</span>
            </div>
          ) : (
            topic.answersList.map((item, index) => {
              const voted = answerVotes[item.id] ?? 0;
              const votePending = pendingAnswerVoteIds.has(item.id);

              return (
              <article className={`answer-card ${item.accepted ? "is-accepted" : ""}`} key={item.id ?? `${item.author}-${index}`}>
                <div className="answer-head">
                  <Avatar initials={item.initials} name={item.author} online={item.accepted} />
                  <div>
                    <strong>{item.author}</strong>
                    <span>{item.role}</span>
                  </div>
                  <div className="answer-score answer-score--votable">
                    <button
                      aria-label={t('forum.upvote')}
                      className={`answer-vote-btn ${voted === 1 ? "is-active" : ""}`}
                      disabled={votePending}
                      onClick={() => onAnswerVote?.(item.id, 1)}
                      title={t('question.helpful')}
                      type="button"
                    >
                      <Icon name="arrowUp" size={14} />
                    </button>
                    <strong>{item.score}</strong>
                    <button
                      aria-label={t('forum.downvote')}
                      className={`answer-vote-btn ${voted === -1 ? "is-danger" : ""}`}
                      disabled={votePending}
                      onClick={() => onAnswerVote?.(item.id, -1)}
                      title={t('question.unhelpful')}
                      type="button"
                    >
                      <Icon name="arrowDown" size={14} />
                    </button>
                    {item.accepted && (
                      <span className="answer-accepted-icon" title={t('question.accepted')}>
                        <Icon name="check" size={15} />
                      </span>
                    )}
                  </div>
                </div>
                <RichText text={item.text} />
              </article>
              );
            })
          )}
        </section>

        <form className="answer-box" onSubmit={submitAnswer}>
          <label htmlFor="answer">{t('forum.writeAnswer')}</label>
          <AnswerEditorTools onChange={setAnswer} textareaRef={answerRef} value={answer} />
          <textarea
            id="answer"
            ref={answerRef}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder={t('forum.answerPlaceholder')}
            value={answer}
          />
          {answer.trim() && (
            <div className="latex-live-preview answer-live-preview">
              <div className="latex-live-preview-label">{t('composer.previewLabel')}</div>
              <RichText text={answer} />
            </div>
          )}
          <button className="primary-button" disabled={!answer.trim()} type="submit">
            <Icon name="send" size={17} />
            {t('forum.sendAnswer')}
          </button>
        </form>
      </aside>
    </div>
  );
}

function ComposerModal({ onClose, onSubmit }) {
  const { t } = useLanguage();
  const summaryRef = useRef(null);
  const fileInputRef = useRef(null);
  const [mode, setMode] = useState("write");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    summary: "",
    category: "organik",
    tags: "organik-kimyo, reaksiya",
    images: [],
  });

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const insertSnippet = (snippet) => {
    const element = summaryRef.current;
    const currentValue = form.summary;
    const start = element?.selectionStart ?? currentValue.length;
    const end = element?.selectionEnd ?? currentValue.length;
    const nextValue = `${currentValue.slice(0, start)}${snippet}${currentValue.slice(end)}`;
    update("summary", nextValue);
    window.requestAnimationFrame(() => {
      summaryRef.current?.focus();
      summaryRef.current?.setSelectionRange(start + snippet.length, start + snippet.length);
    });
  };

  const wrapSelection = (before, after, placeholder) => {
    const element = summaryRef.current;
    const currentValue = form.summary;
    const start = element?.selectionStart ?? currentValue.length;
    const end = element?.selectionEnd ?? currentValue.length;
    const selected = currentValue.slice(start, end) || placeholder;
    const replacement = `${before}${selected}${after}`;
    const nextValue = `${currentValue.slice(0, start)}${replacement}${currentValue.slice(end)}`;
    update("summary", nextValue);
    window.requestAnimationFrame(() => {
      summaryRef.current?.focus();
      summaryRef.current?.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  const handleImages = async (event) => {
    const files = Array.from(event.target.files || [])
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, Math.max(0, 4 - form.images.length));

    if (!files.length) return;

    const results = await Promise.allSettled(files.map(prepareForumImage));
    const images = results
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);

    setForm((current) => ({ ...current, images: [...current.images, ...images] }));
    event.target.value = "";
  };

  const removeImage = (imageId) => {
    setForm((current) => ({
      ...current,
      images: current.images.filter((image) => image.id !== imageId),
    }));
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.summary.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(form);
      // On success, parent closes the modal — no need to reset submitting
    } catch {
      setSubmitting(false); // Stay open so user can retry
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form
        aria-modal="true"
        className="composer-modal"
        onClick={(event) => event.stopPropagation()}
        onSubmit={submit}
        role="dialog"
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">{t('composer.newTopic')}</span>
            <h2>{t('composer.newQuestion')}</h2>
          </div>
          <button aria-label={t('common.close')} className="icon-button" title={t('common.close')} type="button" onClick={onClose}>
            <Icon name="close" size={19} />
          </button>
        </div>

        <div className="composer-tabs" role="tablist">
          <button
            aria-selected={mode === "write"}
            className={mode === "write" ? "is-active" : ""}
            onClick={() => setMode("write")}
            role="tab"
            type="button"
          >
            {t('composer.write')}
          </button>
          <button
            aria-selected={mode === "preview"}
            className={mode === "preview" ? "is-active" : ""}
            onClick={() => setMode("preview")}
            role="tab"
            type="button"
          >
            {t('composer.preview')}
          </button>
        </div>

        {mode === "write" ? (
          <>
            <label>
              {t('composer.title')}
              <input
                onChange={(event) => update("title", event.target.value)}
                placeholder={t('composer.titlePlaceholder')}
                value={form.title}
              />
            </label>

            <div className="chem-toolbar" aria-label={t('composer.chemistry')}>
              <span>{t('composer.chemistry')}</span>
              {[
                { labelKey: "composer.formula", value: "H2SO4" },
                { labelKey: "composer.reaction", value: "H2SO4 + CuO -> CuSO4 + H2O" },
                { labelKey: "composer.reversible", value: "N2 + 3H2 <-> 2NH3" },
                { labelKey: "composer.charge", value: "SO4^2-" },
                { labelKey: "composer.state", value: "(aq)" },
                { labelKey: "composer.precipitate", value: "Ag+ + Cl- -> AgCl(s)" },
              ].map((item) => (
                <button key={item.labelKey} onClick={() => insertSnippet(item.value)} type="button">
                  {t(item.labelKey)}
                </button>
              ))}
            </div>

            <div className="chem-toolbar latex-toolbar" aria-label="LaTeX kimyo formulalari">
              <span>LaTeX</span>
              {[
                { label: "Kasr",    value: "$\\frac{[A]}{[B]}$" },
                { label: "ΔH°",     value: "$$\\Delta H^\\circ = \\sum H_f(\\text{mahsulot}) - \\sum H_f(\\text{reagent})$$" },
                { label: "Keq",     value: "$$K_{eq} = \\frac{[C]^c[D]^d}{[A]^a[B]^b}$$" },
                { label: "pH",      value: "$\\text{pH} = -\\log[H^+]$" },
                { label: "ΔG",      value: "$$\\Delta G = \\Delta H - T\\Delta S$$" },
              ].map((item) => (
                <button key={item.label} onClick={() => insertSnippet(item.value)} type="button">
                  {item.label}
                </button>
              ))}
            </div>

            <div className="chem-toolbar markdown-toolbar" aria-label={t('composer.formatting')}>
              <span>Markdown</span>
              <button
                aria-label={t('composer.bold')}
                onClick={() => wrapSelection("**", "**", "qalin matn")}
                title={t('composer.bold')}
                type="button"
              >
                <strong>B</strong>
              </button>
              <button
                aria-label={t('composer.italic')}
                onClick={() => wrapSelection("*", "*", "kursiv matn")}
                title={t('composer.italic')}
                type="button"
              >
                <em>I</em>
              </button>
              <button
                aria-label={t('composer.list')}
                onClick={() => insertSnippet("- Birinchi band\n- Ikkinchi band")}
                title={t('composer.list')}
                type="button"
              >
                •
              </button>
              <button
                aria-label={t('composer.quote')}
                onClick={() => insertSnippet("> Iqtibos")}
                title={t('composer.quote')}
                type="button"
              >
                “
              </button>
              <button
                aria-label={t('composer.code')}
                onClick={() => wrapSelection("`", "`", "kod")}
                title={t('composer.code')}
                type="button"
              >
                &lt;/&gt;
              </button>
              <button
                aria-label={t('composer.link')}
                onClick={() => wrapSelection("[", "](https://)", "havola matni")}
                title={t('composer.link')}
                type="button"
              >
                <Icon name="link" size={15} />
              </button>
            </div>

            <div className="composer-question-field">
              <label htmlFor="composer-question">{t('composer.questionText')}</label>
              <div className="composer-question-editor">
                <textarea
                  id="composer-question"
                  ref={summaryRef}
                  onChange={(event) => update("summary", event.target.value)}
                  placeholder={t('composer.questionPlaceholder')}
                  rows={6}
                  value={form.summary}
                />

                {form.images.length > 0 && (
                  <div className="composer-editor-images">
                    {form.images.map((image) => (
                      <figure key={image.id}>
                        <img alt={image.name} src={image.src} />
                        <button
                          aria-label={t('composer.removeImage', { name: image.name })}
                          onClick={() => removeImage(image.id)}
                          type="button"
                        >
                          <Icon name="close" size={14} />
                        </button>
                      </figure>
                    ))}
                  </div>
                )}

                <div className="composer-editor-footer">
                  <input
                    accept="image/*"
                    multiple
                    onChange={handleImages}
                    ref={fileInputRef}
                    type="file"
                  />
                  <button
                    className="composer-attach-button"
                    disabled={form.images.length >= 4}
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                  >
                    <Icon name="image" size={17} />
                    {t('composer.image')}
                  </button>
                  <span>{form.images.length}/4</span>
                </div>
              </div>
            </div>

            {(form.summary || form.images.length > 0) && (
              <div className="latex-live-preview">
                <div className="latex-live-preview-label">{t('composer.previewLabel')}</div>
                <div className="question-content">
                  <RichText text={form.summary} />
                  <AttachmentGallery images={form.images} />
                </div>
              </div>
            )}

            <label>
              {t('composer.category')}
              <select onChange={(event) => update("category", event.target.value)} value={form.category}>
                {CATEGORIES.filter((item) => item.id !== "all").map((item) => (
                  <option key={item.id} value={item.id}>
                    {t(item.labelKey)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              {t('composer.tags')}
              <input onChange={(event) => update("tags", event.target.value)} value={form.tags} />
            </label>
          </>
        ) : (
          <div className="composer-preview">
            <div className="topic-meta">
              <CategoryMark categoryId={form.category} />
              <span>{t(CATEGORIES.find((item) => item.id === form.category)?.labelKey || 'forum.all')}</span>
            </div>
            <h3>{form.title || t('composer.emptyTitle')}</h3>
            <div className="question-content">
              <RichText text={form.summary || t('composer.emptyPreview')} />
              <AttachmentGallery images={form.images} size="large" />
            </div>
            <div className="tag-row">
              {form.tags
                .split(",")
                .map((tag) => tag.trim().replace(/^#/, ""))
                .filter(Boolean)
                .slice(0, 4)
                .map((tag) => (
                  <span className="tag-chip" key={tag}>
                    #{tag}
                  </span>
                ))}
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="soft-button" type="button" onClick={onClose}>
            {t('composer.cancel')}
          </button>
          <button className="primary-button" disabled={!form.title.trim() || !form.summary.trim() || submitting} type="submit">
            {submitting ? t('composer.creating') : <><Icon name="plus" size={17} />{t('composer.create')}</>}
          </button>
        </div>
      </form>
    </div>
  );
}

function Toast({ message }) {
  return <div className="toast">{message}</div>;
}

export default function App() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('ximor_theme') || 'light'
  );
  const toggleTheme = () => setTheme(t => {
    const next = t === 'light' ? 'dark' : 'light';
    localStorage.setItem('ximor_theme', next);
    return next;
  });

  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/chat" element={<Forum theme={theme} onThemeToggle={toggleTheme} />} />
        <Route path="/messages" element={<MessagesPage theme={theme} onThemeToggle={toggleTheme} />} />
        <Route path="/forum" element={<Navigate to="/chat" replace />} />
        <Route path="/olimpiadalar" element={<OlimpiadalarPage theme={theme} onThemeToggle={toggleTheme} />} />
        <Route path="/reyting" element={<ReytingPage theme={theme} onThemeToggle={toggleTheme} />} />
        <Route path="/asboblar" element={<ToolsPage theme={theme} onThemeToggle={toggleTheme} />} />
        <Route path="/q/:id" element={<QuestionPage />} />
        <Route path="/u/:username" element={<ProfilePage theme={theme} onThemeToggle={toggleTheme} />} />
        <Route path="/yangiliklar" element={<YangiliklarPage theme={theme} onThemeToggle={toggleTheme} />} />
        <Route path="/admin" element={<AdminPage theme={theme} onThemeToggle={toggleTheme} />} />
      </Routes>
    </AuthProvider>
  );
}

function Forum({ theme, onThemeToggle }) {
  const { user, token, logout, authHeaders } = useAuth();
  const { t } = useLanguage();
  const navigate                  = useNavigate();
  const [searchParams] = useSearchParams();
  const [showAuth, setShowAuth]   = useState(false);
  const [topics, setTopics] = useState([]);
  const [topicsLoaded, setTopicsLoaded] = useState(false);
  const [usingDemoTopics, setUsingDemoTopics] = useState(false);
  const [pendingVoteIds, setPendingVoteIds] = useState(() => new Set());
  const [answerVotes, setAnswerVotes] = useState({});
  const [pendingAnswerVoteIds, setPendingAnswerVoteIds] = useState(() => new Set());
  const voteStateRef = useRef({});
  const pendingVoteIdsRef = useRef(new Set());
  const pendingAnswerVoteIdsRef = useRef(new Set());
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeSort, setActiveSort] = useState("recent");
  const [density, setDensity] = useState("comfortable");
  const [query, setQuery] = useState(() => searchParams.get("q") || "");
  const openTopic = (id) => navigate(`/q/${id}`);
  const [showComposer, setShowComposer] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimerRef = useRef(null);

  // Real-time: vote update from any client
  const handleIncomingVote = useCallback(({ topicId, score }) => {
    setTopics(prev => prev.map(t => t.id === topicId ? { ...t, score } : t));
  }, []);

  // Real-time: answer accepted by question author
  const handleIncomingAccept = useCallback(({ topicId, answerId, solved = true }) => {
    setTopics(prev => prev.map(t => {
      if (t.id !== topicId) return t;
      return {
        ...t,
        solved,
        answersList: t.answersList.map(a =>
          a.id === answerId ? { ...a, accepted: true } : { ...a, accepted: false }
        ),
      };
    }));
  }, []);

  const handleIncomingTopicModeration = useCallback(({ topicId, solved }) => {
    setTopics(prev => prev.map(t => {
      if (t.id !== topicId) return t;
      return {
        ...t,
        solved,
        answersList: solved ? t.answersList : t.answersList.map(a => ({ ...a, accepted: false })),
      };
    }));
  }, []);

  const handleIncomingAnswerDeleted = useCallback(({ topicId, answerId, answers, solved }) => {
    setTopics(prev => prev.map(t => {
      if (t.id !== topicId) return t;
      return {
        ...t,
        answers: answers ?? Math.max((t.answers || 1) - 1, 0),
        solved,
        answersList: t.answersList.filter(a => a.id !== answerId),
      };
    }));
  }, []);

  // Real-time: merge all server-stored topics when we first connect
  const handleInitTopics = useCallback((serverTopics) => {
    setTopics((currentTopics) => {
      const currentById = new Map(currentTopics.map((topic) => [Number(topic.id), topic]));
      const incoming = serverTopics.length ? serverTopics : INITIAL_TOPICS;
      return incoming.map((topic, index) => {
        const normalizedTopic = withTopicCreatedAt(topic, index);
        const current = currentById.get(Number(topic.id));
        return {
          ...normalizedTopic,
          saved: current?.saved ?? false,
          voted: voteStateRef.current[topic.id] ?? current?.voted ?? 0,
        };
      });
    });
    setUsingDemoTopics(serverTopics.length === 0);
    setTopicsLoaded(true);
  }, []);

  // Real-time: single new topic broadcast from another device
  const handleIncomingTopic = useCallback((incoming) => {
    setTopics(prev => {
      if (prev.some(t => t.id === incoming.id)) return prev;
      return [withTopicCreatedAt(incoming), ...prev];
    });
  }, []);

  const handleIncomingTopicUpdate = useCallback((incoming) => {
    setTopics(prev => prev.map((topic) => {
      if (String(topic.id) !== String(incoming.id)) return topic;
      const updated = withTopicCreatedAt(incoming);
      return {
        ...topic,
        ...updated,
        saved: topic.saved,
        voted: voteStateRef.current[topic.id] ?? topic.voted ?? 0,
        answersList: topic.answersList,
        answers: incoming.answers ?? topic.answers,
      };
    }));
  }, []);

  // Real-time: an answer came in from any connected client (including ourselves on retry)
  const handleIncomingAnswer = useCallback(({ topicId, answer, answers }) => {
    setTopics(prev => prev.map(t => {
      if (t.id !== topicId) return t;
      // Deduplicate: if our optimistic update already added this id, skip
      const already = t.answersList.some(a => a.id === answer.id);
      return {
        ...t,
        answers,
        activity: 'Hozir',
        answersList: already ? t.answersList : [...t.answersList, answer],
      };
    }));
  }, []);

  const handleIncomingAnswerVote = useCallback(({ answerId, score }) => {
    setTopics(prev => prev.map(t => ({
      ...t,
      answersList: t.answersList.map(a => (
        String(a.id) === String(answerId) ? { ...a, score } : a
      )),
    })));
  }, []);

  useForumStream(
    handleIncomingTopic,
    handleInitTopics,
    handleIncomingAnswer,
    handleIncomingVote,
    handleIncomingAccept,
    handleIncomingAnswerVote,
    handleIncomingTopicModeration,
    null,
    handleIncomingAnswerDeleted,
    handleIncomingTopicUpdate
  );

  useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  useEffect(() => {
    if (topicsLoaded) return;
    const timer = window.setTimeout(() => {
      setTopics(INITIAL_TOPICS.map(withTopicCreatedAt));
      setUsingDemoTopics(true);
      setTopicsLoaded(true);
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [topicsLoaded]);

  // After login or topics load, sync saved state + per-user vote state from the server
  useEffect(() => {
    if (!topicsLoaded) return undefined;
    if (!user || !token) {
      voteStateRef.current = {};
      setAnswerVotes({});
      setTopics((current) => current.map((topic) => ({ ...topic, saved: false, voted: 0 })));
      return undefined;
    }

    let active = true;
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${BACKEND}/api/forum/saved`, { headers }).then((response) => {
        if (!response.ok) throw new Error('saved state failed');
        return response.json();
      }),
      fetch(`${BACKEND}/api/forum/my-votes`, { headers }).then((response) => {
        if (!response.ok) throw new Error('vote state failed');
        return response.json();
      }),
      fetch(`${BACKEND}/api/forum/my-answer-votes`, { headers }).then((response) => {
        if (!response.ok) throw new Error('answer vote state failed');
        return response.json();
      }),
    ]).then(([savedIds, myVotes, myAnswerVotes]) => {
      if (!active) return;
      const savedSet = new Set(savedIds.map(Number));
      voteStateRef.current = Object.fromEntries(
        Object.entries(myVotes).map(([topicId, direction]) => [Number(topicId), Number(direction)])
      );
      setAnswerVotes(Object.fromEntries(
        Object.entries(myAnswerVotes).map(([answerId, direction]) => [Number(answerId), Number(direction)])
      ));
      setTopics(prev => prev.map(t => ({
        ...t,
        saved:  savedSet.has(t.id),
        voted:  voteStateRef.current[t.id] ?? 0,
      })));
    }).catch(() => {
      if (!active) return;
      voteStateRef.current = {};
      setAnswerVotes({});
      setTopics((current) => current.map((topic) => ({ ...topic, saved: false, voted: 0 })));
    });

    return () => {
      active = false;
    };
  }, [user?.id, topicsLoaded, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(""), 2200);
  };

  const filteredTopics = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = topics.filter((topic) => {
      const byCategory = activeCategory === "all" || topic.category === activeCategory;
      const byQuery =
        !normalizedQuery ||
        [topic.title, topic.summary, topic.formula, topic.author, ...topic.tags]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const bySort =
        activeSort === "recent" ||
        activeSort === "hot" ||
        (activeSort === "unanswered" && topic.answers === 0) ||
        (activeSort === "saved" && topic.saved);

      return byCategory && byQuery && bySort;
    });

    return [...filtered].sort((first, second) => {
      if (first.pinned !== second.pinned) return first.pinned ? -1 : 1;
      if (activeSort === "hot") return second.score + second.answers * 8 - (first.score + first.answers * 8);
      return second.id - first.id;
    });
  }, [activeCategory, activeSort, query, topics]);

  const categoryCounts = useMemo(() => {
    const counts = Object.fromEntries(CATEGORIES.map((category) => [category.id, 0]));
    topics.forEach((topic) => {
      counts.all += 1;
      if (topic.category && topic.category !== "all") {
        counts[topic.category] = (counts[topic.category] || 0) + 1;
      }
    });
    return counts;
  }, [topics]);

  const activeCategoryName = t(
    CATEGORIES.find((item) => item.id === activeCategory)?.labelKey || 'forum.all'
  );

  const handleVote = async (topicId, direction) => {
    if (!user) { setShowAuth(true); return; }
    if (usingDemoTopics) {
      showToast(t('forum.demoVote'));
      return;
    }
    if (pendingVoteIdsRef.current.has(topicId)) return;

    const currentTopic = topics.find((topic) => topic.id === topicId);
    if (!currentTopic) return;
    const previous = { score: currentTopic.score, voted: currentTopic.voted ?? 0 };
    const toggling = previous.voted === direction;
    const optimistic = {
      score: previous.score + (toggling ? -direction : direction - previous.voted),
      voted: toggling ? 0 : direction,
    };

    pendingVoteIdsRef.current.add(topicId);
    setPendingVoteIds(new Set(pendingVoteIdsRef.current));
    voteStateRef.current = { ...voteStateRef.current, [topicId]: optimistic.voted };
    setTopics((current) => current.map((topic) => (
      topic.id === topicId ? { ...topic, ...optimistic } : topic
    )));

    try {
      const response = await fetch(`${BACKEND}/api/forum/topics/${topicId}/vote`, {
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

      voteStateRef.current = { ...voteStateRef.current, [topicId]: serverVoted };
      setTopics((current) => current.map((topic) => (
        topic.id === topicId ? { ...topic, score: serverScore, voted: serverVoted } : topic
      )));
      showToast(serverVoted === 0 ? t('forum.voteRemoved') : t('forum.voteSaved'));
    } catch {
      voteStateRef.current = { ...voteStateRef.current, [topicId]: previous.voted };
      setTopics((current) => current.map((topic) => (
        topic.id === topicId ? { ...topic, ...previous } : topic
      )));
      showToast(t('forum.voteFailed'));
    } finally {
      pendingVoteIdsRef.current.delete(topicId);
      setPendingVoteIds(new Set(pendingVoteIdsRef.current));
    }
  };

  const handleAnswerVote = async (answerId, direction) => {
    if (!user) { setShowAuth(true); return; }
    if (usingDemoTopics) {
      showToast(t('forum.demoVote'));
      return;
    }
    if (pendingAnswerVoteIdsRef.current.has(answerId)) return;

    const topicWithAnswer = topics.find((topic) => (
      topic.answersList.some((answerItem) => String(answerItem.id) === String(answerId))
    ));
    const currentAnswer = topicWithAnswer?.answersList.find((answerItem) => String(answerItem.id) === String(answerId));
    if (!currentAnswer) return;

    const previous = {
      score: currentAnswer.score,
      voted: answerVotes[answerId] ?? 0,
    };
    const toggling = previous.voted === direction;
    const optimisticVoted = toggling ? 0 : direction;
    const scoreDelta = toggling ? -direction : direction - previous.voted;

    pendingAnswerVoteIdsRef.current.add(answerId);
    setPendingAnswerVoteIds(new Set(pendingAnswerVoteIdsRef.current));
    setAnswerVotes((current) => ({ ...current, [answerId]: optimisticVoted }));
    setTopics((current) => current.map((topic) => ({
      ...topic,
      answersList: topic.answersList.map((answerItem) => (
        String(answerItem.id) === String(answerId)
          ? { ...answerItem, score: answerItem.score + scoreDelta }
          : answerItem
      )),
    })));

    try {
      const response = await fetch(`${BACKEND}/api/forum/answers/${answerId}/vote`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ delta: direction }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'answer vote failed');

      const serverScore = Number(result.score);
      const serverVoted = Number(result.voted);
      if (!Number.isFinite(serverScore) || ![-1, 0, 1].includes(serverVoted)) {
        throw new Error('invalid answer vote response');
      }

      setAnswerVotes((current) => ({ ...current, [answerId]: serverVoted }));
      setTopics((current) => current.map((topic) => ({
        ...topic,
        answersList: topic.answersList.map((answerItem) => (
          String(answerItem.id) === String(answerId)
            ? { ...answerItem, score: serverScore }
            : answerItem
        )),
      })));
      showToast(serverVoted === 0 ? t('forum.voteRemoved') : t('forum.voteSaved'));
    } catch {
      setAnswerVotes((current) => ({ ...current, [answerId]: previous.voted }));
      setTopics((current) => current.map((topic) => ({
        ...topic,
        answersList: topic.answersList.map((answerItem) => (
          String(answerItem.id) === String(answerId)
            ? { ...answerItem, score: previous.score }
            : answerItem
        )),
      })));
      showToast(t('forum.voteFailed'));
    } finally {
      pendingAnswerVoteIdsRef.current.delete(answerId);
      setPendingAnswerVoteIds(new Set(pendingAnswerVoteIdsRef.current));
    }
  };

  const handleSave = (topicId) => {
    if (!user) { setShowAuth(true); return; }
    // Optimistic toggle
    setTopics(prev => prev.map(t => t.id === topicId ? { ...t, saved: !t.saved } : t));
    showToast(t('forum.savedUpdated'));
    // Persist — backend toggles and returns authoritative saved state
    fetch(`${BACKEND}/api/forum/topics/${topicId}/save`, {
      method: 'POST',
      headers: authHeaders(),
    }).then(r => r.ok ? r.json() : Promise.reject())
      .then(({ saved }) => {
        setTopics(prev => prev.map(t => t.id === topicId ? { ...t, saved } : t));
      })
      .catch(() => {
        // Revert optimistic update on error
        setTopics(prev => prev.map(t => t.id === topicId ? { ...t, saved: !t.saved } : t));
      });
  };

  const handleAddAnswer = (topicId, text) => {
    if (!user) { setShowAuth(true); return; }
    const nowLabel = t('common.now');

    const answer = {
      id:       Date.now(),
      author:   user.name,
      initials: user.initials,
      role:     user.role,
      accepted: false,
      score:    0,
      text,
    };

    // Optimistic update
    setTopics(prev => prev.map(t =>
      t.id === topicId
        ? { ...t, answers: t.answers + 1, activity: nowLabel,
            answersList: [...t.answersList, answer] }
        : t
    ));
    showToast(t('forum.answerSent'));

    // Persist + broadcast
    fetch(`${BACKEND}/api/forum/topics/${topicId}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(answer),
    }).catch(() => {});
  };

  const handleCreateTopic = async (form) => {
    const tags = form.tags
      .split(",")
      .map((tag) => tag.trim().replace(/^#/, ""))
      .filter(Boolean)
      .slice(0, 4);

    const payload = {
      category:     form.category,
      title:        form.title.trim(),
      summary:      form.summary.trim(),
      tags:         tags.length ? tags : ["savol"],
      images:       form.images,
      score:        1,
      answers:      0,
      views:        '1',
      activity:     t('common.now'),
      created_at:   new Date().toISOString(),
      participants: [user.initials],
      saved:        false,
      voted:        0,
      solved:       false,
      answersList:  [],
    };

    // Await the server so we get the real DB-assigned id
    const r = await fetch(`${BACKEND}/api/forum/topics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      showToast(t('forum.topicCreateError'));
      throw new Error(`create failed: ${r.status}`);
    }
    const { id: realId } = await r.json();

    // SSE will broadcast this topic to other clients; add it locally for the creator
    const newTopic = { ...payload, id: realId, author: user.name, initials: user.initials, role: user.role };
    setTopics(prev => prev.some(t => t.id === realId) ? prev : [newTopic, ...prev]);
    setShowComposer(false);
    showToast(t('forum.topicCreated'));
    navigate(`/q/${realId}`);
  };

  return (
    <Layout
      theme={theme}
      onThemeToggle={onThemeToggle}
      onCompose={() => setShowComposer(true)}
      query={query}
      onQuery={setQuery}
    >
      {toast && <Toast message={toast} />}

      <main className="layout" id="forum">
        <aside className="side-panel">
          <div className="panel-section">
            <span className="panel-label">{t('forum.categories')}</span>
            <div className="category-list">
              {CATEGORIES.map((category) => (
                <button
                  className={activeCategory === category.id ? "is-active" : ""}
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  type="button"
                >
                  <CategoryMark categoryId={category.id} />
                  <span>{t(category.labelKey)}</span>
                  <strong>{categoryCounts[category.id] ?? 0}</strong>
                </button>
              ))}
            </div>
          </div>

          <div className="panel-card mastery-widget">
            <svg width="0" height="0" style={{ position: 'absolute' }}>
              <defs>
                <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" />
                  <stop offset="100%" stopColor="var(--blue)" />
                </linearGradient>
              </defs>
            </svg>
            <div className="mastery-top">
              <div className="mastery-ring">
                <svg width="52" height="52" viewBox="0 0 52 52">
                  <circle className="mastery-ring-bg" cx="26" cy="26" r="18" />
                  <circle className="mastery-ring-fill" cx="26" cy="26" r="18" />
                </svg>
                <span className="mastery-pct">78%</span>
              </div>
              <div className="mastery-info">
                <strong>Elementalist</strong>
                <span>{t('forum.masteryLevel')}</span>
              </div>
            </div>
            <div className="mastery-bar-wrap">
              <div className="mastery-bar" />
            </div>
            <div className="mastery-stats">
              <div className="mastery-stat">
                <strong>245</strong>
                <span>{t('forum.upvotes')}</span>
              </div>
              <div className="mastery-stat">
                <strong>38</strong>
                <span>{t('forum.answers')}</span>
              </div>
              <div className="mastery-stat">
                <strong>50</strong>
                <span>{t('forum.shared')}</span>
              </div>
            </div>
          </div>

          <div className="panel-card sprint-card">
            <div className="section-heading">
              <h3>{t('forum.dailySprint')}</h3>
              <span>2 / 3</span>
            </div>
            <p>{t('forum.sprintText')}</p>
            <div className="progress">
              <span style={{ width: "66%" }} />
            </div>
          </div>

          <div className="panel-section mobile-hidden">
            <span className="panel-label">{t('forum.trendingTags')}</span>
            <div className="trend-tags">
              {TRENDING_TAGS.map((tag) => (
                <button key={tag} onClick={() => setQuery(tag)} type="button">
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="feed">
          <div className="feed-toolbar">
            <div>
              <span className="eyebrow">{activeCategoryName}</span>
              <h2>{t('forum.feed')}</h2>
            </div>

            <div className="toolbar-actions">
              <div className="segmented-control" role="tablist">
                {SORTS.map((sort) => (
                  <button
                    aria-selected={activeSort === sort.id}
                    className={activeSort === sort.id ? "is-active" : ""}
                    key={sort.id}
                    onClick={() => setActiveSort(sort.id)}
                    role="tab"
                    type="button"
                  >
                    <Icon name={sort.icon} size={15} />
                    {t(sort.labelKey)}
                  </button>
                ))}
              </div>
              <button
                className="soft-button density-toggle"
                onClick={() => setDensity((current) => (current === "comfortable" ? "compact" : "comfortable"))}
                type="button"
              >
                <Icon name="layout" size={16} />
                {density === "comfortable" ? t('forum.compact') : t('forum.spacious')}
              </button>
            </div>
          </div>

          <div className="topic-list">
            {usingDemoTopics && (
              <div className="demo-data-banner">
                <strong>{t('forum.demoMode')}</strong>
                <span>{t('forum.demoText')}</span>
              </div>
            )}
            {!topicsLoaded ? (
              <div className="empty-state">
                <span>{t('common.loading')}</span>
              </div>
            ) : filteredTopics.length === 0 ? (
              <div className="empty-state">
                <Icon name="filter" size={24} />
                <strong>{t('forum.noResults')}</strong>
                <span>{t('forum.noResultsHint')}</span>
              </div>
            ) : (
              filteredTopics.map((topic) => (
                <TopicCard
                  density={density}
                  key={topic.id}
                  onOpen={openTopic}
                  onSave={handleSave}
                  onVote={handleVote}
                  onTagClick={tag => setQuery(tag)}
                  topic={topic}
                  votePending={usingDemoTopics || pendingVoteIds.has(topic.id)}
                />
              ))
            )}
          </div>
        </section>

        <InsightsPanel onSpotlightClick={() => setQuery("reaksiya")} />
      </main>

      <button
        aria-label={t('header.askQuestion')}
        className="floating-compose"
        title={t('header.askQuestion')}
        type="button"
        onClick={() => user ? setShowComposer(true) : setShowAuth(true)}
      >
        <Icon name="plus" size={22} />
      </button>

      {/* Mobile sort bar — only visible on small screens within the forum */}
      <div className="mobile-sort-bar">
        {SORTS.map((sort) => (
          <button
            className={activeSort === sort.id ? "is-active" : ""}
            key={sort.id}
            onClick={() => setActiveSort(sort.id)}
            type="button"
          >
            <Icon name={sort.icon} size={15} />
            {t(sort.labelKey)}
          </button>
        ))}
      </div>

      {showComposer && <ComposerModal onClose={() => setShowComposer(false)} onSubmit={handleCreateTopic} />}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={() => showToast(t('auth.welcome'))} />}
    </Layout>
  );
}
