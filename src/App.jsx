import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import "./App.css";
import { LatexLine, hasLatex } from "./components/Latex";
import { useForumStream } from "./hooks/useForumStream";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthModal from "./components/AuthModal";
import Layout from "./components/Layout";
import InsightsPanel from "./components/InsightsPanel";
import QuestionPage from "./pages/QuestionPage";
import OlimpiadalarPage from "./pages/OlimpiadalarPage";
import ReytingPage from "./pages/ReytingPage";
import ProfilePage from "./pages/ProfilePage";
import { avatarBg } from "./utils/avatarColor";

const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:3002';

const CATEGORIES = [
  { id: "all",       name: "Hammasi",       short: "∑",  color: "#0f766e", count: 0 },
  { id: "organik",   name: "Organik kimyo", short: "Or", color: "#2563eb", count: 0 },
  { id: "anorganik", name: "Anorganik",     short: "An", color: "#7c3aed", count: 0 },
  { id: "fizikaviy", name: "Fizikaviy",     short: "Fk", color: "#0284c7", count: 0 },
  { id: "analitik",  name: "Analitik",      short: "Al", color: "#b42318", count: 0 },
  { id: "dtm",       name: "DTM / Olimp.",  short: "DT", color: "#9a6a20", count: 0 },
];

const SORTS = [
  { id: "recent", label: "So'nggi", icon: "clock" },
  { id: "hot", label: "Qaynoq", icon: "flame" },
  { id: "unanswered", label: "Javobsiz", icon: "message" },
  { id: "saved", label: "Saqlangan", icon: "bookmark" },
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
    voted: 1,
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

const ELEMENT_SYMBOLS = new Set([
  "H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl",
  "Ar", "K", "Ca", "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn", "Ga", "Ge", "As",
  "Se", "Br", "Kr", "Rb", "Sr", "Y", "Zr", "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd", "In",
  "Sn", "Sb", "Te", "I", "Xe", "Cs", "Ba", "La", "Ce", "Pr", "Nd", "Pm", "Sm", "Eu", "Gd", "Tb",
  "Dy", "Ho", "Er", "Tm", "Yb", "Lu", "Hf", "Ta", "W", "Re", "Os", "Ir", "Pt", "Au", "Hg", "Tl",
  "Pb", "Bi", "Po", "At", "Rn", "Fr", "Ra", "Ac", "Th", "Pa", "U", "Np", "Pu",
]);

const SUBSCRIPT = { 0: "₀", 1: "₁", 2: "₂", 3: "₃", 4: "₄", 5: "₅", 6: "₆", 7: "₇", 8: "₈", 9: "₉" };
const SUPERSCRIPT = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹", "+": "⁺", "-": "⁻" };

function toSubscript(value) {
  return value.replace(/[0-9]/g, (digit) => SUBSCRIPT[digit]);
}

function toSuperscript(value) {
  return value.replace(/[0-9+-]/g, (char) => SUPERSCRIPT[char] || char);
}

function parseChemicalFormula(rawToken) {
  const stateMatch = rawToken.match(/(\((?:aq|s|l|g)\))$/i);
  const state = stateMatch?.[1];
  const token = (state ? rawToken.slice(0, -state.length) : rawToken).replace(/[•.]/g, "·");
  if (!token) return null;

  const pieces = [];
  let elementCount = 0;
  let i = 0;
  let afterHydrateDot = false;

  while (i < token.length) {
    const char = token[i];

    if (char === "·") {
      pieces.push({ text: "·", type: "dot" });
      afterHydrateDot = true;
      i += 1;
      continue;
    }

    if (/[0-9]/.test(char)) {
      let number = "";
      while (/[0-9]/.test(token[i])) {
        number += token[i];
        i += 1;
      }

      if ((token[i] === "+" || token[i] === "-") && i === token.length - 1) {
        pieces.push({ text: toSuperscript(`${number}${token[i]}`), type: "sup" });
        i += 1;
      } else if (afterHydrateDot || (pieces.length === 0 && /[A-Z([]/.test(token[i] || ""))) {
        pieces.push({ text: number, type: "coeff" });
      } else {
        pieces.push({ text: toSubscript(number), type: "sub" });
      }
      afterHydrateDot = false;
      continue;
    }

    if (char === "^") {
      i += 1;
      let charge = "";
      while (/[0-9+-]/.test(token[i])) {
        charge += token[i];
        i += 1;
      }
      if (!charge) return null;
      pieces.push({ text: toSuperscript(charge), type: "sup" });
      afterHydrateDot = false;
      continue;
    }

    if ((char === "+" || char === "-") && i === token.length - 1) {
      pieces.push({ text: toSuperscript(char), type: "sup" });
      i += 1;
      afterHydrateDot = false;
      continue;
    }

    if (char === "(" || char === ")" || char === "[" || char === "]") {
      pieces.push({ text: char, type: "plain" });
      i += 1;
      afterHydrateDot = false;
      continue;
    }

    if (/[A-Z]/.test(char)) {
      let symbol = char;
      if (/[a-z]/.test(token[i + 1] || "")) {
        symbol += token[i + 1];
      }
      if (!ELEMENT_SYMBOLS.has(symbol)) return null;
      pieces.push({ text: symbol, type: "element" });
      elementCount += 1;
      i += symbol.length;
      afterHydrateDot = false;
      continue;
    }

    return null;
  }

  const hasChemMarker = /[0-9()[\]^+\-·]/.test(token) || elementCount > 1;
  if (!elementCount || !hasChemMarker) return null;

  if (state) pieces.push({ text: state.toLowerCase(), type: "state" });
  return pieces;
}

function renderChemistryToken(part, key) {
  const arrowMap = { "->": "→", "=>": "→", "<-": "←", "<->": "⇌", "=": "→", "⇌": "⇌", "→": "→", "←": "←" };
  if (arrowMap[part]) {
    return (
      <span className="chem-arrow" key={key}>
        {arrowMap[part]}
      </span>
    );
  }

  if (part === "+") {
    return (
      <span className="chem-plus" key={key}>
        +
      </span>
    );
  }

  if (/^\((aq|s|l|g)\)$/i.test(part)) {
    return (
      <span className="chem-state" key={key}>
        {part.toLowerCase()}
      </span>
    );
  }

  const formula = parseChemicalFormula(part);
  if (!formula) return <span key={key}>{part}</span>;

  return (
    <span className="chem-formula" key={key}>
      {formula.map((piece, index) => (
        <span className={`chem-part chem-part--${piece.type}`} key={`${piece.text}-${index}`}>
          {piece.text}
        </span>
      ))}
    </span>
  );
}

function renderChemistryLine(line, lineIndex) {
  return line
    .split(/(<->|->|=>|<-|=|⇌|→|←|\+|\((?:aq|s|l|g)\)|\d*[A-Z][A-Za-z0-9()[\]^·.-]*(?:[0-9]*[+\-](?![0-9A-Z]))?)/g)
    .map((part, index) => (part ? renderChemistryToken(part, `${lineIndex}-${index}`) : null));
}

function isChemistryLine(line) {
  return /(->|=>|<->|=|⇌|→|←)|\d*[A-Z][A-Za-z0-9()[\]^·.-]*/.test(line);
}

function RichText({ className = "", text }) {
  if (!text) return null;

  return (
    <div className={`rich-text ${className}`}>
      {text.split("\n").map((line, lineIndex) => {
        const isChem = isChemistryLine(line);
        const isLatex = hasLatex(line);
        return (
          <p className={isChem ? "chem-line" : ""} key={lineIndex}>
            {isLatex ? (
              <LatexLine
                text={line}
                renderText={(chunk, i) => renderChemistryLine(chunk, `${lineIndex}-plain-${i}`)}
              />
            ) : (
              renderChemistryLine(line, lineIndex)
            )}
          </p>
        );
      })}
    </div>
  );
}

function AttachmentGallery({ images = [], size = "thumb" }) {
  if (!images.length) return null;

  return (
    <div className={`attachment-gallery attachment-gallery--${size}`}>
      {images.map((image) => (
        <figure key={image.id}>
          <img alt={image.name} src={image.src} />
          <figcaption>{image.name}</figcaption>
        </figure>
      ))}
    </div>
  );
}

function TopicCard({ density, onOpen, onSave, onVote, topic }) {
  const category = CATEGORIES.find((item) => item.id === topic.category) || CATEGORIES[0];

  return (
    <article className={`topic-card topic-card--${density}`} onClick={() => onOpen(topic.id)}>
      <div className="vote-rail" onClick={(event) => event.stopPropagation()}>
        <button
          aria-label="Yuqoriga ovoz berish"
          className={topic.voted === 1 ? "is-active" : ""}
          title="Yuqoriga ovoz"
          onClick={() => onVote(topic.id, 1)}
        >
          <Icon name="arrowUp" size={17} />
        </button>
        <strong>{topic.score}</strong>
        <button
          aria-label="Pastga ovoz berish"
          className={topic.voted === -1 ? "is-danger" : ""}
          title="Pastga ovoz"
          onClick={() => onVote(topic.id, -1)}
        >
          <Icon name="arrowDown" size={17} />
        </button>
      </div>

      <div className="topic-body">
        <div className="topic-meta">
          <CategoryMark categoryId={topic.category} />
          <span style={{ color: category.color }}>{category.name}</span>
          <span>{topic.activity}</span>
          <span>{topic.difficulty}</span>
          {topic.pinned && <span className="pill pill--gold">Mahkamlangan</span>}
          {topic.hot && <span className="pill pill--hot">Qaynoq</span>}
          {topic.solved && <span className="pill pill--ok">Yechilgan</span>}
        </div>

        <h2>{topic.title}</h2>
        <RichText className="topic-summary" text={topic.summary} />

        <AttachmentGallery images={topic.images} />

        <div className="topic-footer">
          <div className="tag-row">
            {topic.tags.map((tag) => (
              <button key={tag} className="tag-chip" type="button">
                #{tag}
              </button>
            ))}
          </div>

          <div className="topic-actions" onClick={(event) => event.stopPropagation()}>
            <span title="Javoblar">
              <Icon name="message" size={16} /> {topic.answers}
            </span>
            <span title="Ko'rishlar">
              <Icon name="eye" size={16} /> {topic.views}
            </span>
            <div className="avatar-stack">
              {topic.participants.slice(0, 4).map((initials) => (
                <Avatar key={initials} initials={initials} name={initials} />
              ))}
            </div>
            <button
              aria-label="Saqlash"
              className={`icon-button ${topic.saved ? "is-saved" : ""}`}
              title="Saqlash"
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

function ThreadDrawer({ onAddAnswer, onClose, onSave, onVote, topic }) {
  const [answer, setAnswer] = useState("");

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
            <span className="eyebrow">Muhokama</span>
            <h2>{topic.title}</h2>
          </div>
          <button aria-label="Yopish" className="icon-button" title="Yopish" onClick={onClose}>
            <Icon name="close" size={19} />
          </button>
        </div>

        <div className="drawer-topic">
          <div className="drawer-votes">
            <button
              aria-label="Yuqoriga ovoz berish"
              className={topic.voted === 1 ? "is-active" : ""}
              onClick={() => onVote(topic.id, 1)}
            >
              <Icon name="arrowUp" size={18} />
            </button>
            <strong>{topic.score}</strong>
            <button
              aria-label="Pastga ovoz berish"
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
            </div>
            <RichText className="topic-summary" text={topic.summary} />
            <AttachmentGallery images={topic.images} size="large" />
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
            {topic.saved ? "Saqlangan" : "Saqlash"}
          </button>
          <button className="soft-button">
            <Icon name="star" size={17} />
            Kuzatish
          </button>
        </div>

        <section className="answers-list">
          <div className="section-heading">
            <h3>{topic.answersList.length || topic.answers} ta javob</h3>
            <span>Eng foydalilari yuqorida</span>
          </div>
          {topic.answersList.length === 0 ? (
            <div className="empty-answer">
              <Icon name="message" size={22} />
              <strong>Hali javob yo'q</strong>
              <span>Birinchi aniq javob shu muhokamani boshlab beradi.</span>
            </div>
          ) : (
            topic.answersList.map((item, index) => (
              <article className={`answer-card ${item.accepted ? "is-accepted" : ""}`} key={`${item.author}-${index}`}>
                <div className="answer-head">
                  <Avatar initials={item.initials} name={item.author} online={item.accepted} />
                  <div>
                    <strong>{item.author}</strong>
                    <span>{item.role}</span>
                  </div>
                  <div className="answer-score">
                    {item.accepted && <Icon name="check" size={16} />}
                    {item.score}
                  </div>
                </div>
                <p>{item.text}</p>
              </article>
            ))
          )}
        </section>

        <form className="answer-box" onSubmit={submitAnswer}>
          <label htmlFor="answer">Javob yozish</label>
          <textarea
            id="answer"
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="Qisqa ishora, formula yoki to'liq yechim yozing..."
            value={answer}
          />
          <button className="primary-button" disabled={!answer.trim()} type="submit">
            <Icon name="send" size={17} />
            Javob yuborish
          </button>
        </form>
      </aside>
    </div>
  );
}

function ComposerModal({ onClose, onSubmit }) {
  const summaryRef = useRef(null);
  const fileInputRef = useRef(null);
  const [mode, setMode] = useState("write");
  const [form, setForm] = useState({
    title: "",
    summary: "",
    category: "organik",
    tags: "organik-kimyo, reaksiya",
    difficulty: "O'rta",
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

  const handleImages = async (event) => {
    const files = Array.from(event.target.files || [])
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, Math.max(0, 4 - form.images.length));

    if (!files.length) return;

    const images = await Promise.all(
      files.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                id: `${file.name}-${file.lastModified}-${file.size}`,
                name: file.name,
                size: file.size,
                src: reader.result,
              });
            reader.readAsDataURL(file);
          })
      )
    );

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

  const submit = (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.summary.trim()) return;
    onSubmit(form);
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
            <span className="eyebrow">Yangi mavzu</span>
            <h2>Yangi kimyo savoli</h2>
          </div>
          <button aria-label="Yopish" className="icon-button" title="Yopish" type="button" onClick={onClose}>
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
            Yozish
          </button>
          <button
            aria-selected={mode === "preview"}
            className={mode === "preview" ? "is-active" : ""}
            onClick={() => setMode("preview")}
            role="tab"
            type="button"
          >
            Ko'rib chiqish
          </button>
        </div>

        {mode === "write" ? (
          <>
            <label>
              Sarlavha
              <input
                onChange={(event) => update("title", event.target.value)}
                placeholder="Masalan: sulfat kislotaning CuO bilan reaksiyasi qanday boradi?"
                value={form.title}
              />
            </label>

            <div className="chem-toolbar" aria-label="Kimyo formulalari asboblari">
              <span>Kimyo</span>
              {[
                { label: "Formula", value: "H2SO4" },
                { label: "Reaksiya", value: "H2SO4 + CuO -> CuSO4 + H2O" },
                { label: "Qaytar", value: "N2 + 3H2 <-> 2NH3" },
                { label: "Zaryad", value: "SO4^2-" },
                { label: "Holat", value: "(aq)" },
                { label: "Cho'kma", value: "Ag+ + Cl- -> AgCl(s)" },
              ].map((item) => (
                <button key={item.label} onClick={() => insertSnippet(item.value)} type="button">
                  {item.label}
                </button>
              ))}
            </div>

            <div className="chem-toolbar latex-toolbar" aria-label="LaTeX kimyo formulalari">
              <span>LaTeX</span>
              {[
                { label: "Kasr",    value: "$\\frac{[A]}{[B]}$" },
                { label: "Daraja",  value: "$x^{2+}$" },
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

            <label>
              Savol matni
              <textarea
                ref={summaryRef}
                onChange={(event) => update("summary", event.target.value)}
                placeholder={"Savolingizni yozing — formulalarni to'g'ridan-to'g'ri qo'shing.\nMasalan: H2SO4 + CuO -> CuSO4 + H2O reaksiyasida...\n$K_{eq}$ qiymati qanday o'zgaradi?"}
                rows={6}
                value={form.summary}
              />
            </label>

            {hasLatex(form.summary) && (
              <div className="latex-live-preview">
                <div className="latex-live-preview-label">Ko'rinishi</div>
                <RichText text={form.summary} />
              </div>
            )}

            <div className="form-grid">
              <label>
                Bo'lim
                <select onChange={(event) => update("category", event.target.value)} value={form.category}>
                  {CATEGORIES.filter((item) => item.id !== "all").map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Daraja
                <select onChange={(event) => update("difficulty", event.target.value)} value={form.difficulty}>
                  <option>Boshlang'ich</option>
                  <option>O'rta</option>
                  <option>Murakkab</option>
                </select>
              </label>
            </div>

            <div className="image-uploader">
              <div>
                <strong>Rasm qo'shish</strong>
                <span>Masala skani, chizma yoki jadval. 4 tagacha rasm.</span>
              </div>
              <input accept="image/*" multiple onChange={handleImages} ref={fileInputRef} type="file" />
              <button className="soft-button" onClick={() => fileInputRef.current?.click()} type="button">
                Rasm tanlash
              </button>
            </div>

            {form.images.length > 0 && (
              <div className="upload-preview">
                {form.images.map((image) => (
                  <figure key={image.id}>
                    <img alt={image.name} src={image.src} />
                    <figcaption>{image.name}</figcaption>
                    <button aria-label={`${image.name} rasmni olib tashlash`} onClick={() => removeImage(image.id)} type="button">
                      <Icon name="close" size={15} />
                    </button>
                  </figure>
                ))}
              </div>
            )}

            <label>
              Teglar
              <input onChange={(event) => update("tags", event.target.value)} value={form.tags} />
            </label>
          </>
        ) : (
          <div className="composer-preview">
            <div className="topic-meta">
              <CategoryMark categoryId={form.category} />
              <span>{CATEGORIES.find((item) => item.id === form.category)?.name}</span>
              <span>{form.difficulty}</span>
            </div>
            <h3>{form.title || "Sarlavha hali yozilmagan"}</h3>
            <RichText text={form.summary || "Savol matni yozilganda bu yerda ko'rinadi."} />
            <AttachmentGallery images={form.images} size="large" />
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
            Bekor qilish
          </button>
          <button className="primary-button" disabled={!form.title.trim() || !form.summary.trim()} type="submit">
            <Icon name="plus" size={17} />
            Mavzu yaratish
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
        <Route path="/" element={<Forum theme={theme} onThemeToggle={toggleTheme} />} />
        <Route path="/olimpiadalar" element={<OlimpiadalarPage theme={theme} onThemeToggle={toggleTheme} />} />
        <Route path="/reyting" element={<ReytingPage theme={theme} onThemeToggle={toggleTheme} />} />
        <Route path="/q/:id" element={<QuestionPage />} />
        <Route path="/u/:username" element={<ProfilePage theme={theme} onThemeToggle={toggleTheme} />} />
      </Routes>
    </AuthProvider>
  );
}

function Forum({ theme, onThemeToggle }) {
  const { user, logout, authHeaders } = useAuth();
  const navigate                  = useNavigate();
  const [showAuth, setShowAuth]   = useState(false);
  const [topics, setTopics] = useState([]);
  const [topicsLoaded, setTopicsLoaded] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeSort, setActiveSort] = useState("recent");
  const [density, setDensity] = useState("comfortable");
  const [query, setQuery] = useState("");
  const openTopic = (id) => navigate(`/q/${id}`);
  const [showComposer, setShowComposer] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimerRef = useRef(null);

  // Real-time: vote update from any client
  const handleIncomingVote = useCallback(({ topicId, score }) => {
    setTopics(prev => prev.map(t => t.id === topicId ? { ...t, score } : t));
  }, []);

  // Real-time: answer accepted by question author
  const handleIncomingAccept = useCallback(({ topicId, answerId }) => {
    setTopics(prev => prev.map(t => {
      if (t.id !== topicId) return t;
      return {
        ...t,
        solved: true,
        answersList: t.answersList.map(a =>
          a.id === answerId ? { ...a, accepted: true } : a
        ),
      };
    }));
  }, []);

  // Real-time: merge all server-stored topics when we first connect
  const handleInitTopics = useCallback((serverTopics) => {
    setTopics(serverTopics);
    setTopicsLoaded(true);
  }, []);

  // Real-time: single new topic broadcast from another device
  const handleIncomingTopic = useCallback((incoming) => {
    setTopics(prev => {
      if (prev.some(t => t.id === incoming.id)) return prev;
      return [incoming, ...prev];
    });
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

  useForumStream(handleIncomingTopic, handleInitTopics, handleIncomingAnswer, handleIncomingVote, handleIncomingAccept);

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

  const activeCategoryName = CATEGORIES.find((item) => item.id === activeCategory)?.name || "Hammasi";

  const handleVote = (topicId, direction) => {
    setTopics((currentTopics) =>
      currentTopics.map((topic) => {
        if (topic.id !== topicId) return topic;
        const alreadyVoted = topic.voted === direction;
        const delta = alreadyVoted ? -direction : direction - topic.voted;
        // Optimistic local update
        const newTopic = { ...topic, score: topic.score + delta, voted: alreadyVoted ? 0 : direction };
        // Persist + broadcast to other clients
        fetch(`${BACKEND}/api/forum/topics/${topicId}/vote`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ delta }),
        }).catch(() => {});
        return newTopic;
      })
    );
    showToast(direction > 0 ? "Ovoz qo'shildi" : "Ovoz yangilandi");
  };

  const handleSave = (topicId) => {
    setTopics((currentTopics) =>
      currentTopics.map((topic) => (topic.id === topicId ? { ...topic, saved: !topic.saved } : topic))
    );
    showToast("Saqlanganlar yangilandi");
  };

  const handleAddAnswer = (topicId, text) => {
    if (!user) { setShowAuth(true); return; }

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
        ? { ...t, answers: t.answers + 1, activity: "Hozir",
            answersList: [...t.answersList, answer] }
        : t
    ));
    showToast("Javob yuborildi");

    // Persist + broadcast
    fetch(`${BACKEND}/api/forum/topics/${topicId}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(answer),
    }).catch(() => {});
  };

  const handleCreateTopic = (form) => {
    const tags = form.tags
      .split(",")
      .map((tag) => tag.trim().replace(/^#/, ""))
      .filter(Boolean)
      .slice(0, 4);

    const newTopic = {
      id: Date.now(),
      category: form.category,
      title: form.title.trim(),
      summary: form.summary.trim(),
      tags: tags.length ? tags : ["savol"],
      images: form.images,
      author: "Siz",
      initials: "SZ",
      role: "Ishtirokchi",
      score: 1,
      answers: 0,
      views: 1,
      activity: "Hozir",
      difficulty: form.difficulty,
      participants: ["SZ"],
      saved: false,
      voted: 1,
      solved: false,
      answersList: [],
    };

    setTopics((currentTopics) => [newTopic, ...currentTopics]);
    setShowComposer(false);
    showToast("Mavzu yaratildi");
    navigate(`/q/${newTopic.id}`);

    // Persist + broadcast
    fetch(`${BACKEND}/api/forum/topics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(newTopic),
    }).catch(() => {});
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
            <span className="panel-label">Bo'limlar</span>
            <div className="category-list">
              {CATEGORIES.map((category) => (
                <button
                  className={activeCategory === category.id ? "is-active" : ""}
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  type="button"
                >
                  <CategoryMark categoryId={category.id} />
                  <span>{category.name}</span>
                  <strong>{category.count}</strong>
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
                <span>Mastery darajasi</span>
              </div>
            </div>
            <div className="mastery-bar-wrap">
              <div className="mastery-bar" />
            </div>
            <div className="mastery-stats">
              <div className="mastery-stat">
                <strong>245</strong>
                <span>Upvotes</span>
              </div>
              <div className="mastery-stat">
                <strong>38</strong>
                <span>Javoblar</span>
              </div>
              <div className="mastery-stat">
                <strong>50</strong>
                <span>Ulashdi</span>
              </div>
            </div>
          </div>

          <div className="panel-card sprint-card">
            <div className="section-heading">
              <h3>Kunlik sprint</h3>
              <span>2 / 3</span>
            </div>
            <p>Bugun uchta kimyo muhokamada foydali izoh qoldiring.</p>
            <div className="progress">
              <span style={{ width: "66%" }} />
            </div>
          </div>

          <div className="panel-section mobile-hidden">
            <span className="panel-label">Ommabop teglar</span>
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
              <h2>Savollar oqimi</h2>
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
                    {sort.label}
                  </button>
                ))}
              </div>
              <button
                className="soft-button density-toggle"
                onClick={() => setDensity((current) => (current === "comfortable" ? "compact" : "comfortable"))}
                type="button"
              >
                <Icon name="layout" size={16} />
                {density === "comfortable" ? "Ixcham" : "Keng"}
              </button>
            </div>
          </div>

          <div className="topic-list">
            {!topicsLoaded ? (
              <div className="empty-state">
                <span>Yuklanmoqda…</span>
              </div>
            ) : filteredTopics.length === 0 ? (
              <div className="empty-state">
                <Icon name="filter" size={24} />
                <strong>Natija topilmadi</strong>
                <span>Boshqa so'z yoki fan bilan qidirib ko'ring.</span>
              </div>
            ) : (
              filteredTopics.map((topic) => (
                <TopicCard
                  density={density}
                  key={topic.id}
                  onOpen={openTopic}
                  onSave={handleSave}
                  onVote={handleVote}
                  topic={topic}
                />
              ))
            )}
          </div>
        </section>

        <InsightsPanel onSpotlightClick={() => setQuery("reaksiya")} />
      </main>

      <button
        aria-label="Savol berish"
        className="floating-compose"
        title="Savol berish"
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
            {sort.label}
          </button>
        ))}
      </div>

      {showComposer && <ComposerModal onClose={() => setShowComposer(false)} onSubmit={handleCreateTopic} />}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={() => showToast("Xush kelibsiz!")} />}
    </Layout>
  );
}
