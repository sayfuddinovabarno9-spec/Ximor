const express = require('express');
const db      = require('../db');
const { requireAdmin } = require('../middleware/requireAdmin');

const router = express.Router();
router.use(requireAdmin);

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
  const { is_admin, banned, role, score } = req.body;
  await db.updateUserAdmin(id, { is_admin, banned, role, score });
  res.json({ ok: true });
});

// ── Topics ────────────────────────────────────────────────────────────────────
router.get('/topics', async (_req, res) => {
  res.json(await db.getAdminTopics());
});

router.patch('/topics/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const { pinned, hot, solved } = req.body;
  await db.adminUpdateTopic(id, { pinned, hot, solved });
  res.json({ ok: true });
});

router.delete('/topics/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  await db.adminDeleteTopic(id);
  res.json({ ok: true });
});

// ── Answers ───────────────────────────────────────────────────────────────────
router.delete('/answers/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  await db.adminDeleteAnswer(id);
  res.json({ ok: true });
});

// ── Announce ──────────────────────────────────────────────────────────────────
router.post('/announce', async (req, res) => {
  const { message } = req.body || {};
  if (!message?.trim()) return res.status(400).json({ error: 'Xabar matni kerak' });
  const count = await db.broadcastAnnouncement(message.trim().slice(0, 500));
  res.json({ ok: true, sent: count });
});

module.exports = router;
