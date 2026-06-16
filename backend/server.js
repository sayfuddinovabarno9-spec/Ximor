require('dotenv').config();

const express           = require('express');
const db                = require('./db');
const forumRoutes       = require('./routes/forum');
const authRoutes        = require('./routes/auth');
const usersRoutes       = require('./routes/users');
const tournamentsRoutes = require('./routes/tournaments');
const leaderboardRoutes = require('./routes/leaderboard');

const app  = express();
const PORT = process.env.BACKEND_PORT || 3002;
const HOST = '0.0.0.0';

app.set('trust proxy', 1);

const ALLOWED_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

function isAllowedOrigin(origin) {
  if (!origin) return true;
  return origin === ALLOWED_ORIGIN
    || origin.endsWith('.vercel.app')
    || origin.startsWith('http://localhost');
}

// Manual CORS middleware — avoids Express 5 path-to-regexp wildcard issues
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(200).end();
  }
  next();
});

app.use(express.json({ limit: '64kb' }));

app.use('/api/auth',        authRoutes);
app.use('/api/forum',       forumRoutes);
app.use('/api/users',       usersRoutes);
app.use('/api/tournaments', tournamentsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

let dbReady = false;

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', service: 'ximor-backend', db: dbReady })
);

async function start() {
  // Bind port first so Railway health checks pass immediately
  await new Promise((resolve, reject) => {
    const server = app.listen(PORT, HOST, () => {
      console.log(`\n🧪 Ximor API → http://${HOST}:${PORT}`);
      console.log(`🔒 CORS: ${ALLOWED_ORIGIN} + *.vercel.app + localhost`);
      resolve();
    });
    server.on('error', reject);
  });

  // Init DB — retry on failure so Railway health check stays green
  const initDB = async () => {
    try {
      await db.initSchema();
      console.log('✅ Schema ready');
      await db.seedDemo();
      console.log('🌱 Seed done');
      dbReady = true;
    } catch (err) {
      console.error('❌ DB init failed, retrying in 5s:', err.message);
      setTimeout(initDB, 5000);
    }
  };
  initDB();
}

process.on('uncaughtException',  err => console.error('uncaughtException:', err.message));
process.on('unhandledRejection', err => console.error('unhandledRejection:', err?.message ?? err));

start().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
