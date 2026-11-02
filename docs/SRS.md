# Software Requirements Specification - Campus Library

Version 1.0

## 1. Introduction

### 1.1 Purpose
This document specifies what **Campus Library** must do. It is the reference the implementation in this
repository is built and reviewed against: a feature is complete when it satisfies the requirements below.

### 1.2 Scope
Campus Library is a web application for a school library. Members search the catalogue and borrow,
renew and return books; administrators maintain the catalogue, users and loans and follow the
library's activity. The repository contains the backend (REST API and database) and the frontend
(single-page application served by the backend). Out of scope: payments, e-mail notifications,
book reservations and any physical-library integration.

### 1.3 Definitions
| Term | Meaning |
|---|---|
| Member | A registered user with role `member` |
| Administrator | A registered user with role `admin` |
| Active loan | A loan that has not been returned |
| Overdue loan | An active loan whose due date has passed |
| Copy | One physical item of a book; a book has *total* and *available* copies |

### 1.4 Overview
Section 2 describes the product and its users, section 3 lists the functional requirements,
section 4 the business rules, section 5 the interfaces and section 6 the constraints.

## 2. Overall description

### 2.1 Users
| Role | Capabilities |
|---|---|
| Visitor (signed out) | Register, sign in (password or Google) |
| Member | Everything a visitor can do after signing in, plus: browse the catalogue, borrow, renew and return books, view own loans, manage own profile |
| Administrator | Everything a member can do, plus: manage books, view and manage all loans, manage users, view the dashboard |

### 2.2 Environment and assumptions
- Runs on Node.js 22.13 or newer; data is stored in a local SQLite database.
- The frontend is a browser application without a build step, served by the backend.
- A seed data set (an administrator, a member and 26 books, one of them with no copies) is provided.
- Google sign-in uses Google Identity Services; a mock mode exists for local development.

## 3. Functional requirements

Requirement IDs are stable and referenced from the code and other documents.

### 3.1 Authentication (AUTH)
| ID | Requirement |
|---|---|
| AUTH-01 | **Register.** A visitor registers with name (2-50 characters), a valid e-mail (at most 100 characters, unique regardless of letter case) and a password (8-64 characters, at least one letter and one digit). On success the account is created with role member, the API answers 201 and the user is signed in. Field errors are reported per field. |
| AUTH-02 | **Login.** E-mail and password sign the user in. Wrong credentials give the generic message "Invalid email or password". After 5 consecutive failed logins the account is locked for `LOCK_MINUTES` (default 5); while locked, login fails with 423 even with the correct password. A successful login resets the failure counter. Deactivated accounts cannot sign in (403). |
| AUTH-03 | **Google single sign-on.** A verified Google e-mail signs the user in. An unknown e-mail creates a new member account; an e-mail that already has an account is linked to it. Deactivated accounts cannot sign in. |
| AUTH-04 | **Session.** API calls (except register, login and Google sign-in) require `Authorization: Bearer <JWT>`. Tokens expire after 1 hour. `GET /api/auth/me` returns the current user. Pages other than the sign-in screen are not shown to signed-out users. |
| AUTH-05 | **Logout.** After logout the user is on the sign-in screen, the stored session is removed, and refreshing the page does not sign the user in again. |

### 3.2 Book catalogue (BOOK)
| ID | Requirement |
|---|---|
| BOOK-01 | **List.** Any signed-in user can list books. The UI shows 8 books per page; the API takes `page` and `pageSize` (1-50). `totalPages = ceil(total / pageSize)`. Invalid `page`, `pageSize`, `sort` or `order` values are rejected with 400. |
| BOOK-02 | **Search and filter.** `q` matches title, author or ISBN, case-insensitively, as literal text (`%` and `_` are ordinary characters). `category` is an exact match, `available=true\|false` filters by copy availability, `sort` is one of title, author, year, newest and `order` is asc or desc. Changing any filter in the UI returns to page 1. |
| BOOK-03 | **Details.** `GET /api/books/:id` returns one book; an unknown id gives 404. |
| BOOK-04 | **Create (admin).** Title at most 150 characters, author at most 100, category at most 50, ISBN exactly 10 or 13 digits and unique, year from 1900 to the current year, total copies 1-100. Members receive 403. |
| BOOK-05 | **Update (admin).** Same validation as BOOK-04. Total copies cannot be set below the number currently on loan (409). Available copies = new total - copies on loan. |
| BOOK-06 | **Delete (admin).** Refused with 409 while any copy is on loan; the UI asks for confirmation first. |

### 3.3 Borrowing (LOAN)
| ID | Requirement |
|---|---|
| LOAN-01 | **Borrow.** Checks are made in this order: the book exists (404); a copy is available (409); the member has fewer than 3 active loans (409); the member has no overdue loan (409); the member does not already hold this book (409). The loan period is 14 days and the available copies decrease by 1. The UI reports every refusal as an error. |
| LOAN-02 | **My loans.** A member lists their own loans, filtered by status (all, active, overdue, returned), 6 per page. Each loan shows book, status, borrowed, due and returned dates and the fine accrued. |
| LOAN-03 | **Return.** Only the borrower or an administrator can return a loan. An already returned loan gives 409. Available copies increase by 1. The fine is $0.50 per started overdue day, capped at $20.00, and is stored with the loan. |
| LOAN-04 | **Renew.** Only the borrower can renew; once per loan; not when the loan is overdue. The current due date moves 7 days later. |
| LOAN-05 | **Set due date (admin).** `PATCH /api/loans/:id/due-date` moves a loan's due date (UI: Admin, All loans, *Set due date*); an empty or invalid date is rejected. |
| LOAN-06 | **All loans (admin).** Administrators list every loan, 8 per page, with search (book title, member name or e-mail) and a status filter. |

