const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'ximor-dev-secret-change-in-prod';

function sign(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '30d' });
}

function verify(token) {
  try { return jwt.verify(token, SECRET); }
  catch { return null; }
}

function tokenFrom(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

async function getAuthUser(req) {
  const token = tokenFrom(req);
  const payload = token ? verify(token) : null;
  if (!payload?.id) return null;
  const db = require('../db');
  return db.getUserById(payload.id);
}

/** Express middleware — attaches req.user or returns 401 */
async function requireAuth(req, res, next) {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Login kerak' });
    if (user.banned_at) return res.status(403).json({ error: 'Hisob bloklangan' });
    const db = require('../db');
    db.markUserSeen(user.id).catch(() => {});
    req.user = {
      id: user.id,
      username: user.username,
      name: user.name,
      initials: user.initials,
      avatar_url: user.avatar_url || '',
      role: user.role,
      score: user.score,
      is_admin: Boolean(user.is_admin),
      is_moderator: Boolean(user.is_moderator),
    };
    next();
  } catch (err) {
    next(err);
  }
}

/** Optional auth — attaches req.user if token present, never 401s */
async function optionalAuth(req, res, next) {
  try {
    const user = await getAuthUser(req);
    if (user && !user.banned_at) {
      const db = require('../db');
      db.markUserSeen(user.id).catch(() => {});
    }
    req.user = user && !user.banned_at ? {
      id: user.id,
      username: user.username,
      name: user.name,
      initials: user.initials,
      avatar_url: user.avatar_url || '',
      role: user.role,
      score: user.score,
      is_admin: Boolean(user.is_admin),
      is_moderator: Boolean(user.is_moderator),
    } : null;
    next();
  } catch {
    req.user = null;
    next();
  }
}

module.exports = { sign, verify, requireAuth, optionalAuth, getAuthUser };
