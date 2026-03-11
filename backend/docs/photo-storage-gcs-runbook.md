# GCS Photo Storage Rollout Runbook

## Required env vars

Set these on Cloud Run:

- `APP_PHOTOS_PROVIDER=gcs`
- `GCS_BUCKET_NAME=<gcs-bucket-name>`
- `APP_PHOTOS_PUBLIC_BASE_URL=https://img.megna.us`
- `APP_PHOTOS_MAX_FILE_SIZE_BYTES=10485760`
- `APP_PHOTOS_ALLOWED_CONTENT_TYPES=image/jpeg,image/png,image/webp`
- `APP_PHOTOS_UPLOAD_URL_TTL_SECONDS=900`
- `APP_PHOTOS_PURGE_GRACE_DAYS=30`
- `APP_PHOTOS_MAX_PURGE_RETRIES=5`
- `APP_PHOTOS_PURGE_CRON=0 15 2 * * *`

## GCS bucket CORS

Apply CORS to allow browser direct uploads:

```json
[
  {
    "origin": [
      "https://megna.us",
      "https://www.megna.us",
      "http://localhost:5173"
    ],
    "method": ["PUT", "GET", "HEAD", "OPTIONS"],
    "responseHeader": ["Content-Type", "Cache-Control", "ETag"],
    "maxAgeSeconds": 3600
  }
]
```

## IAM for Cloud Run runtime service account

Grant runtime service account:

- `roles/storage.objectAdmin` on the photo bucket
- `roles/iam.serviceAccountTokenCreator` on the runtime service account

The token creator permission is required for signed URL generation.

## Legacy purge verification SQL

After migration `V9`, verify:

```sql
SELECT COUNT(*) AS legacy_upload_urls
FROM property_photos
WHERE url LIKE '/uploads/%';

SELECT COUNT(*) AS active_without_photos
FROM properties p
WHERE p.status = 'ACTIVE'
  AND NOT EXISTS (
    SELECT 1 FROM property_photos pp WHERE pp.property_id = p.id
  );
```

Expected:

- `legacy_upload_urls = 0`
- `active_without_photos = 0`

## Rollback approach

1. Revert frontend to previous upload API.
2. Temporarily disable new photo endpoints at gateway level if needed.
3. Keep `photo_assets` and `property_photos.photo_asset_id` data intact (no destructive rollback migration).
4. Restore app image to previous revision in Cloud Run.