### 3.4 Profile (PROF)
| ID | Requirement |
|---|---|
| PROF-01 | **View.** A user sees name, e-mail, role, whether a Google account is linked, and loan statistics: total loans, active loans and fines paid. |
| PROF-02 | **Update.** Name 2-50 characters; phone optional, an optional `+` followed by 9-15 digits. The e-mail address cannot be changed. |
| PROF-03 | **Change password.** The current password must be correct; the new password follows the AUTH-01 rule and must differ from the current one. Accounts that only use Google have no password and cannot change it. |
| PROF-04 | **Delete account.** Requires the confirmation text `DELETE` (`{ "confirm": "DELETE" }`). Refused while the user has books on loan. The last administrator cannot delete their own account. |

### 3.5 Administration (ADM)
| ID | Requirement |
|---|---|
| ADM-01 | **Dashboard.** Shows the number of users, books, copies on the shelf, active loans, overdue loans (active loans past their due date only), fines collected and the five most borrowed books. |
| ADM-02 | **User list.** Administrators list users, 8 per page, with search by name or e-mail and filters by role and active status; all filters combine. Each row shows role, status and sign-in method. |
| ADM-03 | **Role change.** An administrator can promote a member or demote an administrator. Administrators cannot change their own role and the last administrator cannot be demoted. |
| ADM-04 | **Activate / deactivate.** Administrators can deactivate and reactivate users but not themselves. A deactivated user is rejected on every API call, even with a still-valid token. |
| ADM-05 | **Unlock.** An administrator can clear a lockout caused by failed logins. |

## 4. Business rules summary
| Rule | Value |
|---|---|
| Loan period | 14 days |
| Renewals | 1 per loan, +7 days, not when overdue |
| Active loans per member | 3 |
| Fine | $0.50 per started overdue day, maximum $20.00 per loan |
| Failed logins before lock | 5 (lock lasts `LOCK_MINUTES`) |
| Token lifetime | 1 hour |
| Page sizes | Books 8, my loans 6, users 8, all loans 8 |
| Roles | `member`, `admin`; at least one active administrator must always remain |

## 5. Interface requirements

### 5.1 User interface
- Single-page application with sections Books, My Loans, Profile and (administrators only) Admin with tabs Dashboard, Users and All loans.
- Actions give feedback as toast messages (success, error, information); forms show errors next to the field.
- Destructive actions (delete book, delete account) ask for confirmation.
- Light and dark themes; the choice is remembered.
- The sign-in screen offers e-mail/password, Google sign-in and quick-fill buttons for the sample accounts.

### 5.2 REST API
JSON over HTTP under `/api`. Errors are `{ "error": "...", "fields": { "<field>": "..." } }`.

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/{register,login,google,logout}`, `GET /api/auth/me` |
| Books | `GET /api/books`, `POST /api/books`, `GET /api/books/categories`, `GET\|PUT\|DELETE /api/books/:id` |
| Loans | `POST /api/loans`, `GET /api/loans/mine`, `POST /api/loans/:id/{return,renew}`, `GET /api/loans` (admin), `PATCH /api/loans/:id/due-date` (admin) |
| Profile | `GET\|PUT\|DELETE /api/profile`, `PUT /api/profile/password` |
| Admin | `GET /api/admin/{stats,users}`, `PATCH /api/admin/users/:id/{role,active}`, `POST /api/admin/users/:id/unlock` |
| System | `GET /api/health` |

Status codes: 200/201 success, 400 invalid input, 401 not authenticated, 403 not allowed or deactivated,
404 not found, 409 conflicting state, 423 account locked.

### 5.3 Configuration
`PORT`, `JWT_SECRET`, `LOCK_MINUTES`, `GOOGLE_CLIENT_ID`, `GOOGLE_MOCK` (see `README.md`).

## 6. Constraints and quality attributes
- Passwords are stored only as salted hashes; the API never returns them.
- Database queries use bound parameters.
- Authorisation is enforced on the server for every endpoint, not only hidden in the UI.
- Dates are stored in UTC.
- The application targets a single-machine deployment and is not intended for production use as it stands.

## 7. Traceability
| Area | IDs | Code |
|---|---|---|
| Authentication | AUTH-01 .. 05 | `backend/src/routes/auth.js`, `middleware.js`, `frontend/app.js` |
| Book catalogue | BOOK-01 .. 06 | `backend/src/routes/books.js`, `frontend/app.js` |
| Borrowing | LOAN-01 .. 06 | `backend/src/routes/loans.js`, `frontend/app.js` |
| Profile | PROF-01 .. 04 | `backend/src/routes/profile.js`, `frontend/app.js` |
| Administration | ADM-01 .. 05 | `backend/src/routes/admin.js`, `frontend/app.js` |
