import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import BrandMark from "../components/BrandMark";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useLanguage } from "../context/LanguageContext";

const FEATURE_CARDS = [
  {
    code: "01",
    titleKey: "home.feature1Title",
    textKey: "home.feature1Text",
    accent: "teal",
  },
  {
    code: "02",
    titleKey: "home.feature2Title",
    textKey: "home.feature2Text",
    accent: "blue",
  },
  {
    code: "03",
    titleKey: "home.feature3Title",
    textKey: "home.feature3Text",
    accent: "amber",
  },
  {
    code: "04",
    titleKey: "home.feature4Title",
    textKey: "home.feature4Text",
    accent: "violet",
  },
];

const MOLECULE_ATOMS = [
  { id: "oLeft", type: "oxygen", x: 30, y: 286, r: 28 },
  { id: "hLeft", type: "hydrogen", x: 82, y: 294, r: 21 },
  { id: "c1", type: "carbon", x: 140, y: 268, r: 34 },
  { id: "c2", type: "carbon", x: 222, y: 218, r: 39 },
  { id: "oTop", type: "oxygen", x: 246, y: 112, r: 30 },
  { id: "hTop", type: "hydrogen", x: 216, y: 55, r: 24 },
  { id: "c3", type: "carbon", x: 345, y: 194, r: 43 },
  { id: "hCenter", type: "hydrogen", x: 357, y: 87, r: 24 },
  { id: "oBottom", type: "oxygen", x: 356, y: 318, r: 32 },
  { id: "c4", type: "carbon", x: 465, y: 216, r: 36 },
  { id: "hTopRight", type: "hydrogen", x: 495, y: 102, r: 23 },
  { id: "c5", type: "carbon", x: 552, y: 178, r: 34 },
  { id: "oRight", type: "oxygen", x: 636, y: 226, r: 31 },
  { id: "hRight", type: "hydrogen", x: 698, y: 177, r: 23 },
  { id: "c6", type: "carbon", x: 534, y: 314, r: 33 },
  { id: "oBranch", type: "oxygen", x: 611, y: 342, r: 29 },
  { id: "hBranch", type: "hydrogen", x: 665, y: 376, r: 21 },
  { id: "hLower", type: "hydrogen", x: 488, y: 386, r: 21 },
];

const MOLECULE_BONDS = [
  ["oLeft", "hLeft", 17],
  ["hLeft", "c1", 19],
  ["c1", "c2", 24],
  ["c2", "oTop", 22],
  ["oTop", "hTop", 18],
  ["c2", "c3", 24],
  ["c3", "hCenter", 18],
  ["c3", "oBottom", 24],
  ["c3", "c4", 25],
  ["c4", "hTopRight", 18],
  ["c4", "c5", 24],
  ["c5", "oRight", 22],
  ["oRight", "hRight", 18],
  ["c4", "c6", 23],
  ["c6", "oBranch", 21],
  ["oBranch", "hBranch", 17],
  ["c6", "hLower", 17],
];

const atomById = Object.fromEntries(MOLECULE_ATOMS.map((atom) => [atom.id, atom]));

