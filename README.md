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
- Address (street, city, state, zip)
- Asking price, ARV, estimated repairs
- Beds, baths, sqft (optional)
- Occupancy status
- Exit strategy
- Closing terms
- Photos (upload and/or external link)
- Notes / description

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
  - `title`
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
