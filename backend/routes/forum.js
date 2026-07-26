const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { hasModeratorAccess } = require('../middleware/requireModerator');

const router = express.Router();
const clients = new Set();
const TOPIC_CATEGORIES = new Set(['all', 'organik', 'anorganik', 'fizikaviy', 'analitik', 'dtm']);

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

function sanitizeImages(imagesInput, defaultName = 'Rasm') {
  let imageBytes = 0;
  return Array.isArray(imagesInput)
    ? imagesInput
        .slice(0, 4)
        .map((image) => {
          const src = typeof image?.src === 'string' ? image.src : '';
          const valid = /^data:image\/(?:jpeg|jpg|png|webp);base64,/i.test(src);
          if (!valid || src.length > 2_000_000 || imageBytes + src.length > 6_000_000) return null;
          imageBytes += src.length;
          return {
            id: sanitize(String(image.id || '').slice(0, 180)),
            name: sanitize(String(image.name || defaultName).slice(0, 180)),
            size: Math.max(0, Number(image.size) || 0),
            src,
          };
        })
        .filter(Boolean)
    : [];
}

function sanitizeTopic(body) {
  return {
    ...body,
    category: sanitize(String(body.category || 'all').slice(0, 50)),
    title:   sanitize(String(body.title  || '').slice(0, 300)),
    summary: body.summary ? sanitize(String(body.summary).slice(0, 20_000)) : '',
    formula: body.formula ? sanitize(String(body.formula).slice(0, 1000)) : '',
    difficulty: body.difficulty ? sanitize(String(body.difficulty).slice(0, 80)) : undefined,
    images: sanitizeImages(body.images, 'Savol rasmi'),
    tags:    Array.isArray(body.tags)
               ? body.tags.slice(0, 10).map(t => sanitize(String(t).slice(0, 50)))
               : [],
  };
}

function sanitizeAnswer(body) {
  const raw = body?.text ?? body?.content ?? '';
  return {
    text: sanitize(String(raw).slice(0, 20_000)),
    images: sanitizeImages(body?.images, 'Javob rasmi'),
  };
}

function normalizeCategory(category) {
  return TOPIC_CATEGORIES.has(category) ? category : 'all';
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
  const clean = sanitizeTopic(req.body);
  if (!clean.title) return res.status(400).json({ error: 'title required' });
  const saved = await db.saveTopic({
    ...clean,
    category: normalizeCategory(clean.category),
    user_id:  req.user.id,
    author:   req.user.name,
    initials: req.user.initials,
    role:     req.user.role,
  });

  broadcast('topic', { ...saved, answersList: [] });
  res.json({ ok: true, id: saved.id, listeners: clients.size });
});

// ── PATCH /api/forum/topics/:id ──────────────────────────────────────────────
router.patch('/topics/:id', requireAuth, async (req, res) => {
  const topicId = Number(req.params.id);
  if (!Number.isFinite(topicId)) return res.status(400).json({ error: 'invalid topic id' });

  const existing = await db.getTopicWithAnswers(topicId);
  if (!existing) return res.status(404).json({ error: 'topic not found' });

  const isAuthor = existing.user_id ? existing.user_id === req.user.id : existing.author === req.user.name;
  if (!isAuthor && !hasModeratorAccess(req.user)) {
    return res.status(403).json({ error: 'Faqat savol egasi yoki moderator tahrirlashi mumkin' });
  }

  const clean = sanitizeTopic(req.body);
  if (!clean.title) return res.status(400).json({ error: 'title required' });
  if (!clean.summary) return res.status(400).json({ error: 'summary required' });

  await db.updateTopic(topicId, {
    category: normalizeCategory(clean.category),
    title: clean.title,
    summary: clean.summary,
    formula: clean.formula || undefined,
    tags: clean.tags,
    images: clean.images,
    difficulty: clean.difficulty,
  });

  const updated = await db.getTopicWithAnswers(topicId);
  const { answersList, ...topicUpdate } = updated;
  broadcast('topicUpdate', topicUpdate);
  res.json({ ok: true, topic: updated, listeners: clients.size });
});

