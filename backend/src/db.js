const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const config = require('./config');

if (config.DB_PATH !== ':memory:') {
  fs.mkdirSync(path.dirname(config.DB_PATH), { recursive: true });
}

const db = new DatabaseSync(config.DB_PATH);
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash   TEXT,
  google_id       TEXT UNIQUE,
  role            TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member','admin')),
  active          INTEGER NOT NULL DEFAULT 1,
  phone           TEXT,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until    TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS books (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  title            TEXT NOT NULL,
  author           TEXT NOT NULL,
  isbn             TEXT NOT NULL UNIQUE,
  category         TEXT NOT NULL,
  year             INTEGER NOT NULL,
  copies_total     INTEGER NOT NULL,
  copies_available INTEGER NOT NULL,
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS loans (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id     INTEGER NOT NULL REFERENCES books(id),
  borrowed_at TEXT NOT NULL,
  due_at      TEXT NOT NULL,
  returned_at TEXT,
  renewed     INTEGER NOT NULL DEFAULT 0,
  fine        REAL NOT NULL DEFAULT 0
);
`);

/** Run fn inside a transaction; rolls back if fn throws. */
function tx(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function seed() {
  const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (userCount === 0) {
    const ins = db.prepare(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
    );
    ins.run('Library Admin', 'admin@library.test', bcrypt.hashSync('Admin@123', 10), 'admin');
    ins.run('Sample Member', 'user@library.test', bcrypt.hashSync('User@1234', 10), 'member');
  }

  const bookCount = db.prepare('SELECT COUNT(*) AS n FROM books').get().n;
  if (bookCount === 0) {
    const books = [
      ['Clean Code', 'Robert C. Martin', 'Programming', 2008, 3],
      ['The Pragmatic Programmer', 'Andrew Hunt', 'Programming', 1999, 2],
      ['Refactoring', 'Martin Fowler', 'Programming', 1999, 2],
      ['Design Patterns', 'Erich Gamma', 'Programming', 1994, 2],
      ['Code Complete', 'Steve McConnell', 'Programming', 1993, 1],
      ['Introduction to Algorithms', 'Thomas H. Cormen', 'Algorithms', 1990, 4],
      ['Algorithms', 'Robert Sedgewick', 'Algorithms', 1983, 2],
      ['The Art of Computer Programming', 'Donald Knuth', 'Algorithms', 1968, 1],
      ['Software Testing', 'Ron Patton', 'Software Quality', 2005, 3],
      ['The Art of Software Testing', 'Glenford Myers', 'Software Quality', 1979, 2],
      ['Lessons Learned in Software Testing', 'Cem Kaner', 'Software Quality', 2001, 2],
      ['Agile Testing', 'Lisa Crispin', 'Software Quality', 2009, 1],
      ['Testing Computer Software', 'Cem Kaner', 'Software Quality', 1999, 2],
      ['Database System Concepts', 'Abraham Silberschatz', 'Databases', 1986, 3],
      ['SQL Antipatterns', 'Bill Karwin', 'Databases', 2010, 2],
      ['Designing Data-Intensive Applications', 'Martin Kleppmann', 'Databases', 2017, 2],
      ['Computer Networking', 'James Kurose', 'Networking', 2000, 3],
      ['TCP/IP Illustrated', 'W. Richard Stevens', 'Networking', 1994, 1],
      ['Operating System Concepts', 'Abraham Silberschatz', 'Systems', 1982, 3],
      ['Modern Operating Systems', 'Andrew Tanenbaum', 'Systems', 1992, 2],
      ['Artificial Intelligence: A Modern Approach', 'Stuart Russell', 'AI', 1995, 2],
      ['Deep Learning', 'Ian Goodfellow', 'AI', 2016, 2],
      ['Hands-On Machine Learning', 'Aurelien Geron', 'AI', 2017, 3],
      ['The Mythical Man-Month', 'Frederick Brooks', 'Software Engineering', 1975, 2],
      ['Peopleware', 'Tom DeMarco', 'Software Engineering', 1987, 1],
      ['Out of Stock Sample', 'Test Author', 'Software Engineering', 2020, 0],
    ];
    const ins = db.prepare(
      `INSERT INTO books (title, author, isbn, category, year, copies_total, copies_available)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    books.forEach(([title, author, category, year, copies], i) => {
      const isbn = '978' + String(1000000000 + i).padStart(10, '0');
      ins.run(title, author, isbn, category, year, copies, copies);
    });
  }
}

seed();

module.exports = { db, tx, seed };
