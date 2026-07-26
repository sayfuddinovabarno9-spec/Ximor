import Layout from '../components/Layout';

const UAC_URL = 'https://elyorbekadkhamov9-cell.github.io/UAC-/index.html';

const COMMUNITY_SITES = [
  {
    id: 'uac',
    name: 'UAC',
    fullName: "O'zbekiston Kimyogarlar Assotsiatsiyasi",
    url: UAC_URL,
    libraryUrl: 'https://elyorbekadkhamov9-cell.github.io/UAC-/library.html',
    tagline: 'Kimyo hammaga tushunarli',
    description:
      "Xalqaro kimyo hamjamiyati, dars e'lonlari, bepul materiallar va IChO 2026 ilmiy qo'mita a'zolari bilan tanishish uchun sahifa.",
    channels: [
      { label: 'Telegram', url: 'https://t.me/ChemistryUAC' },
      { label: 'Instagram', url: 'https://www.instagram.com/uac_uz' },
    ],
    team: [
      {
        name: 'Adkhamov Elyorbek',
        photo: 'https://i.ibb.co/nsBS6v3Y/photo-2026-04-01-00-14-07.jpg',
        achievements: [
          'IMChO - 2x bronze',
          'ARBIChO - gold',
          "IChO 2026 va ARBIChO ilmiy qo'mita a'zosi",
        ],
      },
      {
        name: 'Rakhimov Daler',
        photo: 'https://i.ibb.co/7xv06pVN/photo-2026-04-01-00-14-17.jpg',
        achievements: [
          'IChO - 2x gold',
          'IMChO - 2x silver',
          "IChO 2026 va ARBIChO ilmiy qo'mita a'zosi",
        ],
      },
      {
        name: 'Bahodirov Ahrorbek',
        photo: 'https://i.ibb.co/pr9VgNKh/photo-2026-04-01-00-16-57.jpg',
        achievements: [
          'IChO - silver',
          'ARBIChO - silver',
          "IChO 2026 va ARBIChO ilmiy qo'mita a'zosi",
        ],
      },
      {
        name: 'Timurov Ibrokhim',
        photo: 'https://i.ibb.co/YFqSzJBW/photo-2026-04-01-00-14-13.jpg',
        achievements: [
          'IChO - gold',
          'IMChO - gold',
          "IChO 2026 va ARBIChO ilmiy qo'mita a'zosi",
        ],
      },
      {
        name: 'Zukhriddinov Biloliddin',
        photo: 'https://i.ibb.co/BKyvkVQP/photo-2025-08-11-10-20-20.jpg',
        achievements: [
          'IChO - silver',
          'ARBIChO - gold',
          "IChO 2026 va ARBIChO ilmiy qo'mita a'zosi",
        ],
      },
      {
        name: 'Mukhammadov Mirjakhon',
        photo: 'https://i.ibb.co/9mQtNQ5R/image.png',
        achievements: [
          'IChO - gold',
          'IMChO - gold',
          "IChO 2026 va ARBIChO ilmiy qo'mita a'zosi",
        ],
      },
      {
        name: 'Mirakbarov Mirumid',
        photo: 'https://i.ibb.co/gZz4mDhQ/image.png',
        achievements: [
          'IMChO - gold',
          'IChO - silver',
          'BSc, MSc - HSE Russia',
          "IChO 2026 va ARBIChO ilmiy qo'mita a'zosi",
        ],
      },
      {
        name: 'Eldar Ilxambekov',
        photo: 'https://i.ibb.co/1Gmsf695/image.png',
        achievements: [
          "Kimyo ta'limi",
          'Kimyo musobaqalari tashkilotchisi',
          'Project coordinator',
        ],
      },
    ],
  },
];

function ExternalLink({ href, children, className = 'soft-button' }) {
  return (
    <a className={className} href={href} rel="noreferrer" target="_blank">
      {children}
    </a>
  );
}

