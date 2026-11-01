# Instructor answer key - planted bugs

**Do not share with students.** 24 defects are planted; each is guarded in code by `bugs.on('<ID>')`
(backend) or `bug()` (frontend), and every one disappears when the server runs with `INJECT_BUGS=0`.
Search the codebase for the ID, e.g. `grep -rn "BOOK-4" backend frontend`.

Requirement references point to `docs/TEST_GUIDE.md`.

## Module 1 - Authentication

| ID | Where | Defect | How to reproduce | Sev |
|---|---|---|---|---|
| AUTH-1 | `routes/auth.js` register | Min password length is 7, not 8 (message still says 8-64) | Register with `abcde1x` -> 201 instead of 400 | Minor |
| AUTH-2 | `routes/auth.js` login | `failed_attempts` not reset on success | Fail 4x, log in OK, fail once more -> 423 lock | Major |
| AUTH-3 | `routes/auth.js` login | Lock only blocks wrong passwords | Lock an account, then log in with the correct password -> 200 | Critical |
| AUTH-4 | `routes/auth.js` google | Deactivated users can sign in with Google | Deactivate a Google user, sign in with Google -> 200 | Major |
| AUTH-5 | `frontend/app.js` logout | Token stays in localStorage; refresh logs user back in | Log out, press F5 | Major |

## Module 2 - Book catalogue

| ID | Where | Defect | How to reproduce | Sev |
|---|---|---|---|---|
| BOOK-1 | `routes/books.js` list | `totalPages` uses floor | 26 books / 8 per page shows 3 pages instead of 4; API with `pageSize=10` returns `totalPages: 2` (should be 3); last page unreachable | Major |
| BOOK-2 | `routes/books.js` list | `%`/`_` in `q` act as wildcards | Search `%` or `_` -> returns everything | Minor |
| BOOK-3 | `routes/books.js` validate | ISBN accepts 10-13 digits | Create book with 11- or 12-digit ISBN -> 201 | Minor |
| BOOK-4 | `routes/books.js` update | `copies_available` reset to new total | Borrow a copy, edit the book (save) -> shows all copies available | Major |
| BOOK-5 | `routes/books.js` list | SQL injection in `category` | `GET /api/books?category=x' OR '1'='1` returns all; `' UNION SELECT ...` can read other tables; stray `'` gives 500 | Critical |
| BOOK-6 | `frontend/app.js` books | Changing category/sort/order/availability keeps current page | Go to page 3, tick "Available only" -> empty page | Minor |

## Module 3 - Borrowing

| ID | Where | Defect | How to reproduce | Sev |
|---|---|---|---|---|
| LOAN-1 | `routes/loans.js` borrow | Off-by-one: 4th active loan allowed | Borrow 4 different books | Major |
| LOAN-2 | `routes/loans.js` calcFine | Fine cap ($20) not applied | Set due date 60 days ago -> fine $30 | Major |
| LOAN-3 | `routes/loans.js` renew | Extends from today, not due date | Renew a loan with 10 days left -> due in 7 days (shorter!) | Major |
| LOAN-4 | `routes/loans.js` return | No ownership check | Member B calls `POST /api/loans/<A's id>/return` -> 200 | Critical |
| LOAN-5 | `routes/loans.js` return | No "already returned" guard | Return the same loan twice -> stock increases twice, fine overwritten | Major |
| LOAN-6 | `frontend/app.js` borrow | Failures show a success toast | Borrow when at the limit / already borrowed: UI says "Book borrowed!" | Major |

## Module 4 - Profile & Admin

| ID | Where | Defect | How to reproduce | Sev |
|---|---|---|---|---|
| PROF-1 | `routes/profile.js` password | New password complexity not enforced | Change to `aaaaaaaa` -> 200 | Minor |
| PROF-2 | `routes/profile.js` delete | Account deletable with active loans; copies never return | Borrow, delete account, check book availability stays reduced | Critical |
| ADM-1 | `middleware.js` | Deactivated user's token still works | Deactivate a signed-in user, they keep using the API | Critical |
| ADM-2 | `routes/admin.js` active | Admin can deactivate themselves | `PATCH /api/admin/users/<own id>/active {active:false}` -> 200 | Major |
| ADM-3 | `routes/admin.js` stats | Overdue stat counts returned loans | Return a late loan; "Overdue loans" does not drop | Major |
| ADM-4 | `routes/admin.js` users | Role filter ignored when `q` is set | Search `a` with role=admin -> members listed | Minor |
| ADM-5 | `frontend/app.js` users table | Stored XSS in user name | Register with name `<img src=x onerror=alert(1)>`, admin opens Users tab | Critical |

## Not planted but worth knowing (design limitations students may report)

- JWTs are stateless: a token still verifies after logout until it expires (the server only rejects deactivated/deleted users).
- No rate limiting beyond per-account lockout; no HTTPS; no CSRF concerns (Bearer tokens, not cookies).
- Mock Google mode (`GOOGLE_MOCK=1`) is an intentional test aid; with it enabled anyone can impersonate any email. Never enable it on a public server.
- Fines are recorded when the book is returned; the list shows a projected fine for open overdue loans.

## Suggested grading rubric (adapt freely)

Test plan & design 20% - test case quality/traceability 25% - bugs found, report quality and severity judgement 25% -
API/automation/security work 15% - summary report & presentation 15%.
Bugs found per module ranges 5-7 so the workload is balanced; modules 3 and 4 hold the most critical ones.
