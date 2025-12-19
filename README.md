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
