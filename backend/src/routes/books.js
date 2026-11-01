const express = require('express');
const { db } = require('../db');
const bugs = require('../bugs');
const { requireAuth, requireAdmin } = require('../middleware');
const {
  HttpError,
  failIfInvalid,
  parsePaging,
  pageResult,
  parseId,
  likePattern,
} = require('../util');

const router = express.Router();

const SORTS = { title: 'title', author: 'author', year: 'year', newest: 'id' };

function toBook(b) {
  return {
    id: b.id,
    title: b.title,
    author: b.author,
    isbn: b.isbn,
    category: b.category,
    year: b.year,
    copiesTotal: b.copies_total,
    copiesAvailable: b.copies_available,
  };
}

function validateBook(body, errors) {
  const { title, author, isbn, category, year, copiesTotal } = body || {};
  const str = (v, key, max) => {
    if (typeof v !== 'string' || !v.trim() || v.trim().length > max) {
      errors[key] = `${key} is required (max ${max} characters)`;
      return null;
    }
    return v.trim();
  };
  const clean = {
    title: str(title, 'title', 150),
    author: str(author, 'author', 100),
    category: str(category, 'category', 50),
  };
  // BUG BOOK-3: accepts any 10-13 digit ISBN (so 11 and 12 digits pass) instead of exactly 10 or 13
  const isbnRe = bugs.on('BOOK-3') ? /^\d{10,13}$/ : /^(\d{10}|\d{13})$/;
  if (typeof isbn !== 'string' || !isbnRe.test(isbn)) {
    errors.isbn = 'ISBN must be exactly 10 or 13 digits';
  } else clean.isbn = isbn;

  const thisYear = new Date().getFullYear();
  if (!Number.isInteger(year) || year < 1900 || year > thisYear) {
    errors.year = `Year must be an integer between 1900 and ${thisYear}`;
  } else clean.year = year;

  if (!Number.isInteger(copiesTotal) || copiesTotal < 1 || copiesTotal > 100) {
    errors.copiesTotal = 'Copies must be an integer between 1 and 100';
  } else clean.copiesTotal = copiesTotal;
  return clean;
}

// BOOK-01 List / search / filter / sort / paginate (any logged-in user)
router.get('/', requireAuth, (req, res) => {
  const paging = parsePaging(req.query);
  const { q, category, available, sort = 'title', order = 'asc' } = req.query;

  if (!(sort in SORTS)) throw new HttpError(400, `sort must be one of: ${Object.keys(SORTS).join(', ')}`);
  if (!['asc', 'desc'].includes(order)) throw new HttpError(400, 'order must be asc or desc');
  if (available !== undefined && !['true', 'false'].includes(available)) {
    throw new HttpError(400, 'available must be true or false');
  }

  const where = [];
  const params = [];
  if (q) {
    where.push("(title LIKE ? ESCAPE '\\' OR author LIKE ? ESCAPE '\\' OR isbn LIKE ? ESCAPE '\\')");
    // BUG BOOK-2: % and _ typed by the user are treated as wildcards
    const p = bugs.on('BOOK-2') ? `%${q}%` : likePattern(q);
    params.push(p, p, p);
  }
  if (category) {
    if (bugs.on('BOOK-5')) {
      // BUG BOOK-5: SQL injection - category is concatenated into the query
      where.push(`category = '${category}'`);
    } else {
      where.push('category = ?');
      params.push(category);
    }
  }
  if (available === 'true') where.push('copies_available > 0');
  if (available === 'false') where.push('copies_available = 0');
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = db.prepare(`SELECT COUNT(*) AS n FROM books ${clause}`).get(...params).n;
  const rows = db
    .prepare(
      `SELECT * FROM books ${clause}
       ORDER BY ${SORTS[sort]} ${order.toUpperCase()}, id ASC LIMIT ? OFFSET ?`
    )
    .all(...params, paging.pageSize, paging.offset);
  const result = pageResult(rows.map(toBook), total, paging);
  // BUG BOOK-1: totalPages is rounded down, so the last partial page is unreachable
  if (bugs.on('BOOK-1')) result.totalPages = Math.max(1, Math.floor(total / paging.pageSize));
  res.json(result);
});

// BOOK-02 Category list (for filter dropdown)
router.get('/categories', requireAuth, (_req, res) => {
  const rows = db.prepare('SELECT DISTINCT category FROM books ORDER BY category').all();
  res.json({ categories: rows.map((r) => r.category) });
});

// BOOK-03 Book details
router.get('/:id', requireAuth, (req, res) => {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(parseId(req.params.id));
  if (!book) throw new HttpError(404, 'Book not found');
  res.json({ book: toBook(book) });
});

// BOOK-04 Create (admin)
router.post('/', requireAuth, requireAdmin, (req, res) => {
  const errors = {};
  const b = validateBook(req.body, errors);
  failIfInvalid(errors);
  if (db.prepare('SELECT id FROM books WHERE isbn = ?').get(b.isbn)) {
    throw new HttpError(409, 'A book with this ISBN already exists', { isbn: 'ISBN already exists' });
  }
  const info = db
    .prepare(
      `INSERT INTO books (title, author, isbn, category, year, copies_total, copies_available)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(b.title, b.author, b.isbn, b.category, b.year, b.copiesTotal, b.copiesTotal);
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ book: toBook(book) });
});

// BOOK-05 Update (admin). Cannot reduce total copies below the number currently on loan.
router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  const id = parseId(req.params.id);
  const existing = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
  if (!existing) throw new HttpError(404, 'Book not found');

  const errors = {};
  const b = validateBook(req.body, errors);
  failIfInvalid(errors);

  const onLoan = existing.copies_total - existing.copies_available;
  if (b.copiesTotal < onLoan) {
    throw new HttpError(409, `Cannot set copies below ${onLoan} (currently on loan)`, {
      copiesTotal: `At least ${onLoan} copies are currently on loan`,
    });
  }
  const dup = db.prepare('SELECT id FROM books WHERE isbn = ? AND id != ?').get(b.isbn, id);
  if (dup) throw new HttpError(409, 'A book with this ISBN already exists', { isbn: 'ISBN already exists' });

  db.prepare(
    `UPDATE books SET title=?, author=?, isbn=?, category=?, year=?, copies_total=?, copies_available=?
     WHERE id=?`
  ).run(
    b.title,
    b.author,
    b.isbn,
    b.category,
    b.year,
    b.copiesTotal,
    // BUG BOOK-4: available copies are reset to the new total, ignoring copies currently on loan
    bugs.on('BOOK-4') ? b.copiesTotal : b.copiesTotal - onLoan,
    id
  );
  res.json({ book: toBook(db.prepare('SELECT * FROM books WHERE id = ?').get(id)) });
});

// BOOK-06 Delete (admin). Blocked while any copy is on loan.
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const id = parseId(req.params.id);
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
  if (!book) throw new HttpError(404, 'Book not found');
  const active = db
    .prepare('SELECT COUNT(*) AS n FROM loans WHERE book_id = ? AND returned_at IS NULL')
    .get(id).n;
  if (active > 0) throw new HttpError(409, 'Cannot delete a book that is currently on loan');

  db.prepare('DELETE FROM loans WHERE book_id = ?').run(id); // remove returned-loan history
  db.prepare('DELETE FROM books WHERE id = ?').run(id);
  res.status(204).end();
});

module.exports = router;
