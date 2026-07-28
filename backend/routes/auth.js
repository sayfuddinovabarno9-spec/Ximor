const express   = require('express');
const bcrypt    = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const db        = require('../db');
const { sign, requireAuth } = require('../middleware/auth');

const router = express.Router();
const DEFAULT_OWNER_ADMIN_EMAILS = ['nuriddinzamolitdinov@gmail.com'];

function staffEmailList(value) {
  return String(value || '')
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter(Boolean);
}

function ownerAdminEmails() {
  return [
    ...DEFAULT_OWNER_ADMIN_EMAILS,
    ...staffEmailList(process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL),
    ...staffEmailList(process.env.OWNER_ADMIN_EMAILS || process.env.OWNER_ADMIN_EMAIL),
  ];
}

function publicUser(user) {
  let interests = [];
  if (Array.isArray(user.interests)) {
    interests = user.interests;
  } else if (typeof user.interests === 'string') {
    try { interests = JSON.parse(user.interests); } catch { interests = []; }
  }
  return {
    id: user.id,
    username: user.username,
    email: user.email || '',
    name: user.name,
    initials: user.initials,
    role: user.role,
    score: user.score,
    is_admin: Boolean(user.is_admin),
    is_moderator: Boolean(user.is_moderator),
    bio: user.bio || '',
    avatar_url: user.avatar_url || '',
    cover_url: user.cover_url || '',
    headline: user.headline || '',
    location: user.location || '',
    website: user.website || '',
    study_goal: user.study_goal || '',
    interests,
  };
}

function signUser(user) {
  return sign({
    id: user.id,
    username: user.username,
    email: user.email || '',
    name: user.name,
    initials: user.initials,
    role: user.role,
    is_admin: Boolean(user.is_admin),
    is_moderator: Boolean(user.is_moderator),
  });
}

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  message: { error: "Juda ko'p urinish. 1 soatdan keyin qayta urinib ko'ring." },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false,
  message: { error: "Juda ko'p urinish. 15 daqiqadan keyin qayta urinib ko'ring." },
});

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', registerLimiter, async (req, res) => {
  const { username, name, password, email } = req.body || {};

  if (!username || !name || !password || !email)
    return res.status(400).json({ error: "email, username, name va password kerak" });
  if (username.length < 3)
    return res.status(400).json({ error: "Username kamida 3 ta belgi bo'lishi kerak" });
  if (!/^[a-z0-9_.-]+$/i.test(username))
    return res.status(400).json({ error: "Username faqat harf, raqam, _ . - belgisi bo'lishi mumkin" });
  if (password.length < 6)
    return res.status(400).json({ error: "Parol kamida 6 ta belgi bo'lishi kerak" });
  if (name.trim().length < 2)
    return res.status(400).json({ error: "Ism kamida 2 ta belgi bo'lishi kerak" });
  const normalizedEmail = String(email || '').toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
    return res.status(400).json({ error: "Email manzili noto'g'ri" });

  const hash     = await bcrypt.hash(password, 10);
  const initials = name.trim().split(/\s+/).map(w => w[0]?.toUpperCase()).join('').slice(0, 2) || 'AN';
  const user     = await db.createUser({
    username: username.toLowerCase().trim(),
    name:     name.trim().slice(0, 80),
    initials,
    password: hash,
    email:    normalizedEmail,
  });

  if (!user) return res.status(409).json({ error: "Bu username yoki email band, boshqasini tanlang" });

  await db.bootstrapConfiguredStaff();
  await db.markUserSeen(user.id);
  const sessionUser = await db.getUserById(user.id) || user;
  const token = signUser(sessionUser);
  res.json({ token, user: publicUser(sessionUser) });
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', loginLimiter, async (req, res) => {
  const { email, username, password } = req.body || {};
  const normalizedEmail = String(email || username || '').toLowerCase().trim();
  if (!normalizedEmail || !password)
    return res.status(400).json({ error: "email va password kerak" });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
    return res.status(400).json({ error: "Email manzili noto'g'ri" });

  const user = await db.getUserByEmail(normalizedEmail);
  if (!user) return res.status(401).json({ error: "Foydalanuvchi topilmadi" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: "Parol noto'g'ri" });
  if (user.banned_at) return res.status(403).json({ error: 'Hisob bloklangan' });

  await db.markUserSeen(user.id);
  const token = signUser(user);
  res.json({ token, user: publicUser(user) });
});

// ── POST /api/auth/bootstrap-admin ────────────────────────────────────────────
router.post('/bootstrap-admin', requireAuth, async (req, res) => {
  const setupCode = process.env.ADMIN_SETUP_CODE || process.env.ADMIN_BOOTSTRAP_CODE || '';
  const hasAdmin = await db.hasAnyAdmin();
  const currentUser = await db.getUserById(req.user.id);
  const currentEmail = String(currentUser?.email || '').toLowerCase();
  const isOwnerAdminEmail = currentEmail && ownerAdminEmails().includes(currentEmail);

  if (hasAdmin && !isOwnerAdminEmail) {
    if (!setupCode) return res.status(403).json({ error: 'Admin allaqachon mavjud' });
    if (String(req.body?.code || '') !== setupCode) {
      return res.status(403).json({ error: "Setup kodi noto'g'ri" });
    }
  }

  const promoted = await db.promoteUserToAdmin(req.user.id);
  if (!promoted) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });

  const token = signUser(promoted);
  res.json({ ok: true, token, user: publicUser(promoted) });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  const user = await db.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'not found' });
  res.json(publicUser(user));
});

module.exports = router;
