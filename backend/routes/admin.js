const express = require('express');
const db      = require('../db');
const { requireModerator } = require('../middleware/requireModerator');
const { broadcast } = require('./forum');

const router = express.Router();
router.use(requireModerator);

const HELPFULNESS = new Set(['helpful', 'unhelpful']);
const CORRECTNESS = new Set(['correct', 'incorrect']);

function normalizeLabel(value, allowed) {
  if (value == null || value === '' || value === 'none') return null;
  return allowed.has(value) ? value : undefined;
}

function requireAdminOnly(req, res) {
  if (req.user.is_admin) return true;
  res.status(403).json({ error: 'Admin huquqi kerak' });
  return false;
}

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get('/stats', async (_req, res) => {
  res.json(await db.getAdminStats());
});

// ── Recent activity ───────────────────────────────────────────────────────────
router.get('/activity', async (_req, res) => {
  res.json(await db.getRecentActivity());
});

// ── Users ─────────────────────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit  ?? 100), 200);
  const offset = parseInt(req.query.offset ?? 0);
  res.json(await db.getAllUsersAdmin(limit, offset));
});

router.patch('/users/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const body = req.body || {};
  const target = await db.getUserById(id);
  if (!target) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });

  const fields = {};
  const adminFields = ['is_admin', 'is_moderator', 'role', 'score'];
  const hasAdminFields = adminFields.some(field => field in body);

  if (hasAdminFields && !requireAdminOnly(req, res)) return;

  if ('banned' in body) {
    if (target.id === req.user.id) return res.status(400).json({ error: "O'zingizni bloklab bo'lmaydi" });
    if (!req.user.is_admin && (target.is_admin || target.is_moderator)) {
      return res.status(403).json({ error: 'Moderator boshqa moderator yoki adminni bloklay olmaydi' });
    }
    fields.banned = Boolean(body.banned);
  }

  if (req.user.is_admin) {
    if ('is_admin' in body) {
      if (target.id === req.user.id && !body.is_admin) {
        return res.status(400).json({ error: "O'zingizdan admin huquqini olib bo'lmaydi" });
      }
      fields.is_admin = Boolean(body.is_admin);
    }
    if ('is_moderator' in body) {
      fields.is_moderator = Boolean(body.is_moderator);
      if (fields.is_moderator && !('role' in body)) fields.role = 'Moderator';
    }
    if ('role' in body) {
      fields.role = String(body.role || 'Ishtirokchi').trim().slice(0, 80) || 'Ishtirokchi';
    }
    if ('score' in body) {
      const score = Number(body.score);
      if (!Number.isFinite(score)) return res.status(400).json({ error: 'Invalid score' });
      fields.score = Math.round(score);
    }
  }

  if (!Object.keys(fields).length) return res.status(400).json({ error: 'Oʻzgartirish topilmadi' });
  await db.updateUserAdmin(id, fields);
  res.json({ ok: true });
});

// ── Topics ────────────────────────────────────────────────────────────────────
router.get('/topics', async (_req, res) => {
  res.json(await db.getAdminTopics());
});

router.patch('/topics/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const body = req.body || {};
  const fields = {};

  if (('pinned' in body || 'hot' in body) && !requireAdminOnly(req, res)) return;
  if ('pinned' in body) fields.pinned = Boolean(body.pinned);
  if ('hot' in body) fields.hot = Boolean(body.hot);
  if ('solved' in body) fields.solved = Boolean(body.solved);

  if (!Object.keys(fields).length) return res.status(400).json({ error: 'Oʻzgartirish topilmadi' });
  await db.adminUpdateTopic(id, fields);
  if ('solved' in fields) broadcast('topicModeration', { topicId: id, solved: fields.solved });
  res.json({ ok: true });
});

router.delete('/topics/:id', async (req, res) => {
  if (!requireAdminOnly(req, res)) return;
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  await db.adminDeleteTopic(id);
  res.json({ ok: true });
});

// ── Answers ───────────────────────────────────────────────────────────────────
router.delete('/answers/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const deleted = await db.adminDeleteAnswer(id);
  if (!deleted) return res.status(404).json({ error: 'Javob topilmadi' });
  broadcast('answerDeleted', {
    topicId: deleted.topic_id,
    answerId: id,
    answers: deleted.answers,
    solved: deleted.solved,
  });
  res.json({ ok: true, ...deleted });
});

router.patch('/answers/:id/moderation', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const body = req.body || {};
  const fields = {};

  if ('helpfulness' in body) {
    const helpfulness = normalizeLabel(body.helpfulness, HELPFULNESS);
    if (helpfulness === undefined) return res.status(400).json({ error: 'Invalid helpfulness' });
    fields.helpfulness = helpfulness;
  }

  if ('correctness' in body) {
    const correctness = normalizeLabel(body.correctness, CORRECTNESS);
    if (correctness === undefined) return res.status(400).json({ error: 'Invalid correctness' });
    fields.correctness = correctness;
  }

  if (!Object.keys(fields).length) return res.status(400).json({ error: 'Oʻzgartirish topilmadi' });
  const answer = await db.moderateAnswer(id, fields, req.user.id);
  if (!answer) return res.status(404).json({ error: 'Javob topilmadi' });

  broadcast('answerModeration', {
    topicId: answer.topic_id,
    answerId: id,
    accepted: answer.accepted,
    topic_solved: answer.topic_solved,
    moderation_helpfulness: answer.moderation_helpfulness,
    moderation_correctness: answer.moderation_correctness,
  });
  res.json({ ok: true, answer });
});

// ── Announce ──────────────────────────────────────────────────────────────────
router.post('/announce', async (req, res) => {
  if (!requireAdminOnly(req, res)) return;
  const { message } = req.body || {};
  if (!message?.trim()) return res.status(400).json({ error: 'Xabar matni kerak' });
  const count = await db.broadcastAnnouncement(message.trim().slice(0, 500));
  res.json({ ok: true, sent: count });
});

module.exports = router;
