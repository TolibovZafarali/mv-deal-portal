# Megna Ventures — Investor Deal Portal (MVP)

A gated web platform for sharing off-market real estate deals with approved investors.  
Admins can create/manage property listings, approve investor access, and receive investor inquiries via email.

> **Status:** MVP scope (Draft / Active / Closed workflow)

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
- Wireframe (Figma): `[Figma](https://www.figma.com/design/GpS0eMH9zf3zJcjeeMgNXR/Megna-Ventures-%7C-Wireframe?node-id=0-1&t=SWMRFPR336bN2Ir1-1)`

### ERD (Database Diagram)
- ERD (dbdiagram.io / Lucidchart / etc.): `[ERD](https://dbdiagram.io/d/Megna-Ventures-or-ERD-69399edbe877c63074524e4a)`
