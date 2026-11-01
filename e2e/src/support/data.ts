import { DEFAULT_PASSWORD } from '../config/env';

let counter = 0;

/** Short unique token made of letters and digits only (safe inside names, titles, e-mails). */
export function uid(prefix = 'x'): string {
  counter += 1;
  const rand = Math.random().toString(36).slice(2, 5);
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}${rand}`;
}

function digits(length: number): string {
  counter += 1;
  const stamp = String(Date.now()).slice(-8) + String(counter).padStart(4, '0') + Math.floor(Math.random() * 1e6);
  return stamp.padStart(length, '0').slice(-length);
}

export const isbn13 = (): string => '9' + digits(12);

/** A unique string of exactly `length` digits (used for ISBNs that must be rejected). */
export const isbnOfLength = (length: number): string => '6' + digits(length - 1);
export const isbn10 = (): string => '8' + digits(9);

export interface UserInput {
  name: string;
  email: string;
  password: string;
}

export interface BookInput {
  title: string;
  author: string;
  category: string;
  isbn: string;
  year: number;
  copiesTotal: number;
}

/** A user who is known to be valid according to AUTH-01. */
export function newUserData(overrides: Partial<UserInput> = {}): UserInput {
  const token = uid('u');
  return {
    name: `Tester ${token}`,
    email: `${token}@example.com`,
    password: DEFAULT_PASSWORD,
    ...overrides,
  };
}

/** A book that is known to be valid according to BOOK-04. Title and author contain a unique token. */
export function newBookData(overrides: Partial<BookInput> = {}): BookInput {
  const token = uid('Bk');
  return {
    title: `${token} Title`,
    author: `${token} Author`,
    category: `${token} Category`,
    isbn: isbn13(),
    year: 2015,
    copiesTotal: 3,
    ...overrides,
  };
}

export const repeat = (char: string, times: number): string => char.repeat(times);

/** A unique e-mail address with exactly `length` characters. */
export function emailOfLength(length: number): string {
  const suffix = '@example.com';
  const local = (uid('e') + 'a'.repeat(length)).slice(0, length - suffix.length);
  return `${local}${suffix}`;
}

export const currentYear = (): number => new Date().getUTCFullYear();
