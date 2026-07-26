import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const FEATURE_CARDS = [
  {
    code: "01",
    title: "Chat birinchi o'rinda",
    text: "Savol, yechim, formula va rasm bitta jonli oqimda. Hozircha asosiy markaz chat, keyin darslar ham shu joyga ulanadi.",
    accent: "teal",
  },
  {
    code: "02",
    title: "Kimyo formulalari tayyor",
    text: "Reaksiya, LaTeX, subscript va bosqichma-bosqich yechimlar ko'rinishi chiroyli chiqadi.",
    accent: "blue",
  },
  {
    code: "03",
    title: "Mentorlar va reyting",
    text: "Foydali javoblar yuqoriga ko'tariladi, faol yordamchilar esa community ichida ko'rinib turadi.",
    accent: "amber",
  },
  {
    code: "04",
    title: "Darslar uchun joy bor",
    text: "Olimpiada, mini-kurs, test va practice mode keyin qo'shilsa ham dizayn ularni ko'tara oladi.",
    accent: "violet",
  },
];

const COMMUNITY_ITEMS = [
  "Organik kimyo",
  "DTM tayyorgarlik",
  "Olimpiada sprint",
  "Reaksiya mexanizmlari",
  "Analitik masalalar",
  "Mentor javoblari",
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
  const pageRef = useRef(null);

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
        <button className="landing-brand" type="button" onClick={openChat} aria-label="Ximor chatga o'tish">
          <span className="landing-brand-mark">
            <HomeIcon name="atom" />
          </span>
          <span>
            <strong>Ximor</strong>
            <small>Kimyo chat</small>
          </span>
        </button>

        <nav className="landing-nav" aria-label="Landing navigatsiya">
          <a href="#home">Главная</a>
          <a href="#features">Возможности</a>
          <a href="#about">О нас</a>
          <a href="#community">Community</a>
        </nav>

        <button className="landing-header-cta" type="button" onClick={openChat}>
          <HomeIcon name="message" />
          Chat
        </button>
      </header>

      <main>
        <section className="landing-hero" id="home">
          <div className="landing-hero-copy">
            <div className="landing-eyebrow">
              <span />
              Beyond curriculum · live chemistry help
            </div>
            <h1>
              <span>Самый живой</span>
              <span>kimyo chat</span>
              <span>uchun yangi start</span>
            </h1>
            <p>
              Ximor - savollar, mentor javoblari, formulalar va community energiyasi bitta joyda.
              Hozir asosiy sahna chat, keyin darslar va practice bo'limlari ham qo'shiladi.
            </p>

            <div className="landing-actions">
              <button className="landing-primary" type="button" onClick={openChat}>
                Chatni ochish
                <HomeIcon name="arrow" />
              </button>
              <a className="landing-secondary" href="#features">
                Возможности
              </a>
            </div>

            <div className="landing-metrics" aria-label="Platforma statistikasi">
              <div>
                <strong>24/7</strong>
                <span>Savol oqimi</span>
              </div>
              <div>
                <strong>4+</strong>
                <span>Kimyo bo'limi</span>
              </div>
              <div>
                <strong>soon</strong>
                <span>Lessons mode</span>
              </div>
            </div>
          </div>

          <button className="landing-chat-preview" type="button" onClick={openChat} aria-label="Chat sahifasiga o'tish">
            <div className="preview-reactor" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="preview-notice preview-notice--top">
              <span className="notice-dot" />
              Mentor javob berdi
            </div>
            <div className="preview-notice preview-notice--bottom">
              <span className="notice-dot" />
              12 yangi muhokama
            </div>
            <div className="preview-phone">
              <div className="preview-phone-top">
                <span>9:41</span>
                <span>Ximor live</span>
              </div>
              <div className="preview-search">H2SO4 + CuO reaksiyasi...</div>
              <div className="preview-thread preview-thread--hot">
                <span className="preview-badge">Hot</span>
                <strong>Grignard mexanizmi qanday ishlaydi?</strong>
                <p>CH3CH2MgBr + HCHO {"->"} ?</p>
              </div>
              <div className="preview-message preview-message--left">
                <span>AK</span>
                <p>Karbonil uglerodiga nukleofil hujum bo'ladi.</p>
              </div>
              <div className="preview-message preview-message--right">
                <span>KT</span>
                <p>Demak birlamchi spirt hosil bo'ladimi?</p>
              </div>
              <div className="preview-thread">
                <span className="preview-badge preview-badge--green">Solved</span>
                <strong>Le Chatelier: bosim oshsa?</strong>
                <p>N2 + 3H2 ⇌ 2NH3</p>
              </div>
              <div className="preview-composer">
                <span>Savol yozish...</span>
                <b>+</b>
              </div>
            </div>
          </button>
        </section>

        <div className="landing-marquee" aria-hidden="true">
          <div>
            {COMMUNITY_ITEMS.concat(COMMUNITY_ITEMS).map((item, index) => (
              <span key={`${item}-${index}`}>{item}</span>
            ))}
          </div>
        </div>

        <section className="landing-section" id="features">
          <div className="landing-section-head">
            <span className="landing-eyebrow">
              <span />
              Возможности
            </span>
            <h2>Chat hozir ishlaydi, keyingi bo'limlar uchun joy allaqachon tayyor.</h2>
          </div>

          <div className="landing-feature-grid">
            {FEATURE_CARDS.map((feature) => (
              <article className={`landing-feature landing-feature--${feature.accent}`} key={feature.code}>
                <span>{feature.code}</span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-about" id="about">
          <div className="landing-about-copy">
            <span className="landing-eyebrow">
              <span />
              О нас
            </span>
            <h2>Ximor - kimyoni birga tushunadigan community.</h2>
            <p>
              Maqsad oddiy: quruq javob emas, tushunarli yo'l. Har bir savol formulasi,
              urinishlari va muhokamasi bilan saqlanadi, shunda yangi o'quvchi ham undan foyda oladi.
            </p>
          </div>

          <div className="landing-lab-board" aria-label="Ximor rivojlanish rejasi">
            <div>
              <strong>Now</strong>
              <span>Chat, savollar, javoblar, reyting</span>
            </div>
            <div>
              <strong>Next</strong>
              <span>Darslar, practice sets, mini olimpiadalar</span>
            </div>
            <div>
              <strong>Later</strong>
              <span>Mentor rooms, cohort, progress map</span>
            </div>
          </div>
        </section>

        <section className="landing-community" id="community">
          <div className="landing-community-panel">
            <div>
              <span className="landing-eyebrow">
                <span />
                Community
              </span>
              <h2>Birinchi muhokamani oching. Qolgan animatsiya ichkarida davom etadi.</h2>
            </div>
            <button className="landing-primary" type="button" onClick={openChat}>
              Community chat
              <HomeIcon name="arrow" />
            </button>
          </div>

          <div className="landing-community-feed" aria-label="Community bo'limlari">
            {COMMUNITY_ITEMS.map((item, index) => (
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
