const express = require('express');
const { db } = require('../db');
const bugs = require('../bugs');
const { publicUser, requireAuth, requireAdmin } = require('../middleware');
const { HttpError, parsePaging, pageResult, parseId, likePattern } = require('../util');

const router = express.Router();
router.use(requireAuth, requireAdmin);

function activeAdminCount() {
  return db.prepare("SELECT COUNT(*) AS n FROM users WHERE role='admin' AND active=1").get().n;
}

function getUserOr404(id) {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!u) throw new HttpError(404, 'User not found');
  return u;
}

// ADM-01 Dashboard statistics
router.get('/stats', (_req, res) => {
  const one = (sql) => db.prepare(sql).get().n;
  res.json({
    users: one('SELECT COUNT(*) AS n FROM users'),
    activeUsers: one('SELECT COUNT(*) AS n FROM users WHERE active = 1'),
    books: one('SELECT COUNT(*) AS n FROM books'),
    copiesAvailable: one('SELECT COALESCE(SUM(copies_available),0) AS n FROM books'),
    activeLoans: one('SELECT COUNT(*) AS n FROM loans WHERE returned_at IS NULL'),
    // BUG ADM-3: returned loans whose due date has passed are counted as overdue
    overdueLoans: one(
      bugs.on('ADM-3')
        ? "SELECT COUNT(*) AS n FROM loans WHERE due_at < strftime('%Y-%m-%dT%H:%M:%fZ','now')"
        : "SELECT COUNT(*) AS n FROM loans WHERE returned_at IS NULL AND due_at < strftime('%Y-%m-%dT%H:%M:%fZ','now')"
    ),
    finesCollected: one('SELECT COALESCE(SUM(fine),0) AS n FROM loans WHERE returned_at IS NOT NULL'),
    topBooks: db
      .prepare(
        `SELECT b.title, COUNT(*) AS loans FROM loans l JOIN books b ON b.id = l.book_id
         GROUP BY b.id ORDER BY loans DESC, b.title LIMIT 5`
      )
      .all(),
  });
});

// ADM-02 List users (search by name/email, filter by role/active)
router.get('/users', (req, res) => {
  const paging = parsePaging(req.query);
  const { q, role, active } = req.query;
  const where = [];
  const params = [];
  if (q) {
    where.push("(name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\')");
    const p = likePattern(q);
    params.push(p, p);
  }
  if (role !== undefined) {
    if (!['member', 'admin'].includes(role)) throw new HttpError(400, 'role must be member or admin');
    // BUG ADM-4: the role filter is silently ignored whenever a search term is also given
    if (!(bugs.on('ADM-4') && q)) {
      where.push('role = ?');
      params.push(role);
    }
  }
  if (active !== undefined) {
    if (!['true', 'false'].includes(active)) throw new HttpError(400, 'active must be true or false');
    where.push('active = ?');
    params.push(active === 'true' ? 1 : 0);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS n FROM users ${clause}`).get(...params).n;
  const rows = db
    .prepare(`SELECT * FROM users ${clause} ORDER BY id LIMIT ? OFFSET ?`)
    .all(...params, paging.pageSize, paging.offset);
  res.json(pageResult(rows.map(publicUser), total, paging));
});

// ADM-03 Change a user's role. Admins cannot change their own role; last admin is protected.
router.patch('/users/:id/role', (req, res) => {
  const id = parseId(req.params.id);
  const { role } = req.body || {};
  if (!['member', 'admin'].includes(role)) throw new HttpError(400, 'role must be member or admin');
  const target = getUserOr404(id);
  if (target.id === req.user.id) throw new HttpError(409, 'You cannot change your own role');
  if (target.role === 'admin' && role === 'member' && activeAdminCount() <= 1) {
    throw new HttpError(409, 'Cannot demote the last admin');
  }
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  res.json({ user: publicUser(getUserOr404(id)) });
});

// ADM-04 Activate / deactivate a user. Admins cannot deactivate themselves.
router.patch('/users/:id/active', (req, res) => {
  const id = parseId(req.params.id);
  const { active } = req.body || {};
  if (typeof active !== 'boolean') throw new HttpError(400, 'active must be true or false');
  const target = getUserOr404(id);
  // BUG ADM-2: an admin can deactivate their own account (and lock themselves out)
  if (target.id === req.user.id && !bugs.on('ADM-2')) {
    throw new HttpError(409, 'You cannot deactivate your own account');
  }
  db.prepare('UPDATE users SET active = ? WHERE id = ?').run(active ? 1 : 0, id);
  res.json({ user: publicUser(getUserOr404(id)) });
});

// ADM-05 Unlock an account locked by failed login attempts
router.post('/users/:id/unlock', (req, res) => {
  const id = parseId(req.params.id);
  getUserOr404(id);
  db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(id);
  res.json({ user: publicUser(getUserOr404(id)) });
});

module.exports = router;
