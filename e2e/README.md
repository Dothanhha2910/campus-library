# Campus Library - automated functional tests

Playwright (TypeScript) suite that checks the **functionality** of Campus Library against the
requirements in [`docs/TEST_GUIDE.md`](../docs/TEST_GUIDE.md) (AUTH, BOOK, LOAN, ADM).
Non-functional testing (performance, security, compatibility) is out of scope.
The suite is written strictly with the **Page Object Model** (see [POM rules](#pom-rules)).

## Run it

```bash
cd e2e
npm install
npx playwright install chromium     # first time only
npm test                            # POM check + all tests
npm run test:headed                 # watch the browser
npm run test:ui                     # Playwright UI mode
npx playwright test tests/loans     # one spec folder
npx playwright test -g "LOAN-03"    # tests whose title matches
npm run report                      # open the HTML report of the last run
```

Playwright starts the backend itself (`playwright.config.ts`): port **3100**, its own SQLite file
in `e2e/.tmp/`, freshly seeded on every run, Google mock mode on. Your own data in `backend/data/`
is never touched and you do not need to start the app first.

**A failing test means the application does not behave as the specification says.**
Test titles and assertions follow `TEST_GUIDE.md`; investigate a failure, and if the test is right, report the defect.

## Layout

```
e2e/
├── playwright.config.ts        server, browser settings
├── scripts/check-pom.mjs       enforces the POM rules (runs before `npm test`)
├── src/
│   ├── pages/                  PAGE OBJECTS - the only place that knows the HTML
│   │   ├── BasePage.ts, AuthPage.ts           shared behaviour
│   │   ├── LoginPage / RegisterPage / BooksPage / LoansPage / ProfilePage
│   │   ├── admin/AdminDashboardPage / AdminUsersPage / AdminLoansPage
│   │   ├── components/         reusable UI parts (toast, dialogs, pager, top bar, rows, cards)
│   │   ├── support/            waiting + parsing helpers used by page objects
│   │   └── App.ts              registry: every page object of one browser page
│   ├── api/                    API objects used only to SET UP data (Backend facade)
│   ├── support/                test data builders, Arrange (set-up through the API), AuthSession
│   ├── fixtures/index.ts       Playwright fixtures: app, backend, arrange, session, seedAdmin
│   └── config/env.ts           seed accounts and business-rule constants from the spec
└── tests/                      SPECS - 10 end-to-end UI tests, behaviour only
```

The suite is deliberately small: 10 UI end-to-end tests, one per key requirement, no API tests.

| Test | Spec |
|---|---|
| AUTH-01 register and get signed in | `tests/auth/auth.spec.ts` |
| AUTH-02 locked account refused with the right password | `tests/auth/auth.spec.ts` |
| AUTH-03 Google SSO creates a new member | `tests/auth/auth.spec.ts` |
| AUTH-05 refresh after logout stays signed out | `tests/auth/auth.spec.ts` |
| BOOK-02 search by title, case-insensitive | `tests/catalogue/catalogue.spec.ts` |
| BOOK-04 admin adds a book | `tests/catalogue/catalogue.spec.ts` |
| LOAN-01 borrow a book (14-day loan) | `tests/loans/loans.spec.ts` |
| LOAN-03 return an overdue loan, fine per started day | `tests/loans/loans.spec.ts` |
| LOAN-04 renew extends due date by 7 days | `tests/loans/loans.spec.ts` |
| ADM-01 overdue loan is counted on the dashboard | `tests/admin/users.spec.ts` |
| ADM-04 deactivated user cannot sign in | `tests/admin/users.spec.ts` |

## POM rules

`npm run check:pom` (part of `npm test`) fails the build when one of these is broken.

1. **Specs contain no selectors.** No `locator()`, `getByRole()`, CSS, XPath, and no raw Playwright
   `page`. A spec talks to page objects only, reached through the `app` fixture.
2. **All locators live in page objects**, as private members. Their public methods are things a
   user does (`books.search(...)`, `loans.renew(...)`) or reads (`getFieldError(...)`).
3. **Page objects never assert.** They return values (strings, numbers, dates, small objects) and
   specs run `expect` on them. Page objects only *wait* for conditions, never for fixed times.
4. **Page objects do not depend on each other.** Shared parts are components (`components/`) or base
   classes; the `App` registry is the one place that creates every page object.
5. **Repeated UI parts are components**: toast, dialogs, pager, top bar, a book tile, a loan row.
6. **Set-up goes through the API, not through the UI** (`arrange`, `backend`, `session`), so a test
   exercises exactly the behaviour in its title. Specs never assert on set-up steps.

Page-object methods that submit something return what the user would see next: the toast that was
raised (`{ type, text }`) or `null` when the form stayed open with validation errors. That lets one
spec check both outcomes with the same method.

## Writing a new test

```ts
import { expect, test } from '../../src/fixtures';

test('renewing extends the due date by 7 days', async ({ app, arrange, session }) => {
  const member = await arrange.member();                 // set-up via API
  const book = await arrange.book();
  const loan = await arrange.loan(member, book);
  await session.signInAs(member);                        // start a browser session

  await app.loans.open();                                // act through page objects
  const toast = await app.loans.renew(book.title);

  expect(toast.text).toBe('Loan renewed');               // assert in the spec
});
```

If the page you need is missing, add a page object (or a method) under `src/pages` - never a
selector in the spec.

## Test data and isolation

The tests share one server and database and run one after another (`workers: 1`), but they are
independent of each other and of their order:

- every test creates its own users and books with unique names (`uid()`), never the seeded ones
  (except read-only checks of the seed data);
- catalogue tests create books that share a unique token and search for it, so other books in the
  database do not matter;
- dashboard tests compare numbers *before and after* a change instead of absolute values;
- admins created for a test are demoted again in fixture teardown, so "last admin" rules stay testable.

Loans become overdue through the admin due-date endpoint (`arrange.overdueLoan`), so no test waits
for real time to pass.

## Debugging a failure

- `npx playwright test <file> --headed` to watch it, or `--debug` to step through.
- Failed tests keep a screenshot and a trace: `npx playwright show-trace test-results/<test>/trace.zip`.
- The HTML report (`npm run report`) shows each step with screenshots.
