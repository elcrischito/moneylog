#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# MoneyLog — isolated UAT exercise deployment (Lab 6 §3.5)
# ==============================================================================
# Deploys the CURRENT CHECKOUT (e.g. the sprint staging branch) as a separate
# Cloud Run service `moneylog-uat` with its OWN database `moneylog_uat`, so a
# controlled-defect exercise never touches the healthy release
# (`moneylog` service, database `moneylog`) that the UAT team accepts.
#
# Usage (Cloud Shell, repo root, after deploy/deploy.sh has run once):
#   git checkout <branch-or-commit>
#   DRY_RUN=1 bash deploy/uat-exercise.sh   # print the commands only
#   bash deploy/uat-exercise.sh             # build, migrate+seed, deploy
#   bash deploy/uat-exercise.sh --delete    # remove the service, job, secret, DB
#
# Reuses: Cloud SQL instance moneylog-pg and its DB user, runtime SA
# moneylog-runner, Artifact Registry repo moneylog, and the existing admin/demo
# password secrets (the same test accounts as the healthy release).
# The new DATABASE_URL secret is derived from moneylog-database-url without
# printing it (only the database name is changed).
# Cost: min instances 0, max 1; one extra small database on the same instance.
# ==============================================================================

DRY_RUN="${DRY_RUN:-0}"
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
REGION="${REGION:-asia-southeast1}"
SQL_INSTANCE="moneylog-pg"
DB_NAME="moneylog_uat"
SERVICE="moneylog-uat"
JOB="moneylog-uat-migrate"
SECRET_DB_URL="moneylog-uat-database-url"
RUNNER="moneylog-runner@${PROJECT_ID}.iam.gserviceaccount.com"
CONN="${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"
SHA="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/moneylog/moneylog:uat-${SHA}"

[ -n "$PROJECT_ID" ] || { echo "PROJECT_ID is empty: run 'gcloud config set project <id>' first." >&2; exit 1; }
run() { printf '+ %s\n' "$*" >&2; [ "$DRY_RUN" = "1" ] || "$@"; }
exists() { [ "$DRY_RUN" != "1" ] && "$@" >/dev/null 2>&1; }

if [ "${1:-}" = "--delete" ]; then
  run gcloud run services delete "$SERVICE" --region "$REGION" --project "$PROJECT_ID" --quiet || true
  run gcloud run jobs delete "$JOB" --region "$REGION" --project "$PROJECT_ID" --quiet || true
  run gcloud secrets delete "$SECRET_DB_URL" --project "$PROJECT_ID" --quiet || true
  run gcloud sql databases delete "$DB_NAME" --instance "$SQL_INSTANCE" --project "$PROJECT_ID" --quiet || true
  echo "UAT exercise environment removed. The healthy release was not touched."
  exit 0
fi

echo "Project: ${PROJECT_ID}  Commit: ${SHA}  Dry run: ${DRY_RUN}"

# 1. Own database on the same instance
exists gcloud sql databases describe "$DB_NAME" --instance "$SQL_INSTANCE" --project "$PROJECT_ID" || \
  run gcloud sql databases create "$DB_NAME" --instance "$SQL_INSTANCE" --project "$PROJECT_ID"

# 2. DATABASE_URL for that database (value never printed)
if ! exists gcloud secrets describe "$SECRET_DB_URL" --project "$PROJECT_ID"; then
  printf '+ %s\n' "gcloud secrets versions access latest --secret=moneylog-database-url | sed (db name -> ${DB_NAME}) | gcloud secrets create ${SECRET_DB_URL} --data-file=-" >&2
  if [ "$DRY_RUN" != "1" ]; then
    gcloud secrets versions access latest --secret=moneylog-database-url --project "$PROJECT_ID" \
      | sed "s#/moneylog?#/${DB_NAME}?#" \
      | gcloud secrets create "$SECRET_DB_URL" --replication-policy=automatic --data-file=- --project "$PROJECT_ID" >/dev/null
  fi
  run gcloud secrets add-iam-policy-binding "$SECRET_DB_URL" --member="serviceAccount:${RUNNER}" \
    --role="roles/secretmanager.secretAccessor" --project "$PROJECT_ID" --quiet
fi

# 3. Build the image of this checkout (APP_VERSION = commit, shown by /api/health)
CB="$(mktemp)"
cat >"$CB" <<EOF
steps:
- name: gcr.io/cloud-builders/docker
  args: ["build", "--build-arg", "APP_VERSION=${SHA}", "-t", "${IMAGE}", "."]
images: ["${IMAGE}"]
EOF
run gcloud builds submit --config "$CB" --project "$PROJECT_ID" .

# 4. Migrate + seed the UAT database (same test accounts and passwords)
run gcloud run jobs deploy "$JOB" --image "$IMAGE" --region "$REGION" --service-account "$RUNNER" \
  --set-cloudsql-instances "$CONN" \
  --set-secrets "DATABASE_URL=${SECRET_DB_URL}:latest,ADMIN_PASSWORD=moneylog-admin-password:latest,DEMO_USER_PASSWORD=moneylog-demo-password:latest" \
  --set-env-vars "NODE_ENV=production,TZ=Asia/Bangkok,SEED_DEMO_DATA=true" \
  --command "sh" --args "-c,npx prisma migrate deploy && npm run prisma:seed" \
  --max-retries 1 --task-timeout 300s --project "$PROJECT_ID"
run gcloud run jobs execute "$JOB" --region "$REGION" --wait --project "$PROJECT_ID"

# 5. Separate service
run gcloud run deploy "$SERVICE" --image "$IMAGE" --region "$REGION" --platform managed --allow-unauthenticated \
  --service-account "$RUNNER" --add-cloudsql-instances "$CONN" \
  --set-secrets "DATABASE_URL=${SECRET_DB_URL}:latest" \
  --set-env-vars "NODE_ENV=production,TZ=Asia/Bangkok" \
  --min-instances 0 --max-instances 1 --memory 512Mi --cpu 1 --port 3000 --project "$PROJECT_ID"

URL="$( [ "$DRY_RUN" = "1" ] && echo "https://moneylog-uat-<hash>-as.a.run.app" || gcloud run services describe "$SERVICE" --region "$REGION" --project "$PROJECT_ID" --format='value(status.url)')"
printf '\n%s\n' "UAT exercise URL : ${URL}"
printf '%s\n'   "Version (commit) : ${SHA}  (check ${URL}/api/health)"
