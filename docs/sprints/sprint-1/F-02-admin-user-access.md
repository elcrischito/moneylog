# F-02 Administrator user access — Feature contract

| | |
|---|---|
| Requirements | FR-04, FR-05, BR-02, BR-03, BR-04 |
| Depends on | F-01 |
| Version | 1.0 (14 Nov 2026), written before implementation |

## Behaviour and workflow
1. The administrator signs in and lands on **Users**. The table shows the name, e-mail, role, status (Enabled/Disabled) and an *Enable* or *Disable* button.
2. *Disable* calls `PATCH /api/admin/users/:id` with `{ "isActive": false }`. The row updates. All sessions of that user are revoked at once (BR-03).
3. *Enable* sets `isActive: true`, and the user can sign in again.
4. The administrator has **no** financial screens. Every financial API answers `403 FORBIDDEN` for the ADMIN role (BR-02).

## Rules, validation, failure and boundary cases
- `isActive` must be a boolean. Anything else gives `400 VALIDATION_ERROR`.
- An administrator cannot disable themselves, and the last enabled administrator cannot be disabled: `400 CANNOT_DISABLE_ADMIN` (BR-04).
- An unknown user id gives `404 NOT_FOUND`.
- The user list never includes financial data or password hashes.

## Permissions
`/api/admin/*` is ADMIN only (USER gets `403`). All financial routes are USER only (ADMIN gets `403`).

## API
| Endpoint | Request | Success | Errors |
|---|---|---|---|
| `GET /api/admin/users` | — | `200 { "users": [ { "id", "email", "fullName", "role", "isActive", "createdAt" } ] }` sorted by name | 401, 403 |
| `PATCH /api/admin/users/:id` | `{ "isActive": false }` | `200 { "user": { … } }` | 400 VALIDATION_ERROR, 400 CANNOT_DISABLE_ADMIN, 401, 403, 404 |

## Data
No new table. It uses `User.isActive` and revokes `Session` rows (`revokedAt = now`).

## UI
Users page: a table that becomes cards below 600 px. The button is disabled while saving. An error appears above the table.

## Acceptance criteria
| AC | Given / When / Then |
|---|---|
| AC-02-1 | Given the admin, when listing users, then all users appear with id, e-mail, name, role and status, and no financial or password field. |
| AC-02-2 | When the admin disables Bob, Bob cannot sign in. When the admin enables him again, he can. |
| AC-02-3 | Given Bob is signed in, when the admin disables Bob, then Bob's next request gets `401`. |
| AC-02-4 | The admin gets `403` on `/api/accounts`, `/api/transactions` (GET/POST), `/api/transactions/:id`, `/api/summary` and the opening-balance route. A USER gets `403` on `/api/admin/users`. |
| AC-02-5 | The admin disabling their own account gets `400 CANNOT_DISABLE_ADMIN`, and nothing changes. |

## Software Test Specification
| Test | Level | AC | Input / precondition | Expected |
|---|---|---|---|---|
| TEST-API-10 | API+DB | AC-02-1 | admin token, GET users | 200, contains alice/bob/dan, no `passwordHash`, no `accounts` |
| TEST-API-11 | API+DB | AC-02-2 | disable a temp user → login → enable → login | 401 then 200 |
| TEST-API-12 | API+DB | AC-02-3 | temp user logged in, then disabled | their `/me` → 401 |
| TEST-API-13 | API+DB | AC-02-4 | admin token on each financial route; alice token on admin route | 403 FORBIDDEN, no data |
| TEST-API-14 | API+DB | AC-02-5 | admin PATCH self `isActive:false` | 400 CANNOT_DISABLE_ADMIN; admin still active |
| TEST-UI-03 | UI component | AC-02-4 | header rendered for ADMIN and USER | admin sees only *Users*; user sees financial links |
| TEST-E2E-02 | E2E | AC-02-2, AC-02-4 | browser as admin | disable bob → bob sign-in fails → admin `GET /api/accounts` = 403 → enable bob |

## Revision history
| Version | Date | Change |
|---|---|---|
| 1.0 | 14 Nov 2026 | First contract (before implementation) |
