# F-01 Authentication and sessions — Feature contract

| | |
|---|---|
| Requirements | FR-01, FR-02, FR-03, BR-03, NFR-01, NFR-02, NFR-03 |
| Depends on | — (foundation) |
| Version | 1.0 (14 Nov 2026), written before implementation |

## Behaviour and workflow
1. A visitor opens the app and sees **Sign in**: e-mail, password, *Sign in* button.
2. On submit, the client calls `POST /api/auth/login`. On success it stores the token in `sessionStorage` and loads the home page for the role: Dashboard for USER, Users for ADMIN. The header shows the full name and role taken from the server.
3. Every API call sends `Authorization: Bearer <token>`. When any response is `401`, the client clears the token and returns to Sign in.
4. *Sign out* calls `POST /api/auth/logout`, clears the token and shows Sign in.

## Rules, validation, failure and boundary cases
- E-mail and password are required (client and server). A missing field gives `400 VALIDATION_ERROR`.
- An unknown e-mail, a wrong password or a disabled user (BR-03) all give the **same** `401 INVALID_CREDENTIALS` with the message "Invalid e-mail or password." This avoids revealing which accounts exist.
- E-mail matching is case-insensitive (it is stored lower-case).
- Session token: 32 random bytes as hex. The DB stores only its SHA-256 hash. TTL = `SESSION_TTL_HOURS` (default 8).
- Each request is rejected with `401 UNAUTHENTICATED` when the token is missing, malformed, unknown, revoked or expired, or when its user is disabled.

## Permissions
`login` is public. `logout` and `me` need any valid session.

## API
| Endpoint | Request | Success | Errors |
|---|---|---|---|
| `POST /api/auth/login` | `{ "email": "alice@moneylog.test", "password": "…" }` | `200 { "token": "<64 hex>", "user": { "id", "email", "fullName", "role" } }` | `400 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS` |
| `POST /api/auth/logout` | — | `204` | `401 UNAUTHENTICATED` |
| `GET /api/auth/me` | — | `200 { "user": { "id", "email", "fullName", "role" } }` | `401 UNAUTHENTICATED` |

## Data
New tables `User` and `Session` (migration `init`); see the System SDS, Section 2. The seed creates the admin and users with bcrypt hashes (cost 10).

## UI
Sign in page: labelled inputs, error under the form (`role="alert"`), button disabled while signing in. Header: name, role, *Sign out*.

## Acceptance criteria
| AC | Given / When / Then |
|---|---|
| AC-01-1 | Given a seeded enabled user, when they sign in with the right password, then they receive a session and see their name and role. |
| AC-01-2 | Given a wrong password or an unknown e-mail, when signing in, then `401 INVALID_CREDENTIALS` with the same message, and no token. |
| AC-01-3 | Given a valid session, `GET /api/auth/me` returns the id, e-mail, name and role of that session's user. |
| AC-01-4 | Given a signed-in user, when they sign out, then later requests with the same token get `401`. |
| AC-01-5 | Given a disabled user, when signing in with the right password, then `401 INVALID_CREDENTIALS`. |
| AC-01-6 | No API response contains `passwordHash` or a password. |
| AC-01-7 | Every protected endpoint called without a token or with a forged token answers `401` with no private data. |
| AC-01-8 | A session past its expiry time answers `401`. |

## Software Test Specification
| Test | Level | AC | Input / precondition | Expected |
|---|---|---|---|---|
| TEST-API-01 | API+DB | AC-01-1, AC-01-3 | alice + correct password, then `GET /me` | 200 token (64 hex) + user role USER; `/me` returns alice |
| TEST-API-02 | API+DB | AC-01-2 | alice + wrong password; unknown@… | both 401, identical error body, no token |
| TEST-API-03 | API+DB | AC-01-3 | admin token → `/me` | role ADMIN |
| TEST-API-04 | API+DB | AC-01-4 | login → logout → `/me` with old token | 204 then 401 |
| TEST-API-05 | API+DB | AC-01-5 | disabled seeded user dan | 401 INVALID_CREDENTIALS |
| TEST-API-06 | API+DB | AC-01-6 | login, `/me`, admin users list | no `passwordHash` key anywhere in the JSON |
| TEST-API-07 | API+DB | AC-01-7 | no token and `Bearer forged` on `/me`, `/accounts`, `/transactions`, `/summary`, `/admin/users` | 401, body has only `error` |
| TEST-API-08 | API+DB | AC-01-8 | session row with `expiresAt` in the past | 401 |
| TEST-UI-01 | UI component | AC-01-2 | login API answers 401 | error message shown, e-mail kept |
| TEST-E2E-01 | E2E | AC-01-1, AC-01-4 | browser sign in / sign out as alice | header shows Alice; after sign out the dashboard is no longer reachable |

## Revision history
| Version | Date | Change |
|---|---|---|
| 1.0 | 14 Nov 2026 | First contract (before implementation) |
