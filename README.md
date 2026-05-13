# Megna Ventures — Investor Deal Portal (MVP)

A gated web platform for sharing off-market real estate deals with approved investors.  
Admins can create/manage property listings, approve investor access, and receive investor inquiries via email.

---

## Core Goals
- **Fast deal publishing** for the Megna team
- **Clean deal browsing** for investors (approved only)
- **Simple lead capture**: investors can message about a specific property and the team receives an email with full context

---

## MVP Features

### Admin Portal
- Admin authentication
- **Properties**
  - List properties (table view)
  - Create / Edit / Delete properties
  - Set status: **Draft / Active / Closed**
- **Investors**
  - View investor access requests
  - Approve / reject investors

### Investor Portal
- Investor signup / request access
- Investor login (approved accounts only)
- Browse **Active** properties
- View property details (numbers, photos, key info)
- **Message to the Owner** (email-based inquiry per property)

---

## Property Statuses
- **Draft** — not visible to investors
- **Active** — visible to investors
- **Closed** — not visible to investors

---

## Key Data Captured (MVP)

### Property
- Address (street, city, state zip)
- Asking price, ARV, estimated repairs
- Beds, baths, sqft (optional)
- Occupancy status
- Exit strategy
- Closing terms
- Photos (admin upload; stored as GCS-backed photo assets)

### Investor
- Name, email, phone
- Company (optional)
- Approval status

### Inquiry (Message to the Owner)
- Investor info + message body
- Associated property (ID + address + key numbers)
- Timestamp
- Delivered to Megna team via email

---

## Tech Stack
- Frontend: `React + Vite`
- Backend: `Spring Boot`
- Database: `MySQL`

---

## Repository Structure (Refactored)

The repo now uses a clearer separation by app (`frontend`, `backend`) and by concern inside each app:

```text
mv-deal-portal/
  backend/
    docs/openapi/                    # exported OpenAPI spec
    src/main/java/com/megna/backend/
      application/                   # services + query specifications
      domain/                        # entities, enums, repositories
      infrastructure/                # framework/config/security wiring
      interfaces/rest/               # controllers, API DTOs, mappers
      shared/                        # cross-cutting error models/handlers
  frontend/
    src/
      app/                           # app entry + top-level routing
      api/                           # HTTP client + API modules
      features/                      # admin, auth, investor, home, dev
      shared/                        # reusable UI + utilities
```

Quick pointers:
- Frontend entry: `frontend/src/app/main.jsx`
- Frontend routes: `frontend/src/app/App.jsx`
- Backend API controllers: `backend/src/main/java/com/megna/backend/interfaces/rest/controller`
- Backend service layer: `backend/src/main/java/com/megna/backend/application/service`

---

## Product Docs

