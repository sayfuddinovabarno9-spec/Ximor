const express     = require('express');
const db          = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/tournaments
router.get('/', optionalAuth, async (req, res) => {
  res.json(await db.getAllTournaments(req.user?.id ?? null));
});

// GET /api/tournaments/:id
router.get('/:id', optionalAuth, async (req, res) => {
  const t = await db.getTournamentById(Number(req.params.id), req.user?.id ?? null);
  if (!t) return res.status(404).json({ error: 'Turnir topilmadi' });
  res.json(t);
});

// POST /api/tournaments/:id/register
router.post('/:id/register', requireAuth, async (req, res) => {
  const t = await db.getTournamentById(Number(req.params.id), req.user.id);
  if (!t) return res.status(404).json({ error: 'Turnir topilmadi' });

  if (t.is_registered)
    return res.status(409).json({ error: 'already_registered', message: 'Siz allaqachon yozilgansiz' });

  if (t.participants_count >= t.max_participants)
    return res.status(409).json({ error: 'full', message: 'Joylar tugadi' });

  await db.registerForTournament(t.id, req.user.id);
  res.json({ ok: true, message: "Muvaffaqiyatli yozildingiz!" });
});

module.exports = router;
