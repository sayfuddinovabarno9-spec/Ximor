const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'ximor-dev-secret-change-in-prod';

function sign(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '30d' });
}

function verify(token) {
  try { return jwt.verify(token, SECRET); }
  catch { return null; }
}

/** Express middleware — attaches req.user or returns 401 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  const user   = token ? verify(token) : null;
  if (!user) return res.status(401).json({ error: 'Login kerak' });
  req.user = user;
  next();
}

/** Optional auth — attaches req.user if token present, never 401s */
function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  req.user = token ? verify(token) : null;
  next();
}

module.exports = { sign, verify, requireAuth, optionalAuth };
