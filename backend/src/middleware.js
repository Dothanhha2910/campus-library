const jwt = require('jsonwebtoken');
const config = require('./config');
const bugs = require('./bugs');
const { db } = require('./db');
const { HttpError } = require('./util');

function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone,
    active: !!u.active,
    hasPassword: !!u.password_hash,
    google: !!u.google_id,
    createdAt: u.created_at,
  };
}

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
}

/** Requires a valid Bearer token and an active account. Sets req.user. */
function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw new HttpError(401, 'Authentication required');

  let payload;
  try {
    payload = jwt.verify(token, config.JWT_SECRET);
  } catch {
    throw new HttpError(401, 'Invalid or expired token');
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.sub);
  if (!user) throw new HttpError(401, 'Account no longer exists');
  // BUG ADM-1: deactivation is not checked on API calls, so an existing token keeps working
  if (!user.active && !bugs.on('ADM-1')) throw new HttpError(403, 'Account is deactivated');
  req.user = user;
  next();
}

function requireAdmin(req, _res, next) {
  if (req.user.role !== 'admin') throw new HttpError(403, 'Admin access required');
  next();
}

module.exports = { publicUser, signToken, requireAuth, requireAdmin };
