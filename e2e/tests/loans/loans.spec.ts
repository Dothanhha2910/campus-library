import { RULES } from '../../src/config/env';
import { expect, test } from '../../src/fixtures';
import { DAY, HOUR, addDays, expectedFine, utcDay } from '../../src/support/dates';

test.describe('Borrowing', () => {
  test('LOAN-01: borrowing takes one copy off the shelf and creates a 14-day loan', async ({ app, arrange, backend, session }) => {
    const member = await arrange.member();
    const book = await arrange.book({ copiesTotal: 3 });
    await session.signInAs(member);
    await app.books.open();
    await app.books.search(book.title);

    const toast = await app.books.borrow(book.title);

    expect(toast).toEqual({ type: 'success', text: `Book borrowed! Due in ${RULES.loanDays} days.` });
    expect(await app.books.getBookCard(book.title).getAvailability()).toEqual({ available: 2, total: 3 });

    const [loan] = (await backend.loans.mine(member.token)).body.items;
    expect(new Date(loan.dueAt).getTime() - new Date(loan.borrowedAt).getTime()).toBe(RULES.loanDays * DAY);

    await app.topBar.open('My Loans');
    const shown = app.loans.getLoan(book.title);
    expect((await shown.getStatus()).label).toBe('Borrowed');
    expect(await shown.getDueDate()).toEqual(utcDay(loan.dueAt));
  });

  test('LOAN-03: returning a loan that is 3.5 days overdue charges $0.50 per started day', async ({ app, arrange, session }) => {
    const lateMs = 3 * DAY + 12 * HOUR;
    const fine = expectedFine(lateMs);
    const member = await arrange.member();
    const book = await arrange.book();
    await arrange.overdueLoan(member, book, lateMs);
    await session.signInAs(member);
    await app.loans.open();

    const toast = await app.loans.giveBack(book.title);

    expect(toast.text).toContain(`Fine charged: $${fine.toFixed(2)}`);
    expect(await app.loans.getLoan(book.title).getFine()).toBe(fine);
    expect((await app.loans.getLoan(book.title).getStatus()).label).toBe('Returned');
  });

  test('LOAN-04: renewing extends the current due date by 7 days', async ({ app, arrange, session }) => {
    const member = await arrange.member();
    const book = await arrange.book();
    const loan = await arrange.loan(member, book);
    await session.signInAs(member);
    await app.loans.open();

    const toast = await app.loans.renew(book.title);
    const shown = app.loans.getLoan(book.title);

    expect(toast).toEqual({ type: 'success', text: 'Loan renewed' });
    expect(await shown.getDueDate()).toEqual(utcDay(addDays(loan.dueAt, RULES.renewDays)));
    expect(await shown.isMarkedRenewed()).toBe(true);
  });
});

