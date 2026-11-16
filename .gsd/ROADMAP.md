---
milestone: SynCognia MVP
version: 0.1.0
updated: 2026-11-16T13:48:00+05:30
---

# Roadmap

> **Current Phase:** 3 - Warranty Tracking & Return/Expiry Intelligence Engine
> **Status:** ready_to_plan

## Must-Haves (from SPEC)

- [x] Core data architecture (Asset, Receipt, Warranty, ReturnPolicy, ServiceSchedule, Document) with Prisma ORM
- [x] Multimodal Receipt OCR and AI extraction via Gemini API
- [ ] Active Warranty, Expiry & Return Window calculation engine with dashboard alerts
- [ ] Service & maintenance scheduling with log history
- [ ] Encrypted Document Vault with 1-click insurance & claim dossier export
- [ ] Natural language search and AI Assistant ("Cognia Intelligence")

---

## Phases

### Phase 1: Foundation & Data Architecture
**Status:** ✅ Complete
**Objective:** Scaffold Next.js 15 application shell, Tailwind styling system, Prisma ORM database models, seed datasets, and core asset management API endpoints.
**Requirements:** Foundation for all asset & receipt data storage and core dashboard shell.

**Plans:**
- [x] Plan 1.1: Project scaffold, configuration, and design system shell
- [x] Plan 1.2: Prisma database schema, domain models, and seed migrations
- [x] Plan 1.3: Core Asset & Receipt CRUD services and API route handlers

---

### Phase 2: AI Multi-Modal Ingestion & Receipt Extraction
**Status:** ✅ Complete
**Objective:** Multimodal capture pipeline (file dropzone, image/PDF processing), Gemini 2.5 Flash structured receipt OCR parsing, and review/edit verification UI.
**Depends on:** Phase 1

**Plans:**
- [x] Plan 2.1: Multi-modal document upload pipeline & storage adapter
- [x] Plan 2.2: Gemini structured receipt extraction engine & verification UI

---

### Phase 3: Warranty Tracking & Return/Expiry Intelligence Engine
**Status:** ⬜ Not Started (Next)
**Objective:** Real-time warranty coverage calculations, return window countdowns, expiring soon dashboard badges, notification schedule triggers, and RFC 5545 calendar export.
**Depends on:** Phase 2

**Plans:**
- [ ] Plan 3.1: Warranty & Return Policy Calculation Engine, Status Sync & Server Actions
- [ ] Plan 3.2: Expiry Notification Dispatcher & RFC 5545 Calendar (.ics) Export Engine
- [ ] Plan 3.3: Warranties Hub UI, Live Dashboard Integration & Comprehensive Verification

---

### Phase 4: Service Schedules & Preventive Maintenance
**Status:** ⬜ Not Started
**Objective:** Recurring maintenance interval trackers (vehicles, appliances, home systems), service log entry forms, and maintenance history timeline.
**Depends on:** Phase 3

**Plans:**
- [ ] Plan 4.1: Preventive maintenance profile engine and recurrence tracker
- [ ] Plan 4.2: Service logging UI, receipt linking, and history timeline

---

### Phase 5: Ownership Vault & 1-Click Claim Dossier Generator
**Status:** ⬜ Not Started
**Objective:** Encrypted document storage, categorized asset attachments, insurance inventory PDF/CSV export, and 1-click warranty claim dossier packager.
**Depends on:** Phase 4

**Plans:**
- [ ] Plan 5.1: Encrypted document vault with category tagging and file previews
- [ ] Plan 5.2: Insurance inventory export & 1-click claim dossier PDF generator

---

### Phase 6: Cognia Intelligence Assistant & Semantic Search
**Status:** ⬜ Not Started
**Objective:** Vector embeddings for documents/receipts, natural language asset search, and context-aware warranty claim drafting assistant.
**Depends on:** Phase 5

**Plans:**
- [ ] Plan 6.1: Semantic asset indexing and natural language search API
- [ ] Plan 6.2: Conversational assistant UI for asset Q&A and claim email drafting

---

## Progress Summary

| Phase | Status | Plans | Complete |
|-------|--------|-------|----------|
| 1 | ✅ | 3/3 | 100% |
| 2 | ✅ | 2/2 | 100% |
| 3 | ⬜ | 0/3 | 0% |
| 4 | ⬜ | 0/2 | 0% |
| 5 | ⬜ | 0/2 | 0% |
| 6 | ⬜ | 0/2 | 0% |
