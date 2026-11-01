import type { Locator } from '@playwright/test';

export interface PaginationInfo {
  page: number;
  totalPages: number;
  total: number;
}

/** The "‹ 1 2 3 › Page x of y" control under lists. */
export class PaginationComponent {
  /**
   * @param root the `.pager` element
   * @param run  runs a click and waits until the owning page has refreshed its list; each page
   *             knows how its list signals "loading finished"
   */
  constructor(
    private readonly root: Locator,
    private readonly run: (click: () => Promise<unknown>) => Promise<unknown>
  ) {}

  async getInfo(): Promise<PaginationInfo> {
    const text = ((await this.root.locator('.info').textContent()) ?? '').trim();
    const match = /Page (\d+) of (\d+)\D+(\d+) result/.exec(text);
    if (!match) throw new Error(`Unexpected pagination text: "${text}"`);
    return { page: Number(match[1]), totalPages: Number(match[2]), total: Number(match[3]) };
  }

  async isVisible(): Promise<boolean> {
    return this.root.locator('.info').isVisible();
  }

  async goToPage(page: number): Promise<void> {
    const button = this.root.getByRole('button', { name: String(page), exact: true });
    if ((await button.count()) === 0) {
      const offered = await this.getPageNumbers();
      throw new Error(`Page ${page} cannot be opened: the pager only offers pages [${offered.join(', ')}]`);
    }
    await this.run(() => button.click());
  }

  async next(): Promise<void> {
    await this.run(() => this.root.locator('button').last().click());
  }

  async previous(): Promise<void> {
    await this.run(() => this.root.locator('button').first().click());
  }

  async isNextDisabled(): Promise<boolean> {
    return this.root.locator('button').last().isDisabled();
  }

  async isPreviousDisabled(): Promise<boolean> {
    return this.root.locator('button').first().isDisabled();
  }

  /** Numbers of the page buttons currently shown (ellipsis excluded). */
  async getPageNumbers(): Promise<number[]> {
    const labels = await this.root.locator('button[data-p]').allTextContents();
    return labels.map((l) => Number(l)).filter((n) => Number.isInteger(n));
  }
}
