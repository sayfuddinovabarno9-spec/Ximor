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
      email      TEXT    UNIQUE,
      score      INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

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
      user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
      author     TEXT    DEFAULT 'Anonim',
      initials   TEXT    DEFAULT 'AN',
      role       TEXT    DEFAULT 'Ishtirokchi',
      accepted   BOOLEAN DEFAULT FALSE,
      score      INTEGER DEFAULT 0,
      text       TEXT    NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_answers_topic ON answers(topic_id);
    ALTER TABLE answers ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

    CREATE TABLE IF NOT EXISTS score_log (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      delta      INTEGER NOT NULL,
      reason     TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_score_log_user ON score_log(user_id, created_at);

    CREATE TABLE IF NOT EXISTS notifications (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type       TEXT NOT NULL,
      topic_id   INTEGER REFERENCES topics(id) ON DELETE SET NULL,
      message    TEXT NOT NULL,
      read       BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, read, created_at);

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

    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin   BOOLEAN     DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at  TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS bio        TEXT        DEFAULT '';

    CREATE TABLE IF NOT EXISTS saved_topics (
      user_id   INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
      topic_id  INTEGER NOT NULL REFERENCES topics(id)  ON DELETE CASCADE,
      PRIMARY KEY (user_id, topic_id)
    );

    CREATE TABLE IF NOT EXISTS answer_votes (
      user_id   INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
      answer_id INTEGER NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
      delta     INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (user_id, answer_id)
    );
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
  const answer = await q1('SELECT * FROM answers WHERE id = $1 AND topic_id = $2', [answerId, topicId]);
  await pool.query('UPDATE answers SET accepted = TRUE WHERE id = $1 AND topic_id = $2', [answerId, topicId]);
  await pool.query('UPDATE topics  SET solved   = TRUE WHERE id = $1', [topicId]);
  return answer;
}

