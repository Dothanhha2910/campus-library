import { DialogComponent } from './DialogComponent';
import type { ToastMessage } from './ToastComponent';
import { ToastComponent } from './ToastComponent';
import { waitForApi } from '../support/ui-sync';

/**
 * The "Google sign-in (mock)" dialog shown when the server runs in mock mode.
 *
 * Its inputs are located by `name`: the labels use `for="f-email"`, an id that the sign-in form
 * behind the dialog also uses, so label-based lookup would point at the wrong input.
 */
export class GoogleSignInDialog extends DialogComponent {
  private get emailInput() {
    return this.dialog.locator('input[name="email"]');
  }

  private get nameInput() {
    return this.dialog.locator('input[name="name"]');
  }

  async getEmail(): Promise<string> {
    return this.emailInput.inputValue();
  }

  async getDisplayName(): Promise<string> {
    return this.nameInput.inputValue();
  }

  async fill(email: string, displayName?: string): Promise<void> {
    await this.emailInput.fill(email);
    if (displayName !== undefined) await this.nameInput.fill(displayName);
  }

  /** Presses Continue; the application always answers with a success or error toast. */
  async continue(): Promise<ToastMessage> {
    const toasts = new ToastComponent(this.page);
    return toasts.captureNext(() =>
      waitForApi(this.page, { method: 'POST', path: '/api/auth/google' }, () =>
        this.dialog.getByRole('button', { name: 'Continue' }).click()
      )
    );
  }
}
