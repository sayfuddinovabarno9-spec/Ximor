require('dotenv').config();

const express           = require('express');
const db                = require('./db');
const forumRoutes         = require('./routes/forum');
const authRoutes          = require('./routes/auth');
const usersRoutes         = require('./routes/users');
const tournamentsRoutes   = require('./routes/tournaments');
const leaderboardRoutes   = require('./routes/leaderboard');
const notificationsRoutes = require('./routes/notifications');
const newsRoutes           = require('./routes/news');
const adminRoutes          = require('./routes/admin');
const messagesRoutes       = require('./routes/messages');

const app  = express();
const PORT = process.env.PORT || process.env.BACKEND_PORT || 3002;
const HOST = '0.0.0.0';

app.set('trust proxy', 1);

const ALLOWED_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const CUSTOM_FRONTEND_ORIGINS = new Set([
  'https://chemolymp.uz',
  'https://www.chemolymp.uz',
]);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  return origin === ALLOWED_ORIGIN
    || CUSTOM_FRONTEND_ORIGINS.has(origin)
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

app.use(express.json({ limit: '8mb' }));

app.use('/api/auth',          authRoutes);
app.use('/api/forum',         forumRoutes);
app.use('/api/users',         usersRoutes);
app.use('/api/tournaments',   tournamentsRoutes);
app.use('/api/leaderboard',   leaderboardRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/news',          newsRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/messages',      messagesRoutes);

let dbReady = false;

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', service: 'chemolymp-backend', db: dbReady })
);

async function start() {
  // Bind port first so Railway health checks pass immediately
  await new Promise((resolve, reject) => {
    const server = app.listen(PORT, HOST, () => {
      console.log(`\n🧪 CHEMOLYMP.UZ API → http://${HOST}:${PORT}`);
      console.log(`🔒 CORS: ${ALLOWED_ORIGIN} + chemolymp.uz + *.vercel.app + localhost`);
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
      const staff = await db.bootstrapConfiguredStaff();
      if (staff.admins || staff.moderators) {
        console.log(`🛡️ Staff bootstrap: ${staff.admins} admin, ${staff.moderators} moderator`);
      }
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