// ── Answers ───────────────────────────────────────────────────────────────────
async function saveAnswer(topicId, answer) {
  const row = await q1(`
    INSERT INTO answers (topic_id, user_id, author, initials, role, score, text)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [topicId, answer.user_id ?? null, answer.author ?? 'Anonim', answer.initials ?? 'AN',
      answer.role ?? 'Ishtirokchi', answer.score ?? 0, answer.text ?? '']);
  if (!row) return null;
  await pool.query(
    "UPDATE topics SET answers = answers + 1, activity = 'Hozir', solved = FALSE WHERE id = $1",
    [topicId]
  );
  return hydrateAnswer(row);
}

// ── Users ─────────────────────────────────────────────────────────────────────
async function createUser({ username, name, initials, role = 'Shogird', password, email }) {
  try {
    return await q1(`
      INSERT INTO users (username, name, initials, role, password, email)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, username, name, initials, role, score, email
    `, [username, name, initials, role, password, email || null]);
  } catch (e) {
    if (e.code === '23505') return null; // unique_violation = username or email taken
    throw e;
  }
}

async function getUserByUsername(username) {
  return q1('SELECT * FROM users WHERE username = $1', [username]);
}

async function getUserById(id) {
  return q1('SELECT id, username, name, initials, role, score, is_admin, bio FROM users WHERE id = $1', [id]);
}

async function addUserScore(id, delta, reason = 'answer_accepted') {
  await pool.query('UPDATE users SET score = score + $1 WHERE id = $2', [delta, id]);
  await pool.query('INSERT INTO score_log (user_id, delta, reason) VALUES ($1, $2, $3)', [id, delta, reason]);
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
async function getLeaderboard(period = 'hammasi') {
  const intervalMap = {
    hafta:  "NOW() - INTERVAL '7 days'",
    oy:     "NOW() - INTERVAL '30 days'",
    chorak: "NOW() - INTERVAL '90 days'",
    yil:    "NOW() - INTERVAL '365 days'",
  };
  const since = intervalMap[period];

  let rows;
  if (!since) {
    // All-time: use total score
    rows = await q(`
      SELECT u.id, u.username, u.name, u.initials, u.role, u.score,
        (SELECT COUNT(*) FROM answers WHERE author = u.name AND accepted = TRUE)::INTEGER AS accepted_count
      FROM users u
      ORDER BY u.score DESC, u.id ASC
      LIMIT 50
    `);
  } else {
    rows = await q(`
      SELECT u.id, u.username, u.name, u.initials, u.role,
        COALESCE(SUM(sl.delta), 0)::INTEGER AS score,
        (SELECT COUNT(*) FROM answers a WHERE a.user_id = u.id AND a.accepted = TRUE AND a.created_at >= ${since})::INTEGER AS accepted_count
      FROM users u
      LEFT JOIN score_log sl ON sl.user_id = u.id AND sl.created_at >= ${since}
      GROUP BY u.id
      ORDER BY score DESC, u.id ASC
      LIMIT 50
    `);
  }
  return rows.map((u, i) => ({ ...u, rank: i + 1 }));
}

// ── User Answers ──────────────────────────────────────────────────────────────
async function getUserAnswers(username) {
  const user = await q1('SELECT id, name FROM users WHERE LOWER(username) = LOWER($1)', [username]);
  if (!user) return null;
  const rows = await q(`
    SELECT a.id, a.text, a.accepted, a.score, a.created_at,
           t.id AS topic_id, t.title AS topic_title, t.category
    FROM answers a
    JOIN topics t ON t.id = a.topic_id
    WHERE a.user_id = $1
    ORDER BY a.created_at DESC
    LIMIT 50
  `, [user.id]);
  return rows;
}

// ── Notifications ─────────────────────────────────────────────────────────────
async function createNotification(userId, type, topicId, message) {
  if (!userId) return;
  await pool.query(
    'INSERT INTO notifications (user_id, type, topic_id, message) VALUES ($1,$2,$3,$4)',
    [userId, type, topicId, message]
  );
}

async function getNotifications(userId) {
  return q(`
    SELECT id, type, topic_id, message, read, created_at
    FROM notifications
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT 20
  `, [userId]);
}

async function markNotificationsRead(userId) {
  await pool.query('UPDATE notifications SET read = TRUE WHERE user_id = $1 AND read = FALSE', [userId]);
}

// ── Admin ─────────────────────────────────────────────────────────────────────
async function getAdminStats() {
  const [users, topics, answers, todayUsers, todayTopics, todayAnswers, banned] = await Promise.all([
    q1('SELECT COUNT(*)::INTEGER AS n FROM users'),
    q1('SELECT COUNT(*)::INTEGER AS n FROM topics'),
    q1('SELECT COUNT(*)::INTEGER AS n FROM answers'),
    q1("SELECT COUNT(*)::INTEGER AS n FROM users   WHERE created_at >= NOW() - INTERVAL '24 hours'"),
    q1("SELECT COUNT(*)::INTEGER AS n FROM topics  WHERE created_at >= NOW() - INTERVAL '24 hours'"),
    q1("SELECT COUNT(*)::INTEGER AS n FROM answers WHERE created_at >= NOW() - INTERVAL '24 hours'"),
    q1('SELECT COUNT(*)::INTEGER AS n FROM users WHERE banned_at IS NOT NULL'),
  ]);
  return {
    users: users.n, topics: topics.n, answers: answers.n,
    banned: banned.n,
    today: { users: todayUsers.n, topics: todayTopics.n, answers: todayAnswers.n },
  };
}

async function getAllUsersAdmin(limit = 100, offset = 0) {
  return q(`
    SELECT u.id, u.username, u.name, u.initials, u.role, u.score,
           u.is_admin, u.banned_at, u.created_at,
           (SELECT COUNT(*)::INTEGER FROM topics  WHERE author = u.name)  AS topics_count,
           (SELECT COUNT(*)::INTEGER FROM answers WHERE author = u.name)  AS answers_count,
           (SELECT COUNT(*)::INTEGER FROM answers WHERE author = u.name AND accepted = TRUE) AS accepted_count
    FROM users u
    ORDER BY u.score DESC, u.id ASC
    LIMIT $1 OFFSET $2
  `, [limit, offset]);
}

async function updateUserAdmin(id, fields) {
  const sets = [];
  const vals = [];
  let i = 1;
  if ('is_admin'   in fields) { sets.push(`is_admin = $${i++}`);   vals.push(fields.is_admin); }
  if ('banned'     in fields) { sets.push(`banned_at = $${i++}`);  vals.push(fields.banned ? new Date() : null); }
  if ('role'       in fields) { sets.push(`role = $${i++}`);        vals.push(fields.role); }
  if ('score'      in fields) { sets.push(`score = $${i++}`);       vals.push(fields.score); }
  if (!sets.length) return;
  vals.push(id);
  await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${i}`, vals);
}

async function getAdminTopics(limit = 50) {
  const rows = await q(`
    SELECT id, category, title, author, score, answers, solved, pinned, hot, created_at
    FROM topics ORDER BY id DESC LIMIT $1
  `, [limit]);
  return rows.map(r => ({ ...r, pinned: Boolean(r.pinned), hot: Boolean(r.hot), solved: Boolean(r.solved) }));
}

async function adminDeleteTopic(id) {
  await pool.query('DELETE FROM topics WHERE id = $1', [id]);
}

async function adminDeleteAnswer(id) {
  await pool.query('DELETE FROM answers WHERE id = $1', [id]);
}

async function adminUpdateTopic(id, fields) {
  const sets = [];
  const vals = [];
  let i = 1;
  if ('pinned' in fields) { sets.push(`pinned = $${i++}`); vals.push(fields.pinned); }
  if ('hot'    in fields) { sets.push(`hot = $${i++}`);    vals.push(fields.hot); }
  if ('solved' in fields) { sets.push(`solved = $${i++}`); vals.push(fields.solved); }
  if (!sets.length) return;
  vals.push(id);
  await pool.query(`UPDATE topics SET ${sets.join(', ')} WHERE id = $${i}`, vals);
}

