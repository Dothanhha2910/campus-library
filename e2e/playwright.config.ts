import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const BACKEND_DIR = path.resolve(__dirname, '../backend');

const MAIN = { port: 3100, db: path.resolve(__dirname, '.tmp/e2e.db') };
const serverEnv = (server: { port: number; db: string }) => ({
  PORT: String(server.port),
  DB_PATH: server.db,
  GOOGLE_MOCK: '1',
  GOOGLE_CLIENT_ID: '',
  LOCK_MINUTES: '1',
  JWT_SECRET: 'e2e-secret',
});

export default defineConfig({
  testDir: './tests',
  // Tests share one server and database, so they run one at a time. Every test creates its own
  // users/books (unique names), so tests do not depend on each other or on execution order.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    // The app prints dates in the browser's locale/time zone; pin them so assertions are stable.
    locale: 'en-GB',
    timezoneId: 'UTC',
    actionTimeout: 10_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${MAIN.port}` },
    },
  ],
  webServer: {
    // Fresh seed data on every run, then the real backend (which also serves the frontend).
    command: 'node src/resetDb.js && node src/server.js',
    cwd: BACKEND_DIR,
    url: `http://localhost:${MAIN.port}/api/health`,
    reuseExistingServer: false,
    timeout: 30_000,
    env: serverEnv(MAIN),
  },
});
