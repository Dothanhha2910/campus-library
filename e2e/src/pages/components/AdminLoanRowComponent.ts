import type { Locator, Page } from '@playwright/test';
import { DueDateDialog } from './DueDateDialog';
import { ToastComponent, ToastMessage } from './ToastComponent';
import { parseDisplayedDate, parseMoney } from '../support/parse';
import { waitForAllApis } from '../support/ui-sync';
import type { LoanStatus, LoanStatusLabel } from './LoanItemComponent';

/** One row of the administrator's "All loans" table. */
export class AdminLoanRowComponent {
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

  async getBookTitle(): Promise<string> {
    return ((await this.root.locator('td').nth(0).textContent()) ?? '').trim();
  }

  async getMemberName(): Promise<string> {
    return ((await this.root.locator('td').nth(1).locator('b').textContent()) ?? '').trim();
  }

  async getMemberEmail(): Promise<string> {
    return ((await this.root.locator('td').nth(1).locator('span').textContent()) ?? '').trim();
  }

  async getDueDate(): Promise<Date> {
    return parseDisplayedDate(((await this.root.locator('td').nth(2).textContent()) ?? '').trim());
  }

  async getStatus(): Promise<LoanStatus> {
    const text = ((await this.root.locator('td').nth(3).textContent()) ?? '').trim();
    const match = /^(Borrowed|Overdue|Returned)(?:\s+(\d+)d)?$/.exec(text);
    if (!match) throw new Error(`Unexpected loan status: "${text}"`);
    return { label: match[1] as LoanStatusLabel, daysOverdue: match[2] ? Number(match[2]) : 0 };
  }

  /** The fine column; null when it shows "-". */
  async getFine(): Promise<number | null> {
    const text = ((await this.root.locator('td').nth(4).textContent()) ?? '').trim();
    return text === '-' ? null : parseMoney(text);
  }

  async canSetDueDate(): Promise<boolean> {
    return (await this.root.getByRole('button', { name: 'Set due date' }).count()) > 0;
  }

  async canReturn(): Promise<boolean> {
    return (await this.root.getByRole('button', { name: 'Return' }).count()) > 0;
  }

  async openDueDateDialog(): Promise<DueDateDialog> {
    await this.root.getByRole('button', { name: 'Set due date' }).click();
    const dialog = new DueDateDialog(this.page);
    await dialog.waitUntilOpen();
    return dialog;
  }

  /** Presses Return on behalf of the member; returns the toast shown (the table reloads afterwards). */
  async giveBack(): Promise<ToastMessage> {
    return this.toasts.captureNext(() =>
      waitForAllApis(
        this.page,
        [
          { method: 'POST', path: /^\/api\/loans\/\d+\/return$/ },
          { method: 'GET', path: '/api/loans' },
        ],
        () => this.root.getByRole('button', { name: 'Return' }).click()
      )
    );
  }
}
