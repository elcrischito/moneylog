# F-17 Account administration and own password — Feature contract

| | |
|---|---|
| Requirements | FR-06, FR-22, BR-02, BR-03, NFR-01, NFR-03 |
| Depends on | F-01 (sign-in, sessions), F-02 (admin user access) |
| Version | 1.0 (28 Nov 2026), written before implementation (Issue #67) |

The Administrator creates user accounts and resets a user's password; every user can change their own password. Passwords are only ever stored as bcrypt hashes (NFR-01).

## Behaviour and workflow
1. **Users** page (admin) gets **Create user**: full name, e-mail, initial password → `POST /api/admin/users`. The new USER gets the 11 starter accounts (as the seed) and appears in the list, enabled.
2. Each user row gets **Reset password** → `POST /api/admin/users/:id/password { password }`. All the user's sessions are revoked (they must sign in again).
3. Top bar **Change password** (users and admin) → `/password` page: current password, new password, confirm → `POST /api/auth/password { currentPassword, newPassword }`. On success, every **other** session of the user is revoked; the current one stays.

## Rules, validation, boundaries
| Code | Rule | HTTP |
|---|---|---|
| `VALIDATION_ERROR` | e-mail: valid format, ≤ 254, stored lower-case; full name trimmed 1–100 | 400 |
| `WEAK_PASSWORD` | password 10–72 characters (bcrypt limit), at least one letter and one digit; 9 refused, 10 accepted, 73 refused | 400 |
| `EMAIL_TAKEN` | e-mail unique, case-insensitive | 409 |
| `INVALID_CURRENT_PASSWORD` | change own password: current password wrong | 400 (not 401: the session stays valid) |
| `SAME_PASSWORD` | new password equal to the current one | 400 |
| `NOT_FOUND` | reset for an unknown user id | 404 |
| `FORBIDDEN` | admin routes for a USER; an admin cannot reset another **admin**'s password | 403 |

- Hashes: bcrypt cost ≥ 10; no response ever contains `passwordHash` (NFR-01).
- The created user is always role USER (no admin creation through the API).

## Permissions
Create / reset: ADMIN only. Change own password: any signed-in user.

## API
- `POST /api/admin/users` `{ email, fullName, password }` → `201 { user: <PublicUser> }`
- `POST /api/admin/users/:id/password` `{ password }` → `204`
- `POST /api/auth/password` `{ currentPassword, newPassword }` → `204`

## Data
No migration (User and Session tables exist). Starter accounts reuse `prisma/starter-accounts.ts`.

## Acceptance criteria
- **AC-17-1** The admin creates "Chai Test" with a valid password → 201, role USER, enabled, 11 starter accounts; Chai can sign in and sees balances 0.00.
- **AC-17-2** Weak passwords (9 chars, no digit, 73 chars), bad e-mail and an existing e-mail in another case are refused with the codes above; nothing is created.
- **AC-17-3** After a reset, Bob's old sessions get 401, the old password fails, the new one works.
- **AC-17-4** Changing own password with the wrong current password → 400 `INVALID_CURRENT_PASSWORD`, nothing changes. With the right one → 204; the current session still works, another session of the same user gets 401; the new password signs in.
- **AC-17-5** A USER calling the admin routes → 403; no response contains `passwordHash`.
- **AC-17-6** An admin cannot reset another admin's password (403).

## Tests (STS)
| Test ID | Level | AC | Input | Expected |
|---|---|---|---|---|
| TEST-UNIT-27 | unit (`checkPassword`, `validateNewUser`) | AC-17-2 | lengths 9/10/72/73, letter/digit mix, e-mails | accepted / codes |
| TEST-API-150 | API + DB | AC-17-1 | admin creates Chai; Chai signs in; GET /api/accounts | 201; 200; 11 accounts at 0.00 |
| TEST-API-151 | API + DB | AC-17-2 | invalid bodies; duplicate e-mail other case | 400 / 409; user count unchanged |
| TEST-API-152 | API + DB | AC-17-3 | reset Bob; old token; old/new password | 401; 401 login; 200 login |
| TEST-API-153 | API + DB | AC-17-4 | wrong current; right current with 2 sessions | 400; 204, current 200, other 401 |
| TEST-API-154 | API + DB | AC-17-5, AC-17-6 | USER on admin routes; admin resets admin; scan bodies | 403; 403; no `passwordHash` |
| TEST-UI-18 | component | AC-17-4 | Change password form: mismatch confirm, server 400 | client message; `role="alert"` |

## Definition of Done
Sprint 1 product DoD, every test above executed on the release commit.

## Revision history
| Version | Date | Change |
|---|---|---|
| 1.0 | 28 Nov 2026 | First contract, before implementation |
