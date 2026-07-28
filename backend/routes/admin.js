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

const USER_MANAGEMENT_PERMISSIONS = [
  'staff.create_admin',
  'staff.assign_moderator',
  'staff.change_role',
  'users.ban',
  'users.unban',
];

async function requirePermission(req, res, permissionKey) {
  if (await db.userHasPermission(req.user, permissionKey)) return true;
  res.status(403).json({ error: 'Bu amal uchun huquq yoʻq' });
  return false;
}

async function requireAnyPermission(req, res, permissionKeys) {
  if (await db.userHasAnyPermission(req.user, permissionKeys)) return true;
  res.status(403).json({ error: 'Bu amal uchun huquq yoʻq' });
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

// ── Permissions ──────────────────────────────────────────────────────────────
router.get('/permissions', async (_req, res) => {
  res.json(await db.getRolePermissions());
});

router.patch('/permissions/:key', async (req, res) => {
  if (!requireAdminOnly(req, res)) return;
  const permissions = await db.setModeratorPermission(req.params.key, Boolean(req.body?.moderator));
  if (!permissions) return res.status(404).json({ error: 'Huquq topilmadi' });
  res.json({ ok: true, permissions });
});

// ── Users ─────────────────────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  if (!(await requireAnyPermission(req, res, USER_MANAGEMENT_PERMISSIONS))) return;
  const limit  = Math.min(parseInt(req.query.limit  ?? 100), 200);
  const offset = parseInt(req.query.offset ?? 0);
  res.json(await db.getAllUsersAdmin(limit, offset));
});

router.patch('/users/:id', async (req, res) => {
  if (!requireAdminOnly(req, res)) return;
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const body = req.body || {};
  const target = await db.getUserById(id);
  if (!target) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });

  const fields = {};

  if ('banned' in body) {
    if (target.id === req.user.id) return res.status(400).json({ error: "O'zingizni bloklab bo'lmaydi" });
    const nextBanned = Boolean(body.banned);
    if (!(await requirePermission(req, res, nextBanned ? 'users.ban' : 'users.unban'))) return;
    if (!req.user.is_admin && (target.is_admin || target.is_moderator)) {
      return res.status(403).json({ error: 'Staff foydalanuvchini faqat admin bloklaydi' });
    }
    fields.banned = Boolean(body.banned);
  }

  if ('is_admin' in body) {
    if (!(await requirePermission(req, res, 'staff.create_admin'))) return;
    if (target.id === req.user.id && !body.is_admin) {
      return res.status(400).json({ error: "O'zingizdan admin huquqini olib bo'lmaydi" });
    }
    if (!req.user.is_admin && target.is_admin) {
      return res.status(403).json({ error: 'Admin huquqini faqat admin oʻzgartiradi' });
    }
    fields.is_admin = Boolean(body.is_admin);
  }

  if ('is_moderator' in body) {
    if (!(await requirePermission(req, res, 'staff.assign_moderator'))) return;
    if (!req.user.is_admin && target.is_admin) {
      return res.status(403).json({ error: 'Admin foydalanuvchini faqat admin oʻzgartiradi' });
    }
    fields.is_moderator = Boolean(body.is_moderator);
    if (target.role === 'Moderator' && !('role' in body)) fields.role = 'Mutaxassis';
  }

  if ('role' in body) {
    if (!(await requirePermission(req, res, 'staff.change_role'))) return;
    if (!req.user.is_admin && (target.is_admin || target.is_moderator)) {
      return res.status(403).json({ error: 'Staff rolini faqat admin oʻzgartiradi' });
    }
    fields.role = db.normalizeUserRole(body.role, 'Ishtirokchi');
  }

  if ('score' in body) {
    if (!requireAdminOnly(req, res)) return;
    const score = Number(body.score);
    if (!Number.isFinite(score)) return res.status(400).json({ error: 'Invalid score' });
    fields.score = Math.round(score);
  }

  if (!Object.keys(fields).length) return res.status(400).json({ error: 'Oʻzgartirish topilmadi' });
  const user = await db.updateUserAdmin(id, fields);
  res.json({ ok: true, user });
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

  if (('pinned' in body || 'hot' in body) && !(await requirePermission(req, res, 'topic.feature'))) return;
  if ('pinned' in body) fields.pinned = Boolean(body.pinned);
  if ('hot' in body) fields.hot = Boolean(body.hot);
  if ('solved' in body) {
    const solved = Boolean(body.solved);
    if (!(await requirePermission(req, res, solved ? 'question.solve' : 'question.open'))) return;
    fields.solved = solved;
  }

  if (!Object.keys(fields).length) return res.status(400).json({ error: 'Oʻzgartirish topilmadi' });
  await db.adminUpdateTopic(id, fields);
  if ('solved' in fields) broadcast('topicModeration', { topicId: id, solved: fields.solved });
  res.json({ ok: true });
});

router.delete('/topics/:id', async (req, res) => {
  if (!(await requirePermission(req, res, 'question.delete'))) return;
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  await db.adminDeleteTopic(id);
  broadcast('topicDeleted', { topicId: id });
  res.json({ ok: true });
});

// ── Answers ───────────────────────────────────────────────────────────────────
router.delete('/answers/:id', async (req, res) => {
  if (!(await requirePermission(req, res, 'answer.delete'))) return;
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
    if (!(await requirePermission(req, res, 'answer.helpfulness'))) return;
    const helpfulness = normalizeLabel(body.helpfulness, HELPFULNESS);
    if (helpfulness === undefined) return res.status(400).json({ error: 'Invalid helpfulness' });
    fields.helpfulness = helpfulness;
  }

  if ('correctness' in body) {
    if (!(await requirePermission(req, res, 'answer.correctness'))) return;
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
  if (!(await requirePermission(req, res, 'notify.announce'))) return;
  const { message } = req.body || {};
  if (!message?.trim()) return res.status(400).json({ error: 'Xabar matni kerak' });
  const count = await db.broadcastAnnouncement(message.trim().slice(0, 500));
  res.json({ ok: true, sent: count });
});

module.exports = router;
