const express = require('express');
const db      = require('../db');

const router = express.Router();

// GET /api/leaderboard?period=hafta|oy|chorak|yil|hammasi
router.get('/', async (req, res) => {
  res.json(await db.getLeaderboard());
});

module.exports = router;
