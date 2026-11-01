import type { Page } from '@playwright/test';
import { ToastComponent, ToastMessage } from './components/ToastComponent';
import { RequestMatcher, waitForApi } from './support/ui-sync';

/** Behaviour shared by every page object. Page objects never assert; specs do. */
export abstract class BasePage {
  protected readonly toasts: ToastComponent;

  constructor(protected readonly page: Page) {
    this.toasts = new ToastComponent(page);
  }

  async goBack(): Promise<void> {
    await this.page.goBack();
  }

  async reload(): Promise<void> {
    await this.page.reload();
  }

  /** The route part of the address, for example "#/books". */
  getRoute(): string {
    return new URL(this.page.url()).hash;
  }

  /** Runs `trigger`, waits for the matching API call and returns the toast it raised (null if none). */
  protected async submitAndCapture(request: RequestMatcher, trigger: () => Promise<unknown>): Promise<ToastMessage | null> {
    return this.toasts.captureIfAny(() => waitForApi(this.page, request, trigger));
  }
}
