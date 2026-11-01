const express = require('express');
const config = require('../config');
const { db, tx } = require('../db');
const bugs = require('../bugs');
const { requireAuth, requireAdmin } = require('../middleware');
const { HttpError, parsePaging, pageResult, parseId, likePattern } = require('../util');

const router = express.Router();
const DAY = 86400000;

function addDays(iso, days) {
  return new Date(new Date(iso).getTime() + days * DAY).toISOString();
}

/** Fine = FINE_PER_DAY for every started day past due, capped at FINE_CAP. */
function calcFine(dueAt, atTime = new Date()) {
  const late = atTime.getTime() - new Date(dueAt).getTime();
  if (late <= 0) return { daysOverdue: 0, fine: 0 };
  const daysOverdue = Math.ceil(late / DAY);
  // BUG LOAN-2: the maximum fine cap is not applied
  const raw = daysOverdue * config.FINE_PER_DAY;
  return { daysOverdue, fine: bugs.on('LOAN-2') ? raw : Math.min(raw, config.FINE_CAP) };
}

function toLoan(l) {
  let status = 'returned';
  let daysOverdue = 0;
  let fine = l.fine;
  if (!l.returned_at) {
    const calc = calcFine(l.due_at);
    daysOverdue = calc.daysOverdue;
    fine = calc.fine; // projected fine if returned now
    status = daysOverdue > 0 ? 'overdue' : 'active';
  }
  return {
    id: l.id,
    userId: l.user_id,
    userName: l.user_name,
    userEmail: l.user_email,
    bookId: l.book_id,
    bookTitle: l.book_title,
    borrowedAt: l.borrowed_at,
    dueAt: l.due_at,
    returnedAt: l.returned_at,
    renewed: !!l.renewed,
    status,
    daysOverdue,
    fine,
  };
}

const BASE_SELECT = `
  SELECT l.*, b.title AS book_title, u.name AS user_name, u.email AS user_email
  FROM loans l JOIN books b ON b.id = l.book_id JOIN users u ON u.id = l.user_id`;

function statusClause(status) {
  switch (status) {
    case undefined:
    case 'all':
      return '';
    case 'active':
      return "l.returned_at IS NULL AND l.due_at >= strftime('%Y-%m-%dT%H:%M:%fZ','now')";
    case 'overdue':
      return "l.returned_at IS NULL AND l.due_at < strftime('%Y-%m-%dT%H:%M:%fZ','now')";
    case 'returned':
      return 'l.returned_at IS NOT NULL';
    default:
      throw new HttpError(400, 'status must be one of: all, active, overdue, returned');
  }
}

function listLoans(req, res, userId) {
  const paging = parsePaging(req.query);
  const where = [];
  const params = [];
  if (userId) {
    where.push('l.user_id = ?');
    params.push(userId);
  }
  const sc = statusClause(req.query.status);
  if (sc) where.push(sc);
  if (req.query.q) {
    where.push("(b.title LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\' OR u.name LIKE ? ESCAPE '\\')");
    const p = likePattern(req.query.q);
    params.push(p, p, p);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db
    .prepare(
      `SELECT COUNT(*) AS n FROM loans l JOIN books b ON b.id=l.book_id JOIN users u ON u.id=l.user_id ${clause}`
    )
    .get(...params).n;
  const rows = db
    .prepare(`${BASE_SELECT} ${clause} ORDER BY l.id DESC LIMIT ? OFFSET ?`)
    .all(...params, paging.pageSize, paging.offset);
  res.json(pageResult(rows.map(toLoan), total, paging));
}

function getLoan(id) {
  return db.prepare(`${BASE_SELECT} WHERE l.id = ?`).get(id);
}

// LOAN-01 Borrow a book
router.post('/', requireAuth, (req, res) => {
  const bookId = Number(req.body && req.body.bookId);
  if (!Number.isInteger(bookId) || bookId < 1) throw new HttpError(400, 'bookId is required');

  const loanId = tx(() => {
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);
    if (!book) throw new HttpError(404, 'Book not found');
    if (book.copies_available < 1) throw new HttpError(409, 'No copies available');

    const mine = db
      .prepare('SELECT * FROM loans WHERE user_id = ? AND returned_at IS NULL')
      .all(req.user.id);
    // BUG LOAN-1: off-by-one - a 4th book is allowed
    const limitReached = bugs.on('LOAN-1')
      ? mine.length > config.MAX_ACTIVE_LOANS
      : mine.length >= config.MAX_ACTIVE_LOANS;
    if (limitReached) {
      throw new HttpError(409, `You cannot borrow more than ${config.MAX_ACTIVE_LOANS} books at a time`);
    }
    if (mine.some((l) => new Date(l.due_at) < new Date())) {
      throw new HttpError(409, 'You have an overdue book. Return it before borrowing again');
    }
    if (mine.some((l) => l.book_id === bookId)) {
      throw new HttpError(409, 'You have already borrowed this book');
    }

    const now = new Date().toISOString();
    const info = db
      .prepare('INSERT INTO loans (user_id, book_id, borrowed_at, due_at) VALUES (?, ?, ?, ?)')
      .run(req.user.id, bookId, now, addDays(now, config.LOAN_DAYS));
    db.prepare('UPDATE books SET copies_available = copies_available - 1 WHERE id = ?').run(bookId);
    return info.lastInsertRowid;
  });
  res.status(201).json({ loan: toLoan(getLoan(loanId)) });
});

