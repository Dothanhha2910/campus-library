import type { Page } from '@playwright/test';
import { AuthPage } from './AuthPage';
import type { ToastMessage } from './components/ToastComponent';

export interface Credentials {
  email: string;
  password: string;
}

/** The "Sign in" tab. */
export class LoginPage extends AuthPage {
  constructor(page: Page) {
    super(page, '/api/auth/login');
  }

  async open(): Promise<void> {
    await this.page.goto('/#/login');
    await this.card.getByRole('heading', { name: 'Welcome back' }).waitFor();
  }

  /** Opens a protected route (for example "#/books") without a session; the sign-in screen must appear. */
  async openProtectedRoute(route: string): Promise<void> {
    await this.page.goto(`/${route}`);
    await this.waitUntilDisplayed();
  }

  async fillCredentials(credentials: Partial<Credentials>): Promise<void> {
    if (credentials.email !== undefined) await this.form.getByLabel('Email').fill(credentials.email);
    if (credentials.password !== undefined) await this.form.getByLabel('Password').fill(credentials.password);
  }

  /** Fills the form and presses "Sign in". Returns the toast of a successful sign-in (null on failure). */
  async signIn(credentials: Partial<Credentials>): Promise<ToastMessage | null> {
    await this.fillCredentials(credentials);
    return this.submitForm();
  }

  /** Fills the form and submits it with the Enter key. */
  async signInWithEnter(credentials: Credentials): Promise<ToastMessage | null> {
    await this.fillCredentials(credentials);
    return this.submitWithEnter(this.form.getByLabel('Password'));
  }

  /** Several failed attempts in a row, as used by the lockout rule. */
  async failSignInTimes(email: string, wrongPassword: string, times: number): Promise<void> {
    for (let i = 0; i < times; i += 1) await this.signIn({ email, password: wrongPassword });
  }

  async useDemoAccount(kind: 'Admin' | 'Member'): Promise<void> {
    await this.page.locator('.chip-btn', { hasText: kind }).click();
  }

  async getEmailValue(): Promise<string> {
    return this.form.getByLabel('Email').inputValue();
  }

  async getPasswordValue(): Promise<string> {
    return this.form.getByLabel('Password').inputValue();
  }

  async switchToRegister(): Promise<void> {
    await this.card.locator('.seg').getByRole('button', { name: 'Register' }).click();
    await this.card.getByRole('heading', { name: 'Create your account' }).waitFor();
  }
}
