import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../BasePage';
import { AdminLoanRowComponent } from '../components/AdminLoanRowComponent';
import { AdminTabsComponent } from '../components/AdminTabsComponent';
import { PaginationComponent } from '../components/PaginationComponent';
import { waitForApi } from '../support/ui-sync';

export type AdminLoanFilter = 'all' | 'active' | 'overdue' | 'returned';

/** Administration -> All loans tab. */
export class AdminLoansPage extends BasePage {
  readonly pagination: PaginationComponent;
  private readonly tabs: AdminTabsComponent;
  private readonly searchBox: Locator;
  private readonly statusSelect: Locator;
  private readonly body: Locator;

  constructor(page: Page) {
    super(page);
    this.tabs = new AdminTabsComponent(page);
    this.searchBox = page.locator('#lq');
    this.statusSelect = page.locator('#lstatus');
    this.body = page.locator('#lbody');
    this.pagination = new PaginationComponent(page.locator('#pager'), (click) => waitForApi(page, this.loansRequest(), click));
  }

  private loansRequest(where?: (params: URLSearchParams) => boolean) {
    return { method: 'GET', path: '/api/loans', where: (url: URL) => (where ? where(url.searchParams) : true) };
  }

  async open(): Promise<void> {
    await this.page.goto('/#/admin');
    await this.tabs.waitUntilVisible();
    await waitForApi(this.page, this.loansRequest(), () => this.tabs.select('All loans'));
    await this.waitUntilLoaded();
  }

  async waitUntilLoaded(): Promise<void> {
    await this.body.locator('tr').first().waitFor();
  }

  async search(text: string): Promise<void> {
    await waitForApi(this.page, this.loansRequest((p) => (p.get('q') ?? '') === text), () => this.searchBox.fill(text));
    await this.waitUntilLoaded();
  }

  async filterByStatus(status: AdminLoanFilter): Promise<void> {
    await waitForApi(this.page, this.loansRequest((p) => (p.get('status') ?? 'all') === status), () =>
      this.statusSelect.selectOption({ value: status })
    );
    await this.waitUntilLoaded();
  }

  async getBookTitles(): Promise<string[]> {
    await this.waitUntilLoaded();
    return (await this.body.locator('tr td:first-child b').allTextContents()).map((t) => t.trim());
  }

  /** The row of a book; pass `memberEmail` when several members borrowed the same book. */
  getLoan(bookTitle: string, memberEmail?: string): AdminLoanRowComponent {
    let row = this.body.locator('tr').filter({ has: this.page.getByText(bookTitle, { exact: true }) });
    if (memberEmail) row = row.filter({ has: this.page.getByText(memberEmail, { exact: true }) });
    return new AdminLoanRowComponent(this.page, row);
  }

  async hasNoLoansMessage(): Promise<boolean> {
    return this.body.locator('.empty h3', { hasText: 'No loans found' }).isVisible();
  }
}