### Wireframes
- Wireframe (Figma): [Figma](https://www.figma.com/design/GpS0eMH9zf3zJcjeeMgNXR/Megna-Ventures-%7C-Wireframe?node-id=0-1&t=SWMRFPR336bN2Ir1-1)

### ERD (Database Diagram)
- ERD (dbdiagram.io): [ERD](https://dbdiagram.io/d/Megna-Ventures-or-ERD-69399edbe877c63074524e4a)

---

## Rule — MVP Access + Publishing Rules

### Investor Access & Approval
- When an investor registers, their account is created with `status = PENDING`.
- Only investors with `status = APPROVED` can:
  - view deal listings and deal details
  - send a “Message to the owner” inquiry
- The admin can set an investor’s status to `APPROVED` or `REJECTED`.
- If `status = REJECTED`, access is blocked.
- These rules are enforced **server-side** (not just in the UI).

### Property Draft vs Active
- Properties can be saved as `DRAFT` with incomplete/nullable fields (to allow partial entry).
- Only properties with `status = ACTIVE` are visible to approved investors.
- When the admin sets a property to `ACTIVE`, the backend must validate required fields (reject if missing):
  - `street_1`, `city`, `state`, `zip`
  - `asking_price`
  - `occupancy_status`, `exit_strategy`, `closing_terms`
  - at least **1** photo in `property_photos`
- Properties with `status = CLOSED` are not visible to investors.

---

## Investor Map Configuration

The investor dashboard uses Leaflet with a satellite base layer. Configure tile behavior in `frontend` with:

- `VITE_MAP_TILE_URL` (default: Esri World Imagery satellite tiles)
- `VITE_MAP_PLACE_LABEL_TILE_URL` (default: Esri place/city labels)
- `VITE_MAP_MAX_ZOOM` (default: `18`)

---

## Coordinate Backfill Runbook

One-time backfill command:

```bash
cd frontend
npm run backfill:coords
```

Required environment variables:

- `BACKFILL_ADMIN_EMAIL`
- `BACKFILL_ADMIN_PASSWORD`

Optional environment variables:

- `BACKFILL_API_BASE_URL` (default: `http://localhost:8080`)
- `BACKFILL_DRY_RUN` (default: `false`)
- `BACKFILL_PAGE_SIZE` (default: `50`)
- `BACKFILL_MAX_UPDATES` (no cap by default)
- `BACKFILL_DELAY_MS` (minimum effective delay is `1100ms`)

### Dry Run (no writes)

```bash
cd frontend
BACKFILL_API_BASE_URL=http://localhost:8080 \
BACKFILL_ADMIN_EMAIL=admin@example.com \
BACKFILL_ADMIN_PASSWORD='your-password' \
BACKFILL_DRY_RUN=true \
npm run backfill:coords
```

### Production Run

```bash
cd frontend
BACKFILL_API_BASE_URL=https://your-api-host \
BACKFILL_ADMIN_EMAIL=admin@example.com \
BACKFILL_ADMIN_PASSWORD='your-password' \
BACKFILL_DELAY_MS=1100 \
npm run backfill:coords
```

### Rollback Notes

- The script is idempotent and can be safely re-run after address/data fixes.
- If coordinates need to be reverted, restore from your DB backup or set `latitude`/`longitude` back to `NULL` for affected rows, then re-run the backfill.

---

## Photo Upload Manual Test (GCS Direct Upload)

Use this checklist to verify the direct browser-to-GCS flow end to end.

### Preconditions

- Backend env:
  - `GCS_BUCKET_NAME` is set (`mv-photos-dev` for dev, `mv-photos-prod` for prod)
  - `APP_PHOTOS_PUBLIC_BASE_URL` is set (currently `https://storage.googleapis.com/<bucket>`)
- Admin account is authenticated in UI.
- DB migration `V9__add_photo_assets_and_migrate_property_photos.sql` has run.

### 1) Initialize upload

`POST /api/properties/photos/uploads/init`

Expected:

- `201 Created`
- Response includes `uploadId`, `uploadUrl`, `httpMethod = "PUT"`, `requiredHeaders.Content-Type`, `expiresAt`, `uploadToken`
- A `photo_assets` row is created with `status = UPLOADING`

### 2) Upload bytes to signed URL

From browser, issue `PUT uploadUrl` with required `Content-Type` header and file bytes.

Expected:

- Upload succeeds (2xx from GCS signed URL).
- Original object exists under `original/yyyy/MM/...`.

### 3) Complete upload + derivative generation

`POST /api/properties/photos/uploads/{uploadId}/complete` with `{ uploadToken }`

Expected:

- `200 OK`
- Response includes `photoAssetId`, `url`, `thumbnailUrl`, `width`, `height`, `contentType` (original uploaded type), `sizeBytes`
- `photo_assets.status` transitions to `READY`
- `url` and `thumbnailUrl` both resolve to the original uploaded object (`original/yyyy/MM/...`)

### 4) Save property with photo assets

Create/update property payload `photos[]` entries must include:

```json
{
  "photoAssetId": "<uuid>",
  "sortOrder": 0,
  "caption": null
}
```

Expected:

- Save succeeds.
- `property_photos.photo_asset_id` is populated.
- Investor UI shows thumbnail image in cards and detail thumbs.

### 5) Removal behavior

- Remove a photo from an existing property and save.

Expected:

- Related `photo_assets.status = DELETED_PENDING`
- `purge_after_at = now + 30 days`

- Remove a staged (not-yet-attached) upload in admin modal.

Expected:

- `DELETE /api/properties/photos/uploads/{uploadId}` succeeds.
- Asset is marked `DELETED` (or `FAILED` if immediate cleanup fails).

### 6) Legacy cleanup checks

Run:

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
