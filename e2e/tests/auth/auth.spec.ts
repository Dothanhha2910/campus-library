import { expect, test } from '../../src/fixtures';
import { newUserData, uid } from '../../src/support/data';

test.describe('Authentication', () => {
  test.beforeEach(async ({ app }) => {
    await app.login.open();
  });

  test('AUTH-01: a valid registration creates a member and signs them in', async ({ app }) => {
    const user = newUserData();
    await app.register.open();

    const toast = await app.register.register(user);
    await app.books.waitUntilLoaded();

    expect(toast).toEqual({ type: 'success', text: 'Account created. Welcome!' });
    expect(app.register.getRoute()).toBe('#/books');
    expect(await app.topBar.getUserName()).toBe(user.name);
    expect(await app.topBar.getUserRole()).toBe('member');
  });

  test('AUTH-02: a locked account is refused even with the correct password', async ({ app, arrange }) => {
    const user = await arrange.member();
    await arrange.lockAccount(user);

    const toast = await app.login.signIn(user);

    expect(toast).toBeNull();
    expect(await app.login.getFormError()).toMatch(/locked/i);
    expect(await app.login.isDisplayed()).toBe(true);
  });

  test('AUTH-03: an unknown Google e-mail creates a new member account', async ({ app }) => {
    const email = `${uid('g')}@gmail.com`;
    const dialog = await app.login.openGoogleDialog();
    await dialog.fill(email, 'New Google Person');

    const toast = await dialog.continue();
    await app.books.waitUntilLoaded();

    expect(toast).toEqual({ type: 'success', text: `Signed in with Google as ${email}` });
    expect(await app.topBar.getUserName()).toBe('New Google Person');
    expect(await app.topBar.getUserRole()).toBe('member');
  });

  test('AUTH-05: refreshing the page after signing out does not sign the user in again', async ({ app, arrange, session }) => {
    await session.signInAs(await arrange.member());
    await app.topBar.logout();

    await app.login.reload();
    await app.login.waitUntilDisplayed();

    expect(await app.login.isDisplayed()).toBe(true);
    expect(await app.topBar.isVisible()).toBe(false);
  });
});
