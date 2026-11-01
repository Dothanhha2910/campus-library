import type { Locator } from '@playwright/test';
import { parseDisplayedDate, parseMoney } from '../support/parse';

export type LoanStatusLabel = 'Borrowed' | 'Overdue' | 'Returned';

export interface LoanStatus {
  label: LoanStatusLabel;
  /** Number of overdue days printed next to "Overdue" (0 when none). */
  daysOverdue: number;
}

/** One loan on the "My loans" page. */
export class LoanItemComponent {
  constructor(private readonly root: Locator) {}

  async exists(): Promise<boolean> {
    return (await this.root.count()) > 0;
  }

  async getTitle(): Promise<string> {
    return ((await this.root.locator('h4').textContent()) ?? '').trim();
  }

  async getStatus(): Promise<LoanStatus> {
    const text = ((await this.root.locator('.badge').first().textContent()) ?? '').trim();
    const match = /^(Borrowed|Overdue|Returned)(?:\s+(\d+)d)?$/.exec(text);
    if (!match) throw new Error(`Unexpected loan status: "${text}"`);
    return { label: match[1] as LoanStatusLabel, daysOverdue: match[2] ? Number(match[2]) : 0 };
  }

  private async dateOf(prefix: 'Borrowed' | 'Due' | 'Returned'): Promise<Date | null> {
    const span = this.root.locator('.dates span', { hasText: new RegExp(`^${prefix} `) });
    if ((await span.count()) === 0) return null;
    return parseDisplayedDate(((await span.first().textContent()) ?? '').trim());
  }

  getBorrowedDate(): Promise<Date | null> {
    return this.dateOf('Borrowed');
  }

  getDueDate(): Promise<Date | null> {
    return this.dateOf('Due');
  }

  getReturnedDate(): Promise<Date | null> {
    return this.dateOf('Returned');
  }

  async isMarkedRenewed(): Promise<boolean> {
    return (await this.root.locator('.dates span', { hasText: /^Renewed$/ }).count()) > 0;
  }

  /** The fine printed on the loan ("Fine so far" / "Fine paid"), or null when no fine is shown. */
  async getFine(): Promise<number | null> {
    const fine = this.root.locator('.fine');
    if ((await fine.count()) === 0) return null;
    return parseMoney(((await fine.textContent()) ?? '').trim());
  }

  async canReturn(): Promise<boolean> {
    return (await this.root.getByRole('button', { name: 'Return' }).count()) > 0;
  }

  async canRenew(): Promise<boolean> {
    return (await this.root.getByRole('button', { name: 'Renew' }).count()) > 0;
  }

  async clickReturn(): Promise<void> {
    await this.root.getByRole('button', { name: 'Return' }).click();
  }

  async clickRenew(): Promise<void> {
    await this.root.getByRole('button', { name: 'Renew' }).click();
  }
}
