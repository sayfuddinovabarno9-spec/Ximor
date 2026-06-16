const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications — current user's notifications
router.get('/', requireAuth, async (req, res) => {
  const notifs = await db.getNotifications(req.user.id);
  const unread = notifs.filter(n => !n.read).length;
  res.json({ notifications: notifs, unread });
});

// POST /api/notifications/read — mark all as read
router.post('/read', requireAuth, async (req, res) => {
  await db.markNotificationsRead(req.user.id);
  res.json({ ok: true });
});

module.exports = router;
