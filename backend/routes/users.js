const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function cleanText(value, max = 160) {
  return String(value || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, max);
}

function cleanUrl(value) {
  const raw = String(value || '').trim().slice(0, 160);
  if (!raw) return '';
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withProtocol);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

function cleanImage(value, maxLength) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (!/^data:image\/(?:jpeg|jpg|png|webp);base64,/i.test(raw)) return '';
  return raw.length <= maxLength ? raw : '';
}

// PATCH /api/users/me/profile — update the logged-in user's public profile
router.patch('/me/profile', requireAuth, async (req, res, next) => {
  try {
    const username = cleanText(req.body?.username, 32).toLowerCase();
    const name = cleanText(req.body?.name, 80);
    if (username.length < 3 || !/^[a-z0-9_.-]+$/i.test(username)) {
      return res.status(400).json({ error: "Username kamida 3 ta belgi va faqat harf, raqam, _ . - bo'lishi kerak" });
    }
    if (name.length < 2) {
      return res.status(400).json({ error: "Ism kamida 2 ta belgi bo'lishi kerak" });
    }

    const interests = Array.isArray(req.body?.interests)
      ? req.body.interests
      : String(req.body?.interests || '').split(',');

    const profile = await db.updateUserProfile(req.user.id, {
      username,
      name,
      role: cleanText(req.body?.role, 80) || 'Shogird',
      headline: cleanText(req.body?.headline, 120),
      bio: cleanText(req.body?.bio, 600),
      location: cleanText(req.body?.location, 80),
      website: cleanUrl(req.body?.website),
      study_goal: cleanText(req.body?.study_goal, 160),
      avatar_url: cleanImage(req.body?.avatar_url, 1_400_000),
      cover_url: cleanImage(req.body?.cover_url, 2_400_000),
      interests,
    });

    if (!profile) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
    const { password, banned_at, ...safe } = profile;
    res.json({ ok: true, user: safe });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Bu username band, boshqasini tanlang' });
    }
    next(err);
  }
});

// GET /api/users/:username — public profile + recent topics
router.get('/:username', async (req, res) => {
  const profile = await db.getUserProfile(req.params.username);
  if (!profile) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
  const { password, ...safe } = profile;
  res.json(safe);
});

// GET /api/users/:username/answers — recent answers by this user
router.get('/:username/answers', async (req, res) => {
  const answers = await db.getUserAnswers(req.params.username);
  if (answers === null) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
  res.json(answers);
});

module.exports = router;
