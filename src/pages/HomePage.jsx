import { useEffect, useRef } from "react";
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

const FLOATING_SYMBOLS = ["H2SO4", "NaCl", "pH", "CuSO4", "K_eq", "NH3", "C6H6", "Delta G"];

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

  const openChat = () => navigate("/chat");

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
        <div className="landing-symbol-cloud">
          {FLOATING_SYMBOLS.map((symbol, index) => (
            <span key={symbol} style={{ "--symbol-index": index }}>
              {symbol}
            </span>
          ))}
        </div>
        <div className="landing-scan" />
      </div>

      <header className="landing-header">
        <button className="landing-brand" type="button" onClick={openChat} aria-label={t('home.openChat')}>
          <span className="landing-brand-mark">
            <BrandMark />
          </span>
          <span>
            <strong>Ximor</strong>
            <small>{t('home.chemistryChat')}</small>
          </span>
        </button>

        <nav className="landing-nav" aria-label={t('nav.main')}>
          <a href="#home">{t('home.home')}</a>
          <a href="#features">{t('home.features')}</a>
          <a href="#about">{t('home.about')}</a>
          <a href="#community">{t('home.community')}</a>
        </nav>

        <LanguageSwitcher className="landing-language-switcher" />
        <button className="landing-header-cta" type="button" onClick={openChat}>
          <HomeIcon name="message" />
          {t('nav.chat')}
        </button>
      </header>

      <main>
        <section className="landing-hero" id="home">
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
              <a className="landing-secondary" href="#features">
                {t('home.features')}
              </a>
            </div>

            <div className="landing-metrics" aria-label="Ximor">
              <div>
                <strong>24/7</strong>
                <span>{t('home.questionFlow')}</span>
              </div>
              <div>
                <strong>4+</strong>
                <span>{t('home.chemistrySections')}</span>
              </div>
              <div>
                <strong>soon</strong>
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
                <span>Ximor live</span>
              </div>
              <div className="preview-search">{t('home.reactionSearch')}</div>
              <div className="preview-thread preview-thread--hot">
                <span className="preview-badge">Hot</span>
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
                <span className="preview-badge preview-badge--green">Solved</span>
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

        <div className="landing-marquee" aria-hidden="true">
          <div>
            {communityItems.concat(communityItems).map((item, index) => (
              <span key={`${item}-${index}`}>{item}</span>
            ))}
          </div>
        </div>

        <section className="landing-section" id="features">
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

        <section className="landing-about" id="about">
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

        <section className="landing-community" id="community">
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
                <em>live</em>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
