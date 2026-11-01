import type { Locator, Page } from '@playwright/test';

export type NavLabel = 'Books' | 'My Loans' | 'Profile' | 'Admin';
export type Theme = 'light' | 'dark';

/** Header shown to every signed-in user: navigation, current user, theme switch, sign out. */
export class TopBarComponent {
  private readonly root: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('header.topbar');
  }

  async waitUntilVisible(): Promise<void> {
    await this.root.waitFor();
  }

  async isVisible(): Promise<boolean> {
    return this.root.isVisible();
  }

  async getUserName(): Promise<string> {
    return ((await this.root.locator('.user-chip .meta b').textContent()) ?? '').trim();
  }

  async getUserRole(): Promise<string> {
    return ((await this.root.locator('.user-chip .meta span').textContent()) ?? '').trim();
  }

  async getNavLabels(): Promise<string[]> {
    return (await this.root.locator('#nav a').allTextContents()).map((t) => t.trim());
  }

  async hasNavLink(label: NavLabel): Promise<boolean> {
    return (await this.root.locator('#nav a', { hasText: label }).count()) > 0;
  }

  async getActiveNavLabel(): Promise<string> {
    return ((await this.root.locator('#nav a.active').textContent()) ?? '').trim();
  }

  async open(label: NavLabel): Promise<void> {
    await this.root.locator('#nav a', { hasText: label }).click();
  }

  /** Clicks "Sign out" and waits for the sign-in screen. */
  async logout(): Promise<void> {
    await this.root.locator('#logout-btn').click();
    await this.page.locator('.auth').waitFor();
  }

  async toggleTheme(): Promise<void> {
    await this.root.locator('#theme-btn').click();
  }

  async getTheme(): Promise<Theme> {
    return ((await this.page.locator('html').getAttribute('data-theme')) as Theme) ?? 'light';
  }
}
