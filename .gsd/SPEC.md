# SPEC.md — Project Specification: SynCognia

> **Status**: `DRAFT`
>
> ⚠️ **Planning Lock**: No implementation code may be written until this spec is marked `FINALIZED`.

---

## Vision

**SynCognia** is an AI-powered personal management and asset intelligence platform designed to eliminate the mental load, financial loss, and chaos of physical and digital ownership. It empowers individuals and households to track purchases, claim warranties effortlessly, never miss a return window, stay ahead of expirations and maintenance schedules, and securely centralize proof-of-ownership documentation.

---

## Core Pillars & Functional Requirements

### 1. Multi-Modal Purchase & Receipt Ingestion
- **Multi-Source Capture**: Direct photo upload (receipts/slips), PDF invoice upload, and forwardable email ingestion.
- **AI Extraction Engine**: Multimodal LLM extraction parsing:
  - Merchant / Retailer name
  - Purchase date & transaction total
  - Itemized products, categories, quantities, unit prices
  - Identified warranty terms and stated return policy window
  - Serial numbers and model numbers when visible
- **Manual Entry & Override**: Ability to quickly add or correct any item details manually.

### 2. Warranty Management & Claim Readiness
- **Warranty Lifecycle**: Automatic calculation of standard manufacturer warranty vs. extended warranty duration.
- **Coverage Status**: Live status badges (`Active`, `Expiring Soon (30d)`, `Expired`).
- **Claim Dossier Generator**: One-click export of an all-in-one PDF/zip packet containing:
  - Original proof of purchase (receipt/invoice)
  - Product serial number and photos
  - Warranty terms reference
  - Pre-drafted claim email/letter addressed to manufacturer customer support.

### 3. Expiry Dates & Return Window Intelligence
- **Return Window Tracker**: Automated countdowns for return periods (e.g., 14-day, 30-day, holiday extended returns).
- **Consumable & License Expiry**: Tracking expiry dates for household supplies, memberships, software licenses, certificates, and perishable goods.
- **Proactive Notification Engine**: Multi-channel reminders (in-app notifications, browser push, email alerts, and `.ics` calendar sync) at critical intervals (e.g., 7 days, 3 days, 24 hours before deadline).

### 4. Service & Preventive Maintenance Schedules
- **Asset Service Profiles**: Dedicated schedules for vehicles, home appliances, HVAC, electronics, and power tools.
- **Interval Tracking**: Mileage-based and calendar-based recurring service triggers (e.g., oil change every 6 months / 5,000 miles, water filter replacement every 90 days).
- **Service History Log**: Chronological record of repairs, costs, mechanic/vendor notes, and attached service receipts.

### 5. Encrypted Ownership Document Vault
- **Document Repository**: Secure storage for receipts, warranty cards, insurance certificates, appraisals, manuals, and title deeds.
- **Metadata Tagging**: Categorized by asset, brand, location (e.g., Home, Office, Vehicle), and replacement value.
- **Insurance Inventory Export**: Instant CSV/PDF report of registered household items with total declared replacement value and attached ownership proofs for insurance claims.

### 6. Conversational AI Assistant ("Cognia Intelligence")
- **Semantic Retrieval**: Natural language search across all user assets and documents:
  - *"Which vacuum cleaner do I own and is it still under warranty?"*
  - *"How much did I spend on electronics in the last 6 months?"*
  - *"Find the user manual for my microwave."*
- **Context-Aware Drafting**: AI generates return inquiry letters or warranty claim messages using specific receipt and purchase metadata.

---

## Non-Goals (Scope Boundaries for MVP / Phase 1)

- **Out of Scope for Initial MVP**:
  - Direct banking / Open Banking API integrations (Plaid/Yodlee) for automated bank feed sync (deferred to v2).
  - Multi-tenant enterprise inventory and commercial asset depreciation accounting.
  - Direct in-app warranty underwriting or insurance policy sales.
  - Native iOS/Android compiled app builds (MVP targets responsive PWA with mobile camera support).

---

## Technical Constraints & Architecture

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide icons, responsive mobile-first UI.
- **Backend / API**: Next.js Server Actions / API Routes + FastAPI Python microservice (or unified TypeScript stack) for document processing and AI orchestration.
- **AI & Vision Model**: Google Gemini API (`gemini-2.5-flash` / `gemini-1.5-flash`) for fast, cost-effective multimodal OCR and structured JSON output.
- **Database & Storage**:
  - PostgreSQL with Prisma ORM / Drizzle ORM, with `pgvector` for semantic search embeddings.
  - Encrypted file storage (S3-compatible / Supabase Storage / local encrypted storage in dev).
- **Authentication**: Modern session-based or token-based auth (e.g. NextAuth / Auth0 / Supabase Auth).
- **Security & Privacy**: Client-side metadata sanitation and encrypted storage for sensitive documents.

---

## Success Criteria

- [ ] **Document Ingestion**: User can upload an image or PDF of a receipt and have product name, price, date, and warranty accurately extracted into structured records within 5 seconds.
- [ ] **Dashboard Overview**: User sees unified timeline of upcoming return deadlines, warranties expiring within 30 days, and pending service schedules.
- [ ] **Claim Packet Export**: User can generate a complete warranty claim PDF packet in 1 click.
- [ ] **Vault Search**: User can locate any receipt or manual by natural language search or category filtering in under 1 second.
- [ ] **Alerts & Reminders**: System triggers automated alerts before return windows and warranty periods expire.

---

*Last updated: 2026-11-15 (Drafted by GSD Planner)*
