require('dotenv').config();

const express          = require('express');
const cors             = require('cors');
const db               = require('./db');
const forumRoutes      = require('./routes/forum');
const authRoutes       = require('./routes/auth');
const usersRoutes      = require('./routes/users');
const tournamentsRoutes = require('./routes/tournaments');
const leaderboardRoutes = require('./routes/leaderboard');

const app  = express();
const PORT = process.env.PORT || 3002;

app.set('trust proxy', 1); // required for rate-limiting behind Railway/Vercel proxy

const ALLOWED_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || origin === ALLOWED_ORIGIN) return cb(null, true);
    cb(new Error(`CORS: origin '${origin}' is not allowed`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '64kb' }));

app.use('/api/auth',        authRoutes);
app.use('/api/forum',       forumRoutes);
app.use('/api/users',       usersRoutes);
app.use('/api/tournaments', tournamentsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', service: 'ximor-backend' })
);

async function start() {
  await db.initSchema();
  console.log('✅ Schema ready');
  await db.seedDemo();
  console.log('🌱 Seed done');

  app.listen(PORT, () => {
    console.log(`\n🧪 Ximor API → http://localhost:${PORT}`);
    console.log(`🔒 CORS locked to: ${ALLOWED_ORIGIN}`);
    console.log('📡 SSE stream → GET /api/forum/stream');
  });
}

start().catch(err => {
  console.error('❌ Startup failed:', err.message);
  process.exit(1);
});
