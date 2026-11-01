const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** "05 Nov 2026" (as printed by the app) -> midnight UTC of that day. The browser runs in UTC. */
export function parseDisplayedDate(text: string): Date {
  const match = /(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\.?\s+(\d{4})/.exec(text);
  if (!match) throw new Error(`Cannot parse date "${text}"`);
  const month = MONTHS.indexOf(match[2].toLowerCase());
  if (month < 0) throw new Error(`Unknown month in "${text}"`);
  return new Date(Date.UTC(Number(match[3]), month, Number(match[1])));
}

/** "$1.50" -> 1.5 */
export function parseMoney(text: string): number {
  const match = /\$\s*(-?\d+(?:\.\d+)?)/.exec(text);
  if (!match) throw new Error(`Cannot parse amount "${text}"`);
  return Number(match[1]);
}
