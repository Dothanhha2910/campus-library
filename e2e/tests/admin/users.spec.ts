import { expect, test } from '../../src/fixtures';

test.describe('Administration', () => {
  test('ADM-01: an overdue loan that is still out counts as overdue and as active', async ({ app, arrange, seedAdmin, session }) => {
    const member = await arrange.member();
    const book = await arrange.book();
    await session.signInAs(seedAdmin);
    await app.adminDashboard.open();
    const before = await app.adminDashboard.getStats();

    await arrange.overdueLoan(member, book);
    await app.adminDashboard.refresh();
    const after = await app.adminDashboard.getStats();

    expect(after.overdueLoans).toBe(before.overdueLoans + 1);
    expect(after.activeLoans).toBe(before.activeLoans + 1);
  });

  test('ADM-04: a deactivated user cannot sign in', async ({ app, arrange, seedAdmin, session }) => {
    const member = await arrange.member();
    await session.signInAs(seedAdmin);
    await app.adminUsers.open();
    await app.adminUsers.search(member.email);
    const row = app.adminUsers.getUser(member.email);

    const toast = await row.toggleActive();
    expect(toast).toEqual({ type: 'success', text: 'User updated' });
    expect(await row.getStatus()).toBe('Deactivated');

    await app.topBar.logout();
    await app.login.signIn(member);

    expect(await app.login.getFormError()).toBe('Account is deactivated');
    expect(await app.login.isDisplayed()).toBe(true);
  });
});
