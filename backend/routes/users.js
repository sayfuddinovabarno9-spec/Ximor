const express = require('express');
const db = require('../db');

const router = express.Router();

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
