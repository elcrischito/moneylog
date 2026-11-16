#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# MoneyLog — one-time GitHub -> Google Cloud trust (Workload Identity Federation)
# ==============================================================================
# Usage (Cloud Shell, repo root, AFTER deploy/deploy.sh has run once):
#   DRY_RUN=1 bash deploy/setup-wif.sh     # print the commands only
#   bash deploy/setup-wif.sh               # create pool, provider, deployer SA
#
# WHAT IT CREATES (safe to re-run: existing resources are reused)
#   - APIs: IAM Service Account Credentials, Security Token Service
#   - Pool `github-actions`, OIDC provider `github-main` (issuer GitHub Actions)
#   - Service account `moneylog-deployer` with ONLY:
#       roles/run.developer             on the project (update job + service)
#       roles/artifactregistry.writer   on the `moneylog` repository only
#       roles/iam.serviceAccountUser    on `moneylog-runner` only
#   - roles/iam.workloadIdentityUser on the deployer SA, for tokens of this
#     repository only
#
# WHY THE PROVIDER CONDITION LOOKS LIKE THIS
#   GitHub's OIDC token is accepted only when ALL of these match:
#   repository ID + owner ID (numeric, so a renamed/forked repo is refused),
#   ref = refs/heads/main, environment = demo, workflow = deploy.yml.
#   Pull Requests, other branches and other workflows get no Google token.
#   No service-account key is ever created or downloaded.
#
# The deployer never reads Secret Manager and cannot manage IAM or databases:
# the migration job and the service read their secrets as `moneylog-runner`.
# ==============================================================================

DRY_RUN="${DRY_RUN:-0}"
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
REGION="${REGION:-asia-southeast1}"
GITHUB_REPO="elcrischito/moneylog"
GITHUB_REPO_ID="1457556961"     # gh api repos/elcrischito/moneylog --jq .id
GITHUB_OWNER_ID="256379567"     # gh api repos/elcrischito/moneylog --jq .owner.id
POOL="github-actions"
PROVIDER="github-main"
REPO_NAME="moneylog"
DEPLOYER="moneylog-deployer"
RUNNER="moneylog-runner"

[ -n "$PROJECT_ID" ] || { echo "PROJECT_ID is empty: run 'gcloud config set project <id>' first." >&2; exit 1; }

run() {
  printf '+ %s\n' "$*" >&2
  if [ "$DRY_RUN" != "1" ]; then "$@"; fi
}
exists() { [ "$DRY_RUN" != "1" ] && "$@" >/dev/null 2>&1; }

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)' 2>/dev/null || echo 000000000000)"
DEPLOYER_EMAIL="${DEPLOYER}@${PROJECT_ID}.iam.gserviceaccount.com"
RUNNER_EMAIL="${RUNNER}@${PROJECT_ID}.iam.gserviceaccount.com"
POOL_ID="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}"
CONDITION="assertion.repository_id=='${GITHUB_REPO_ID}' && assertion.repository_owner_id=='${GITHUB_OWNER_ID}' && assertion.ref=='refs/heads/main' && assertion.environment=='demo' && assertion.workflow_ref.startsWith('${GITHUB_REPO}/.github/workflows/deploy.yml@')"

echo "Project: ${PROJECT_ID} (${PROJECT_NUMBER})  Repo: ${GITHUB_REPO}  Dry run: ${DRY_RUN}"

run gcloud services enable iamcredentials.googleapis.com sts.googleapis.com --project "$PROJECT_ID"

exists gcloud iam workload-identity-pools describe "$POOL" --location=global --project "$PROJECT_ID" || \
  run gcloud iam workload-identity-pools create "$POOL" --location=global \
    --display-name="GitHub Actions" --project "$PROJECT_ID"

exists gcloud iam workload-identity-pools providers describe "$PROVIDER" --workload-identity-pool="$POOL" --location=global --project "$PROJECT_ID" || \
  run gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" \
    --workload-identity-pool="$POOL" --location=global \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository_id=assertion.repository_id,attribute.repository_owner_id=assertion.repository_owner_id,attribute.ref=assertion.ref,attribute.environment=assertion.environment,attribute.workflow_ref=assertion.workflow_ref" \
    --attribute-condition="$CONDITION" \
    --project "$PROJECT_ID"

exists gcloud iam service-accounts describe "$DEPLOYER_EMAIL" --project "$PROJECT_ID" || \
  run gcloud iam service-accounts create "$DEPLOYER" \
    --display-name="MoneyLog GitHub deployer" --project "$PROJECT_ID"
# A new service account can take a few seconds before IAM bindings accept it.
[ "$DRY_RUN" = "1" ] || sleep 15

run gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${DEPLOYER_EMAIL}" --role="roles/run.developer" --condition=None --quiet >/dev/null
run gcloud artifacts repositories add-iam-policy-binding "$REPO_NAME" --location="$REGION" \
  --member="serviceAccount:${DEPLOYER_EMAIL}" --role="roles/artifactregistry.writer" --project "$PROJECT_ID" --quiet >/dev/null
run gcloud iam service-accounts add-iam-policy-binding "$RUNNER_EMAIL" \
  --member="serviceAccount:${DEPLOYER_EMAIL}" --role="roles/iam.serviceAccountUser" --project "$PROJECT_ID" --quiet >/dev/null
run gcloud iam service-accounts add-iam-policy-binding "$DEPLOYER_EMAIL" \
  --member="principalSet://iam.googleapis.com/${POOL_ID}/attribute.repository_id/${GITHUB_REPO_ID}" \
  --role="roles/iam.workloadIdentityUser" --project "$PROJECT_ID" --quiet >/dev/null

printf '\n%s\n' "=================================================================="
printf '%s\n' "GitHub environment 'demo' -> variables (not secrets, nothing here is secret):"
printf '%s\n' "  GCP_PROJECT_ID      = ${PROJECT_ID}"
printf '%s\n' "  GCP_REGION          = ${REGION}"
printf '%s\n' "  WIF_PROVIDER        = ${POOL_ID}/providers/${PROVIDER}"
printf '%s\n' "  WIF_SERVICE_ACCOUNT = ${DEPLOYER_EMAIL}"
printf '%s\n' "=================================================================="
