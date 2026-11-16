# MoneyLog — Deployment (Lab 5)

Team **EN-049 elcrischito** (one member: Mamadou Diao Bah, GitHub `elcrischito`) · Theme 7: Personal Money and Expense Logging System.
Repository: https://github.com/elcrischito/moneylog (public).

## 1. Stack and changes from the reference

| Part | MoneyLog | Same as the Starter Kit (TokTickIT)? |
|---|---|---|
| Client | React 18 + Vite + TypeScript | yes |
| API | Express 4 + TypeScript, bundled with esbuild to `server/dist/index.js` | yes (esbuild instead of plain `tsc` output) |
| Database | PostgreSQL 16, Prisma 5 migrations + seed | yes |
| Image | one image: client built in stage 1, API in stage 2, non-root runtime on `PORT` 3000 serving `/api` and the SPA | yes |
| GCP | Artifact Registry, Cloud Run (service + migrate job), Cloud SQL for PostgreSQL, Secret Manager, Workload Identity Federation | yes |

Differences and why:

- **No JWT secret.** MoneyLog uses opaque server-side sessions (SHA-256 token hash in the `Session` table, 8 h TTL), so there is no signing key to store.
- **No file uploads.** Nothing is written to the container disk; all state is in PostgreSQL (R-04).
- **Seed is safe in production.** With `NODE_ENV=production` the seed refuses to run without an admin password, creates only the administrator unless `SEED_DEMO_DATA=true`, and never overwrites an existing user's password on a rerun (PR #26).
- **Smoke test.** MoneyLog has no public list endpoint like `/api/categories`, so the fourth check of `deploy/smoke_test.py` is `GET /api/accounts` without a session → **401** (PR #28).

## 2. Environment variables

The client has no variables: it calls `/api` on the same origin (`client/.env.example`). Server variables are in `server/.env.example` with placeholder values only. `.env` is in `.gitignore`.

| Variable | Purpose | Secret? | Local value from | Cloud value from |
|---|---|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | **yes** | `server/.env` (not committed) | Secret Manager `moneylog-database-url` (Cloud SQL socket URL, created by `deploy.sh` step 6) |
| `PORT` | HTTP port | no | `4000` in `.env` (Vite proxy) | Cloud Run sets it (3000 in the image) |
| `NODE_ENV` | `production` turns on config checks and safe seeding | no | unset → development | `--set-env-vars` in `deploy.sh` |
| `TZ` | Ledger dates use Bangkok time | no | system | `Asia/Bangkok` via `--set-env-vars` |
| `SESSION_TTL_HOURS` | Session lifetime (default 8) | no | unset | unset (default) |
| `CORS_ORIGIN` | Extra browser origins, local development only | no | unset | unset (same origin) |
| `CLIENT_DIST_DIR` | Folder of the built SPA | no | unset → `../client/dist` | unset → `/app/client/dist` in the image |
| `ADMIN_PASSWORD` / `SEED_ADMIN_PASSWORD` | First password of `admin@moneylog.test` (seed only) | **yes** | local fallback in the seed | Secret Manager `moneylog-admin-password` (generated, never printed) |
| `DEMO_USER_PASSWORD` / `SEED_USER_PASSWORD` | Password of the demo users Alice, Bob, Dan (seed only) | **yes** | local fallback in the seed | Secret Manager `moneylog-demo-password` (only with `--demo`) |
| `SEED_DEMO_DATA` | Seed demo users and their 11 starter accounts | no | default true locally | `true` only with `deploy.sh --demo` (Lab 6 UAT) |

GitHub environment **`demo`** (used by `deploy.yml`): variables `GCP_PROJECT_ID`, `GCP_REGION`, `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT`, `SMOKE_EMAIL`; secret `SMOKE_PASSWORD`. No service-account key file exists anywhere: GitHub signs in to GCP with Workload Identity Federation.

## 3. Commands

### Local, without Docker

```bash
cd server && cp .env.example .env      # then edit DATABASE_URL
npm ci
npx prisma migrate deploy              # migrate
npm run prisma:seed                    # seed (admin + demo data locally)
npm test                               # 52 API + unit tests
npm run dev                            # API on :4000
cd ../client && npm ci && npm test && npm run dev   # UI on :5173
npm run test:e2e                       # Playwright (desktop + 360 px)
```

Reset the demo data: `cd server && npm run demo:reset` (refuses when `NODE_ENV=production`).

### Local, with Docker

```bash
docker compose up --build              # db, migrate (migrate deploy + seed), server :3000, client :5173
docker compose down                    # keep data (named volume moneylog-pgdata)
docker compose down -v                 # delete data too
docker build -t moneylog:local .       # the unified production image only
```

### CI (`.github/workflows/ci-docker.yml`, job `test-and-docker`)

Runs on every PR into `staging` or `main`, on pushes to `staging`, and from `deploy.yml`: deploy-script stub tests → backend `npm ci`, `prisma migrate deploy`, seed, tests, build → frontend tests and build → `docker build` of the unified image. `test-and-docker` is the required check on `main`.

## 4. GCP resources

| Item | Value |
|---|---|
| Project ID | `<GCP_PROJECT_ID>` (filled in after the course project is created) |
| Region | `asia-southeast1` (Singapore, closest to Bangkok) |
| Artifact Registry repo / image | `moneylog` / `moneylog:<commit SHA>` |
| Cloud Run service | `moneylog` (min instances 0, max 3, 512 MiB) |
| Cloud Run job (migrate + seed) | `moneylog-migrate` |
| Cloud SQL instance / database / user | `moneylog-pg` (PostgreSQL 16, `db-f1-micro`, 10 GB, storage auto-increase off) / `moneylog` / `moneylog` |
| Runtime service account | `moneylog-runner@<GCP_PROJECT_ID>.iam.gserviceaccount.com` (Cloud SQL client + access to its 3 secrets only) |
| Secrets | `moneylog-database-url`, `moneylog-admin-password`, `moneylog-demo-password` |
| Budget | alerts-only budget, created before any other resource |

First deployment, once, from Cloud Shell:

```bash
git clone https://github.com/elcrischito/moneylog && cd moneylog
DRY_RUN=1 bash deploy/deploy.sh --demo     # prints every command, calls nothing
bash deploy/deploy.sh --demo               # creates the resources above, migrates, seeds, deploys
python3 deploy/smoke_test.py "$SERVICE_URL"
```

Pause when idle: `gcloud sql instances patch moneylog-pg --activation-policy=NEVER` (start again with `ALWAYS`). Tear down after the course: `bash deploy/teardown.sh`.

## 5. Release procedure (R-07, R-08)

1. Open an Issue (label `lab5` for Lab 5 work), branch from `staging`, open a PR into `staging`. CI `test-and-docker` must pass; the PR gets a written review comment, then it is merged.
2. Open the release PR `staging → main`. The ruleset on `main` blocks the merge until `test-and-docker` passes.
3. The merge to `main` starts `.github/workflows/deploy.yml`: it reruns CI, builds the image, tags it with the **full commit SHA**, pushes it to Artifact Registry, then `deploy/release.sh` resolves the tag to its `@sha256` digest, runs the `moneylog-migrate` job (a failed migration stops the release before the service changes) and updates the `moneylog` service. `smoke_test.py` then checks the public URL.
4. Optionally tag the release on GitHub (`v0.1.0` = Sprint 1, commit `c26bebe`).

**Which commit is running?**

```bash
gcloud run services describe moneylog --region asia-southeast1 \
  --format='value(spec.template.spec.containers[0].image)'
```

The image is `…/moneylog/moneylog@sha256:…`; the deploy run log and Artifact Registry show the SHA tag that points to that digest, which is the `main` commit. The Actions run of `deploy.yml` also lists it.

**Rollback.** Run `deploy.yml` by hand (*Run workflow*) with the full SHA of an earlier image. Rollback updates the service only: no migration and no seed.

## 6. Persistence check (R-04)

1. Sign in on the public URL as a demo user and record a transaction, for example an expense with a unique description.
2. Restart: deploy a new revision without code change (`gcloud run services update moneylog --region asia-southeast1 --update-labels=restart=$(date +%s)`); the record is still in History.
3. Redeploy: merge a release into `main`; after `deploy.yml` finishes, the record and the balances are unchanged.

Evidence (screenshots before/after) is in the Lab 5 PDF.
