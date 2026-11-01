import type { Locator, Page } from '@playwright/test';

export type AdminTab = 'Dashboard' | 'Users' | 'All loans';

/** The Dashboard / Users / All loans tab strip of the Administration page. */
export class AdminTabsComponent {
  private readonly root: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('#tabs');
  }

  async waitUntilVisible(): Promise<void> {
    await this.page.locator('#main .page-head h1', { hasText: 'Administration' }).waitFor();
    await this.root.waitFor();
  }

  async select(tab: AdminTab): Promise<void> {
    await this.root.getByRole('button', { name: tab, exact: true }).click();
  }

  async getActiveTab(): Promise<string> {
    return ((await this.root.locator('button.active').textContent()) ?? '').trim();
  }
}
