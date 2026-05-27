const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const clients = new Set();

// ── Input sanitization ────────────────────────────────────────────────────────
// Strips script/iframe/object tags and dangerous event attributes.
// React already escapes HTML on render, but we sanitize at the DB layer
// so raw data is clean regardless of which client renders it.
function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str
    // Remove entire <script>…</script> blocks (case-insensitive, across newlines)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    // Remove <iframe>, <object>, <embed>, <frame>, <frameset>
    .replace(/<\/?(iframe|object|embed|frame|frameset|base|form)[^>]*>/gi, '')
    // Strip on* event attributes:  onclick="…"  onload='…'  onerror=foo
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')
    // Strip javascript: from href/src/action
    .replace(/(href|src|action)\s*=\s*"javascript:[^"]*"/gi, '$1="#"')
    .replace(/(href|src|action)\s*=\s*'javascript:[^']*'/gi, "$1='#'")
    // Trim to reasonable max lengths
    .trim();
}

function sanitizeTopic(body) {
  return {
    ...body,
    title:   sanitize(String(body.title  || '').slice(0, 300)),
    content: body.content ? sanitize(String(body.content).slice(0, 20_000)) : undefined,
    tags:    Array.isArray(body.tags)
               ? body.tags.slice(0, 10).map(t => sanitize(String(t).slice(0, 50)))
               : [],
  };
}

function sanitizeAnswer(body) {
  return {
    ...body,
    content: sanitize(String(body.content || '').slice(0, 20_000)),
  };
}

// ── SSE broadcast ────────────────────────────────────────────────────────────
function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(payload);
}

// ── GET /api/forum/stream ─────────────────────────────────────────────────────
router.get('/stream', (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const topics = db.getAllTopics();
  if (topics.length > 0) {
    res.write(`event: init\ndata: ${JSON.stringify(topics)}\n\n`);
  }

  clients.add(res);
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
});

// ── GET /api/forum/topics ─────────────────────────────────────────────────────
router.get('/topics', (req, res) => {
  res.json(db.getAllTopics());
});

// ── GET /api/forum/topics/:id ─────────────────────────────────────────────────
router.get('/topics/:id', (req, res) => {
  const topic = db.getTopicWithAnswers(Number(req.params.id));
  if (!topic) return res.status(404).json({ error: 'not found' });
  res.json(topic);
});

// ── POST /api/forum/topics ────────────────────────────────────────────────────
router.post('/topics', requireAuth, (req, res) => {
  if (!req.body?.title) return res.status(400).json({ error: 'title required' });

  const clean = sanitizeTopic(req.body);
  const topic = {
    ...clean,
    author:   req.user.name,
    initials: req.user.initials,
    role:     req.user.role,
  };
  db.saveTopic(topic);
  broadcast('topic', { ...topic, answersList: [] });
  res.json({ ok: true, listeners: clients.size });
});

// ── POST /api/forum/topics/:id/answers ───────────────────────────────────────
router.post('/topics/:id/answers', requireAuth, (req, res) => {
  const topicId = Number(req.params.id);
  const topic   = db.getTopicWithAnswers(topicId);
  if (!topic) return res.status(404).json({ error: 'topic not found' });

  if (!req.body?.content) return res.status(400).json({ error: 'content required' });

  const clean  = sanitizeAnswer(req.body);
  const answer = {
    ...clean,
    id:       req.body.id || Date.now(),
    author:   req.user.name,
    initials: req.user.initials,
    role:     req.user.role,
  };
  const saved = db.saveAnswer(topicId, answer);

  if (saved) {
    const updated = db.getTopicWithAnswers(topicId);
    broadcast('answer', { topicId, answer, answers: updated.answers });
  }

  res.json({ ok: true, listeners: clients.size });
});

// ── PATCH /api/forum/topics/:id/vote ─────────────────────────────────────────
router.patch('/topics/:id/vote', requireAuth, (req, res) => {
  const topicId = Number(req.params.id);
  const delta   = Number(req.body?.delta ?? 0);
  if (delta !== 1 && delta !== -1) return res.status(400).json({ error: 'delta must be 1 or -1' });

  const newScore = db.updateScore(topicId, delta);
  broadcast('vote', { topicId, score: newScore });
  res.json({ ok: true, score: newScore });
});

// ── POST /api/forum/topics/:id/accept/:answerId ───────────────────────────────
router.post('/topics/:id/accept/:answerId', requireAuth, (req, res) => {
  const topicId  = Number(req.params.id);
  const answerId = Number(req.params.answerId);
  db.acceptAnswer(topicId, answerId);
  broadcast('accept', { topicId, answerId });
  res.json({ ok: true });
});

// ── GET /api/forum/listeners ──────────────────────────────────────────────────
router.get('/listeners', (req, res) => {
  res.json({ count: clients.size });
});

module.exports = router;
module.exports.broadcast = broadcast;
