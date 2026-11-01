const path = require('path');

// Load backend/.env if present (Node >= 20.12)
try {
  process.loadEnvFile(path.join(__dirname, '..', '.env'));
} catch {
  /* no .env file - use defaults */
}

module.exports = {
  PORT: Number(process.env.PORT) || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  // LOCAL TESTING ONLY: accepts credentials like "mock:someone@gmail.com:Some Name"
  GOOGLE_MOCK: process.env.GOOGLE_MOCK === '1',
  DB_PATH: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'library.db'),

  // Business rules (documented in docs/TEST_GUIDE.md)
  LOCK_AFTER_FAILED_ATTEMPTS: 5,
  LOCK_MINUTES: Number(process.env.LOCK_MINUTES) || 5,
  MAX_ACTIVE_LOANS: 3,
  LOAN_DAYS: 14,
  RENEW_DAYS: 7,
  FINE_PER_DAY: 0.5,
  FINE_CAP: 20,
};
