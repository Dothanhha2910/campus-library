import type { Locator, Page } from '@playwright/test';
import { ToastComponent, ToastMessage } from './ToastComponent';
import { waitForAllApis } from '../support/ui-sync';

export type RoleName = 'member' | 'admin';
export type AccountStatus = 'Active' | 'Deactivated';

/** One row of the administrator's user table. */
export class UserRowComponent {
  private readonly toasts: ToastComponent;

  constructor(
    private readonly page: Page,
    private readonly root: Locator
  ) {
    this.toasts = new ToastComponent(page);
  }

  async exists(): Promise<boolean> {
    return (await this.root.count()) > 0;
  }

  async getDisplayName(): Promise<string> {
    return this.root.locator('.cell-user b').evaluate((el) => (el.childNodes[0]?.textContent ?? '').trim());
  }

  async getEmail(): Promise<string> {
    return ((await this.root.locator('.cell-user > div > span').textContent()) ?? '').trim();
  }

  async getRole(): Promise<RoleName> {
    return (await this.root.locator('select[data-role]').inputValue()) as RoleName;
  }

  async isRoleSelectDisabled(): Promise<boolean> {
    return this.root.locator('select[data-role]').isDisabled();
  }

  async getStatus(): Promise<AccountStatus> {
    return ((await this.root.locator('td').nth(2).locator('.badge').textContent()) ?? '').trim() as AccountStatus;
  }

  async getSignInMethods(): Promise<string[]> {
    return (await this.root.locator('td').nth(3).locator('.badge').allTextContents()).map((t) => t.trim());
  }

  async isCurrentUser(): Promise<boolean> {
    return (await this.root.locator('.cell-user b .badge', { hasText: 'you' }).count()) > 0;
  }

  async getToggleLabel(): Promise<'Deactivate' | 'Activate'> {
    return ((await this.root.locator('button[data-toggle]').textContent()) ?? '').trim() as 'Deactivate' | 'Activate';
  }

  /** Changes the role in the drop-down. Returns the toast shown; the table is reloaded afterwards. */
  async changeRole(role: RoleName): Promise<ToastMessage> {
    return this.toasts.captureNext(() =>
      waitForAllApis(
        this.page,
        [
          { method: 'PATCH', path: /^\/api\/admin\/users\/\d+\/role$/ },
          { method: 'GET', path: '/api/admin/users' },
        ],
        () => this.root.locator('select[data-role]').selectOption({ value: role })
      )
    );
  }

  /** Presses Deactivate / Activate. Returns the toast shown; the table is reloaded afterwards. */
  async toggleActive(): Promise<ToastMessage> {
    return this.toasts.captureNext(() =>
      waitForAllApis(
        this.page,
        [
          { method: 'PATCH', path: /^\/api\/admin\/users\/\d+\/active$/ },
          { method: 'GET', path: '/api/admin/users' },
        ],
        () => this.root.locator('button[data-toggle]').click()
      )
    );
  }

  /** Presses Unlock and returns the toast shown. */
  async unlock(): Promise<ToastMessage> {
    return this.toasts.captureNext(() =>
      waitForAllApis(this.page, [{ method: 'POST', path: /^\/api\/admin\/users\/\d+\/unlock$/ }], () =>
        this.root.locator('button[data-unlock]').click()
      )
    );
  }
}
