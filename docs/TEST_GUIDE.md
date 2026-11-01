# Test Guide - Campus Library (SQA Class 10)

The system under test (SUT) is a library app: members browse and borrow books, admins manage
the catalogue and users. Your team of five tests it for one month. **The app contains bugs -
finding and reporting them is the goal.** Everything below is the specification: if the app
behaves differently, that is a defect.

## 1. Team split

| # | Module | Scope | Requirement IDs |
|---|---|---|---|
| 1 | **Authentication** | Register, login, lockout, Google SSO, session, logout | AUTH-xx |
| 2 | **Book catalogue** | List, search, filter, sort, pagination, admin CRUD | BOOK-xx |
| 3 | **Borrowing** | Borrow, return, renew, overdue, fines, loan history | LOAN-xx |
| 4 | **Profile & Admin** | Profile, password change, account deletion, user management, dashboard | PROF-xx, ADM-xx |
| 5 | **Test automation** | Playwright functional regression suite (Page Object Model), 10 end-to-end UI tests, see `e2e/README.md` | all |

Members 1-4 each own their module's test cases, execution and bug reports, and also do **at least
one cross-module review** of a teammate's test cases. Member 5 owns the automated suite in `e2e/`
and reports the defects it finds using the same bug template.

## 2. Requirements & business rules

### Authentication (AUTH)
- **AUTH-01 Register** - name 2-50 chars; valid email (max 100), unique **case-insensitively**;
  password 8-64 chars with at least one letter and one digit. Success returns 201 and logs the user in.
- **AUTH-02 Login** - email + password. Wrong credentials give a generic "Invalid email or password".
  After **5 consecutive failed logins** the account is locked for `LOCK_MINUTES` (default 5; 1 in `.env.example`).
  While locked, login fails with 423 **even with the correct password**. A successful login resets the failure counter.
  Deactivated accounts cannot sign in (403).
- **AUTH-03 Google SSO** - a verified Google email signs in; unknown emails create a new member account;
  an email that already exists is linked to that account. Deactivated accounts cannot sign in.
- **AUTH-04 Session** - API calls need `Authorization: Bearer <JWT>`; tokens expire after 1 hour; `GET /api/auth/me` returns the current user.
- **AUTH-05 Logout** - after logout the user is back on the sign-in page and a refresh must **not** sign them in again.

### Book catalogue (BOOK)
- **BOOK-01 List** - any signed-in user; pages of 8 in the UI (API: `page`, `pageSize` 1-50).
  `totalPages = ceil(total / pageSize)`. Invalid `page`/`pageSize`/`sort`/`order` values return 400.
- **BOOK-02 Search & filter** - `q` matches title, author or ISBN (case-insensitive, **literal text** - `%` and `_` are ordinary characters);
  `category` exact match; `available=true|false`; `sort` = title|author|year|newest; `order` = asc|desc.
  Changing any filter in the UI returns to page 1.
- **BOOK-03 Details** - `GET /api/books/:id`; unknown id gives 404.
- **BOOK-04 Create (admin)** - title <=150, author <=100, category <=50, **ISBN exactly 10 or 13 digits** and unique,
  year 1900..current year, copies 1-100. Members get 403.
- **BOOK-05 Update (admin)** - same validation. Total copies cannot go below the number currently on loan (409).
  Available copies = new total - copies on loan.
- **BOOK-06 Delete (admin)** - blocked (409) while any copy is on loan.

### Borrowing (LOAN)
- **LOAN-01 Borrow** - rules, in this order: book exists (404); copies available (409);
  **max 3 active loans** per member (409); no overdue loan (409); not the same book twice (409).
  Loan period 14 days; available copies decrease by 1. The UI must report failures as errors.
- **LOAN-02 My loans** - filter `status` = all|active|overdue|returned, paginated.
- **LOAN-03 Return** - only the borrower (or an admin). Already-returned loans give 409. Available copies increase by 1.
  Fine = **$0.50 per started overdue day, capped at $20.00**.
