require('dotenv').config();   // must be first — loads .env before anything reads process.env

const express     = require('express');
const cors        = require('cors');
const forumRoutes = require('./routes/forum');
const authRoutes  = require('./routes/auth');

const app  = express();
const PORT = process.env.PORT || 3002;

// ── CORS ──────────────────────────────────────────────────────────────────────
// Locked to a single allowed origin. Wildcards removed.
const ALLOWED_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

app.use(cors({
  origin: (origin, cb) => {
    // Allow same-origin requests (origin === undefined) and the configured frontend
    if (!origin || origin === ALLOWED_ORIGIN) return cb(null, true);
    cb(new Error(`CORS: origin '${origin}' is not allowed`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '64kb' }));  // prevent oversized payloads

app.use('/api/auth',  authRoutes);
app.use('/api/forum', forumRoutes);

app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', service: 'ximor-backend' })
);

app.listen(PORT, () => {
  console.log(`\n🧪 Ximor API → http://localhost:${PORT}`);
  console.log(`🔒 CORS locked to: ${ALLOWED_ORIGIN}`);
  console.log('📡 SSE stream → GET /api/forum/stream');
  console.log('📬 Post topic  → POST /api/forum/topics');
});