// ── POST /api/forum/topics/:id/answers ───────────────────────────────────────
router.post('/topics/:id/answers', requireAuth, async (req, res) => {
  const topicId = Number(req.params.id);
  const topic   = await db.getTopicWithAnswers(topicId);
  if (!topic) return res.status(404).json({ error: 'topic not found' });

  const clean = sanitizeAnswer(req.body);
  if (!clean.text.trim() && clean.images.length === 0) {
    return res.status(400).json({ error: 'content required' });
  }

  const saved = await db.saveAnswer(topicId, {
    user_id:  req.user.id,
    text:     clean.text,
    images:   clean.images,
    author:   req.user.name,
    initials: req.user.initials,
    role:     req.user.role,
    score:    0,
  });

  const clientId = req.body?.id == null ? null : sanitize(String(req.body.id).slice(0, 80));

  if (saved) {
    const updated = await db.getTopicWithAnswers(topicId);
    const answer = { ...saved, client_id: clientId };
    broadcast('answer', { topicId, answer, answers: updated.answers });
    // Notify the topic author that their question got a new answer
    if (topic.user_id && topic.user_id !== req.user.id) {
      await db.createNotification(
        topic.user_id, 'answer', topicId,
        `"${topic.title.slice(0, 60)}" savolingizga yangi javob keldi`
      );
    }
    broadcast('notification', { topicId });
  }

  res.json({ ok: true, answer: saved ? { ...saved, client_id: clientId } : null, listeners: clients.size });
});

// ── PATCH /api/forum/topics/:id/vote ─────────────────────────────────────────
router.patch('/topics/:id/vote', requireAuth, async (req, res) => {
  const topicId   = Number(req.params.id);
  // Accept either `direction` (new) or `delta` (legacy field name)
  const direction = Number(req.body?.direction ?? req.body?.delta ?? 0);
  if (direction !== 1 && direction !== -1) return res.status(400).json({ error: 'direction must be 1 or -1' });

  const { score, voted } = await db.voteTopic(req.user.id, topicId, direction);
  broadcast('vote', { topicId, score });
  res.json({ ok: true, score, voted });
});

// ── POST /api/forum/topics/:id/accept/:answerId ───────────────────────────────
router.post('/topics/:id/accept/:answerId', requireAuth, async (req, res) => {
  const topicId  = Number(req.params.id);
  const answerId = Number(req.params.answerId);
  const topic  = await db.getTopicWithAnswers(topicId);
  if (!topic) return res.status(404).json({ error: 'not found' });
  const isAuthor = topic.user_id === req.user.id || topic.author === req.user.name;
  if (!isAuthor && !hasModeratorAccess(req.user)) {
    return res.status(403).json({ error: 'Faqat savol egasi yoki moderator javobni qabul qilishi mumkin' });
  }
  const answer = await db.acceptAnswer(topicId, answerId);
  if (!answer) return res.status(404).json({ error: 'answer not found' });
  if (answer.user_id && !answer.was_accepted) {
    await db.addUserScore(answer.user_id, 50, 'answer_accepted');
    await db.createNotification(
      answer.user_id, 'accept', topicId,
      `Tabriklaymiz! Javobingiz qabul qilindi: "${topic.title.slice(0, 60)}" (+50 ball)`
    );
  }
  broadcast('accept', { topicId, answerId, solved: true, moderation_correctness: 'correct' });
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
  const result   = await db.voteAnswer(req.user.id, answerId, delta);
  broadcast('answerVote', { answerId, score: result.score });

  // Notify the answer author only when the net result is a new upvote
  // (scoreDelta > 0 alone would fire on downvote-removal; voted===1 confirms actual upvote)
  if (result.scoreDelta > 0 && result.voted === 1) {
    const { rows } = await db.pool.query(
      'SELECT user_id, topic_id FROM answers WHERE id=$1', [answerId]
    );
    const ans = rows[0];
    if (ans?.user_id && ans.user_id !== req.user.id) {
      await db.createNotification(
        ans.user_id, 'upvote', ans.topic_id,
        'Javobingiz foydali deb baholandi (+1 ovoz)'
      );
    }
  }

  res.json({ ok: true, score: result.score, voted: result.voted });
});

// ── GET /api/forum/listeners ──────────────────────────────────────────────────
router.get('/listeners', (req, res) => {
  res.json({ count: clients.size });
});

// ── GET /api/forum/my-votes ───────────────────────────────────────────────────
router.get('/my-votes', requireAuth, async (req, res) => {
  const votes = await db.getMyTopicVotes(req.user.id);
  res.json(votes);
});

// ── GET /api/forum/my-answer-votes ───────────────────────────────────────────
router.get('/my-answer-votes', requireAuth, async (req, res) => {
  const votes = await db.getMyAnswerVotes(req.user.id);
  res.json(votes);
});

// ── GET /api/forum/stats ──────────────────────────────────────────────────────
router.get('/stats', async (_req, res) => {
  const experts = await db.getLeaderboard('hammasi');
  res.json({
    connections: clients.size,   // SSE connection count, not unique users
    topExperts: experts.slice(0, 5).map(u => ({
      id: u.id, username: u.username, name: u.name,
      initials: u.initials, role: u.role, score: u.score,
    })),
  });
});

module.exports = router;
module.exports.broadcast = broadcast;
