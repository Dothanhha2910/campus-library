import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../BasePage';
import { AdminTabsComponent } from '../components/AdminTabsComponent';
import { PaginationComponent } from '../components/PaginationComponent';
import { UserRowComponent } from '../components/UserRowComponent';
import { waitForApi } from '../support/ui-sync';

export type RoleFilter = 'all' | 'member' | 'admin';
export type StatusFilter = 'any' | 'active' | 'deactivated';

/** Administration -> Users tab. */
export class AdminUsersPage extends BasePage {
  readonly pagination: PaginationComponent;
  private readonly tabs: AdminTabsComponent;
  private readonly searchBox: Locator;
  private readonly roleSelect: Locator;
  private readonly statusSelect: Locator;
  private readonly body: Locator;

  constructor(page: Page) {
    super(page);
    this.tabs = new AdminTabsComponent(page);
    this.searchBox = page.locator('#uq');
    this.roleSelect = page.locator('#urole');
    this.statusSelect = page.locator('#uactive');
    this.body = page.locator('#ubody');
    this.pagination = new PaginationComponent(page.locator('#pager'), (click) => waitForApi(page, this.usersRequest(), click));
  }

  private usersRequest(where?: (params: URLSearchParams) => boolean) {
    return { method: 'GET', path: '/api/admin/users', where: (url: URL) => (where ? where(url.searchParams) : true) };
  }

  async open(): Promise<void> {
    await this.page.goto('/#/admin');
    await this.tabs.waitUntilVisible();
    await waitForApi(this.page, this.usersRequest(), () => this.tabs.select('Users'));
    await this.waitUntilLoaded();
  }

  async waitUntilLoaded(): Promise<void> {
    await this.body.locator('tr').first().waitFor();
  }

  async search(text: string): Promise<void> {
    await waitForApi(this.page, this.usersRequest((p) => (p.get('q') ?? '') === text), () => this.searchBox.fill(text));
    await this.waitUntilLoaded();
  }

  async filterByRole(role: RoleFilter): Promise<void> {
    const value = role === 'all' ? '' : role;
    await waitForApi(this.page, this.usersRequest((p) => (p.get('role') ?? '') === value), () =>
      this.roleSelect.selectOption({ value })
    );
    await this.waitUntilLoaded();
  }

  async filterByStatus(status: StatusFilter): Promise<void> {
    const value = status === 'any' ? '' : status === 'active' ? 'true' : 'false';
    await waitForApi(this.page, this.usersRequest((p) => (p.get('active') ?? '') === value), () =>
      this.statusSelect.selectOption({ value })
    );
    await this.waitUntilLoaded();
  }

  async getUserEmails(): Promise<string[]> {
    await this.waitUntilLoaded();
    return (await this.body.locator('.cell-user > div > span').allTextContents()).map((t) => t.trim());
  }

  getUser(email: string): UserRowComponent {
    const row = this.body.locator('tr').filter({ has: this.page.getByText(email, { exact: true }) });
    return new UserRowComponent(this.page, row);
  }

  async hasNoUsersMessage(): Promise<boolean> {
    return this.body.locator('.empty h3', { hasText: 'No users match' }).isVisible();
  }
}
