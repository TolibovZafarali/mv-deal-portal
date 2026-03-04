# Dev Backend + Cloud SQL + Firebase Runbook

This runbook provisions a separate dev backend stack for `https://mre-frontend.firebaseapp.com`.

## 1) Create dev Cloud SQL instance, DB, and user

```bash
PROJECT_ID="megna-real-estate-backend"
REGION="us-central1"
INSTANCE="mv-mysql-dev"
DB_NAME="megnarealestate_dev"
DB_USER="app_dev"

gcloud config set project "${PROJECT_ID}"

gcloud sql instances create "${INSTANCE}" \
  --database-version=MYSQL_8_0 \
  --tier=db-f1-micro \
  --region="${REGION}"

gcloud sql databases create "${DB_NAME}" --instance="${INSTANCE}"

gcloud sql users create "${DB_USER}" --instance="${INSTANCE}" --password="<choose-strong-password>"
```

## 2) Create dev secrets

```bash
PROJECT_ID="megna-real-estate-backend"
RUNTIME_SA="mv-deal-backend-run@${PROJECT_ID}.iam.gserviceaccount.com"

echo -n '<dev-db-password>' | gcloud secrets create DB_PASSWORD_DEV \
  --project="${PROJECT_ID}" --replication-policy=automatic --data-file=-

echo -n '<dev-jwt-secret>' | gcloud secrets create JWT_SECRET_DEV \
  --project="${PROJECT_ID}" --replication-policy=automatic --data-file=-

gcloud secrets add-iam-policy-binding DB_PASSWORD_DEV \
  --project="${PROJECT_ID}" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding JWT_SECRET_DEV \
  --project="${PROJECT_ID}" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/secretmanager.secretAccessor"
```

## 3) Deploy dev Cloud Run service

`cloudbuild.dev.yaml` already defaults to:

- service: `mv-deal-backend-dev`
- Cloud SQL instance: `megna-real-estate-backend:us-central1:mv-mysql-dev`
- DB: `megnarealestate_dev`
- user: `app_dev`

Run:

```bash
gcloud builds submit --config cloudbuild.dev.yaml
```

If your names differ, override substitutions:

```bash
gcloud builds submit --config cloudbuild.dev.yaml \
  --substitutions=_CLOUDSQL_INSTANCE=megna-real-estate-backend:us-central1:mv-mysql-dev,_DB_NAME=megnarealestate_dev,_DB_USER=app_dev,_SERVICE_NAME=mv-deal-backend-dev
```

## 4) Build and deploy frontend for Firebase dev

`frontend/.env.firebase-dev` points to:

`https://mv-deal-backend-dev-66429902358.us-central1.run.app`

Build + deploy:

```bash
cd frontend
npm run build:firebase-dev
firebase deploy --only hosting
```

## 5) Verify

1. Open `https://mre-frontend.firebaseapp.com`.
2. Create/login test account.
3. Confirm API calls succeed (no CORS errors).
4. Confirm data is isolated from prod.
