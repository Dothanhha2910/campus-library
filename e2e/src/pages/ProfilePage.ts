import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { DeleteAccountDialog } from './components/DeleteAccountDialog';
import type { ToastMessage } from './components/ToastComponent';
import { parseMoney } from './support/parse';
import { readText } from './support/ui-sync';

export interface ProfileStats {
  totalLoans: number;
  activeLoans: number;
  finesPaid: number;
}

export type InfoField = 'name' | 'phone';
export type PasswordField = 'currentPassword' | 'newPassword';

/** "My profile" page: summary card, personal information, change password, delete account. */
export class ProfilePage extends BasePage {
  private readonly heading: Locator;
  private readonly summary: Locator;
  private readonly infoForm: Locator;
  private readonly passwordForm: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.locator('#main .page-head h1');
    this.summary = page.locator('.profile-card');
    this.infoForm = page.locator('#info-form');
    this.passwordForm = page.locator('#pw-form');
  }

  async open(): Promise<void> {
    await this.page.goto('/#/profile');
    await this.waitUntilLoaded();
  }

  async waitUntilLoaded(): Promise<void> {
    await this.heading.filter({ hasText: 'My profile' }).waitFor();
    await this.summary.waitFor();
  }

  // ---- summary card -------------------------------------------------------------------------

  async getDisplayedName(): Promise<string> {
    return ((await this.summary.locator('h2').textContent()) ?? '').trim();
  }

  async getDisplayedEmail(): Promise<string> {
    return ((await this.summary.locator('.email').textContent()) ?? '').trim();
  }

  async getRoleBadge(): Promise<string> {
    return ((await this.summary.locator('.badge.brand').textContent()) ?? '').trim();
  }

  async isGoogleLinked(): Promise<boolean> {
    return (await this.summary.locator('.badge.info', { hasText: 'Google linked' }).count()) > 0;
  }

  async getStats(): Promise<ProfileStats> {
    const value = async (label: string): Promise<string> => {
      const cell = this.summary.locator('.mini-stats > div', { has: this.page.getByText(label, { exact: true }) });
      return ((await cell.locator('b').textContent()) ?? '').trim();
    };
    return {
      totalLoans: Number(await value('Total loans')),
      activeLoans: Number(await value('Active')),
      finesPaid: parseMoney(await value('Fines paid')),
    };
  }

  // ---- personal information -----------------------------------------------------------------

  async isEmailEditable(): Promise<boolean> {
    return this.infoForm.getByLabel('Email').isEditable();
  }

  async getEmailFieldValue(): Promise<string> {
    return this.infoForm.getByLabel('Email').inputValue();
  }

  async getNameFieldValue(): Promise<string> {
    return this.infoForm.getByLabel('Full name').inputValue();
  }

  async getPhoneFieldValue(): Promise<string> {
    return this.infoForm.getByLabel('Phone (optional)').inputValue();
  }

  /** Fills the given fields and presses "Save changes". Returns the toast of a successful save. */
  async updateProfile(values: { name?: string; phone?: string }): Promise<ToastMessage | null> {
    if (values.name !== undefined) await this.infoForm.getByLabel('Full name').fill(values.name);
    if (values.phone !== undefined) await this.infoForm.getByLabel('Phone (optional)').fill(values.phone);
    return this.submitAndCapture({ method: 'PUT', path: '/api/profile' }, () =>
      this.infoForm.getByRole('button', { name: 'Save changes' }).click()
    );
  }

  async getInfoFieldError(field: InfoField): Promise<string> {
    return readText(this.infoForm.locator(`[data-error="${field}"]`));
  }

  async getInfoFormError(): Promise<string> {
    return readText(this.infoForm.locator('.form-error'));
  }

  // ---- change password ----------------------------------------------------------------------

  async isPasswordFormEnabled(): Promise<boolean> {
    return (
      (await this.passwordForm.getByLabel('Current password').isEnabled()) &&
      (await this.passwordForm.getByLabel('New password').isEnabled()) &&
      (await this.passwordForm.getByRole('button', { name: 'Update password' }).isEnabled())
    );
  }

  async getPasswordHint(): Promise<string> {
    return ((await this.passwordForm.locator('xpath=preceding-sibling::p[1]').textContent()) ?? '').trim();
  }

  /** Presses "Update password". Returns the toast of a successful change. */
  async changePassword(currentPassword: string, newPassword: string): Promise<ToastMessage | null> {
    await this.passwordForm.getByLabel('Current password').fill(currentPassword);
    await this.passwordForm.getByLabel('New password').fill(newPassword);
    return this.submitAndCapture({ method: 'PUT', path: '/api/profile/password' }, () =>
      this.passwordForm.getByRole('button', { name: 'Update password' }).click()
    );
  }

  async getPasswordFieldError(field: PasswordField): Promise<string> {
    return readText(this.passwordForm.locator(`[data-error="${field}"]`));
  }

  async getPasswordFormError(): Promise<string> {
    return readText(this.passwordForm.locator('.form-error'));
  }

  async getCurrentPasswordFieldValue(): Promise<string> {
    return this.passwordForm.getByLabel('Current password').inputValue();
  }

  // ---- delete account -----------------------------------------------------------------------

  async openDeleteAccountDialog(): Promise<DeleteAccountDialog> {
    await this.page.locator('#delete-account').click();
    const dialog = new DeleteAccountDialog(this.page);
    await dialog.waitUntilOpen();
    return dialog;
  }
}
