const { getAuthUser } = require('./auth');

function hasModeratorAccess(user) {
  return Boolean(user?.is_admin || user?.is_moderator);
}

async function requireModerator(req, res, next) {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Login kerak' });
    if (user.banned_at) return res.status(403).json({ error: 'Hisob bloklangan' });
    if (!hasModeratorAccess(user)) {
      return res.status(403).json({ error: 'Moderator huquqi kerak' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      name: user.name,
      initials: user.initials,
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

module.exports = { requireModerator, hasModeratorAccess };