function CommunityMember({ member }) {
  return (
    <article className="community-member">
      <img className="community-photo" src={member.photo} alt={member.name} loading="lazy" />
      <div className="community-member-body">
        <h3>{member.name}</h3>
        <ul className="community-achievements">
          {member.achievements.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function CommunitySiteCard({ site }) {
  const previewMembers = site.team.slice(0, 4);

  return (
    <article className="community-site-card">
      <div className="community-site-main">
        <div className="community-site-head">
          <span className="community-site-logo">{site.name}</span>
          <div>
            <span className="eyebrow">Community website</span>
            <h2>{site.fullName}</h2>
            <p>{site.tagline}</p>
          </div>
        </div>

        <p className="community-site-description">{site.description}</p>

        <div className="community-meta-grid">
          <div className="community-meta">
            <strong>{site.team.length}</strong>
            <span>jamoa a'zolari</span>
          </div>
          <div className="community-meta">
            <strong>1</strong>
            <span>website</span>
          </div>
          <div className="community-meta">
            <strong>{site.channels.length}</strong>
            <span>social kanal</span>
          </div>
        </div>

        <div className="community-site-links">
          <ExternalLink className="primary-button" href={site.url}>Saytni ochish</ExternalLink>
          <ExternalLink href={site.libraryUrl}>Kutubxona</ExternalLink>
          {site.channels.map(channel => (
            <ExternalLink key={channel.label} href={channel.url}>{channel.label}</ExternalLink>
          ))}
        </div>
      </div>

      <div className="community-preview" aria-label={`${site.name} jamoasi`}>
        {previewMembers.map(member => (
          <img key={member.name} src={member.photo} alt={member.name} loading="lazy" />
        ))}
      </div>
    </article>
  );
}

export default function OlimpiadalarPage({ theme, onThemeToggle }) {
  const primarySite = COMMUNITY_SITES[0];

  return (
    <Layout theme={theme} onThemeToggle={onThemeToggle}>
      <main className="community-layout" id="community">
        <aside className="side-panel community-sidebar">
          <div className="panel-section">
            <span className="panel-label">Hamjamiyatlar</span>
            <div className="community-list">
              {COMMUNITY_SITES.map(site => (
                <a key={site.id} className="community-list-item is-active" href={`#${site.id}`}>
                  <span className="category-mark" style={{ '--category-color': '#4d6b59' }}>
                    {site.name}
                  </span>
                  <span>{site.fullName}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="panel-card community-note">
            <span className="eyebrow">Maqsad</span>
            <h3>Foydali kimyo sahifalari</h3>
            <p>
              Bu bo'limda So'ra! foydalanuvchilari uchun kerakli community saytlar,
              materiallar va rasmiy kanallar bir joyga yig'iladi.
            </p>
          </div>
        </aside>

        <section className="feed community-feed">
          <section className="community-hero">
            <div className="community-hero-copy">
              <div className="hero-eyebrow">
                <span className="hero-eyebrow-dot" />
                Bizning hamjamiyat
              </div>
              <h1>Our community</h1>
              <p>
                Kimyo o'rganuvchilariga foydali hamjamiyatlar, ularning saytlari,
                kutubxonalari va jamoa ma'lumotlari shu yerda jamlanadi.
              </p>
              <div className="community-hero-actions">
                <ExternalLink className="primary-button" href={primarySite.url}>
                  UAC saytiga o'tish
                </ExternalLink>
                <ExternalLink href={primarySite.libraryUrl}>Kutubxona</ExternalLink>
              </div>
            </div>

            <div className="community-hero-media" aria-label="UAC jamoasi rasmlari">
              {primarySite.team.slice(0, 4).map(member => (
                <img key={member.name} src={member.photo} alt={member.name} loading="lazy" />
              ))}
            </div>
          </section>

          <section className="community-sites" aria-labelledby="community-sites-title">
            <div className="section-heading">
              <span className="eyebrow">Hozircha 1 ta sayt</span>
              <h3 id="community-sites-title">Community websites</h3>
            </div>
            {COMMUNITY_SITES.map(site => (
              <CommunitySiteCard key={site.id} site={site} />
            ))}
          </section>

          <section className="community-team-section" aria-labelledby="community-team-title">
            <div className="section-heading">
              <span className="eyebrow">UAC jamoasi</span>
              <h3 id="community-team-title">A'zolar va ma'lumotlar</h3>
            </div>
            <div className="community-team-grid">
              {primarySite.team.map(member => (
                <CommunityMember key={member.name} member={member} />
              ))}
            </div>
          </section>
        </section>

        <aside className="community-aside">
          <div className="panel-card community-contact-card">
            <span className="eyebrow">Aloqa</span>
            <h3>{primarySite.name}</h3>
            <p>{primarySite.description}</p>
            <div className="community-contact-links">
              {primarySite.channels.map(channel => (
                <ExternalLink key={channel.label} href={channel.url}>{channel.label}</ExternalLink>
              ))}
            </div>
          </div>

          <div className="panel-card community-source-card">
            <span className="eyebrow">Manba</span>
            <h3>Rasmiy sahifa</h3>
            <p>
              Jamoa ma'lumotlari UAC sahifasidan olindi. Keyinroq boshqa community saytlar
              ham shu formatda qo'shiladi.
            </p>
            <ExternalLink href={primarySite.url}>UAC website</ExternalLink>
          </div>
        </aside>
      </main>
    </Layout>
  );
}
