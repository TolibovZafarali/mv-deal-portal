# GCS Photo Upload Infra Runbook

This runbook covers CORS and IAM for direct browser `PUT` uploads and public photo reads.

## 1) Apply CORS

Run from repo root:

```bash
gcloud storage cors set infra/gcs/cors.dev.json gs://mv-photos-dev
gcloud storage cors set infra/gcs/cors.prod.json gs://mv-photos-prod
```

The CORS policies allow direct browser upload requests from:

- `http://localhost:5173`
- `https://megna-realestate.com`
- `https://www.megna-realestate.com`

## 2) Apply IAM

Set your project and backend runtime service account:

```bash
PROJECT_ID="megna-real-estate-backend"
RUNTIME_SA="mv-deal-backend-run@${PROJECT_ID}.iam.gserviceaccount.com"
```

Grant backend runtime read/write/delete access to both buckets:

```bash
gcloud storage buckets add-iam-policy-binding gs://mv-photos-dev \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/storage.objectAdmin"

gcloud storage buckets add-iam-policy-binding gs://mv-photos-prod \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/storage.objectAdmin"
```

Grant backend runtime signing permission for V4 signed upload URLs:

```bash
gcloud iam service-accounts add-iam-policy-binding "${RUNTIME_SA}" \
  --project="${PROJECT_ID}" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/iam.serviceAccountTokenCreator"
```

Grant public object read on both buckets (required for `https://storage.googleapis.com/<bucket>/<object>` URLs):

```bash
gcloud storage buckets add-iam-policy-binding gs://mv-photos-dev \
  --member="allUsers" \
  --role="roles/storage.objectViewer"

gcloud storage buckets add-iam-policy-binding gs://mv-photos-prod \
  --member="allUsers" \
  --role="roles/storage.objectViewer"
```

## 3) Required Env Vars (Phase 2+ / PLAN.md)

These must be present in Cloud Run env config for each environment.

| Variable | Dev | Prod |
| --- | --- | --- |
| `APP_PHOTOS_PROVIDER` | `gcs` | `gcs` |
| `GCS_BUCKET_NAME` | `mv-photos-dev` | `mv-photos-prod` |
| `APP_PHOTOS_PUBLIC_BASE_URL` | `https://storage.googleapis.com/mv-photos-dev` | `https://storage.googleapis.com/mv-photos-prod` |
| `APP_PHOTOS_MAX_FILE_SIZE_BYTES` | `10485760` | `10485760` |
| `APP_PHOTOS_ALLOWED_CONTENT_TYPES` | `image/jpeg,image/png,image/webp` | `image/jpeg,image/png,image/webp` |
| `APP_PHOTOS_UPLOAD_URL_TTL_SECONDS` | `900` | `900` |
| `APP_PHOTOS_PURGE_GRACE_DAYS` | `30` | `30` |
| `APP_PHOTOS_MAX_PURGE_RETRIES` | `5` | `5` |
| `APP_PHOTOS_PURGE_CRON` | `0 15 2 * * *` | `0 15 2 * * *` |

Deploy note:

- Keep Cloud Run deploy on `--env-vars-file` only for env vars (no `--update-env-vars` / `--set-env-vars`).
- Backend listens on Cloud Run port via `server.port=${PORT:8080}`.
