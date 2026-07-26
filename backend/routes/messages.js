const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function cleanMessage(value) {
  return String(value || '')
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, 4000);
}

router.use(requireAuth);

// GET /api/messages/users?q= — users available for a new conversation
router.get('/users', async (req, res, next) => {
  try {
    const users = await db.getChatUsers(req.user.id, req.query.q || '');
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

// GET /api/messages/conversations — current user's conversation list
router.get('/conversations', async (req, res, next) => {
  try {
    const conversations = await db.getConversationsForUser(req.user.id);
    res.json({ conversations });
  } catch (err) {
    next(err);
  }
});

// POST /api/messages/conversations — start or reopen a direct chat
router.post('/conversations', async (req, res, next) => {
  try {
    const userId = Number(req.body?.userId);
    const conversation = await db.getOrCreateConversation(req.user.id, userId);
    if (!conversation) {
      return res.status(400).json({ error: "Suhbat uchun boshqa foydalanuvchini tanlang" });
    }
    res.json({ ok: true, conversation });
  } catch (err) {
    next(err);
  }
});

// GET /api/messages/conversations/:id/messages — messages in one conversation
router.get('/conversations/:id/messages', async (req, res, next) => {
  try {
    const conversationId = Number(req.params.id);
    const messages = await db.getConversationMessages(conversationId, req.user.id, {
      before: req.query.before,
      limit: req.query.limit,
    });
    if (!messages) return res.status(404).json({ error: 'Suhbat topilmadi' });
    await db.markConversationRead(conversationId, req.user.id);
    const conversation = await db.getConversationForUser(conversationId, req.user.id);
    res.json({ messages, conversation });
  } catch (err) {
    next(err);
  }
});

// POST /api/messages/conversations/:id/messages — send a message
router.post('/conversations/:id/messages', async (req, res, next) => {
  try {
    const body = cleanMessage(req.body?.body);
    if (!body) return res.status(400).json({ error: 'Xabar matni kerak' });

    const conversationId = Number(req.params.id);
    const message = await db.sendConversationMessage(conversationId, req.user.id, body);
    if (!message) return res.status(404).json({ error: 'Suhbat topilmadi' });

    const conversation = await db.getConversationForUser(conversationId, req.user.id);
    if (conversation?.otherUser?.id) {
      await db.createNotification(
        conversation.otherUser.id,
        'message',
        null,
        `${req.user.name} sizga yangi xabar yubordi`
      );
    }

    res.json({ ok: true, message, conversation });
  } catch (err) {
    next(err);
  }
});

// POST /api/messages/conversations/:id/read — mark messages as read
router.post('/conversations/:id/read', async (req, res, next) => {
  try {
    await db.markConversationRead(Number(req.params.id), req.user.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
