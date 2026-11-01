const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const bugs = require('../bugs');
const { publicUser, requireAuth } = require('../middleware');
const { HttpError, validateName, validatePhone, validatePassword, failIfInvalid } = require('../util');

const router = express.Router();
router.use(requireAuth);

// PROF-01 View profile
router.get('/', (req, res) => {
  const loans = db
    .prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN returned_at IS NULL THEN 1 ELSE 0 END) AS active,
              COALESCE(SUM(fine), 0) AS fines
       FROM loans WHERE user_id = ?`
    )
    .get(req.user.id);
  res.json({
    user: publicUser(req.user),
    stats: { totalLoans: loans.total, activeLoans: loans.active || 0, finesPaid: loans.fines },
  });
});

// PROF-02 Update name / phone (email cannot be changed)
router.put('/', (req, res) => {
  const { name, phone } = req.body || {};
  const errors = {};
  const cleanName = validateName(name, errors);
  const cleanPhone = validatePhone(phone, errors);
  failIfInvalid(errors);
  db.prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?').run(cleanName, cleanPhone, req.user.id);
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) });
});

// PROF-03 Change password (local accounts only)
router.put('/password', (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!req.user.password_hash) {
    throw new HttpError(400, 'This account signs in with Google and has no password');
  }
  const errors = {};
  if (typeof currentPassword !== 'string' || !currentPassword) {
    errors.currentPassword = 'Current password is required';
  }
  // BUG PROF-1: letter+digit complexity rule is not enforced for a changed password
  validatePassword(newPassword, errors, 'newPassword', { complexity: !bugs.on('PROF-1') });
  failIfInvalid(errors);

  if (!bcrypt.compareSync(currentPassword, req.user.password_hash)) {
    throw new HttpError(400, 'Current password is incorrect', { currentPassword: 'Current password is incorrect' });
  }
  if (currentPassword === newPassword) {
    throw new HttpError(400, 'New password must be different from the current one', {
      newPassword: 'New password must be different from the current one',
    });
  }
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 10), req.user.id);
  res.json({ message: 'Password updated' });
});

// PROF-04 Delete own account. Body: { confirm: "DELETE" }. Blocked while books are on loan,
// and the last remaining admin cannot delete themselves.
router.delete('/', (req, res) => {
  if (!req.body || req.body.confirm !== 'DELETE') {
    throw new HttpError(400, 'Type DELETE to confirm account deletion');
  }
  const active = db
    .prepare('SELECT COUNT(*) AS n FROM loans WHERE user_id = ? AND returned_at IS NULL')
    .get(req.user.id).n;
  // BUG PROF-2: active loans are ignored - the loans cascade-delete but the copies never come back
  if (active > 0 && !bugs.on('PROF-2')) {
    throw new HttpError(409, 'Return all borrowed books before deleting your account');
  }
  if (req.user.role === 'admin') {
    const admins = db.prepare("SELECT COUNT(*) AS n FROM users WHERE role='admin' AND active=1").get().n;
    if (admins <= 1) throw new HttpError(409, 'You are the last admin and cannot delete your account');
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
  res.status(204).end();
});

module.exports = router;
