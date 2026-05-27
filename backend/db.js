/**
 * db.js — SQLite database for Ximor forum
 *
 * Uses better-sqlite3 (synchronous, zero-config).
 * Database file: backend/ximor.db  (git-ignored in production)
 *
 * Tables
 * ──────
 *   topics   — questions posted by users
 *   answers  — replies to a topic
 */

const Database = require('better-sqlite3');
const path = require('path');

// Use DB_PATH env var if set (Railway Volume), else local file
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'ximor.db');
const db = new Database(DB_PATH);
console.log(`🗄️  SQLite → ${DB_PATH}`);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ──────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT    UNIQUE NOT NULL,
    name       TEXT    NOT NULL,
    initials   TEXT    NOT NULL,
    role       TEXT    DEFAULT 'Shogird',
    password   TEXT    NOT NULL,
    score      INTEGER DEFAULT 0,
    created_at TEXT    DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE TABLE IF NOT EXISTS topics (
    id          INTEGER PRIMARY KEY,
    category    TEXT    NOT NULL DEFAULT 'all',
    title       TEXT    NOT NULL,
    summary     TEXT    DEFAULT '',
    formula     TEXT    DEFAULT '',
    tags        TEXT    DEFAULT '[]',       -- JSON array of strings
    author      TEXT    DEFAULT 'Anonim',
    initials    TEXT    DEFAULT 'AN',
    role        TEXT    DEFAULT 'Ishtirokchi',
    score       INTEGER DEFAULT 1,
    answers     INTEGER DEFAULT 0,
    views       TEXT    DEFAULT '0',
    activity    TEXT    DEFAULT 'Hozir',
    difficulty  TEXT    DEFAULT 'O''rta',
    participants TEXT   DEFAULT '[]',       -- JSON array of initials
    pinned      INTEGER DEFAULT 0,          -- boolean 0/1
    hot         INTEGER DEFAULT 0,
    solved      INTEGER DEFAULT 0,
    created_at  TEXT    DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE TABLE IF NOT EXISTS answers (
    id          INTEGER PRIMARY KEY,
    topic_id    INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    author      TEXT    DEFAULT 'Anonim',
    initials    TEXT    DEFAULT 'AN',
    role        TEXT    DEFAULT 'Ishtirokchi',
    accepted    INTEGER DEFAULT 0,
    score       INTEGER DEFAULT 0,
    text        TEXT    NOT NULL,
    created_at  TEXT    DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE INDEX IF NOT EXISTS idx_answers_topic ON answers(topic_id);
`);

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Parse JSON columns safely */
function hydrateTopic(row) {
  if (!row) return null;
  return {
    ...row,
    tags:         safeJson(row.tags,         []),
    participants: safeJson(row.participants,  []),
    pinned:       Boolean(row.pinned),
    hot:          Boolean(row.hot),
    solved:       Boolean(row.solved),
    saved:        false,   // client-side only
    voted:        0,       // client-side only
    answersList:  [],      // filled by getTopicWithAnswers when needed
  };
}

function hydrateAnswer(row) {
  if (!row) return null;
  return { ...row, accepted: Boolean(row.accepted) };
}

function safeJson(str, fallback) {
  try { return JSON.parse(str); }
  catch { return fallback; }
}

// ── Queries ──────────────────────────────────────────────────────────────────

const stmts = {
  // Topics
  insertTopic: db.prepare(`
    INSERT OR REPLACE INTO topics
      (id, category, title, summary, formula, tags, author, initials, role,
       score, answers, views, activity, difficulty, participants, pinned, hot, solved)
    VALUES
      (@id, @category, @title, @summary, @formula, @tags, @author, @initials, @role,
       @score, @answers, @views, @activity, @difficulty, @participants, @pinned, @hot, @solved)
  `),

  allTopics: db.prepare(`SELECT * FROM topics ORDER BY pinned DESC, id DESC`),

  topicById: db.prepare(`SELECT * FROM topics WHERE id = ?`),

  updateTopicScore: db.prepare(`
    UPDATE topics SET score = score + ? WHERE id = ?
  `),

  updateTopicAnswerCount: db.prepare(`
    UPDATE topics SET answers = answers + 1, activity = 'Hozir', solved = 0 WHERE id = ?
  `),

  markSolved: db.prepare(`UPDATE topics SET solved = 1 WHERE id = ?`),

  // Answers
  insertAnswer: db.prepare(`
    INSERT INTO answers (id, topic_id, author, initials, role, accepted, score, text)
    VALUES (@id, @topicId, @author, @initials, @role, @accepted, @score, @text)
  `),

  answersByTopic: db.prepare(`
    SELECT * FROM answers WHERE topic_id = ? ORDER BY accepted DESC, score DESC, id ASC
  `),

  acceptAnswer: db.prepare(`
    UPDATE answers SET accepted = 1 WHERE id = ? AND topic_id = ?
  `),

  answerExists: db.prepare(`SELECT 1 FROM answers WHERE id = ?`),
};

// ── Public API ────────────────────────────────────────────────────────────────

function getAllTopics() {
  return stmts.allTopics.all().map(hydrateTopic);
}

function getTopicWithAnswers(id) {
  const topic = hydrateTopic(stmts.topicById.get(id));
  if (!topic) return null;
  topic.answersList = stmts.answersByTopic.all(id).map(hydrateAnswer);
  return topic;
}

function saveTopic(topic) {
  stmts.insertTopic.run({
    id:           topic.id,
    category:     topic.category     ?? 'all',
    title:        topic.title        ?? '',
    summary:      topic.summary      ?? '',
    formula:      topic.formula      ?? '',
    tags:         JSON.stringify(topic.tags         ?? []),
    author:       topic.author       ?? 'Anonim',
    initials:     topic.initials     ?? 'AN',
    role:         topic.role         ?? 'Ishtirokchi',
    score:        topic.score        ?? 1,
    answers:      topic.answers      ?? 0,
    views:        String(topic.views ?? '0'),
    activity:     topic.activity     ?? 'Hozir',
    difficulty:   topic.difficulty   ?? "O'rta",
    participants: JSON.stringify(topic.participants ?? []),
    pinned:       topic.pinned       ? 1 : 0,
    hot:          topic.hot          ? 1 : 0,
    solved:       topic.solved       ? 1 : 0,
  });
}

function saveAnswer(topicId, answer) {
  // Idempotent — ignore duplicate ids
  if (stmts.answerExists.get(answer.id)) return false;
  stmts.insertAnswer.run({
    id:       answer.id,
    topicId,
    author:   answer.author   ?? 'Anonim',
    initials: answer.initials ?? 'AN',
    role:     answer.role     ?? 'Ishtirokchi',
    accepted: answer.accepted ? 1 : 0,
    score:    answer.score    ?? 0,
    text:     answer.text     ?? '',
  });
  stmts.updateTopicAnswerCount.run(topicId);
  return true;
}

function updateScore(topicId, delta) {
  stmts.updateTopicScore.run(delta, topicId);
  return stmts.topicById.get(topicId)?.score ?? 0;
}

function acceptAnswer(topicId, answerId) {
  stmts.acceptAnswer.run(answerId, topicId);
  stmts.markSolved.run(topicId);
}

// ── User queries ──────────────────────────────────────────────────────────────
const userStmts = {
  create: db.prepare(`
    INSERT INTO users (username, name, initials, role, password)
    VALUES (@username, @name, @initials, @role, @password)
  `),
  byUsername: db.prepare(`SELECT * FROM users WHERE username = ?`),
  byId:       db.prepare(`SELECT id, username, name, initials, role, score FROM users WHERE id = ?`),
  addScore:   db.prepare(`UPDATE users SET score = score + ? WHERE id = ?`),
};

function createUser({ username, name, initials, role = 'Shogird', password }) {
  try {
    const info = userStmts.create.run({ username, name, initials, role, password });
    return userStmts.byId.get(info.lastInsertRowid);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return null; // username taken
    throw e;
  }
}

function getUserByUsername(username) { return userStmts.byUsername.get(username) ?? null; }
function getUserById(id)             { return userStmts.byId.get(id) ?? null; }
function addUserScore(id, delta)     { userStmts.addScore.run(delta, id); }

module.exports = {
  getAllTopics, getTopicWithAnswers, saveTopic, saveAnswer, updateScore, acceptAnswer,
  createUser, getUserByUsername, getUserById, addUserScore,
};
