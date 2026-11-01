import type { Locator, Page } from '@playwright/test';
import { DialogComponent } from './DialogComponent';
import type { ToastMessage } from './ToastComponent';

/** "Delete your account?" confirmation dialog on the profile page. */
export class DeleteAccountDialog extends DialogComponent {
  private readonly confirmField: Locator;
  private readonly deleteButton: Locator;

  constructor(page: Page) {
    super(page);
    this.confirmField = this.dialog.getByLabel('Confirmation');
    this.deleteButton = this.dialog.getByRole('button', { name: 'Delete account' });
  }

  async typeConfirmation(text: string): Promise<void> {
    await this.confirmField.fill(text);
  }

  /** Types the text and presses "Delete account". Returns the toast of a successful deletion. */
  async confirm(text: string): Promise<ToastMessage | null> {
    await this.typeConfirmation(text);
    return this.submitAndCapture(this.deleteButton, { method: 'DELETE', path: '/api/profile' });
  }
}
