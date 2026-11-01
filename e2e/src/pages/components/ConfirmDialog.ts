import { DialogComponent } from './DialogComponent';

/** Generic "Are you sure?" dialog (for example "Delete this book?"). */
export class ConfirmDialog extends DialogComponent {
  async getMessage(): Promise<string> {
    return ((await this.dialog.locator('.modal-sub').textContent()) ?? '').trim();
  }

  /** Confirms and waits for the dialog to close. The action's own toast is read by the caller. */
  async confirm(): Promise<void> {
    await this.dialog.locator('#ok').click();
    await this.waitUntilClosed();
  }
}