async function broadcastAnnouncement(message) {
  const users = await q('SELECT id FROM users WHERE banned_at IS NULL');
  for (const u of users) {
    await pool.query(
      "INSERT INTO notifications (user_id, type, topic_id, message) VALUES ($1,'announce',NULL,$2)",
      [u.id, message]
    );
  }
  return users.length;
}

async function getRecentActivity() {
  const topics  = await q('SELECT id, title, author, created_at FROM topics  ORDER BY created_at DESC LIMIT 10');
  const answers = await q('SELECT a.id, a.author, a.created_at, t.id AS topic_id, t.title AS topic_title FROM answers a JOIN topics t ON t.id = a.topic_id ORDER BY a.created_at DESC LIMIT 10');
  return { topics, answers };
}

// ── Saved topics ──────────────────────────────────────────────────────────────
async function toggleSavedTopic(userId, topicId) {
  const existing = await q1('SELECT 1 FROM saved_topics WHERE user_id=$1 AND topic_id=$2', [userId, topicId]);
  if (existing) {
    await pool.query('DELETE FROM saved_topics WHERE user_id=$1 AND topic_id=$2', [userId, topicId]);
    return false;
  }
  await pool.query('INSERT INTO saved_topics (user_id, topic_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [userId, topicId]);
  return true;
}

async function getUserSavedTopicIds(userId) {
  const rows = await q('SELECT topic_id FROM saved_topics WHERE user_id=$1', [userId]);
  return rows.map(r => r.topic_id);
}

// ── Answer votes ──────────────────────────────────────────────────────────────
async function voteAnswer(userId, answerId, delta) {
  const clamped = delta > 0 ? 1 : -1;
  const existing = await q1('SELECT delta FROM answer_votes WHERE user_id=$1 AND answer_id=$2', [userId, answerId]);
  let scoreDelta = 0;
  if (!existing) {
    await pool.query('INSERT INTO answer_votes (user_id, answer_id, delta) VALUES ($1,$2,$3)', [userId, answerId, clamped]);
    scoreDelta = clamped;
  } else if (existing.delta === clamped) {
    await pool.query('DELETE FROM answer_votes WHERE user_id=$1 AND answer_id=$2', [userId, answerId]);
    scoreDelta = -clamped;
  } else {
    await pool.query('UPDATE answer_votes SET delta=$1 WHERE user_id=$2 AND answer_id=$3', [clamped, userId, answerId]);
    scoreDelta = clamped * 2;
  }
  const row = await q1('UPDATE answers SET score=score+$1 WHERE id=$2 RETURNING score', [scoreDelta, answerId]);
  return row?.score ?? 0;
}

// ── View increment ────────────────────────────────────────────────────────────
async function incrementTopicViews(id) {
  await pool.query(`
    UPDATE topics SET views = CASE
      WHEN views ~ '^[0-9]+$' THEN (views::INTEGER + 1)::TEXT
      WHEN views ~ '^[0-9]+\\.[0-9]+k$' OR views ~ '^[0-9]+k$' THEN views
      ELSE (1)::TEXT
    END WHERE id = $1
  `, [id]);
}

// ── User bio ──────────────────────────────────────────────────────────────────
async function updateUserBio(userId, bio) {
  await pool.query('UPDATE users SET bio=$1 WHERE id=$2', [bio.slice(0, 300), userId]);
}

// ── Search ────────────────────────────────────────────────────────────────────
async function searchTopics(q_text) {
  if (!q_text || q_text.trim().length < 2) return [];
  const like = `%${q_text.trim().toLowerCase()}%`;
  const rows = await q(`
    SELECT id, category, title, summary, tags, author, score, answers, views, activity, difficulty, solved, hot, pinned
    FROM topics
    WHERE LOWER(title) LIKE $1 OR LOWER(summary) LIKE $1 OR LOWER(tags) LIKE $1 OR LOWER(author) LIKE $1
    ORDER BY score DESC
    LIMIT 20
  `, [like]);
  return rows.map(hydrateTopic);
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

  // Make first demo user admin
  await pool.query("UPDATE users SET is_admin = TRUE WHERE username = 'aziza_kimyo'");

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
  getUserAnswers, updateUserBio,
  getAllTournaments, getTournamentById, registerForTournament,
  getLeaderboard,
  createNotification, getNotifications, markNotificationsRead,
  searchTopics,
  // Admin
  getAdminStats, getAllUsersAdmin, updateUserAdmin,
  getAdminTopics, adminDeleteTopic, adminDeleteAnswer, adminUpdateTopic,
  broadcastAnnouncement, getRecentActivity,
  // Upgrades
  toggleSavedTopic, getUserSavedTopicIds,
  voteAnswer,
  incrementTopicViews,
};
