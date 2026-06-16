const { Pool } = require('pg');
const bcrypt    = require('bcryptjs');

// ── Connection pool ──────────────────────────────────────────────────────────
const isLocal = !process.env.DATABASE_URL ||
  process.env.DATABASE_URL.includes('localhost') ||
  process.env.DATABASE_URL.includes('127.0.0.1');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/ximor',
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

// ── Helpers ──────────────────────────────────────────────────────────────────
async function q(sql, params)  { const r = await pool.query(sql, params); return r.rows; }
async function q1(sql, params) { const r = await pool.query(sql, params); return r.rows[0] ?? null; }

// ── Schema ───────────────────────────────────────────────────────────────────
async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      username   TEXT    UNIQUE NOT NULL,
      name       TEXT    NOT NULL,
      initials   TEXT    NOT NULL,
      role       TEXT    DEFAULT 'Shogird',
      password   TEXT    NOT NULL,
      score      INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS topics (
      id           SERIAL PRIMARY KEY,
      category     TEXT    NOT NULL DEFAULT 'all',
      title        TEXT    NOT NULL,
      summary      TEXT    DEFAULT '',
      formula      TEXT    DEFAULT '',
      tags         TEXT    DEFAULT '[]',
      author       TEXT    DEFAULT 'Anonim',
      initials     TEXT    DEFAULT 'AN',
      role         TEXT    DEFAULT 'Ishtirokchi',
      score        INTEGER DEFAULT 1,
      answers      INTEGER DEFAULT 0,
      views        TEXT    DEFAULT '0',
      activity     TEXT    DEFAULT 'Hozir',
      difficulty   TEXT    DEFAULT 'O''rta',
      participants TEXT    DEFAULT '[]',
      pinned       BOOLEAN DEFAULT FALSE,
      hot          BOOLEAN DEFAULT FALSE,
      solved       BOOLEAN DEFAULT FALSE,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS answers (
      id         SERIAL PRIMARY KEY,
      topic_id   INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      author     TEXT    DEFAULT 'Anonim',
      initials   TEXT    DEFAULT 'AN',
      role       TEXT    DEFAULT 'Ishtirokchi',
      accepted   BOOLEAN DEFAULT FALSE,
      score      INTEGER DEFAULT 0,
      text       TEXT    NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_answers_topic ON answers(topic_id);

    CREATE TABLE IF NOT EXISTS tournaments (
      id                    SERIAL PRIMARY KEY,
      title                 TEXT    NOT NULL,
      type                  TEXT    DEFAULT 'respublika',
      location              TEXT    DEFAULT '',
      start_date            TIMESTAMPTZ NOT NULL,
      registration_deadline TIMESTAMPTZ NOT NULL,
      prize                 TEXT    DEFAULT '',
      description           TEXT    DEFAULT '',
      max_participants      INTEGER DEFAULT 100,
      status                TEXT    DEFAULT 'upcoming',
      created_at            TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS registrations (
      id            SERIAL PRIMARY KEY,
      tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
      user_id       INTEGER NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tournament_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_reg_tournament ON registrations(tournament_id);
    CREATE INDEX IF NOT EXISTS idx_reg_user       ON registrations(user_id);
  `);
}

// ── Hydration ─────────────────────────────────────────────────────────────────
function safeJson(str, fallback) {
  try { return typeof str === 'string' ? JSON.parse(str) : (str ?? fallback); }
  catch { return fallback; }
}

function hydrateTopic(row) {
  if (!row) return null;
  return {
    ...row,
    tags:         safeJson(row.tags, []),
    participants: safeJson(row.participants, []),
    pinned:       Boolean(row.pinned),
    hot:          Boolean(row.hot),
    solved:       Boolean(row.solved),
    saved:        false,
    voted:        0,
    answersList:  [],
  };
}

function hydrateAnswer(row) {
  if (!row) return null;
  return { ...row, accepted: Boolean(row.accepted) };
}

// ── Topics ────────────────────────────────────────────────────────────────────
async function getAllTopics() {
  const rows = await q('SELECT * FROM topics ORDER BY pinned DESC, id DESC');
  return rows.map(hydrateTopic);
}

async function getTopicWithAnswers(id) {
  const topic = hydrateTopic(await q1('SELECT * FROM topics WHERE id = $1', [id]));
  if (!topic) return null;
  const answers = await q(
    'SELECT * FROM answers WHERE topic_id = $1 ORDER BY accepted DESC, score DESC, id ASC',
    [id]
  );
  topic.answersList = answers.map(hydrateAnswer);
  return topic;
}

async function saveTopic(topic) {
  const row = await q1(`
    INSERT INTO topics
      (category, title, summary, formula, tags, author, initials, role,
       score, answers, views, activity, difficulty, participants, pinned, hot, solved)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    RETURNING *
  `, [
    topic.category     ?? 'all',
    topic.title        ?? '',
    topic.summary      ?? '',
    topic.formula      ?? '',
    JSON.stringify(topic.tags         ?? []),
    topic.author       ?? 'Anonim',
    topic.initials     ?? 'AN',
    topic.role         ?? 'Ishtirokchi',
    topic.score        ?? 1,
    topic.answers      ?? 0,
    String(topic.views ?? '0'),
    topic.activity     ?? 'Hozir',
    topic.difficulty   ?? "O'rta",
    JSON.stringify(topic.participants ?? []),
    topic.pinned       ?? false,
    topic.hot          ?? false,
    topic.solved       ?? false,
  ]);
  return hydrateTopic(row);
}

async function updateScore(topicId, delta) {
  const row = await q1(
    'UPDATE topics SET score = score + $1 WHERE id = $2 RETURNING score',
    [delta, topicId]
  );
  return row?.score ?? 0;
}

async function acceptAnswer(topicId, answerId) {
  await pool.query('UPDATE answers SET accepted = TRUE  WHERE id = $1 AND topic_id = $2', [answerId, topicId]);
  await pool.query('UPDATE topics  SET solved   = TRUE  WHERE id = $1',                   [topicId]);
}

// ── Answers ───────────────────────────────────────────────────────────────────
async function saveAnswer(topicId, answer) {
  const row = await q1(`
    INSERT INTO answers (topic_id, author, initials, role, score, text)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [topicId, answer.author ?? 'Anonim', answer.initials ?? 'AN',
      answer.role ?? 'Ishtirokchi', answer.score ?? 0, answer.text ?? '']);
  if (!row) return null;
  await pool.query(
    "UPDATE topics SET answers = answers + 1, activity = 'Hozir', solved = FALSE WHERE id = $1",
    [topicId]
  );
  return hydrateAnswer(row);
}

// ── Users ─────────────────────────────────────────────────────────────────────
async function createUser({ username, name, initials, role = 'Shogird', password }) {
  try {
    return await q1(`
      INSERT INTO users (username, name, initials, role, password)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, name, initials, role, score
    `, [username, name, initials, role, password]);
  } catch (e) {
    if (e.code === '23505') return null; // unique_violation = username taken
    throw e;
  }
}

async function getUserByUsername(username) {
  return q1('SELECT * FROM users WHERE username = $1', [username]);
}

async function getUserById(id) {
  return q1('SELECT id, username, name, initials, role, score FROM users WHERE id = $1', [id]);
}

async function addUserScore(id, delta) {
  await pool.query('UPDATE users SET score = score + $1 WHERE id = $2', [delta, id]);
}

async function getUserProfile(username) {
  const profile = await q1(`
    SELECT
      u.id, u.username, u.name, u.initials, u.role, u.score, u.created_at,
      (SELECT COUNT(*) FROM topics  WHERE author = u.name)::INTEGER                  AS topics_count,
      (SELECT COUNT(*) FROM answers WHERE author = u.name)::INTEGER                  AS answers_count,
      (SELECT COUNT(*) FROM answers WHERE author = u.name AND accepted = TRUE)::INTEGER AS accepted_count
    FROM users u WHERE LOWER(u.username) = LOWER($1)
  `, [username]);
  if (!profile) return null;

  const recentTopics = await q(`
    SELECT id, title, summary, tags, score, answers, views, activity, difficulty,
           solved, hot, created_at, category
    FROM topics
    WHERE author = $1
    ORDER BY id DESC LIMIT 20
  `, [profile.name]);

  return {
    ...profile,
    recentTopics: recentTopics.map(r => ({
      ...r,
      tags:   safeJson(r.tags, []),
      solved: Boolean(r.solved),
      hot:    Boolean(r.hot),
    })),
  };
}

// ── Tournaments ───────────────────────────────────────────────────────────────
async function getAllTournaments(userId) {
  const rows = await q(`
    SELECT t.*,
      (SELECT COUNT(*) FROM registrations r WHERE r.tournament_id = t.id)::INTEGER AS participants_count
    FROM tournaments t ORDER BY t.start_date ASC
  `);
  if (!userId) return rows.map(t => ({ ...t, is_registered: false }));
  const regs = await q('SELECT tournament_id FROM registrations WHERE user_id = $1', [userId]);
  const regSet = new Set(regs.map(r => r.tournament_id));
  return rows.map(t => ({ ...t, is_registered: regSet.has(t.id) }));
}

async function getTournamentById(id, userId) {
  const t = await q1(`
    SELECT t.*,
      (SELECT COUNT(*) FROM registrations r WHERE r.tournament_id = t.id)::INTEGER AS participants_count
    FROM tournaments t WHERE t.id = $1
  `, [id]);
  if (!t) return null;
  let is_registered = false;
  if (userId) {
    const reg = await q1(
      'SELECT 1 FROM registrations WHERE tournament_id = $1 AND user_id = $2',
      [id, userId]
    );
    is_registered = !!reg;
  }
  return { ...t, is_registered };
}

async function registerForTournament(tournamentId, userId) {
  try {
    const r = await pool.query(
      'INSERT INTO registrations (tournament_id, user_id) VALUES ($1, $2)',
      [tournamentId, userId]
    );
    return r.rowCount > 0;
  } catch (e) {
    if (e.code === '23505') return false; // already registered
    throw e;
  }
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
async function getLeaderboard() {
  const rows = await q(`
    SELECT
      u.id, u.username, u.name, u.initials, u.role, u.score,
      (SELECT COUNT(*) FROM answers WHERE author = u.name AND accepted = TRUE)::INTEGER AS accepted_count
    FROM users u
    ORDER BY u.score DESC, u.id ASC
    LIMIT 50
  `);
  return rows.map((u, i) => ({ ...u, rank: i + 1 }));
}

// ── Seed ──────────────────────────────────────────────────────────────────────
async function seedDemo() {
  // Demo users
  const existing = await q1("SELECT 1 FROM users WHERE username = 'aziza_kimyo'");
  if (!existing) {
    const hash = await bcrypt.hash('demo123456', 10);
    const demoUsers = [
      { username: 'aziza_kimyo',  name: 'Aziza Karimova',      role: 'Organik kimyo',   score: 18400 },
      { username: 'sardor_yu',    name: 'Sardor Yusupov',       role: 'Anorganik kimyo', score: 12100 },
      { username: 'nilufar_r',    name: 'Nilufar Rashidova',    role: 'Analitik kimyo',  score: 9300  },
      { username: 'farrux_t',     name: "Farrux Toshpo'latov",  role: 'Fizikaviy kimyo', score: 7800  },
      { username: 'nodira_s',     name: 'Nodira Saidova',       role: 'Olimpiadalar',    score: 6400  },
      { username: 'jasur_i',      name: 'Jasur Ibragimov',      role: 'Anorganik kimyo', score: 4200  },
      { username: 'mukhtor_n',    name: 'Mukhtor Nazarov',      role: 'Organik kimyo',   score: 2100  },
      { username: 'sevara_t',     name: 'Sevara Toshmatova',    role: 'Analitik kimyo',  score: 1350  },
    ];
    for (const u of demoUsers) {
      const initials = u.name.replace(/'/g, '').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
      await pool.query(`
        INSERT INTO users (username, name, initials, role, password, score)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (username) DO NOTHING
      `, [u.username, u.name, initials, u.role, hash, u.score]);
    }
  }

  // Welcome topic
  const topicCount = await q1('SELECT COUNT(*)::INTEGER AS n FROM topics');
  if (topicCount.n === 0) {
    await pool.query(`
      INSERT INTO topics (category, title, summary, formula, tags, author, initials, role,
                          score, answers, views, difficulty, pinned, solved)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    `, [
      'all',
      "Forumga xush kelibsiz — kimyo savollarini birga yechamiz",
      "Bu yerda organik, anorganik, analitik va fizikaviy kimyo bo'yicha savollarni muhokama qilamiz. Savolingizga urinish, kuzatuv va aniq formulani ilova qiling.",
      "savol + urinish + formula = tez va foydali javob",
      JSON.stringify(['qoidalar', 'boshlash', 'kimyo']),
      'Ximor jamoasi', 'Xi', 'Moderator',
      412, 1, '9.7k', "Boshlang'ich",
      true, true,
    ]);
  }

  // Tournaments
  const tourCount = await q1('SELECT COUNT(*)::INTEGER AS n FROM tournaments');
  if (tourCount.n === 0) {
    const tours = [
      ["O'zbekiston Kimyo Olimpiadasi — Final", 'respublika', 'Toshkent',  '2026-06-28T09:00:00Z', '2026-06-25T23:59:59Z', "12 000 000 so'm", "10-11 sinflar uchun ochiq. 3 bosqich: test, yozma, amaliy. O'zRFA bilan hamkorlikda.", 200],
      ["Mendeleev Xalqaro Turniri — Saralash",  'xalqaro',   'Toshkent',  '2026-07-06T09:00:00Z', '2026-07-03T23:59:59Z', "$2 500",          "IChO oldidan eng muhim tayyorlov musobaqasi. 9-11 sinflar.",                            50 ],
      ["IChO 2026 Milliy Jamoa Tanlovi",         'xalqaro',   'Samarqand', '2026-07-12T09:00:00Z', '2026-07-09T23:59:59Z', "IChO sayohati",  "Xalqaro kimyo olimpiadasiga seleksiya. Faqat 11-sinf.",                                  30 ],
      ["So'ra! Tezkor Turnir — Ekvivalent",      'tezkor',    'Online',    '2026-07-20T09:00:00Z', '2026-07-19T23:59:59Z', "200 000 so'm",   "1v1 tezkor reaksiya aniqlash. Top-32 format. Barcha sinflar.",                          64 ],
      ["Onlayn Kimyo Sprint",                    'onlayn',    'Online',    '2026-06-22T14:00:00Z', '2026-06-21T23:59:59Z', "Sertifikat + ball","24 soatlik tezkor masalalar. Onlayn format, barcha sinf.",                              310],
    ];
    for (const t of tours) {
      await pool.query(`
        INSERT INTO tournaments (title, type, location, start_date, registration_deadline, prize, description, max_participants)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `, t);
    }
  }
}

module.exports = {
  pool,
  initSchema, seedDemo,
  getAllTopics, getTopicWithAnswers, saveTopic, updateScore, acceptAnswer,
  saveAnswer,
  createUser, getUserByUsername, getUserById, addUserScore, getUserProfile,
  getAllTournaments, getTournamentById, registerForTournament,
  getLeaderboard,
};
