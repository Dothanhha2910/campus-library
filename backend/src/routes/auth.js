const express = require('express');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const config = require('../config');
const { db } = require('../db');
const { publicUser, signToken, requireAuth } = require('../middleware');
const bugs = require('../bugs');
const {
  HttpError,
  validateEmail,
  validatePassword,
  validateName,
  failIfInvalid,
} = require('../util');

const router = express.Router();
const googleClient = config.GOOGLE_CLIENT_ID ? new OAuth2Client(config.GOOGLE_CLIENT_ID) : null;

// AUTH-01 Register
router.post('/register', (req, res) => {
  const { name, email, password } = req.body || {};
  const errors = {};
  const cleanName = validateName(name, errors);
  const cleanEmail = validateEmail(email, errors);
  // BUG AUTH-1: minimum length is 7 instead of the specified 8
  validatePassword(password, errors, 'password', { minLen: bugs.on('AUTH-1') ? 7 : 8 });
  failIfInvalid(errors);

  if (db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail)) {
    throw new HttpError(409, 'Email is already registered', { email: 'Email is already registered' });
  }
  const info = db
    .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(cleanName, cleanEmail, bcrypt.hashSync(password, 10));
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

// AUTH-02 Login (with lockout after repeated failures)
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    throw new HttpError(400, 'Email and password are required');
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (!user) throw new HttpError(401, 'Invalid email or password');

  const locked = user.locked_until && new Date(user.locked_until) > new Date();
  // BUG AUTH-3: lock is only enforced for wrong passwords - the correct password still gets in
  if (locked && !bugs.on('AUTH-3')) {
    throw new HttpError(423, `Account is locked until ${user.locked_until}. Try again later.`);
  }
  if (!user.password_hash) {
    throw new HttpError(401, 'This account uses Google sign-in. Please use the Google button.');
  }
  if (!bcrypt.compareSync(password, user.password_hash)) {
    if (locked) {
      throw new HttpError(423, `Account is locked until ${user.locked_until}. Try again later.`);
    }
    const attempts = user.failed_attempts + 1;
    if (attempts >= config.LOCK_AFTER_FAILED_ATTEMPTS) {
      const until = new Date(Date.now() + config.LOCK_MINUTES * 60000).toISOString();
      db.prepare('UPDATE users SET failed_attempts = 0, locked_until = ? WHERE id = ?').run(until, user.id);
      throw new HttpError(423, `Too many failed attempts. Account locked for ${config.LOCK_MINUTES} minutes.`);
    }
    db.prepare('UPDATE users SET failed_attempts = ? WHERE id = ?').run(attempts, user.id);
    throw new HttpError(401, 'Invalid email or password');
  }
  if (!user.active) throw new HttpError(403, 'Account is deactivated');

  // BUG AUTH-2: failed-attempt counter is not reset after a successful login,
  // so failures accumulate across sessions
  if (bugs.on('AUTH-2')) {
    db.prepare('UPDATE users SET locked_until = NULL WHERE id = ?').run(user.id);
  } else {
    db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(user.id);
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

// AUTH-03 Google single sign-on (client sends the Google ID token as `credential`)
router.post('/google', async (req, res) => {
  const { credential } = req.body || {};
  if (typeof credential !== 'string' || !credential) {
    throw new HttpError(400, 'Google credential is required');
  }

  let profile; // { sub, email, name, emailVerified }
  if (config.GOOGLE_MOCK && credential.startsWith('mock:')) {
    const [, email, name] = credential.split(':');
    profile = { sub: 'mock-' + email, email, name: name || email, emailVerified: true };
  } else {
    if (!googleClient) throw new HttpError(503, 'Google sign-in is not configured on this server');
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: config.GOOGLE_CLIENT_ID,
      });
      const p = ticket.getPayload();
      profile = { sub: p.sub, email: p.email, name: p.name, emailVerified: p.email_verified };
    } catch {
      throw new HttpError(401, 'Invalid Google credential');
    }
  }
  if (!profile.email || !profile.emailVerified) {
    throw new HttpError(401, 'Google account email is not verified');
  }
  const email = profile.email.toLowerCase();

  let user = db.prepare('SELECT * FROM users WHERE google_id = ?').get(profile.sub);
  if (!user) {
    user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (user) {
      // Link Google to the existing local account
      db.prepare('UPDATE users SET google_id = ? WHERE id = ?').run(profile.sub, user.id);
    } else {
      const name = (profile.name || email.split('@')[0]).slice(0, 50).padEnd(2, ' ');
      const info = db
        .prepare('INSERT INTO users (name, email, google_id) VALUES (?, ?, ?)')
        .run(name.trim() || email, email, profile.sub);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
    }
  }
  user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  // BUG AUTH-4: deactivated accounts can still sign in through Google
  if (!user.active && !bugs.on('AUTH-4')) throw new HttpError(403, 'Account is deactivated');
  res.json({ token: signToken(user), user: publicUser(user) });
});

// AUTH-04 Current session
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// AUTH-05 Logout (stateless JWT: the client discards the token)
router.post('/logout', requireAuth, (_req, res) => {
  res.status(204).end();
});

module.exports = router;
