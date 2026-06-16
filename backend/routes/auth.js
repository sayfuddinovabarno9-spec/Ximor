const express   = require('express');
const bcrypt    = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const db        = require('../db');
const { sign, requireAuth } = require('../middleware/auth');

const router = express.Router();

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
  const { username, name, password } = req.body || {};

  if (!username || !name || !password)
    return res.status(400).json({ error: "username, name va password kerak" });
  if (username.length < 3)
    return res.status(400).json({ error: "Username kamida 3 ta belgi bo'lishi kerak" });
  if (!/^[a-z0-9_.-]+$/i.test(username))
    return res.status(400).json({ error: "Username faqat harf, raqam, _ . - belgisi bo'lishi mumkin" });
  if (password.length < 6)
    return res.status(400).json({ error: "Parol kamida 6 ta belgi bo'lishi kerak" });
  if (name.trim().length < 2)
    return res.status(400).json({ error: "Ism kamida 2 ta belgi bo'lishi kerak" });

  const hash     = await bcrypt.hash(password, 10);
  const initials = name.trim().split(/\s+/).map(w => w[0]?.toUpperCase()).join('').slice(0, 2) || 'AN';
  const user     = await db.createUser({
    username: username.toLowerCase().trim(),
    name:     name.trim().slice(0, 80),
    initials,
    password: hash,
  });

  if (!user) return res.status(409).json({ error: "Bu username band, boshqasini tanlang" });

  const token = sign({ id: user.id, username: user.username, name: user.name, initials: user.initials, role: user.role });
  res.json({ token, user: { id: user.id, username: user.username, name: user.name, initials: user.initials, role: user.role } });
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ error: "username va password kerak" });

  const user = await db.getUserByUsername(username.toLowerCase().trim());
  if (!user) return res.status(401).json({ error: "Foydalanuvchi topilmadi" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: "Parol noto'g'ri" });

  const token = sign({ id: user.id, username: user.username, name: user.name, initials: user.initials, role: user.role });
  res.json({ token, user: { id: user.id, username: user.username, name: user.name, initials: user.initials, role: user.role } });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  const user = await db.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'not found' });
  res.json(user);
});

module.exports = router;
