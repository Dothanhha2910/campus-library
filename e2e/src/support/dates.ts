export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;

/** Midnight (UTC) of the day containing the given instant. */
export function utcDay(value: Date | string): Date {
  const d = new Date(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function addDays(value: Date | string, days: number): Date {
  return new Date(new Date(value).getTime() + days * DAY);
}

/** ISO timestamp `ms` milliseconds before now. */
export function isoAgo(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

/** YYYY-MM-DD, the format of an <input type="date">. */
export function toDateInputValue(value: Date | string): string {
  return new Date(value).toISOString().slice(0, 10);
}

/** Fine rule from the spec: $0.50 per *started* overdue day, capped at $20.00. */
export function expectedFine(lateMs: number, perDay = 0.5, cap = 20): number {
  if (lateMs <= 0) return 0;
  return Math.min(Math.ceil(lateMs / DAY) * perDay, cap);
}
