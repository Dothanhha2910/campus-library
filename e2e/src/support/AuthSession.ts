import type { Page } from '@playwright/test';

/**
 * Starts a browser session as an existing user without typing credentials in the login form.
 *
 * The app keeps the JWT in localStorage; we store a token obtained through the API and reload.
 * This is set-up only. Tests that verify signing in or out use LoginPage / TopBar instead.
 */
export class AuthSession {
  constructor(private readonly page: Page) {}

  async signInAs(user: { token: string }): Promise<void> {
    await this.seedToken(user.token);
    await this.page.locator('header.topbar').waitFor();
  }

  /** Stores an arbitrary token (valid or not) and reloads the application. */
  async seedToken(token: string): Promise<void> {
    await this.page.goto('/');
    await this.page.evaluate((value) => localStorage.setItem('token', value), token);
    await this.page.reload();
  }
}
