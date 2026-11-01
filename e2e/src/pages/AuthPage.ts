import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { GoogleSignInDialog } from './components/GoogleSignInDialog';
import type { ToastMessage } from './components/ToastComponent';
import { readText } from './support/ui-sync';

export type AuthField = 'name' | 'email' | 'password';

/** Elements common to the "Sign in" and "Register" tabs of the unauthenticated screen. */
export abstract class AuthPage extends BasePage {
  protected readonly card: Locator;
  protected readonly form: Locator;
  protected readonly submitButton: Locator;
  private readonly googleButton: Locator;

  protected constructor(page: Page, private readonly endpoint: string) {
    super(page);
    this.card = page.locator('.auth-card');
    this.form = page.locator('#auth-form');
    this.submitButton = this.form.locator('button[type="submit"]');
    this.googleButton = page.locator('.btn-google');
  }

  async isDisplayed(): Promise<boolean> {
    return this.page.locator('.auth').isVisible();
  }

  /** Waits until the unauthenticated screen is shown (for example after a redirect). */
  async waitUntilDisplayed(): Promise<void> {
    await this.page.locator('.auth').waitFor();
  }

  async getHeading(): Promise<string> {
    return ((await this.card.locator('h2').textContent()) ?? '').trim();
  }

  async getActiveTab(): Promise<string> {
    return ((await this.card.locator('.seg button.active').textContent()) ?? '').trim();
  }

  async getFormError(): Promise<string> {
    return readText(this.form.locator('.form-error'));
  }

  async getFieldError(field: AuthField): Promise<string> {
    return readText(this.form.locator(`[data-error="${field}"]`));
  }

  async isPasswordMasked(): Promise<boolean> {
    return (await this.form.getByLabel('Password').getAttribute('type')) === 'password';
  }

  async hasField(field: AuthField): Promise<boolean> {
    return (await this.form.locator(`[name="${field}"]`).count()) > 0;
  }

  async isGoogleButtonEnabled(): Promise<boolean> {
    return this.googleButton.isEnabled();
  }

  async openGoogleDialog(): Promise<GoogleSignInDialog> {
    await this.googleButton.click();
    const dialog = new GoogleSignInDialog(this.page);
    await dialog.waitUntilOpen();
    return dialog;
  }

  /** Presses the form's submit button once and returns the toast raised by a successful attempt. */
  protected async submitForm(): Promise<ToastMessage | null> {
    return this.submitAndCapture({ method: 'POST', path: this.endpoint }, () => this.submitButton.click());
  }

  /** Same as `submitForm` but submits with the Enter key from the given field. */
  protected async submitWithEnter(field: Locator): Promise<ToastMessage | null> {
    return this.submitAndCapture({ method: 'POST', path: this.endpoint }, () => field.press('Enter'));
  }
}
