const express = require('express');
const db      = require('../db');

const router = express.Router();

// GET /api/leaderboard?period=hafta|oy|chorak|yil|hammasi
router.get('/', async (req, res) => {
  const period = ['hafta','oy','chorak','yil','hammasi'].includes(req.query.period)
    ? req.query.period : 'hammasi';
  res.json(await db.getLeaderboard(period));
});

module.exports = router;
