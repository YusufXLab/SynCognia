---
phase: 1
researched_at: 2026-11-15
discovery_level: 1
---

# Phase 1 Research: Foundation & Data Architecture

## Objective
Establish the foundational application structure, styling system, and database schema for SynCognia.

## Discovery Level
**Level 1** — Quick Verification of Next.js 15 App Router + Prisma ORM + Tailwind CSS + SQLite/PostgreSQL setup.

## Key Decisions

### Decision 1: Application Framework
- **Decision:** Next.js 15 with App Router, TypeScript, React 19.
- **Rationale:** Server Actions simplify CRUD operations and API routes without needing a separate backend server in early phases.

### Decision 2: Database & ORM
- **Decision:** Prisma ORM with SQLite for local development and seamless migration to PostgreSQL (`pgvector`).
- **Rationale:** Fast setup, type-safe schema generation (`@prisma/client`), and simple migrations for models: `User`, `Asset`, `Receipt`, `Warranty`, `ReturnPolicy`, `MaintenanceSchedule`, `Document`.

### Decision 3: Styling & UI Primitives
- **Decision:** Tailwind CSS + Lucide React icons + reusable UI components (`Card`, `Badge`, `Button`, `Dialog`).
- **Rationale:** Mobile-first, responsive dashboard layout with dark/light theme support.

## Dependencies Identified
| Package | Version | Purpose |
|---|---|---|
| next | ^15.0.0 | Full-stack React framework |
| react | ^19.0.0 | UI rendering |
| react-dom | ^19.0.0 | DOM rendering |
| @prisma/client | ^5.20.0 | Type-safe database client |
| prisma | ^5.20.0 | Database ORM CLI & migration engine |
| tailwindcss | ^3.4.0 | Utility-first CSS |
| lucide-react | ^0.450.0 | Iconography |
| clsx | ^2.1.0 | Utility class merging |
| tailwind-merge | ^2.5.0 | Utility class deduplication |

## Recommendations for Planning
1. **Plan 1.1**: Project setup, Next.js configuration, Tailwind design system, responsive navigation shell and dashboard layout.
2. **Plan 1.2**: Prisma schema modeling (`Asset`, `Receipt`, `Warranty`, `ReturnPolicy`, `MaintenanceSchedule`, `Document`), database initialization, and comprehensive seed script with realistic demo data.
3. **Plan 1.3**: Core server actions and REST API route handlers (`/api/assets`, `/api/receipts`, `/api/warranties`) with validation and tests.
