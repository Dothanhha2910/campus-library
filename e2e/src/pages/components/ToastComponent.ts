import type { Locator, Page } from '@playwright/test';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  type: ToastType;
  text: string;
}

/** The notification stack in the bottom corner of the application. */
export class ToastComponent {
  private readonly all: Locator;
  private readonly unseen: Locator;

  constructor(page: Page) {
    this.all = page.locator('#toasts .toast');
    this.unseen = page.locator('#toasts .toast:not([data-seen])');
  }

  private async read(toast: Locator): Promise<ToastMessage> {
    const css = (await toast.getAttribute('class')) ?? '';
    const type: ToastType = css.includes('error') ? 'error' : css.includes('success') ? 'success' : 'info';
    const text = ((await toast.locator('span').last().textContent()) ?? '').trim();
    return { type, text };
  }

  /** Tags the toasts currently on screen so that only toasts raised later count as "new". */
  private async markExistingAsSeen(): Promise<void> {
    await this.all.evaluateAll((elements) => elements.forEach((el) => el.setAttribute('data-seen', '1')));
  }

  /** Runs `action` and returns the toast it raised, or null when it raised none. */
  async captureIfAny(action: () => Promise<unknown>): Promise<ToastMessage | null> {
    await this.markExistingAsSeen();
    await action();
    if ((await this.unseen.count()) === 0) return null;
    return this.read(this.unseen.first());
  }

  /** Runs `action` and waits for the toast it must raise. */
  async captureNext(action: () => Promise<unknown>): Promise<ToastMessage> {
    await this.markExistingAsSeen();
    await action();
    await this.unseen.first().waitFor({ timeout: 5_000 });
    return this.read(this.unseen.first());
  }

  /** The most recent toast currently on screen (waits for one to appear). */
  async latest(): Promise<ToastMessage> {
    await this.all.last().waitFor({ timeout: 5_000 });
    return this.read(this.all.last());
  }
}
