import type { Locator, Page } from '@playwright/test';
import { DialogComponent } from './DialogComponent';
import type { ToastMessage } from './ToastComponent';

/** "Set due date" dialog (admin testing tool on the All loans tab). */
export class DueDateDialog extends DialogComponent {
  private readonly saveButton: Locator;

  constructor(page: Page) {
    super(page);
    this.saveButton = this.dialog.getByRole('button', { name: 'Save' });
  }

  /** @param isoDate YYYY-MM-DD */
  async setDate(isoDate: string): Promise<void> {
    await this.dialog.getByLabel('New due date').fill(isoDate);
  }

  /** Presses Save. Returns the toast of a successful update (null when rejected). */
  async save(): Promise<ToastMessage | null> {
    return this.submitAndCapture(this.saveButton, { method: 'PATCH', path: /^\/api\/loans\/\d+\/due-date$/ });
  }
}
