import { Backend } from '../api/Backend';
import type { ApiResponse } from '../api/ApiClient';
import type { ApiBook, ApiLoan } from '../api/models';
import { RULES, SEED_ADMIN } from '../config/env';
import { BookInput, UserInput, newBookData, newUserData, uid } from './data';
import { DAY, HOUR, isoAgo } from './dates';

export interface TestUser extends UserInput {
  id: number;
  token: string;
}

function ok<T>(response: ApiResponse<T>, what: string, expected = [200, 201, 204]): T {
  if (!expected.includes(response.status)) {
    throw new Error(`Arrange step failed: ${what} -> ${response.status} ${JSON.stringify(response.body)}`);
  }
  return response.body;
}

/**
 * Prepares test data through the REST API (fast and deterministic) so that a UI test can focus on
 * the single behaviour it verifies. Nothing here drives the browser, and specs never assert on it.
 */
export class Arrange {
  private seedAdminToken?: string;
  private readonly promoted: number[] = [];

  constructor(private readonly backend: Backend) {}

  /** Bearer token of the seeded administrator (used for privileged set-up steps only). */
  async adminToken(): Promise<string> {
    if (!this.seedAdminToken) {
      const body = ok(await this.backend.auth.login(SEED_ADMIN), 'login as seed admin');
      this.seedAdminToken = body.token;
    }
    return this.seedAdminToken;
  }

  async member(overrides: Partial<UserInput> = {}): Promise<TestUser> {
    const data = newUserData(overrides);
    const body = ok(await this.backend.auth.register(data), `register ${data.email}`);
    return { ...data, email: data.email.toLowerCase(), id: body.user.id, token: body.token };
  }

  /** A member promoted to admin. Demoted again by `cleanup()` so the "last admin" rules stay testable. */
  async admin(overrides: Partial<UserInput> = {}): Promise<TestUser> {
    const user = await this.member(overrides);
    ok(await this.backend.admin.setRole(await this.adminToken(), user.id, 'admin'), 'promote to admin');
    this.promoted.push(user.id);
    return user;
  }

  /** Registers an admin created outside `admin()` (for example promoted through the UI) for clean-up. */
  demoteAfterTest(user: { id: number }): void {
    this.promoted.push(user.id);
  }

  /** Signs in with a mock Google account (creates it on first use). */
  async googleUser(email: string, name = 'Google User'): Promise<{ id: number; token: string; email: string; name: string }> {
    const body = ok(await this.backend.auth.googleMock(email, name), `google sign-in ${email}`);
    return { id: body.user.id, token: body.token, email: body.user.email, name: body.user.name };
  }

  async book(overrides: Partial<BookInput> = {}): Promise<ApiBook> {
    const data = newBookData(overrides);
    return ok(await this.backend.books.create(await this.adminToken(), data), `create book ${data.title}`).book;
  }

  /**
   * `count` books whose titles share a unique token and sort alphabetically by their index.
   * Searching for the token isolates them from every other book in the shared database.
   */
  async catalogue(count: number, overrides: Partial<BookInput> = {}): Promise<{ token: string; books: ApiBook[] }> {
    const token = uid('Cat');
    const books: ApiBook[] = [];
    for (let i = 1; i <= count; i += 1) {
      const index = String(i).padStart(2, '0');
      books.push(
        await this.book({ title: `${token} Book ${index}`, author: `${token} Author ${index}`, category: `${token} Category`, ...overrides })
      );
    }
    return { token, books };
  }

  async loan(user: { token: string }, book: { id: number }): Promise<ApiLoan> {
    return ok(await this.backend.loans.borrow(user.token, book.id), `borrow book ${book.id}`).loan;
  }

  async setDueDate(loan: { id: number }, dueAt: string): Promise<ApiLoan> {
    return ok(await this.backend.loans.setDueDate(await this.adminToken(), loan.id, dueAt), 'set due date').loan;
  }

  /** A loan whose due date was moved `lateMs` into the past (default: 3 days). */
  async overdueLoan(user: { token: string }, book: { id: number }, lateMs = 3 * DAY + 12 * HOUR): Promise<ApiLoan> {
    const loan = await this.loan(user, book);
    return this.setDueDate(loan, isoAgo(lateMs));
  }

  async giveBack(user: { token: string }, loan: { id: number }): Promise<ApiLoan> {
    return ok(await this.backend.loans.giveBack(user.token, loan.id), 'return loan').loan;
  }

  async returnedLoan(user: { token: string }, book: { id: number }): Promise<ApiLoan> {
    return this.giveBack(user, await this.loan(user, book));
  }

  /** `count` loans for one user, each on a fresh book. */
  async loans(user: { token: string }, count: number): Promise<{ books: ApiBook[]; loans: ApiLoan[] }> {
    const books: ApiBook[] = [];
    const loans: ApiLoan[] = [];
    for (let i = 0; i < count; i += 1) {
      const book = await this.book({ copiesTotal: 2 });
      books.push(book);
      loans.push(await this.loan(user, book));
    }
    return { books, loans };
  }

  /** Fails the login enough times to trigger the account lock (AUTH-02). */
  async lockAccount(user: { email: string }): Promise<void> {
    for (let i = 0; i < RULES.failedLoginsBeforeLock; i += 1) {
      await this.backend.auth.login({ email: user.email, password: 'definitely-wrong-1' });
    }
  }

  async deactivate(user: { id: number }): Promise<void> {
    ok(await this.backend.admin.setActive(await this.adminToken(), user.id, false), 'deactivate user');
  }

  /** Makes the seeded admin the only active administrator (needed by the "last admin" rules). */
  async ensureSingleActiveAdmin(): Promise<void> {
    const token = await this.adminToken();
    const admins = ok(await this.backend.admin.users(token, { role: 'admin', active: true, pageSize: 50 }), 'list admins');
    for (const admin of admins.items) {
      if (admin.email !== SEED_ADMIN.email) ok(await this.backend.admin.setRole(token, admin.id, 'member'), 'demote admin');
    }
  }

  /** Demotes every admin created through `admin()`; call from fixture teardown. */
  async cleanup(): Promise<void> {
    if (!this.promoted.length) return;
    const token = await this.adminToken();
    for (const id of this.promoted) await this.backend.admin.setRole(token, id, 'member');
  }
}
