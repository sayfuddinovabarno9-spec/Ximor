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

const USER_ROLES = ['Shogird', 'Ishtirokchi', "O'rta daraja", 'Mutaxassis', 'Moderator'];
const LEGACY_SUBJECT_ROLES = new Set([
  'Organik kimyo',
  'Anorganik kimyo',
  'Analitik kimyo',
  'Fizikaviy kimyo',
  'Olimpiadalar',
  'DTM tayyorgarlik',
  '10-sinf',
  '11-sinf',
  'Abituriyent',
]);

function normalizeUserRole(value, fallback = 'Shogird') {
  const role = String(value || '').trim();
  if (USER_ROLES.includes(role)) return role;
  if (LEGACY_SUBJECT_ROLES.has(role)) return 'Mutaxassis';
  return fallback;
}

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
      images       TEXT    DEFAULT '[]',
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
    ALTER TABLE topics ADD COLUMN IF NOT EXISTS images TEXT DEFAULT '[]';

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
      images     TEXT    DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_answers_topic ON answers(topic_id);
    ALTER TABLE answers ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE answers ADD COLUMN IF NOT EXISTS images TEXT DEFAULT '[]';
    ALTER TABLE answers ADD COLUMN IF NOT EXISTS moderation_helpfulness TEXT;
    ALTER TABLE answers ADD COLUMN IF NOT EXISTS moderation_correctness  TEXT;
    ALTER TABLE answers ADD COLUMN IF NOT EXISTS moderated_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE answers ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;

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

    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin      BOOLEAN     DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_moderator  BOOLEAN     DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at     TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS bio           TEXT        DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url    TEXT        DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_url     TEXT        DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS headline      TEXT        DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS location      TEXT        DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS website       TEXT        DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS study_goal    TEXT        DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS interests     TEXT        DEFAULT '[]';
    UPDATE users SET is_moderator = TRUE WHERE role = 'Moderator' AND is_moderator = FALSE;
    UPDATE users
       SET role = 'Mutaxassis'
     WHERE role IN ('Organik kimyo','Anorganik kimyo','Analitik kimyo','Fizikaviy kimyo','Olimpiadalar','DTM tayyorgarlik','10-sinf','11-sinf','Abituriyent');
    UPDATE topics
       SET role = 'Mutaxassis'
     WHERE role IN ('Organik kimyo','Anorganik kimyo','Analitik kimyo','Fizikaviy kimyo','Olimpiadalar','DTM tayyorgarlik','10-sinf','11-sinf','Abituriyent');
    UPDATE answers
       SET role = 'Mutaxassis'
     WHERE role IN ('Organik kimyo','Anorganik kimyo','Analitik kimyo','Fizikaviy kimyo','Olimpiadalar','DTM tayyorgarlik','10-sinf','11-sinf','Abituriyent');

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

    ALTER TABLE topics ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

    CREATE TABLE IF NOT EXISTS topic_votes (
      user_id  INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
      topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      delta    INTEGER NOT NULL,
      PRIMARY KEY (user_id, topic_id)
    );

    CREATE INDEX IF NOT EXISTS idx_topic_votes_user  ON topic_votes(user_id);
    CREATE INDEX IF NOT EXISTS idx_answer_votes_user ON answer_votes(user_id);

    CREATE TABLE IF NOT EXISTS conversations (
      id           SERIAL PRIMARY KEY,
      user_low_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_high_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      updated_at   TIMESTAMPTZ DEFAULT NOW(),
      CHECK (user_low_id < user_high_id),
      UNIQUE(user_low_id, user_high_id)
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id              SERIAL PRIMARY KEY,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
      body            TEXT NOT NULL,
      read_at         TIMESTAMPTZ,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_conversations_low  ON conversations(user_low_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_conversations_high ON conversations(user_high_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id, id DESC);
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
    images:       safeJson(row.images, []),
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
  return {
    ...row,
    accepted: Boolean(row.accepted),
    images: safeJson(row.images, []),
    moderation_helpfulness: row.moderation_helpfulness ?? null,
    moderation_correctness: row.moderation_correctness ?? null,
  };
}

// ── Topics ────────────────────────────────────────────────────────────────────
async function getAllTopics() {
  const rows = await q(`
    SELECT t.*, COALESCE(a.answers, 0)::INTEGER AS answers
    FROM topics t
    LEFT JOIN (
      SELECT topic_id, COUNT(*)::INTEGER AS answers
      FROM answers
      GROUP BY topic_id
    ) a ON a.topic_id = t.id
    ORDER BY t.pinned DESC, t.id DESC
  `);
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
  topic.answers = topic.answersList.length;
  return topic;
}

async function saveTopic(topic) {
  const row = await q1(`
    INSERT INTO topics
      (category, title, summary, formula, tags, images, author, initials, role,
       score, answers, views, activity, difficulty, participants, pinned, hot, solved, user_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
    RETURNING *
  `, [
    topic.category     ?? 'all',
    topic.title        ?? '',
    topic.summary      ?? '',
    topic.formula      ?? '',
    JSON.stringify(topic.tags         ?? []),
    JSON.stringify(topic.images       ?? []),
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
    topic.user_id      ?? null,
  ]);
  return hydrateTopic(row);
}

async function updateTopic(topicId, topic) {
  const row = await q1(`
    UPDATE topics
    SET category = $2,
        title = $3,
        summary = $4,
        formula = COALESCE($5, formula),
        tags = $6,
        images = $7,
        difficulty = COALESCE($8, difficulty)
    WHERE id = $1
    RETURNING *
  `, [
    topicId,
    topic.category ?? 'all',
    topic.title ?? '',
    topic.summary ?? '',
    topic.formula ?? null,
    JSON.stringify(topic.tags ?? []),
    JSON.stringify(topic.images ?? []),
    topic.difficulty ?? null,
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

async function voteTopic(userId, topicId, direction) {
  const clamped = direction > 0 ? 1 : -1;
  const client  = await pool.connect();
  try {
    await client.query('BEGIN');
    // FOR UPDATE serializes concurrent votes from the same user on the same topic
    const { rows } = await client.query(
      'SELECT delta FROM topic_votes WHERE user_id=$1 AND topic_id=$2 FOR UPDATE',
      [userId, topicId]
    );
    const existing  = rows[0] ?? null;
    let scoreDelta  = 0;
    let newVoted    = 0;

    if (!existing) {
      // ON CONFLICT handles the rare case where two requests race past the SELECT
      const ins = await client.query(
        `INSERT INTO topic_votes (user_id, topic_id, delta) VALUES ($1,$2,$3)
         ON CONFLICT (user_id, topic_id) DO NOTHING`,
        [userId, topicId, clamped]
      );
      if (ins.rowCount > 0) { scoreDelta = clamped; newVoted = clamped; }
    } else if (existing.delta === clamped) {
      await client.query(
        'DELETE FROM topic_votes WHERE user_id=$1 AND topic_id=$2',
        [userId, topicId]
      );
      scoreDelta = -clamped; newVoted = 0;
    } else {
      await client.query(
        'UPDATE topic_votes SET delta=$1 WHERE user_id=$2 AND topic_id=$3',
        [clamped, userId, topicId]
      );
      scoreDelta = clamped * 2; newVoted = clamped;
    }

    const { rows: sr } = await client.query(
      'UPDATE topics SET score=score+$1 WHERE id=$2 RETURNING score',
      [scoreDelta, topicId]
    );
    await client.query('COMMIT');
    return { score: sr[0]?.score ?? 0, voted: newVoted };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

async function getMyTopicVotes(userId) {
  const rows = await q('SELECT topic_id, delta FROM topic_votes WHERE user_id=$1', [userId]);
  const map = {};
  for (const r of rows) map[r.topic_id] = r.delta;
  return map;
}

async function acceptAnswer(topicId, answerId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT * FROM answers WHERE id = $1 AND topic_id = $2 FOR UPDATE',
      [answerId, topicId]
    );
    const existing = rows[0] ?? null;
    if (!existing) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query('UPDATE answers SET accepted = FALSE WHERE topic_id = $1', [topicId]);
    const updated = await client.query(
      `UPDATE answers
       SET accepted = TRUE,
           moderation_correctness = COALESCE(moderation_correctness, 'correct'),
           moderated_at = NOW()
       WHERE id = $1 AND topic_id = $2
       RETURNING *`,
      [answerId, topicId]
    );
    await client.query('UPDATE topics SET solved = TRUE WHERE id = $1', [topicId]);
    await client.query('COMMIT');
    return { ...hydrateAnswer(updated.rows[0]), was_accepted: Boolean(existing.accepted) };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// ── Answers ───────────────────────────────────────────────────────────────────
async function saveAnswer(topicId, answer) {
  const row = await q1(`
    INSERT INTO answers (topic_id, user_id, author, initials, role, score, text, images)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [topicId, answer.user_id ?? null, answer.author ?? 'Anonim', answer.initials ?? 'AN',
      answer.role ?? 'Ishtirokchi', answer.score ?? 0, answer.text ?? '', JSON.stringify(answer.images ?? [])]);
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
      RETURNING id, username, name, initials, role, score, email, is_admin, is_moderator
    `, [username, name, initials, role, password, email]);
  } catch (e) {
    if (e.code === '23505') return null; // unique_violation = username or email taken
    throw e;
  }
}

async function getUserByUsername(username) {
  return q1('SELECT * FROM users WHERE username = $1', [username]);
}

async function getUserByEmail(email) {
  return q1('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
}

async function getUserById(id) {
  return q1(`
    SELECT id, username, name, initials, role, score, email, is_admin, is_moderator, banned_at,
           bio, avatar_url, cover_url, headline, location, website, study_goal, interests
    FROM users WHERE id = $1
  `, [id]);
}

async function addUserScore(id, delta, reason = 'answer_accepted') {
  await pool.query('UPDATE users SET score = score + $1 WHERE id = $2', [delta, id]);
  await pool.query('INSERT INTO score_log (user_id, delta, reason) VALUES ($1, $2, $3)', [id, delta, reason]);
}

async function getUserProfile(username) {
  const profile = await q1(`
    SELECT
      u.id, u.username, u.name, u.initials, u.role, u.score, u.is_admin, u.is_moderator, u.created_at,
      u.bio, u.avatar_url, u.cover_url, u.headline, u.location, u.website, u.study_goal, u.interests,
      (SELECT COUNT(*) FROM topics  WHERE user_id = u.id OR author = u.name)::INTEGER AS topics_count,
      (SELECT COUNT(*) FROM answers WHERE user_id = u.id OR author = u.name)::INTEGER AS answers_count,
      (SELECT COUNT(*) FROM answers WHERE (user_id = u.id OR author = u.name) AND accepted = TRUE)::INTEGER AS accepted_count
    FROM users u WHERE LOWER(u.username) = LOWER($1)
  `, [username]);
  if (!profile) return null;

  const recentTopics = await q(`
    SELECT id, title, summary, tags, score, answers, views, activity, difficulty,
           solved, hot, created_at, category
    FROM topics
    WHERE user_id = $1 OR author = $2
    ORDER BY id DESC LIMIT 20
  `, [profile.id, profile.name]);

  return {
    ...profile,
    interests: safeJson(profile.interests, []),
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
    WHERE a.user_id = $1 OR a.author = $2
    ORDER BY a.created_at DESC
    LIMIT 50
  `, [user.id, user.name]);
  return rows;
}

async function updateUserProfile(userId, fields) {
  const current = await q1('SELECT id, name FROM users WHERE id = $1', [userId]);
  if (!current) return null;

  const clean = {
    username: String(fields.username || '').toLowerCase().trim(),
    name: String(fields.name || '').trim(),
    role: normalizeUserRole(fields.role, 'Shogird'),
    headline: String(fields.headline || '').trim(),
    bio: String(fields.bio || '').trim(),
    location: String(fields.location || '').trim(),
    website: String(fields.website || '').trim(),
    study_goal: String(fields.study_goal || '').trim(),
    avatar_url: String(fields.avatar_url || '').trim(),
    cover_url: String(fields.cover_url || '').trim(),
    interests: Array.isArray(fields.interests) ? fields.interests : [],
  };

  const initials = clean.name
    .replace(/'/g, '')
    .split(/\s+/)
    .map(w => w[0]?.toUpperCase())
    .join('')
    .slice(0, 2) || 'AN';

  const row = await q1(`
    UPDATE users
    SET username = $1,
        name = $2,
        initials = $3,
        role = $4,
        headline = $5,
        bio = $6,
        location = $7,
        website = $8,
        study_goal = $9,
        avatar_url = $10,
        cover_url = $11,
        interests = $12
    WHERE id = $13
    RETURNING id, username, name, initials, role, score, email, is_admin, is_moderator, banned_at,
              bio, avatar_url, cover_url, headline, location, website, study_goal, interests
  `, [
    clean.username,
    clean.name.slice(0, 80),
    initials,
    clean.role,
    clean.headline.slice(0, 120),
    clean.bio.slice(0, 600),
    clean.location.slice(0, 80),
    clean.website.slice(0, 160),
    clean.study_goal.slice(0, 160),
    clean.avatar_url,
    clean.cover_url,
    JSON.stringify(clean.interests.slice(0, 12).map(item => String(item).trim().slice(0, 36)).filter(Boolean)),
    userId,
  ]);

  await pool.query(
    'UPDATE topics SET author=$1, initials=$2, role=$3 WHERE user_id=$4',
    [row.name, row.initials, row.role, userId]
  );
  await pool.query(
    'UPDATE answers SET author=$1, initials=$2, role=$3 WHERE user_id=$4',
    [row.name, row.initials, row.role, userId]
  );

  return { ...row, interests: safeJson(row.interests, []) };
}

// ── Direct messages ──────────────────────────────────────────────────────────
function hydrateConversation(row) {
  if (!row) return null;
  return {
    id: row.id,
    updated_at: row.updated_at,
    otherUser: {
      id: row.other_user_id,
      username: row.other_username,
      name: row.other_name,
      initials: row.other_initials,
      avatar_url: row.other_avatar_url || '',
      role: row.other_role,
      score: row.other_score,
    },
    lastMessage: row.last_message_id ? {
      id: row.last_message_id,
      body: row.last_message_body,
      sender_id: row.last_message_sender_id,
      created_at: row.last_message_at,
      is_mine: row.last_message_sender_id === row.viewer_id,
    } : null,
    unread_count: Number(row.unread_count || 0),
  };
}

function hydrateChatMessage(row, viewerId) {
  if (!row) return null;
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    sender_id: row.sender_id,
    body: row.body,
    read_at: row.read_at,
    created_at: row.created_at,
    is_mine: row.sender_id === viewerId,
    sender: {
      id: row.sender_id,
      username: row.sender_username,
      name: row.sender_name,
      initials: row.sender_initials,
      avatar_url: row.sender_avatar_url || '',
      role: row.sender_role,
    },
  };
}

async function getChatUsers(currentUserId, search = '') {
  const term = String(search || '').trim().toLowerCase();
  const like = `%${term}%`;
  const rows = await q(`
    SELECT id, username, name, initials, avatar_url, role, score
    FROM users
    WHERE id <> $1
      AND banned_at IS NULL
      AND (
        $2 = ''
        OR LOWER(username) LIKE $3
        OR LOWER(name) LIKE $3
        OR LOWER(role) LIKE $3
      )
    ORDER BY score DESC, name ASC
    LIMIT 40
  `, [currentUserId, term, like]);
  return rows;
}

async function getConversationForUser(conversationId, userId) {
  const row = await q1(`
    SELECT
      c.id, c.updated_at,
      $2::INTEGER AS viewer_id,
      u.id AS other_user_id,
      u.username AS other_username,
      u.name AS other_name,
      u.initials AS other_initials,
      u.avatar_url AS other_avatar_url,
      u.role AS other_role,
      u.score AS other_score,
      m.id AS last_message_id,
      m.body AS last_message_body,
      m.sender_id AS last_message_sender_id,
      m.created_at AS last_message_at,
      COALESCE(unread.unread_count, 0)::INTEGER AS unread_count
    FROM conversations c
    JOIN users u ON u.id = CASE WHEN c.user_low_id = $2 THEN c.user_high_id ELSE c.user_low_id END
    LEFT JOIN LATERAL (
      SELECT id, body, sender_id, created_at
      FROM chat_messages
      WHERE conversation_id = c.id
      ORDER BY id DESC
      LIMIT 1
    ) m ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::INTEGER AS unread_count
      FROM chat_messages
      WHERE conversation_id = c.id
        AND sender_id <> $2
        AND read_at IS NULL
    ) unread ON TRUE
    WHERE c.id = $1
      AND (c.user_low_id = $2 OR c.user_high_id = $2)
  `, [conversationId, userId]);
  return hydrateConversation(row);
}

async function getOrCreateConversation(userId, otherUserId) {
  const targetId = Number(otherUserId);
  if (!Number.isInteger(targetId) || targetId <= 0 || targetId === userId) return null;
  const other = await q1('SELECT id FROM users WHERE id = $1 AND banned_at IS NULL', [targetId]);
  if (!other) return null;

  const low = Math.min(userId, targetId);
  const high = Math.max(userId, targetId);
  const row = await q1(`
    INSERT INTO conversations (user_low_id, user_high_id)
    VALUES ($1, $2)
    ON CONFLICT (user_low_id, user_high_id)
    DO UPDATE SET updated_at = conversations.updated_at
    RETURNING id
  `, [low, high]);
  return getConversationForUser(row.id, userId);
}

async function getConversationsForUser(userId) {
  const rows = await q(`
    SELECT
      c.id, c.updated_at,
      $1::INTEGER AS viewer_id,
      u.id AS other_user_id,
      u.username AS other_username,
      u.name AS other_name,
      u.initials AS other_initials,
      u.avatar_url AS other_avatar_url,
      u.role AS other_role,
      u.score AS other_score,
      m.id AS last_message_id,
      m.body AS last_message_body,
      m.sender_id AS last_message_sender_id,
      m.created_at AS last_message_at,
      COALESCE(unread.unread_count, 0)::INTEGER AS unread_count
    FROM conversations c
    JOIN users u ON u.id = CASE WHEN c.user_low_id = $1 THEN c.user_high_id ELSE c.user_low_id END
    LEFT JOIN LATERAL (
      SELECT id, body, sender_id, created_at
      FROM chat_messages
      WHERE conversation_id = c.id
      ORDER BY id DESC
      LIMIT 1
    ) m ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::INTEGER AS unread_count
      FROM chat_messages
      WHERE conversation_id = c.id
        AND sender_id <> $1
        AND read_at IS NULL
    ) unread ON TRUE
    WHERE c.user_low_id = $1 OR c.user_high_id = $1
    ORDER BY COALESCE(m.created_at, c.updated_at) DESC, c.id DESC
  `, [userId]);
  return rows.map(hydrateConversation);
}

async function getConversationMessages(conversationId, userId, options = {}) {
  const conversation = await q1(
    'SELECT id FROM conversations WHERE id = $1 AND (user_low_id = $2 OR user_high_id = $2)',
    [conversationId, userId]
  );
  if (!conversation) return null;

  const beforeId = Number(options.before);
  const limit = Math.min(Math.max(Number(options.limit) || 80, 1), 120);
  const rows = await q(`
    SELECT
      m.id, m.conversation_id, m.sender_id, m.body, m.read_at, m.created_at,
      u.username AS sender_username,
      u.name AS sender_name,
      u.initials AS sender_initials,
      u.avatar_url AS sender_avatar_url,
      u.role AS sender_role
    FROM chat_messages m
    LEFT JOIN users u ON u.id = m.sender_id
    WHERE m.conversation_id = $1
      AND ($2::INTEGER IS NULL OR m.id < $2)
    ORDER BY m.id DESC
    LIMIT $3
  `, [conversationId, Number.isInteger(beforeId) && beforeId > 0 ? beforeId : null, limit]);
  return rows.reverse().map((row) => hydrateChatMessage(row, userId));
}

async function sendConversationMessage(conversationId, userId, body) {
  const conversation = await q1(
    'SELECT id FROM conversations WHERE id = $1 AND (user_low_id = $2 OR user_high_id = $2)',
    [conversationId, userId]
  );
  if (!conversation) return null;

  const row = await q1(`
    INSERT INTO chat_messages (conversation_id, sender_id, body)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [conversationId, userId, body]);
  await pool.query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [conversationId]);

  const sender = await q1('SELECT username, name, initials, avatar_url, role FROM users WHERE id = $1', [userId]);
  return hydrateChatMessage({
    ...row,
    sender_username: sender?.username,
    sender_name: sender?.name,
    sender_initials: sender?.initials,
    sender_avatar_url: sender?.avatar_url,
    sender_role: sender?.role,
  }, userId);
}

async function markConversationRead(conversationId, userId) {
  const result = await pool.query(`
    UPDATE chat_messages
    SET read_at = NOW()
    WHERE conversation_id = $1
      AND sender_id <> $2
      AND read_at IS NULL
      AND EXISTS (
        SELECT 1 FROM conversations c
        WHERE c.id = $1
          AND (c.user_low_id = $2 OR c.user_high_id = $2)
      )
  `, [conversationId, userId]);
  return result.rowCount;
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
  const [users, topics, answers, todayUsers, todayTopics, todayAnswers, banned, moderators] = await Promise.all([
    q1('SELECT COUNT(*)::INTEGER AS n FROM users'),
    q1('SELECT COUNT(*)::INTEGER AS n FROM topics'),
    q1('SELECT COUNT(*)::INTEGER AS n FROM answers'),
    q1("SELECT COUNT(*)::INTEGER AS n FROM users   WHERE created_at >= NOW() - INTERVAL '24 hours'"),
    q1("SELECT COUNT(*)::INTEGER AS n FROM topics  WHERE created_at >= NOW() - INTERVAL '24 hours'"),
    q1("SELECT COUNT(*)::INTEGER AS n FROM answers WHERE created_at >= NOW() - INTERVAL '24 hours'"),
    q1('SELECT COUNT(*)::INTEGER AS n FROM users WHERE banned_at IS NOT NULL'),
    q1('SELECT COUNT(*)::INTEGER AS n FROM users WHERE is_admin = TRUE OR is_moderator = TRUE'),
  ]);
  return {
    users: users.n, topics: topics.n, answers: answers.n,
    banned: banned.n, moderators: moderators.n,
    today: { users: todayUsers.n, topics: todayTopics.n, answers: todayAnswers.n },
  };
}

async function getAllUsersAdmin(limit = 100, offset = 0) {
  return q(`
    SELECT u.id, u.username, u.email, u.name, u.initials, u.role, u.score,
           u.is_admin, u.is_moderator, u.banned_at, u.created_at,
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
  if ('is_moderator' in fields) { sets.push(`is_moderator = $${i++}`); vals.push(fields.is_moderator); }
  if ('banned'     in fields) { sets.push(`banned_at = $${i++}`);  vals.push(fields.banned ? new Date() : null); }
  if ('role'       in fields) { sets.push(`role = $${i++}`);        vals.push(fields.role); }
  if ('score'      in fields) { sets.push(`score = $${i++}`);       vals.push(fields.score); }
  if (!sets.length) return;
  vals.push(id);
  await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${i}`, vals);
}

async function hasAnyAdmin() {
  const row = await q1('SELECT EXISTS(SELECT 1 FROM users WHERE is_admin = TRUE) AS exists');
  return Boolean(row?.exists);
}

async function promoteUserToAdmin(id) {
  return q1(`
    UPDATE users
    SET is_admin = TRUE
    WHERE id = $1 AND banned_at IS NULL
    RETURNING id, username, name, initials, role, score, email, is_admin, is_moderator, banned_at, bio
  `, [id]);
}

function parseStaffList(value) {
  return String(value || '')
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter(Boolean);
}

async function bootstrapConfiguredStaff(env = process.env) {
  const adminEmails = parseStaffList(env.ADMIN_EMAILS || env.ADMIN_EMAIL);
  const moderatorEmails = parseStaffList(env.MODERATOR_EMAILS || env.MODERATOR_EMAIL);
  const adminUsernames = parseStaffList(env.ADMIN_USERNAMES || env.ADMIN_USERNAME);
  const moderatorUsernames = parseStaffList(env.MODERATOR_USERNAMES || env.MODERATOR_USERNAME);

  const results = { admins: 0, moderators: 0 };

  if (adminEmails.length) {
    const rows = await q(
      'UPDATE users SET is_admin = TRUE WHERE LOWER(email) = ANY($1) RETURNING id',
      [adminEmails]
    );
    results.admins += rows.length;
  }
  if (moderatorEmails.length) {
    const rows = await q(
      `UPDATE users
       SET is_moderator = TRUE,
           role = CASE WHEN role IN ('Shogird','Ishtirokchi') THEN 'Moderator' ELSE role END
       WHERE LOWER(email) = ANY($1)
       RETURNING id`,
      [moderatorEmails]
    );
    results.moderators += rows.length;
  }
  if (adminUsernames.length) {
    console.warn('ADMIN_USERNAMES is legacy; prefer ADMIN_EMAILS for staff bootstrap.');
    const rows = await q(
      'UPDATE users SET is_admin = TRUE WHERE LOWER(username) = ANY($1) RETURNING id',
      [adminUsernames]
    );
    results.admins += rows.length;
  }
  if (moderatorUsernames.length) {
    console.warn('MODERATOR_USERNAMES is legacy; prefer MODERATOR_EMAILS for staff bootstrap.');
    const rows = await q(
      `UPDATE users
       SET is_moderator = TRUE,
           role = CASE WHEN role IN ('Shogird','Ishtirokchi') THEN 'Moderator' ELSE role END
       WHERE LOWER(username) = ANY($1)
       RETURNING id`,
      [moderatorUsernames]
    );
    results.moderators += rows.length;
  }

  return results;
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT topic_id, accepted FROM answers WHERE id = $1 FOR UPDATE',
      [id]
    );
    const answer = rows[0] ?? null;
    if (!answer) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query('DELETE FROM answers WHERE id = $1', [id]);
    const solved = await client.query(
      'SELECT EXISTS(SELECT 1 FROM answers WHERE topic_id = $1 AND accepted = TRUE) AS solved',
      [answer.topic_id]
    );
    const updated = await client.query(
      `UPDATE topics
       SET answers = GREATEST(answers - 1, 0),
           solved = $1
       WHERE id = $2
       RETURNING answers, solved`,
      [Boolean(solved.rows[0]?.solved), answer.topic_id]
    );
    await client.query('COMMIT');
    return {
      topic_id: answer.topic_id,
      answers: updated.rows[0]?.answers ?? 0,
      solved: Boolean(updated.rows[0]?.solved),
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
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
  if (fields.solved === false) {
    await pool.query('UPDATE answers SET accepted = FALSE WHERE topic_id = $1', [id]);
  }
}

async function moderateAnswer(id, fields, moderatorId) {
  const sets = [];
  const vals = [];
  let i = 1;
  if ('helpfulness' in fields) {
    sets.push(`moderation_helpfulness = $${i++}`);
    vals.push(fields.helpfulness);
  }
  if ('correctness' in fields) {
    sets.push(`moderation_correctness = $${i++}`);
    vals.push(fields.correctness);
  }
  if (!sets.length) return null;
  sets.push(`moderated_by = $${i++}`);
  vals.push(moderatorId);
  sets.push('moderated_at = NOW()');
  vals.push(id);
  const row = await q1(`UPDATE answers SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, vals);
  if (row && fields.correctness === 'incorrect' && row.accepted) {
    await pool.query('UPDATE answers SET accepted = FALSE WHERE id = $1', [id]);
    const stillSolved = await q1(
      'SELECT EXISTS(SELECT 1 FROM answers WHERE topic_id = $1 AND accepted = TRUE) AS solved',
      [row.topic_id]
    );
    await pool.query('UPDATE topics SET solved = $1 WHERE id = $2', [Boolean(stillSolved?.solved), row.topic_id]);
    row.accepted = false;
    row.topic_solved = Boolean(stillSolved?.solved);
  }
  return hydrateAnswer(row);
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
  const client  = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT delta FROM answer_votes WHERE user_id=$1 AND answer_id=$2 FOR UPDATE',
      [userId, answerId]
    );
    const existing  = rows[0] ?? null;
    let scoreDelta  = 0;
    let newVoted    = 0;

    if (!existing) {
      const ins = await client.query(
        `INSERT INTO answer_votes (user_id, answer_id, delta) VALUES ($1,$2,$3)
         ON CONFLICT (user_id, answer_id) DO NOTHING`,
        [userId, answerId, clamped]
      );
      if (ins.rowCount > 0) { scoreDelta = clamped; newVoted = clamped; }
    } else if (existing.delta === clamped) {
      await client.query(
        'DELETE FROM answer_votes WHERE user_id=$1 AND answer_id=$2',
        [userId, answerId]
      );
      scoreDelta = -clamped; newVoted = 0;
    } else {
      await client.query(
        'UPDATE answer_votes SET delta=$1 WHERE user_id=$2 AND answer_id=$3',
        [clamped, userId, answerId]
      );
      scoreDelta = clamped * 2; newVoted = clamped;
    }

    const { rows: sr } = await client.query(
      'UPDATE answers SET score=score+$1 WHERE id=$2 RETURNING score',
      [scoreDelta, answerId]
    );
    await client.query('COMMIT');
    return { score: sr[0]?.score ?? 0, voted: newVoted, scoreDelta };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

async function getMyAnswerVotes(userId) {
  const rows = await q('SELECT answer_id, delta FROM answer_votes WHERE user_id=$1', [userId]);
  const map = {};
  for (const r of rows) map[r.answer_id] = r.delta;
  return map;
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
    SELECT
      t.id, t.category, t.title, t.summary, t.tags, t.author, t.score,
      COALESCE(a.answers, 0)::INTEGER AS answers,
      t.views, t.activity, t.difficulty, t.solved, t.hot, t.pinned, t.created_at
    FROM topics t
    LEFT JOIN (
      SELECT topic_id, COUNT(*)::INTEGER AS answers
      FROM answers
      GROUP BY topic_id
    ) a ON a.topic_id = t.id
    WHERE LOWER(t.title) LIKE $1
       OR LOWER(t.summary) LIKE $1
       OR LOWER(t.tags) LIKE $1
       OR LOWER(t.author) LIKE $1
    ORDER BY t.score DESC
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
      { username: 'aziza_kimyo',  email: 'aziza@example.com',   name: 'Aziza Karimova',      role: 'Mutaxassis',      score: 18400 },
      { username: 'sardor_yu',    email: 'sardor@example.com',  name: 'Sardor Yusupov',      role: 'Mutaxassis',      score: 12100 },
      { username: 'nilufar_r',    email: 'nilufar@example.com', name: 'Nilufar Rashidova',   role: 'Mutaxassis',      score: 9300  },
      { username: 'farrux_t',     email: 'farrux@example.com',  name: "Farrux Toshpo'latov", role: "O'rta daraja",     score: 7800  },
      { username: 'nodira_s',     email: 'nodira@example.com',  name: 'Nodira Saidova',      role: "O'rta daraja",     score: 6400  },
      { username: 'jasur_i',      email: 'jasur@example.com',   name: 'Jasur Ibragimov',     role: 'Ishtirokchi',     score: 4200  },
      { username: 'mukhtor_n',    email: 'mukhtor@example.com', name: 'Mukhtor Nazarov',     role: 'Ishtirokchi',     score: 2100  },
      { username: 'sevara_t',     email: 'sevara@example.com',  name: 'Sevara Toshmatova',   role: 'Shogird',         score: 1350  },
    ];
    for (const u of demoUsers) {
      const initials = u.name.replace(/'/g, '').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
      await pool.query(`
        INSERT INTO users (username, email, name, initials, role, password, score)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (username) DO NOTHING
      `, [u.username, u.email, u.name, initials, u.role, hash, u.score]);
    }
  }

  await pool.query(`
    UPDATE users
    SET email = CASE username
      WHEN 'aziza_kimyo' THEN 'aziza@example.com'
      WHEN 'sardor_yu' THEN 'sardor@example.com'
      WHEN 'nilufar_r' THEN 'nilufar@example.com'
      WHEN 'farrux_t' THEN 'farrux@example.com'
      WHEN 'nodira_s' THEN 'nodira@example.com'
      WHEN 'jasur_i' THEN 'jasur@example.com'
      WHEN 'mukhtor_n' THEN 'mukhtor@example.com'
      WHEN 'sevara_t' THEN 'sevara@example.com'
      ELSE email
    END
    WHERE email IS NULL
      AND username IN ('aziza_kimyo','sardor_yu','nilufar_r','farrux_t','nodira_s','jasur_i','mukhtor_n','sevara_t')
  `);

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

  // Keep demo admin opt-in so production installs do not get a known default admin.
  if (String(process.env.SEED_DEMO_ADMIN || '').toLowerCase() === 'true') {
    await pool.query("UPDATE users SET is_admin = TRUE WHERE username = 'aziza_kimyo'");
  }

  // Tournaments
  const tourCount = await q1('SELECT COUNT(*)::INTEGER AS n FROM tournaments');
  if (tourCount.n === 0) {
    const tours = [
      ["O'zbekiston Kimyo Olimpiadasi — Final", 'respublika', 'Toshkent',  '2026-06-28T09:00:00Z', '2026-06-25T23:59:59Z', "12 000 000 so'm", "10-11 sinflar uchun ochiq. 3 bosqich: test, yozma, amaliy. O'zRFA bilan hamkorlikda.", 200],
      ["Mendeleev Xalqaro Turniri — Saralash",  'xalqaro',   'Toshkent',  '2026-07-06T09:00:00Z', '2026-07-03T23:59:59Z', "$2 500",          "IChO oldidan eng muhim tayyorlov musobaqasi. 9-11 sinflar.",                            50 ],
      ["IChO 2026 Milliy Jamoa Tanlovi",         'xalqaro',   'Samarqand', '2026-07-12T09:00:00Z', '2026-07-09T23:59:59Z', "IChO sayohati",  "Xalqaro kimyo olimpiadasiga seleksiya. Faqat 11-sinf.",                                  30 ],
      ["Ximor Tezkor Turnir — Ekvivalent",       'tezkor',    'Online',    '2026-07-20T09:00:00Z', '2026-07-19T23:59:59Z', "200 000 so'm",   "1v1 tezkor reaksiya aniqlash. Top-32 format. Barcha sinflar.",                          64 ],
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
  USER_ROLES, normalizeUserRole,
  initSchema, seedDemo,
  getAllTopics, getTopicWithAnswers, saveTopic, updateTopic, updateScore, acceptAnswer,
  saveAnswer,
  createUser, getUserByUsername, getUserByEmail, getUserById, addUserScore, getUserProfile,
  getUserAnswers, updateUserProfile, updateUserBio,
  getAllTournaments, getTournamentById, registerForTournament,
  getLeaderboard,
  createNotification, getNotifications, markNotificationsRead,
  getChatUsers, getConversationForUser, getOrCreateConversation, getConversationsForUser,
  getConversationMessages, sendConversationMessage, markConversationRead,
  searchTopics,
  // Admin
  getAdminStats, getAllUsersAdmin, updateUserAdmin, hasAnyAdmin, promoteUserToAdmin, bootstrapConfiguredStaff,
  getAdminTopics, adminDeleteTopic, adminDeleteAnswer, adminUpdateTopic, moderateAnswer,
  broadcastAnnouncement, getRecentActivity,
  // Votes & saves
  toggleSavedTopic, getUserSavedTopicIds,
  voteAnswer, voteTopic, getMyTopicVotes, getMyAnswerVotes,
  incrementTopicViews,
};