// LOAN-02 My loans (filter: status=all|active|overdue|returned)
router.get('/mine', requireAuth, (req, res) => listLoans(req, res, req.user.id));

// LOAN-06 All loans (admin)
router.get('/', requireAuth, requireAdmin, (req, res) => listLoans(req, res, null));

// LOAN-03 Return a book (owner or admin). Fine is charged if overdue.
router.post('/:id/return', requireAuth, (req, res) => {
  const id = parseId(req.params.id);
  tx(() => {
    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(id);
    if (!loan) throw new HttpError(404, 'Loan not found');
    // BUG LOAN-4: ownership check missing - any member can return someone else's loan
    if (!bugs.on('LOAN-4') && loan.user_id !== req.user.id && req.user.role !== 'admin') {
      throw new HttpError(403, 'You can only return your own loans');
    }
    // BUG LOAN-5: no "already returned" guard - returning twice inflates the stock again
    if (loan.returned_at && !bugs.on('LOAN-5')) {
      throw new HttpError(409, 'This loan has already been returned');
    }

    const now = new Date();
    const { fine } = calcFine(loan.due_at, now);
    db.prepare('UPDATE loans SET returned_at = ?, fine = ? WHERE id = ?').run(now.toISOString(), fine, id);
    db.prepare('UPDATE books SET copies_available = copies_available + 1 WHERE id = ?').run(loan.book_id);
  });
  res.json({ loan: toLoan(getLoan(id)) });
});

// LOAN-04 Renew (owner only): once per loan, only if not overdue, +RENEW_DAYS
router.post('/:id/renew', requireAuth, (req, res) => {
  const id = parseId(req.params.id);
  const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(id);
  if (!loan) throw new HttpError(404, 'Loan not found');
  if (loan.user_id !== req.user.id) throw new HttpError(403, 'You can only renew your own loans');
  if (loan.returned_at) throw new HttpError(409, 'This loan has already been returned');
  if (new Date(loan.due_at) < new Date()) throw new HttpError(409, 'Overdue loans cannot be renewed');
  if (loan.renewed) throw new HttpError(409, 'This loan has already been renewed once');

  // BUG LOAN-3: extends from today instead of from the current due date
  const base = bugs.on('LOAN-3') ? new Date().toISOString() : loan.due_at;
  db.prepare('UPDATE loans SET due_at = ?, renewed = 1 WHERE id = ?').run(
    addDays(base, config.RENEW_DAYS),
    id
  );
  res.json({ loan: toLoan(getLoan(id)) });
});

// LOAN-05 Testing hook (admin): move the due date of an active loan so that
// overdue/fine behaviour can be tested without waiting. Body: { dueAt: "YYYY-MM-DD" }
router.patch('/:id/due-date', requireAuth, requireAdmin, (req, res) => {
  const id = parseId(req.params.id);
  const { dueAt } = req.body || {};
  const date = new Date(dueAt);
  if (typeof dueAt !== 'string' || Number.isNaN(date.getTime())) {
    throw new HttpError(400, 'dueAt must be a valid date, e.g. 2026-01-31');
  }
  const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(id);
  if (!loan) throw new HttpError(404, 'Loan not found');
  if (loan.returned_at) throw new HttpError(409, 'Cannot change the due date of a returned loan');
  db.prepare('UPDATE loans SET due_at = ? WHERE id = ?').run(date.toISOString(), id);
  res.json({ loan: toLoan(getLoan(id)) });
});

module.exports = router;
