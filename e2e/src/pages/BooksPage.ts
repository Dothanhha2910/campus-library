import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { BookCardComponent } from './components/BookCardComponent';
import { BookFormDialog } from './components/BookFormDialog';
import { ConfirmDialog } from './components/ConfirmDialog';
import { PaginationComponent } from './components/PaginationComponent';
import type { ToastMessage } from './components/ToastComponent';
import { waitForApi } from './support/ui-sync';

export type SortField = 'title' | 'author' | 'year' | 'newest';
export type SortOrder = 'asc' | 'desc';

/** The "Book catalogue" page (members and admins). */
export class BooksPage extends BasePage {
  readonly pagination: PaginationComponent;
  private readonly heading: Locator;
  private readonly grid: Locator;
  private readonly searchBox: Locator;
  private readonly categorySelect: Locator;
  private readonly sortSelect: Locator;
  private readonly orderSelect: Locator;
  private readonly availableToggle: Locator;
  private readonly availableSwitch: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.locator('#main .page-head h1');
    this.grid = page.locator('#grid');
    this.searchBox = page.locator('#q');
    this.categorySelect = page.locator('#category');
    this.sortSelect = page.locator('#sort');
    this.orderSelect = page.locator('#order');
    this.availableToggle = page.locator('label.toggle');
    this.availableSwitch = page.locator('#available');
    this.pagination = new PaginationComponent(page.locator('#pager'), async (click) => {
      await click();
      await this.waitUntilLoaded();
    });
  }

  async open(): Promise<void> {
    await this.page.goto('/#/books');
    await this.waitUntilLoaded();
  }

  /** Opens any route (for example "#/admin") and waits for the catalogue, where the app redirects members. */
  async openRoute(route: string): Promise<void> {
    await this.page.goto(`/${route}`);
    await this.waitUntilLoaded();
  }

  /** The heading is visible and the grid is no longer showing loading placeholders. */
  async waitUntilLoaded(): Promise<void> {
    await this.heading.filter({ hasText: 'Book catalogue' }).waitFor();
    await this.grid.locator('.skeleton').first().waitFor({ state: 'detached' });
  }

  // ---- reading the list ---------------------------------------------------------------------

  async getBookTitles(): Promise<string[]> {
    await this.waitUntilLoaded();
    return (await this.grid.locator('.book-title').allTextContents()).map((t) => t.trim());
  }

  async getBookCount(): Promise<number> {
    await this.waitUntilLoaded();
    return this.grid.locator('article.book').count();
  }

  getBookCard(title: string): BookCardComponent {
    const card = this.grid.locator('article.book').filter({ has: this.page.getByRole('heading', { name: title, exact: true }) });
    return new BookCardComponent(card);
  }

  async hasNoResultsMessage(): Promise<boolean> {
    await this.waitUntilLoaded();
    return this.grid.locator('.empty h3', { hasText: 'No books found' }).isVisible();
  }

  async getErrorMessage(): Promise<string | null> {
    await this.waitUntilLoaded();
    const state = this.grid.locator('.empty', { has: this.page.getByRole('heading', { name: 'Something went wrong' }) });
    return (await state.count()) ? ((await state.locator('p').textContent()) ?? '').trim() : null;
  }

  // ---- search, filter, sort -----------------------------------------------------------------

  private listRequest(where: (params: URLSearchParams) => boolean) {
    return { method: 'GET', path: '/api/books', where: (url: URL) => where(url.searchParams) };
  }

  async search(text: string): Promise<void> {
    await waitForApi(this.page, this.listRequest((p) => (p.get('q') ?? '') === text), () => this.searchBox.fill(text));
    await this.waitUntilLoaded();
  }

  async getSearchText(): Promise<string> {
    return this.searchBox.inputValue();
  }

  /** Pass null to select "All categories". */
  async filterByCategory(category: string | null): Promise<void> {
    const value = category ?? '';
    await waitForApi(this.page, this.listRequest((p) => (p.get('category') ?? '') === value), () =>
      this.categorySelect.selectOption(category === null ? { value: '' } : { label: category })
    );
    await this.waitUntilLoaded();
  }

  async getCategoryOptions(): Promise<string[]> {
    return (await this.categorySelect.locator('option').allTextContents()).map((t) => t.trim());
  }

  async sortBy(field: SortField): Promise<void> {
    await waitForApi(this.page, this.listRequest((p) => (p.get('sort') ?? 'title') === field), () =>
      this.sortSelect.selectOption({ value: field })
    );
    await this.waitUntilLoaded();
  }

  async setOrder(order: SortOrder): Promise<void> {
    await waitForApi(this.page, this.listRequest((p) => (p.get('order') ?? 'asc') === order), () =>
      this.orderSelect.selectOption({ value: order })
    );
    await this.waitUntilLoaded();
  }

  async setAvailableOnly(enabled: boolean): Promise<void> {
    await waitForApi(this.page, this.listRequest((p) => (p.get('available') === 'true') === enabled), () => this.availableToggle.click());
    await this.waitUntilLoaded();
  }

  async isAvailableOnlyOn(): Promise<boolean> {
    return this.availableSwitch.isChecked();
  }

  async getSelectedSort(): Promise<string> {
    return this.sortSelect.inputValue();
  }

  // ---- pagination (delegates to the component) ----------------------------------------------

  async goToPage(page: number): Promise<void> {
    await this.pagination.goToPage(page);
  }

  // ---- borrowing ------------------------------------------------------------------------------

  /** Presses Borrow on the book and returns the toast the application shows. */
  async borrow(title: string): Promise<ToastMessage> {
    const toast = await this.toasts.captureNext(() =>
      waitForApi(this.page, { method: 'POST', path: '/api/loans' }, () => this.getBookCard(title).clickBorrow())
    );
    await this.waitUntilLoaded();
    return toast;
  }

  // ---- admin actions --------------------------------------------------------------------------

  async isAddBookVisible(): Promise<boolean> {
    return this.page.getByRole('button', { name: 'Add book' }).isVisible();
  }

  async openAddBookDialog(): Promise<BookFormDialog> {
    await this.page.getByRole('button', { name: 'Add book' }).click();
    const dialog = new BookFormDialog(this.page);
    await dialog.waitUntilOpen();
    return dialog;
  }

  async openEditBookDialog(title: string): Promise<BookFormDialog> {
    await this.getBookCard(title).clickEdit();
    const dialog = new BookFormDialog(this.page);
    await dialog.waitUntilOpen();
    return dialog;
  }

  async openDeleteConfirmation(title: string): Promise<ConfirmDialog> {
    await this.getBookCard(title).clickDelete();
    const dialog = new ConfirmDialog(this.page);
    await dialog.waitUntilOpen();
    return dialog;
  }

  /** Confirms an open delete dialog; returns the toast of the delete attempt and refreshes the list. */
  async confirmDelete(dialog: ConfirmDialog): Promise<ToastMessage> {
    const toast = await this.toasts.captureNext(() =>
      waitForApi(this.page, { method: 'DELETE', path: /^\/api\/books\/\d+$/ }, () => dialog.confirm())
    );
    await this.waitUntilLoaded();
    return toast;
  }
}
