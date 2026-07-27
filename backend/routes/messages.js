const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { broadcast } = require('./forum');

const router = express.Router();

function cleanMessage(value) {
  return String(value || '')
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, 4000);
}

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

function sanitizeImages(imagesInput, defaultName = 'Xabar rasmi') {
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
    const images = sanitizeImages(req.body?.images);
    if (!body && images.length === 0) return res.status(400).json({ error: 'Xabar matni yoki rasm kerak' });

    const conversationId = Number(req.params.id);
    const message = await db.sendConversationMessage(conversationId, req.user.id, body, images);
    if (!message) return res.status(404).json({ error: 'Suhbat topilmadi' });

    const conversation = await db.getConversationForUser(conversationId, req.user.id);
    if (conversation?.otherUser?.id) {
      await db.createNotification(
        conversation.otherUser.id,
        'message',
        null,
        `${req.user.name} sizga yangi xabar yubordi`
      );
      broadcast('notification', { type: 'message', conversationId });
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
