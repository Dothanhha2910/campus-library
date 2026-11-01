/** Seed data and business rules taken from docs/TEST_GUIDE.md (the specification). */

export const SEED_ADMIN = { name: 'Library Admin', email: 'admin@library.test', password: 'Admin@123' } as const;
export const SEED_MEMBER = { name: 'Sample Member', email: 'user@library.test', password: 'User@1234' } as const;

/** Seeded book with 0 copies, used to test the "out of stock" behaviour. */
export const OUT_OF_STOCK_BOOK_TITLE = 'Out of Stock Sample';

export const RULES = {
  booksPageSize: 8,
  loansPageSize: 6,
  usersPageSize: 8,
  maxActiveLoans: 3,
  loanDays: 14,
  renewDays: 7,
  finePerDay: 0.5,
  fineCap: 20,
  failedLoginsBeforeLock: 5,
} as const;

export const DEFAULT_PASSWORD = 'Passw0rd1';
