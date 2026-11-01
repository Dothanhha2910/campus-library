import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { LoanItemComponent } from './components/LoanItemComponent';
import { PaginationComponent } from './components/PaginationComponent';
import type { ToastMessage } from './components/ToastComponent';
import { waitForAllApis } from './support/ui-sync';

export type LoanFilter = 'all' | 'active' | 'overdue' | 'returned';

/** "My loans" page of a member. */
export class LoansPage extends BasePage {
  readonly pagination: PaginationComponent;
  private readonly heading: Locator;
  private readonly list: Locator;
  private readonly tabs: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.locator('#main .page-head h1');
    this.list = page.locator('#list');
    this.tabs = page.locator('#tabs');
    this.pagination = new PaginationComponent(page.locator('#pager'), async (click) => {
      await click();
      await this.waitUntilLoaded();
    });
  }

  async open(): Promise<void> {
    await this.page.goto('/#/loans');
    await this.waitUntilLoaded();
  }

  async waitUntilLoaded(): Promise<void> {
    await this.heading.filter({ hasText: 'My loans' }).waitFor();
    await this.list.locator('.skeleton').first().waitFor({ state: 'detached' });
  }

  async getRulesText(): Promise<string> {
    return ((await this.heading.locator('xpath=following-sibling::p').textContent()) ?? '').trim();
  }

  async filterBy(filter: LoanFilter): Promise<void> {
    const label = filter[0].toUpperCase() + filter.slice(1);
    await waitForAllApis(
      this.page,
      [{ method: 'GET', path: '/api/loans/mine', where: (url) => (url.searchParams.get('status') ?? 'all') === filter }],
      () => this.tabs.getByRole('button', { name: label, exact: true }).click()
    );
    await this.waitUntilLoaded();
  }

  async getActiveFilter(): Promise<string> {
    return ((await this.tabs.locator('button.active').textContent()) ?? '').trim();
  }

  async getLoanTitles(): Promise<string[]> {
    await this.waitUntilLoaded();
    return (await this.list.locator('article.loan h4').allTextContents()).map((t) => t.trim());
  }

  getLoan(bookTitle: string): LoanItemComponent {
    const row = this.list.locator('article.loan').filter({ has: this.page.getByRole('heading', { name: bookTitle, exact: true }) });
    return new LoanItemComponent(row);
  }

  async hasEmptyMessage(): Promise<boolean> {
    await this.waitUntilLoaded();
    return this.list.locator('.empty h3', { hasText: 'No loans here yet' }).isVisible();
  }

  async getErrorMessage(): Promise<string | null> {
    await this.waitUntilLoaded();
    const state = this.list.locator('.empty', { has: this.page.getByRole('heading', { name: 'Something went wrong' }) });
    return (await state.count()) ? ((await state.locator('p').textContent()) ?? '').trim() : null;
  }

  /** Presses Return on the loan; returns the toast shown (it contains the fine, if any). */
  async giveBack(bookTitle: string): Promise<ToastMessage> {
    const toast = await this.toasts.captureNext(() =>
      waitForAllApis(this.page, [{ method: 'POST', path: /^\/api\/loans\/\d+\/return$/ }], () => this.getLoan(bookTitle).clickReturn())
    );
    await this.waitUntilLoaded();
    return toast;
  }

  /** Presses Renew on the loan and returns the toast shown. */
  async renew(bookTitle: string): Promise<ToastMessage> {
    const toast = await this.toasts.captureNext(() =>
      waitForAllApis(this.page, [{ method: 'POST', path: /^\/api\/loans\/\d+\/renew$/ }], () => this.getLoan(bookTitle).clickRenew())
    );
    await this.waitUntilLoaded();
    return toast;
  }
}