function MoleculeBackground() {
  const atomFill = {
    carbon: "url(#landingAtomCarbon)",
    oxygen: "url(#landingAtomOxygen)",
    hydrogen: "url(#landingAtomHydrogen)",
  };

  return (
    <svg className="landing-molecule-svg" viewBox="0 0 740 440" aria-hidden="true">
      <defs>
        <radialGradient id="landingAtomCarbon" cx="34%" cy="24%" r="72%">
          <stop offset="0%" stopColor="#5f6878" />
          <stop offset="38%" stopColor="#111318" />
          <stop offset="100%" stopColor="#020304" />
        </radialGradient>
        <radialGradient id="landingAtomOxygen" cx="32%" cy="24%" r="72%">
          <stop offset="0%" stopColor="#fff1e8" />
          <stop offset="30%" stopColor="#ff3a2e" />
          <stop offset="100%" stopColor="#720400" />
        </radialGradient>
        <radialGradient id="landingAtomHydrogen" cx="30%" cy="22%" r="76%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="42%" stopColor="#e5ecff" />
          <stop offset="100%" stopColor="#526fd0" />
        </radialGradient>
        <linearGradient id="landingMoleculeBond" x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stopColor="#8fa7cf" />
          <stop offset="42%" stopColor="#fff0cf" />
          <stop offset="100%" stopColor="#c8d6ef" />
        </linearGradient>
        <filter id="landingMoleculeShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#000000" floodOpacity="0.45" />
        </filter>
      </defs>
      <ellipse className="landing-molecule-ground" cx="390" cy="372" rx="290" ry="48" />
      <g className="landing-molecule-bonds" filter="url(#landingMoleculeShadow)">
        {MOLECULE_BONDS.map(([from, to, width]) => {
          const a = atomById[from];
          const b = atomById[to];
          return (
            <g key={`${from}-${to}`}>
              <line className="landing-molecule-bond" x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={width} />
              <line className="landing-molecule-bond-shine" x1={a.x} y1={a.y - 2} x2={b.x} y2={b.y - 2} strokeWidth={Math.max(4, width * 0.28)} />
            </g>
          );
        })}
      </g>
      <g className="landing-molecule-atoms" filter="url(#landingMoleculeShadow)">
        {MOLECULE_ATOMS.map((atom) => (
          <g key={atom.id}>
            <circle className="landing-molecule-atom" cx={atom.x} cy={atom.y} r={atom.r} fill={atomFill[atom.type]} />
            <circle className="landing-molecule-atom-gloss" cx={atom.x - atom.r * 0.28} cy={atom.y - atom.r * 0.3} r={Math.max(5, atom.r * 0.2)} />
          </g>
        ))}
      </g>
    </svg>
  );
}

