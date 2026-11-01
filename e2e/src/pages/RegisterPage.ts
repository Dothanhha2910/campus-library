import type { Page } from '@playwright/test';
import { AuthPage } from './AuthPage';
import type { ToastMessage } from './components/ToastComponent';

export interface Registration {
  name: string;
  email: string;
  password: string;
}

/** The "Register" tab. */
export class RegisterPage extends AuthPage {
  constructor(page: Page) {
    super(page, '/api/auth/register');
  }

  async open(): Promise<void> {
    await this.page.goto('/#/register');
    await this.card.getByRole('heading', { name: 'Create your account' }).waitFor();
  }

  async fillForm(values: Partial<Registration>): Promise<void> {
    if (values.name !== undefined) await this.form.getByLabel('Full name').fill(values.name);
    if (values.email !== undefined) await this.form.getByLabel('Email').fill(values.email);
    if (values.password !== undefined) await this.form.getByLabel('Password').fill(values.password);
  }

  /** Fills the form and presses "Create account". Returns the toast of a successful registration. */
  async register(values: Partial<Registration>): Promise<ToastMessage | null> {
    await this.fillForm(values);
    return this.submitForm();
  }

  /** Fills the form and submits it with the Enter key. */
  async registerWithEnter(values: Registration): Promise<ToastMessage | null> {
    await this.fillForm(values);
    return this.submitWithEnter(this.form.getByLabel('Password'));
  }

  /** Presses "Create account" twice in quick succession (double click). */
  async doubleClickSubmit(): Promise<void> {
    await this.submitButton.dblclick();
  }

  async switchToSignIn(): Promise<void> {
    await this.card.locator('.seg').getByRole('button', { name: 'Sign in' }).click();
    await this.card.getByRole('heading', { name: 'Welcome back' }).waitFor();
  }
}
