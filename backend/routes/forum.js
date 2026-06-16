const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const clients = new Set();

// ── Input sanitization ────────────────────────────────────────────────────────
function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/?(iframe|object|embed|frame|frameset|base|form)[^>]*>/gi, '')
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')
    .replace(/(href|src|action)\s*=\s*"javascript:[^"]*"/gi, '$1="#"')
    .replace(/(href|src|action)\s*=\s*'javascript:[^']*'/gi, "$1='#'")
    .trim();
}

function sanitizeTopic(body) {
  return {
    ...body,
    title:   sanitize(String(body.title  || '').slice(0, 300)),
    summary: body.summary ? sanitize(String(body.summary).slice(0, 20_000)) : '',
    tags:    Array.isArray(body.tags)
               ? body.tags.slice(0, 10).map(t => sanitize(String(t).slice(0, 50)))
               : [],
  };
}

// ── SSE broadcast ─────────────────────────────────────────────────────────────
function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch { clients.delete(res); }
  }
}

// ── GET /api/forum/stream ─────────────────────────────────────────────────────
router.get('/stream', async (req, res) => {
  res.setHeader('Content-Type',      'text/event-stream');
  res.setHeader('Cache-Control',     'no-cache');
  res.setHeader('Connection',        'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    const topics = await db.getAllTopics();
    res.write(`event: init\ndata: ${JSON.stringify(topics)}\n\n`);
  } catch (e) {
    console.error('SSE init error:', e.message);
    res.write(`event: init\ndata: []\n\n`);
  }

  clients.add(res);
  const heartbeat = setInterval(() => {
    try { res.write(': ping\n\n'); } catch { clearInterval(heartbeat); clients.delete(res); }
  }, 25_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
});

// ── GET /api/forum/topics ─────────────────────────────────────────────────────
router.get('/topics', async (req, res) => {
  res.json(await db.getAllTopics());
});

// ── GET /api/forum/topics/:id ─────────────────────────────────────────────────
router.get('/topics/:id', async (req, res) => {
  const topic = await db.getTopicWithAnswers(Number(req.params.id));
  if (!topic) return res.status(404).json({ error: 'not found' });
  res.json(topic);
});

// ── POST /api/forum/topics ────────────────────────────────────────────────────
router.post('/topics', requireAuth, async (req, res) => {
  if (!req.body?.title) return res.status(400).json({ error: 'title required' });

  const clean = sanitizeTopic(req.body);
  const saved = await db.saveTopic({
    ...clean,
    author:   req.user.name,
    initials: req.user.initials,
    role:     req.user.role,
  });

  broadcast('topic', { ...saved, answersList: [] });
  res.json({ ok: true, id: saved.id, listeners: clients.size });
});

// ── POST /api/forum/topics/:id/answers ───────────────────────────────────────
router.post('/topics/:id/answers', requireAuth, async (req, res) => {
  const topicId = Number(req.params.id);
  const topic   = await db.getTopicWithAnswers(topicId);
  if (!topic) return res.status(404).json({ error: 'topic not found' });

  const raw = req.body?.text || req.body?.content || '';
  if (!raw.trim()) return res.status(400).json({ error: 'content required' });

  const saved = await db.saveAnswer(topicId, {
    user_id:  req.user.id,
    text:     sanitize(String(raw).slice(0, 20_000)),
    author:   req.user.name,
    initials: req.user.initials,
    role:     req.user.role,
    score:    0,
  });

  if (saved) {
    const updated = await db.getTopicWithAnswers(topicId);
    broadcast('answer', { topicId, answer: saved, answers: updated.answers });
    // Notify via SSE so logged-in users can refresh notifications
    broadcast('notification', { topicId });
  }

  res.json({ ok: true, listeners: clients.size });
});

// ── PATCH /api/forum/topics/:id/vote ─────────────────────────────────────────
router.patch('/topics/:id/vote', requireAuth, async (req, res) => {
  const topicId = Number(req.params.id);
  const delta   = Number(req.body?.delta ?? 0);
  if (delta !== 1 && delta !== -1) return res.status(400).json({ error: 'delta must be 1 or -1' });

  const newScore = await db.updateScore(topicId, delta);
  broadcast('vote', { topicId, score: newScore });
  res.json({ ok: true, score: newScore });
});

// ── POST /api/forum/topics/:id/accept/:answerId ───────────────────────────────
router.post('/topics/:id/accept/:answerId', requireAuth, async (req, res) => {
  const topicId  = Number(req.params.id);
  const answerId = Number(req.params.answerId);
  const topic  = await db.getTopicWithAnswers(topicId);
  if (!topic) return res.status(404).json({ error: 'not found' });
  const answer = await db.acceptAnswer(topicId, answerId);
  if (answer?.user_id) {
    await db.addUserScore(answer.user_id, 50, 'answer_accepted');
    await db.createNotification(
      answer.user_id, 'accept', topicId,
      `Tabriklaymiz! Javobingiz qabul qilindi: "${topic.title.slice(0, 60)}" (+50 ball)`
    );
  }
  broadcast('accept', { topicId, answerId });
  res.json({ ok: true });
});

// ── GET /api/forum/search?q= ──────────────────────────────────────────────────
router.get('/search', async (req, res) => {
  const results = await db.searchTopics(req.query.q || '');
  res.json(results);
});

// ── PATCH /api/forum/topics/:id/views ────────────────────────────────────────
router.patch('/topics/:id/views', async (req, res) => {
  await db.incrementTopicViews(Number(req.params.id));
  res.json({ ok: true });
});

// ── POST /api/forum/topics/:id/save ──────────────────────────────────────────
router.post('/topics/:id/save', requireAuth, async (req, res) => {
  const topicId = Number(req.params.id);
  const saved   = await db.toggleSavedTopic(req.user.id, topicId);
  res.json({ ok: true, saved });
});

// ── GET /api/forum/saved ──────────────────────────────────────────────────────
router.get('/saved', requireAuth, async (req, res) => {
  const ids = await db.getUserSavedTopicIds(req.user.id);
  res.json(ids);
});

// ── PATCH /api/forum/answers/:id/vote ────────────────────────────────────────
router.patch('/answers/:id/vote', requireAuth, async (req, res) => {
  const answerId = Number(req.params.id);
  const delta    = Number(req.body?.delta ?? 1);
  const newScore = await db.voteAnswer(req.user.id, answerId, delta);
  broadcast('answerVote', { answerId, score: newScore });
  res.json({ ok: true, score: newScore });
});

// ── GET /api/forum/listeners ──────────────────────────────────────────────────
router.get('/listeners', (req, res) => {
  res.json({ count: clients.size });
});

module.exports = router;
module.exports.broadcast = broadcast;
