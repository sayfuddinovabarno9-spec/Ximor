const { verify } = require('./auth');
const db = require('../db');

async function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = token ? verify(token) : null;
  if (!payload) return res.status(401).json({ error: 'Login kerak' });

  const user = await db.getUserById(payload.id);
  if (!user || !user.is_admin) return res.status(403).json({ error: 'Admin huquqi kerak' });

  req.user = { ...payload, is_admin: true };
  next();
}

module.exports = { requireAdmin };
