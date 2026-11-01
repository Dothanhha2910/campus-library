// Deletes the SQLite file so the next start re-creates it with fresh seed data.
const fs = require('fs');
const config = require('./config');

if (config.DB_PATH === ':memory:') {
  console.log('In-memory database - nothing to reset.');
} else {
  for (const suffix of ['', '-wal', '-shm']) {
    fs.rmSync(config.DB_PATH + suffix, { force: true });
  }
  console.log('Database reset. It will be re-seeded on next start.');
}