- **LOAN-04 Renew** - borrower only; once per loan; not when overdue; extends the **current due date by 7 days**.
- **LOAN-05 Due-date tool (admin)** - `PATCH /api/loans/:id/due-date` moves a due date, so you can simulate overdue loans without waiting.
  (In the UI: Admin -> All loans -> *Set due date*.)
- **LOAN-06 All loans (admin)** - search and status filter.

### Profile (PROF)
- **PROF-01 View** - profile + loan statistics.
- **PROF-02 Update** - name 2-50 chars, optional phone `+?` and 9-15 digits. Email cannot be changed.
- **PROF-03 Change password** - current password must be correct; new password follows the AUTH-01 rule
  (8-64, letter + digit) and must differ from the current one. Google-only accounts cannot change a password.
- **PROF-04 Delete account** - body `{ "confirm": "DELETE" }`; blocked while books are on loan; last admin cannot delete themselves.

### Administration (ADM)
- **ADM-01 Dashboard** - users, books, copies on shelf, active loans, **overdue loans (active loans past due only)**, fines collected, top 5 books.
- **ADM-02 User list** - search by name/email, filter by role and active; **all filters combine**.
- **ADM-03 Role change** - admins cannot change their own role; the last admin cannot be demoted.
- **ADM-04 Activate/deactivate** - admins cannot deactivate themselves. A deactivated user is rejected on **every** API call, even with a still-valid token.
- **ADM-05 Unlock** - clears a lockout caused by failed logins.

## 3. Tips for simulating situations

| Need | How |
|---|---|
| Overdue loan / fines | Borrow a book as a member, then as admin use *Set due date* with a past date |
| Account lockout | Fail login 5 times; use a short `LOCK_MINUTES` or Admin -> Users -> *Unlock* |
| Fresh data | `npm run reset-db`, restart |
| Google users | Mock mode: any email; or real Google with a client ID |
| API testing | Postman / curl / REST Client against `http://localhost:3000/api` (login first, copy the `token`) |

API quick reference: `POST /api/auth/{register,login,google,logout}`, `GET /api/auth/me`,
`GET|POST /api/books`, `GET|PUT|DELETE /api/books/:id`, `GET /api/books/categories`,
`POST /api/loans`, `GET /api/loans/mine`, `POST /api/loans/:id/{return,renew}`,
`GET /api/loans` (admin), `GET|PUT|DELETE /api/profile`, `PUT /api/profile/password`,
`GET /api/admin/{stats,users}`, `PATCH /api/admin/users/:id/{role,active}`, `POST /api/admin/users/:id/unlock`.
Errors look like `{ "error": "...", "fields": { "email": "..." } }`.

## 4. Suggested four-week plan

| Week | Goal | Deliverables |
|---|---|---|
| 1 | Understand the SUT, plan | Test plan (scope, approach, environment, risks, schedule); each member's requirement-to-test-case traceability matrix; test-design techniques chosen (equivalence partitioning, boundary values, decision tables, state transitions) |
| 2 | Design & start executing | Detailed test cases (ID, steps, data, expected result) for your module; first execution round; first bug reports |
| 3 | Execute deeper | API tests (Postman collection), exploratory sessions, security checks (injection, XSS, authorisation), usability / compatibility spot checks on 2+ browsers; optional automation of regression tests (e.g. Playwright / Selenium / pytest + requests) |
| 4 | Report | Bug report review and de-duplication; retest and regression; test summary report (coverage, pass/fail counts, bugs by severity & module, lessons learned); demo |

## 5. Bug report template

```
ID:            BUG-<module>-<n>          Reporter / date:
Title:         short, specific (what is wrong, where)
Module / req:  e.g. LOAN-01
Severity:      Critical | Major | Minor | Trivial      Priority: High | Medium | Low
Environment:   browser + version, OS, URL / API endpoint
Steps:         1. ... 2. ... 3. ...
Expected:      (quote the requirement)
Actual:        (include status code, response body or screenshot)
Evidence:      screenshot / HAR / curl command
```

Ideas for finding more than the obvious: boundary values on every numeric field, repeated and
out-of-order actions, two different users acting on the same book, using someone else's IDs,
leaving fields empty or oversized, special characters (`%`, `_`, `'`, `<`), and refreshing the page
after each action.
