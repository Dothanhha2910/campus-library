import { test as base, expect } from '@playwright/test';
import { Backend } from '../api/Backend';
import { SEED_ADMIN } from '../config/env';
import { App } from '../pages/App';
import { Arrange, TestUser } from '../support/Arrange';
import { AuthSession } from '../support/AuthSession';

interface Fixtures {
  /** Every page object of the application, bound to the test's browser page. */
  app: App;
  /** REST API objects, for API-level tests and for reading back state. */
  backend: Backend;
  /** Set-up helpers (create users, books, loans through the API). */
  arrange: Arrange;
  /** Starts a browser session for an existing user without using the login form. */
  session: AuthSession;
  /** The seeded administrator, with a ready-made token. */
  seedAdmin: TestUser;
}

export const test = base.extend<Fixtures>({
  // The app links to Google Fonts and the Google sign-in script; tests must not depend on them.
  context: async ({ context }, use) => {
    await context.route(/(fonts\.googleapis\.com|fonts\.gstatic\.com|accounts\.google\.com)/, (route) => route.abort());
    await use(context);
  },

  app: async ({ page }, use) => {
    await use(new App(page));
  },

  backend: async ({ request }, use) => {
    await use(new Backend(request));
  },

  arrange: async ({ backend }, use) => {
    const arrange = new Arrange(backend);
    await use(arrange);
    await arrange.cleanup();
  },

  session: async ({ page }, use) => {
    await use(new AuthSession(page));
  },

  seedAdmin: async ({ arrange }, use) => {
    const token = await arrange.adminToken();
    await use({ ...SEED_ADMIN, id: 1, token });
  },
});

export { expect };
