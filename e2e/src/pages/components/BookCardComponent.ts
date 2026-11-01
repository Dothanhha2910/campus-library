import type { Locator } from '@playwright/test';

export interface Availability {
  available: number;
  total: number;
}

/** One book tile in the catalogue grid. */
export class BookCardComponent {
  constructor(private readonly root: Locator) {}

  async isVisible(): Promise<boolean> {
    return this.root.isVisible();
  }

  async exists(): Promise<boolean> {
    return (await this.root.count()) > 0;
  }

  async getTitle(): Promise<string> {
    return ((await this.root.locator('.book-title').textContent()) ?? '').trim();
  }

  async getAuthor(): Promise<string> {
    return ((await this.root.locator('.book-author').textContent()) ?? '').trim();
  }

  async getCategory(): Promise<string> {
    return ((await this.root.locator('.cover .cat').textContent()) ?? '').trim();
  }

  async getYear(): Promise<number> {
    return Number(((await this.root.locator('.book-meta span').first().textContent()) ?? '').trim());
  }

  async getIsbn(): Promise<string> {
    const text = ((await this.root.locator('.book-meta span').last().textContent()) ?? '').trim();
    return text.replace(/^ISBN\s*/, '');
  }

  async getAvailability(): Promise<Availability> {
    const text = ((await this.root.locator('.badge').textContent()) ?? '').trim();
    const match = /(\d+)\/(\d+) available/.exec(text);
    if (!match) throw new Error(`Unexpected availability text: "${text}"`);
    return { available: Number(match[1]), total: Number(match[2]) };
  }

  async isBorrowEnabled(): Promise<boolean> {
    return this.root.getByRole('button', { name: 'Borrow' }).isEnabled();
  }

  async hasAdminActions(): Promise<boolean> {
    return (await this.root.locator('button[title="Edit"], button[title="Delete"]').count()) > 0;
  }

  async clickBorrow(): Promise<void> {
    await this.root.getByRole('button', { name: 'Borrow' }).click();
  }

  async clickEdit(): Promise<void> {
    await this.root.locator('button[title="Edit"]').click();
  }

  async clickDelete(): Promise<void> {
    await this.root.locator('button[title="Delete"]').click();
  }
}
