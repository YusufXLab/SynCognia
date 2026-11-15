---
phase: 1
plan: 2
wave: 2
depends_on: ["01"]
gap_closure: false
---

# Plan 1.2: Prisma Database Schema, Domain Models, and Seed Migrations

## Objective
Design and implement the comprehensive relational database schema using Prisma ORM with SQLite for local development. Define models for Users, Assets, Receipts, Warranties, Return Policies, Maintenance Schedules, and Vault Documents. Instantiate a singleton Prisma client and execute seed migrations containing realistic household, electronics, appliance, and vehicle records.

## Context
Load these files for context:
- .gsd/SPEC.md
- .gsd/ROADMAP.md
- .gsd/phases/1/RESEARCH.md
- .gsd/phases/1/01-PLAN.md

## Tasks

<task type="auto">
  <name>Define Prisma schema and initialize database client</name>
  <files>
    prisma/schema.prisma
    lib/prisma.ts
  </files>
  <action>
    Configure Prisma ORM with SQLite provider and define all required SynCognia core models and relationships.
    
    Steps:
    1. Create `prisma/schema.prisma` configuring `datasource db` with `provider = "sqlite"` and `url = env("DATABASE_URL")` (default `file:./dev.db`).
    2. Define models with proper foreign keys, indices, and cascade rules:
       - `User`: id, email (unique), name, avatarUrl, createdAt, updatedAt.
       - `Asset`: id, userId (relation to User), name, category (e.g., Electronics, Appliances, Vehicles, Tools), brand, modelNumber, serialNumber, purchaseDate, purchasePrice (Float), currency (default "USD"), location (e.g., Home Office, Kitchen, Garage), status (e.g., ACTIVE, SOLD, RETIRED), notes, createdAt, updatedAt.
       - `Receipt`: id, assetId (optional relation to Asset), merchant, purchaseDate, totalAmount (Float), currency, rawOcrText, fileUrl, mimeType, createdAt, updatedAt.
       - `Warranty`: id, assetId (relation to Asset), provider (e.g., Apple, Dyson, SquareTrade), warrantyType (e.g., MANUFACTURER, EXTENDED), durationMonths (Int), startDate, endDate, policyNumber, supportContact, claimUrl, status (e.g., ACTIVE, EXPIRING_SOON, EXPIRED), createdAt, updatedAt.
       - `ReturnPolicy`: id, assetId (relation to Asset), returnWindowDays (Int), returnDeadline, policyDetails, returnStatus (e.g., OPEN, EXPIRED, RETURNED), createdAt, updatedAt.
       - `MaintenanceSchedule`: id, assetId (relation to Asset), title, intervalMonths (Int optional), intervalMileage (Int optional), lastServiceDate, nextServiceDate, currentMileage (Int optional), lastServiceCost (Float optional), notes, status (e.g., UPCOMING, DUE, COMPLETED), createdAt, updatedAt.
       - `Document`: id, assetId (relation to Asset), title, documentType (e.g., MANUAL, INVOICE, WARRANTY_CARD, TITLE_DEED), fileUrl, fileSize (Int), mimeType, isEncrypted (Boolean default false), createdAt, updatedAt.
    3. Create `lib/prisma.ts` implementing a singleton PrismaClient instance using `globalThis` to prevent exhausting database connections across Next.js hot module reloads.
    4. Run `npx prisma db push` to synchronize the SQLite database and generate the Prisma Client.
    
    AVOID: Creating multiple PrismaClient instances across requests which causes SQLite database lock errors.
    USE: Global singleton pattern in `lib/prisma.ts` and strongly typed Prisma models.
  </action>
  <verify>
    npx prisma validate && npx prisma db push
  </verify>
  <done>
    `prisma/schema.prisma` validates cleanly, SQLite database file is created, and Prisma Client types are generated.
  </done>
</task>

<task type="auto">
  <name>Create and execute realistic seed dataset</name>
  <files>
    prisma/seed.ts
    package.json
  </files>
  <action>
    Develop a comprehensive seed script that populates the database with realistic demo assets across various categories.
    
    Steps:
    1. Create `prisma/seed.ts` populating:
       - Default Demo User (`demo@syncognia.local`, "Demo User").
       - Asset 1 (Electronics): "MacBook Pro 16\" M3 Max" with AppleCare+ Warranty (Active), Apple Store Receipt ($3,499.00), expired Return Policy, and PDF user manual Document.
       - Asset 2 (Audio): "Sony WH-1000XM5 Noise Canceling Headphones" with Manufacturer Warranty (Active, expires in 45 days), Best Buy Receipt ($398.00), and Open Return Window (expires in 5 days).
       - Asset 3 (Appliances): "Dyson V15 Detect Cordless Vacuum" with Dyson 2-Year Warranty (Expiring in 20 days -> EXPIRING_SOON status), Dyson.com Receipt ($749.99), and recurring 6-month Filter Cleaning MaintenanceSchedule.
       - Asset 4 (Vehicles): "2022 Honda Civic EX" with Powertrain Warranty, Dealership Bill of Sale, and dual interval MaintenanceSchedule: Oil Change & Tire Rotation (every 6 months or 5,000 miles, current mileage 24,500).
       - Asset 5 (Kitchen): "Breville Barista Touch Espresso Machine" with 1-Year Limited Warranty (EXPIRED status) and recurring Water Filter / Descaling MaintenanceSchedule.
    2. Add `"prisma": { "seed": "npx tsx prisma/seed.ts" }` to `package.json` (install `tsx` as devDependency if not present).
    3. Run the seed command: `npx prisma db seed`.
    4. Verify the database contains all seeded models by running a query check or counting records.
    
    AVOID: Using minimal or placeholder "test" strings that fail to demonstrate realistic receipt extraction and warranty data structures.
    USE: Accurate metadata, realistic dates (some active, some expiring soon within 30 days, some expired) to exercise future dashboard filters.
  </action>
  <verify>
    npx prisma db seed
  </verify>
  <done>
    `npx prisma db seed` runs successfully and inserts demo users, assets, receipts, warranties, return policies, schedules, and documents.
  </done>
</task>

## Must-Haves
After all tasks complete, verify:
- [ ] Prisma schema defines User, Asset, Receipt, Warranty, ReturnPolicy, MaintenanceSchedule, and Document models with all relationships.
- [ ] Database schema is deployed to local SQLite database via `npx prisma db push`.
- [ ] Prisma client singleton in `lib/prisma.ts` compiles without type errors.
- [ ] `npx prisma db seed` populates realistic records across multiple categories and lifecycle states (Active, Expiring Soon, Expired).

## Success Criteria
- [ ] All tasks verified passing
- [ ] Must-haves confirmed
