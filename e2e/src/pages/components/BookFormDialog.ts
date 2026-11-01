import type { Locator, Page } from '@playwright/test';
import { DialogComponent } from './DialogComponent';
import type { ToastMessage } from './ToastComponent';

export interface BookFormValues {
  title: string;
  author: string;
  category: string;
  isbn: string;
  year: string | number;
  copiesTotal: string | number;
}

export type BookFormField = keyof BookFormValues;

/** The "Add a new book" / "Edit book" dialog (admin). */
export class BookFormDialog extends DialogComponent {
  private readonly saveButton: Locator;

  constructor(page: Page) {
    super(page);
    this.saveButton = this.dialog.locator('#book-form button[type="submit"]');
  }

  private field(name: BookFormField): Locator {
    const labels: Record<BookFormField, string> = {
      title: 'Title',
      author: 'Author',
      category: 'Category',
      isbn: 'ISBN',
      year: 'Year',
      copiesTotal: 'Total copies',
    };
    return this.dialog.getByLabel(labels[name], { exact: true });
  }

  async fill(values: Partial<BookFormValues>): Promise<void> {
    for (const [name, value] of Object.entries(values) as [BookFormField, string | number | undefined][]) {
      if (value !== undefined) await this.field(name).fill(String(value));
    }
  }

  async getValues(): Promise<Record<BookFormField, string>> {
    const names: BookFormField[] = ['title', 'author', 'category', 'isbn', 'year', 'copiesTotal'];
    const entries = await Promise.all(names.map(async (n) => [n, await this.field(n).inputValue()] as const));
    return Object.fromEntries(entries) as Record<BookFormField, string>;
  }

  async getSubmitLabel(): Promise<string> {
    return ((await this.saveButton.textContent()) ?? '').trim();
  }

  /** Presses "Add book" / "Save changes". Returns the toast of a successful save (null when rejected). */
  async save(): Promise<ToastMessage | null> {
    return this.submitAndCapture(this.saveButton, { method: ['POST', 'PUT'], path: /^\/api\/books(\/\d+)?$/ });
  }
}
