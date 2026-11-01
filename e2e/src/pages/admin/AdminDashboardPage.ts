import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../BasePage';
import { AdminTabsComponent } from '../components/AdminTabsComponent';
import { parseMoney } from '../support/parse';
import { waitForApi } from '../support/ui-sync';

export interface DashboardStats {
  users: number;
  books: number;
  copiesOnShelf: number;
  activeLoans: number;
  overdueLoans: number;
  finesCollected: number;
}

export interface TopBook {
  title: string;
  loans: number;
}

/** Administration -> Dashboard tab. */
export class AdminDashboardPage extends BasePage {
  private readonly tabs: AdminTabsComponent;
  private readonly cards: Locator;

  constructor(page: Page) {
    super(page);
    this.tabs = new AdminTabsComponent(page);
    this.cards = page.locator('#panel .stat');
  }

  async open(): Promise<void> {
    await this.page.goto('/#/admin');
    await this.tabs.waitUntilVisible();
    await this.cards.first().waitFor();
  }

  /** Re-opens the tab so the numbers are fetched again from the server. */
  async refresh(): Promise<void> {
    await waitForApi(this.page, { method: 'GET', path: '/api/admin/stats' }, () => this.tabs.select('Dashboard'));
    await this.cards.first().waitFor();
  }

  async getStats(): Promise<DashboardStats> {
    await this.cards.first().waitFor();
    const read = async (label: string): Promise<string> => {
      const card = this.cards.filter({ has: this.page.getByText(label, { exact: true }) });
      return ((await card.locator('.num').textContent()) ?? '').trim();
    };
    return {
      users: Number(await read('Registered users')),
      books: Number(await read('Book titles')),
      copiesOnShelf: Number(await read('Copies on shelf')),
      activeLoans: Number(await read('Active loans')),
      overdueLoans: Number(await read('Overdue loans')),
      finesCollected: parseMoney(await read('Fines collected')),
    };
  }

  async getTopBooks(): Promise<TopBook[]> {
    await this.cards.first().waitFor();
    const rows = this.page.locator('#panel .bar-row');
    const count = await rows.count();
    const result: TopBook[] = [];
    for (let i = 0; i < count; i += 1) {
      const spans = rows.nth(i).locator('.top span');
      const title = ((await spans.first().textContent()) ?? '').trim();
      const loans = Number((((await spans.last().textContent()) ?? '').match(/\d+/) ?? ['0'])[0]);
      result.push({ title, loans });
    }
    return result;
  }
}
