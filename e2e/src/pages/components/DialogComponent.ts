import type { Locator, Page } from '@playwright/test';
import { RequestMatcher, readText, waitForApi } from '../support/ui-sync';
import { ToastComponent, ToastMessage } from './ToastComponent';

/** Base class for the modal <dialog> used by the application (one dialog is open at a time). */
export abstract class DialogComponent {
  protected readonly dialog: Locator;
  private readonly toasts: ToastComponent;

  constructor(protected readonly page: Page) {
    this.dialog = page.locator('dialog#dialog');
    this.toasts = new ToastComponent(page);
  }

  async waitUntilOpen(): Promise<void> {
    await this.dialog.waitFor({ state: 'visible' });
  }

  async waitUntilClosed(): Promise<void> {
    await this.dialog.waitFor({ state: 'hidden' });
  }

  async isOpen(): Promise<boolean> {
    return this.dialog.isVisible();
  }

  async getHeading(): Promise<string> {
    return ((await this.dialog.locator('h3').textContent()) ?? '').trim();
  }

  async cancel(): Promise<void> {
    await this.dialog.getByRole('button', { name: 'Cancel' }).click();
    await this.waitUntilClosed();
  }

  async getFormError(): Promise<string> {
    return readText(this.dialog.locator('.form-error'));
  }

  async getFieldError(field: string): Promise<string> {
    return readText(this.dialog.locator(`[data-error="${field}"]`));
  }

  /** Clicks `submit`, waits for the API call and returns the toast raised by it (null if none). */
  protected async submitAndCapture(submit: Locator, request: RequestMatcher): Promise<ToastMessage | null> {
    return this.toasts.captureIfAny(() => waitForApi(this.page, request, () => submit.click()));
  }
}
