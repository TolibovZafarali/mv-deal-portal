# Cloud Build -> Cloud Run IAM Setup

This runbook fixes deploy failures like:

`Permission 'iam.serviceaccounts.actAs' denied`

It assumes:

- Project ID: `megna-real-estate-backend`
- Build trigger service account: `mv-deal-cloudbuild-trigger@megna-real-estate-backend.iam.gserviceaccount.com`
- Cloud Run runtime service account: `mv-deal-backend-run@megna-real-estate-backend.iam.gserviceaccount.com`

## 1) Create build trigger service account (if missing)

```bash
gcloud iam service-accounts create mv-deal-cloudbuild-trigger \
  --project=megna-real-estate-backend \
  --display-name="Cloud Build Trigger SA"
```

If it already exists, this command will fail with `already exists`; that is safe to ignore.

## 2) Grant project-level roles to build trigger SA

```bash
gcloud projects add-iam-policy-binding megna-real-estate-backend \
  --member="serviceAccount:mv-deal-cloudbuild-trigger@megna-real-estate-backend.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding megna-real-estate-backend \
  --member="serviceAccount:mv-deal-cloudbuild-trigger@megna-real-estate-backend.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding megna-real-estate-backend \
  --member="serviceAccount:mv-deal-cloudbuild-trigger@megna-real-estate-backend.iam.gserviceaccount.com" \
  --role="roles/logging.logWriter"
```

## 3) Allow build trigger SA to act as runtime SA (fixes iam.serviceaccounts.actAs)

```bash
gcloud iam service-accounts add-iam-policy-binding \
  mv-deal-backend-run@megna-real-estate-backend.iam.gserviceaccount.com \
  --project=megna-real-estate-backend \
  --member="serviceAccount:mv-deal-cloudbuild-trigger@megna-real-estate-backend.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

## 4) Ensure runtime SA has runtime access roles

```bash
gcloud projects add-iam-policy-binding megna-real-estate-backend \
  --member="serviceAccount:mv-deal-backend-run@megna-real-estate-backend.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding megna-real-estate-backend \
  --member="serviceAccount:mv-deal-backend-run@megna-real-estate-backend.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## 5) Verify Service Account User binding on runtime SA

```bash
gcloud iam service-accounts get-iam-policy \
  mv-deal-backend-run@megna-real-estate-backend.iam.gserviceaccount.com \
  --project=megna-real-estate-backend \
  --format="table(bindings.role,bindings.members)"
```

Expected output includes:

- `roles/iam.serviceAccountUser`
- `serviceAccount:mv-deal-cloudbuild-trigger@megna-real-estate-backend.iam.gserviceaccount.com`