function HomeIcon({ name }) {
  const icons = {
    spark: "M12 2l1.6 5.2L19 9l-5.4 1.8L12 16l-1.6-5.2L5 9l5.4-1.8L12 2ZM5 16l.8 2.6L8.5 20l-2.7 1.4L5 24l-.8-2.6L1.5 20l2.7-1.4L5 16Z",
    arrow: "M5 12h14M13 6l6 6-6 6",
    message: "M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z",
    atom: "M12 12h.01M19.1 4.9c2.1 2.1-.5 8.2-5.8 13.5-5.3 5.3-11.4 7.9-13.5 5.8-2.1-2.1.5-8.2 5.8-13.5C10.9 5.4 17 2.8 19.1 4.9ZM4.9 4.9C2.8 7 5.4 13.1 10.7 18.4c5.3 5.3 11.4 7.9 13.5 5.8 2.1-2.1-.5-8.2-5.8-13.5C13.1 5.4 7 2.8 4.9 4.9Z",
  };

  return (
    <svg aria-hidden="true" className="landing-icon" fill="none" viewBox="0 0 24 24">
      <path d={icons[name]} />
    </svg>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const pageRef = useRef(null);
  const scrollAnimationRef = useRef(0);
  const communityItems = t('home.communityItems');

  useEffect(() => {
    const node = pageRef.current;
    if (!node) return undefined;

    const handlePointerMove = (event) => {
      const rect = node.getBoundingClientRect();
      node.style.setProperty("--pointer-x", `${event.clientX - rect.left}px`);
      node.style.setProperty("--pointer-y", `${event.clientY - rect.top}px`);
    };

    node.addEventListener("pointermove", handlePointerMove);
    return () => node.removeEventListener("pointermove", handlePointerMove);
  }, []);

  useEffect(() => {
    const node = pageRef.current;
    if (!node) return undefined;

    const revealItems = Array.from(node.querySelectorAll("[data-landing-reveal]"));
    if (!revealItems.length) return undefined;

    if (!("IntersectionObserver" in window)) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.16,
      }
    );

    revealItems.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (scrollAnimationRef.current) {
        window.cancelAnimationFrame(scrollAnimationRef.current);
      }
    };
  }, []);

  const animateToSection = useCallback((target) => {
    if (!target) return;

    if (scrollAnimationRef.current) {
      window.cancelAnimationFrame(scrollAnimationRef.current);
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const headerHeight = pageRef.current?.querySelector(".landing-header")?.getBoundingClientRect().height || 0;
    const start = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const targetTop = target.getBoundingClientRect().top + start - headerHeight - 18;
    const end = Math.max(0, Math.min(targetTop, maxScroll));
    const distance = end - start;

    if (prefersReducedMotion || Math.abs(distance) < 2) {
      window.scrollTo(0, end);
      window.history.replaceState(null, "", `#${target.id}`);
      scrollAnimationRef.current = 0;
      return;
    }

    const duration = Math.min(1350, Math.max(760, Math.abs(distance) * 0.58));
    const startedAt = window.performance.now();
    const easeInOutCubic = (progress) =>
      progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    const step = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      window.scrollTo(0, start + distance * easeInOutCubic(progress));

      if (progress < 1) {
        scrollAnimationRef.current = window.requestAnimationFrame(step);
        return;
      }

      window.history.replaceState(null, "", `#${target.id}`);
      scrollAnimationRef.current = 0;
    };

    scrollAnimationRef.current = window.requestAnimationFrame(step);
  }, []);

  const handleSectionLink = useCallback((event, sectionId) => {
    const target = document.getElementById(sectionId);
    if (!target) return;
    event.preventDefault();
    animateToSection(target);
  }, [animateToSection]);

  const openChat = () => navigate("/forum");

  return (
    <div className="landing-page" ref={pageRef}>
      <div className="landing-background" aria-hidden="true">
        <div className="landing-grid" />
        <div className="landing-light-field" />
        <div className="landing-lines">
          {Array.from({ length: 12 }).map((_, index) => (
            <span key={`line-${index}`} style={{ "--line-index": index }} />
          ))}
        </div>
        <div className="landing-molecule-stage">
          <MoleculeBackground />
        </div>
        <div className="landing-scan" />
      </div>

      <header className="landing-header">
        <button className="landing-brand" type="button" onClick={openChat} aria-label={t('home.openChat')}>
          <span className="landing-brand-mark">
            <BrandMark />
          </span>
          <span>
            <strong>ChemOlymp</strong>
            <small>{t('home.chemistryChat')}</small>
          </span>
        </button>

        <nav className="landing-nav" aria-label={t('nav.main')}>
          <a href="#home" onClick={(event) => handleSectionLink(event, "home")}>{t('home.home')}</a>
          <a href="#features" onClick={(event) => handleSectionLink(event, "features")}>{t('home.features')}</a>
          <a href="#about" onClick={(event) => handleSectionLink(event, "about")}>{t('home.about')}</a>
          <a href="#community" onClick={(event) => handleSectionLink(event, "community")}>{t('home.community')}</a>
        </nav>

        <LanguageSwitcher className="landing-language-switcher" />
        <button className="landing-header-cta" type="button" onClick={openChat}>
          <HomeIcon name="message" />
          {t('nav.chat')}
        </button>
      </header>

      <main>
        <section className="landing-hero is-visible" id="home" data-landing-reveal>
          <div className="landing-hero-copy">
            <div className="landing-eyebrow">
              <span />
              {t('home.eyebrow')}
            </div>
            <h1>
              <span>{t('home.title1')}</span>
              <span>{t('home.title2')}</span>
              <span>{t('home.title3')}</span>
            </h1>
            <p>
              {t('home.intro')}
            </p>

            <div className="landing-actions">
              <button className="landing-primary" type="button" onClick={openChat}>
                {t('home.openChat')}
                <HomeIcon name="arrow" />
              </button>
              <a className="landing-secondary" href="#features" onClick={(event) => handleSectionLink(event, "features")}>
                {t('home.features')}
              </a>
            </div>

            <div className="landing-metrics" aria-label="ChemOlymp">
              <div>
                <strong>24/7</strong>
                <span>{t('home.questionFlow')}</span>
              </div>
              <div>
                <strong>4+</strong>
                <span>{t('home.chemistrySections')}</span>
              </div>
              <div>
                <strong>{t('common.soon')}</strong>
                <span>{t('home.lessonsMode')}</span>
              </div>
            </div>
          </div>

          <button className="landing-chat-preview" type="button" onClick={openChat} aria-label={t('home.openChat')}>
            <div className="preview-reactor" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="preview-notice preview-notice--top">
              <span className="notice-dot" />
              {t('home.mentorAnswered')}
            </div>
            <div className="preview-notice preview-notice--bottom">
              <span className="notice-dot" />
              {t('home.newDiscussions', { count: 12 })}
            </div>
            <div className="preview-phone">
              <div className="preview-phone-top">
                <span>9:41</span>
                <span>ChemOlymp live</span>
              </div>
              <div className="preview-search">{t('home.reactionSearch')}</div>
              <div className="preview-thread preview-thread--hot">
                <span className="preview-badge">{t('forum.hot')}</span>
                <strong>{t('home.grignardQuestion')}</strong>
                <p>CH3CH2MgBr + HCHO {"->"} ?</p>
              </div>
              <div className="preview-message preview-message--left">
                <span>AK</span>
                <p>{t('home.mentorMessage')}</p>
              </div>
              <div className="preview-message preview-message--right">
                <span>KT</span>
                <p>{t('home.learnerMessage')}</p>
              </div>
              <div className="preview-thread">
                <span className="preview-badge preview-badge--green">{t('common.solved')}</span>
                <strong>{t('home.pressureQuestion')}</strong>
                <p>N2 + 3H2 ⇌ 2NH3</p>
              </div>
              <div className="preview-composer">
                <span>{t('home.writeQuestion')}</span>
                <b>+</b>
              </div>
            </div>
          </button>
        </section>

        <div className="landing-marquee" aria-hidden="true" data-landing-reveal>
          <div>
            {communityItems.concat(communityItems).map((item, index) => (
              <span key={`${item}-${index}`}>{item}</span>
            ))}
          </div>
        </div>

        <section className="landing-section" id="features" data-landing-reveal>
          <div className="landing-section-head">
            <span className="landing-eyebrow">
              <span />
              {t('home.features')}
            </span>
            <h2>{t('home.featuresHeading')}</h2>
          </div>

          <div className="landing-feature-grid">
            {FEATURE_CARDS.map((feature) => (
              <article className={`landing-feature landing-feature--${feature.accent}`} key={feature.code}>
                <span>{feature.code}</span>
                <h3>{t(feature.titleKey)}</h3>
                <p>{t(feature.textKey)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-about" id="about" data-landing-reveal>
          <div className="landing-about-copy">
            <span className="landing-eyebrow">
              <span />
              {t('home.about')}
            </span>
            <h2>{t('home.aboutHeading')}</h2>
            <p>{t('home.aboutText')}</p>
          </div>

          <div className="landing-lab-board" aria-label={t('home.roadmap')}>
            <div>
              <strong>{t('home.now')}</strong>
              <span>{t('home.nowItems')}</span>
            </div>
            <div>
              <strong>{t('home.next')}</strong>
              <span>{t('home.nextItems')}</span>
            </div>
            <div>
              <strong>{t('home.later')}</strong>
              <span>{t('home.laterItems')}</span>
            </div>
          </div>
        </section>

        <section className="landing-community" id="community" data-landing-reveal>
          <div className="landing-community-panel">
            <div>
              <span className="landing-eyebrow">
                <span />
                {t('home.community')}
              </span>
              <h2>{t('home.communityHeading')}</h2>
            </div>
            <button className="landing-primary" type="button" onClick={openChat}>
              {t('home.communityChat')}
              <HomeIcon name="arrow" />
            </button>
          </div>

          <div className="landing-community-feed" aria-label={t('home.communitySections')}>
            {communityItems.map((item, index) => (
              <div key={item} style={{ "--feed-index": index }}>
                <span>0{index + 1}</span>
                <strong>{item}</strong>
                <em>{t('common.live')}</em>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
