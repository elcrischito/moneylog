# MoneyLog — Personal Money and Expense Logging System

CPE 334 Group Project (KMUTT, semester 1/2026) · Team **EN-049** (`elcrischito`, one member) · Theme 7.

Each user keeps private records of wallets, bank accounts, credit cards, loans, income and expenses. They record payments and money received as transactions split into allocation lines, and see correct balances, credit card debt, an income/expense summary and their history. An administrator manages who can sign in, but cannot see anyone's financial data.

| Documents | |
|---|---|
| SRS (FR/BR/NFR, scope, decisions) | [`docs/srs.md`](docs/srs.md) |
| Feature inventory / traceability | [`docs/features.md`](docs/features.md), [`docs/traceability.md`](docs/traceability.md) |
| System-level design | [`docs/system-sds.md`](docs/system-sds.md) |
| Three-sprint plan | [`docs/sprints/plan.md`](docs/sprints/plan.md) |
| Sprint 1 contracts, STS, Definition of Done | [`docs/sprints/sprint-1/`](docs/sprints/sprint-1/) |
| AI-use declaration | [`docs/ai-use.md`](docs/ai-use.md) |

## Stack
React 18 + TypeScript + Vite (client) · Node.js + Express + TypeScript (API) · PostgreSQL 16 + Prisma 5 · Vitest, Supertest, React Testing Library, Playwright.

## Run it locally

Requirements: Node.js 22+ (CI uses 24), and PostgreSQL 16, for example in Docker.

```bash
# 1. Database (port 5433 so it does not clash with another local PostgreSQL)
docker run -d --name moneylog-db -e POSTGRES_USER=moneylog -e POSTGRES_PASSWORD=moneylog \
  -e POSTGRES_DB=moneylog -p 5433:5432 -v moneylog-data:/var/lib/postgresql/data postgres:16-alpine

# 2. API
cd server
cp .env.example .env          # placeholders only; adjust DATABASE_URL if needed
npm install
npx prisma migrate deploy     # versioned SQL migrations
npm run prisma:seed           # idempotent demo users and accounts
npm run dev                   # http://localhost:4000

# 3. Web app (second terminal)
cd client
npm install
npm run dev                   # http://localhost:5173 (proxies /api to :4000)
```

### Demo accounts (local seed)
| E-mail | Role | Notes |
|---|---|---|
| `admin@moneylog.test` | Administrator | manages users only |
| `alice@moneylog.test` | User | starts with 11 accounts and no transactions |
| `bob@moneylog.test` | User | second user (privacy checks) |
| `dan@moneylog.test` | User | **disabled** (cannot sign in) |

Locally, every seeded account uses the development password from `prisma/seed.ts`. In production the passwords come from `SEED_ADMIN_PASSWORD` / `SEED_USER_PASSWORD`, which the seed requires there. To return the demo users to their starting state locally: `cd server && npm run demo:reset`.

### Configuration
All settings come from environment variables, documented in [`server/.env.example`](server/.env.example) and in System SDS §7. The client has none. Never commit a real `.env`.

## Tests

```bash
cd server && npm test            # unit + API/DB integration tests (needs the database, migrated and seeded)
cd server && npm run build       # type-check + bundle
cd client && npm test            # UI component tests
cd client && npm run build
# end-to-end: API and web app running (see above), then
cd client && npx playwright install chromium && npm run test:e2e
```

CI (`.github/workflows/ci.yml`) runs the backend and frontend suites on every Pull Request into `staging` and `main`.

## Sprint 1 demo sequence (theme example)
1. Sign in as **alice**. Go to **Accounts** → *Opening balance* on *Bangkok Bank Savings*: 10,000.00, dated 2026-11-01.
2. **New transaction** → *Receive money* into the bank: 30,000.00, one line *Salary* 30,000.00.
3. **New transaction** → *Make a payment* from *KTC Credit Card*: 1,500.00, lines *Dining* 900.00 and *Groceries* 600.00.
4. **New transaction** → *Make a payment* from the bank: 1,500.00, line *KTC Credit Card* 1,500.00 (repayment).
5. **Dashboard**: cash ฿38,500.00, credit card debt ฿0.00. **Summary** for November: income ฿30,000.00, expense ฿1,500.00, net ฿28,500.00. **History**: 3 transactions with their lines.
6. Rule rejection: in a payment, make the lines 900 + 500 for a total of 1,500. *Save* stays disabled ("Remaining ฿100.00"), and the API answers `400 LINES_TOTAL_MISMATCH`.
7. Sign out. Sign in as **admin** → **Users**: disable Bob (Bob can no longer sign in). The admin's financial API calls answer `403`.

## Workflow
Issues with labels on the project board → branch from `staging` (`feature/<issue>-…`) → PR into `staging` with CI and a written review → release PR `staging` → `main` → tag (`v0.1.0` = Sprint 1).
