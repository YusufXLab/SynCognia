---
phase: 1
plan: 3
wave: 2
depends_on: ["01"]
gap_closure: false
---

# Plan 1.3: Core Server Actions, API Route Handlers, and Verification

## Objective
Implement core Next.js Server Actions and REST API Route Handlers for managing assets, receipts, and warranties. Add input validation, error handling, query filtering (category, search, status), and comprehensive integration verification tests.

## Context
Load these files for context:
- .gsd/SPEC.md
- .gsd/ROADMAP.md
- .gsd/phases/1/RESEARCH.md
- .gsd/phases/1/01-PLAN.md
- .gsd/phases/1/02-PLAN.md

## Tasks

<task type="auto">
  <name>Implement Server Actions and input validation schemas</name>
  <files>
    lib/validations/asset.ts
    lib/actions/assets.ts
    lib/actions/receipts.ts
    lib/actions/warranties.ts
  </files>
  <action>
    Create input validation utilities and type-safe Server Actions for asset, receipt, and warranty lifecycle management.
    
    Steps:
    1. Create `lib/validations/asset.ts` defining input schemas and TypeScript types for:
       - Asset creation/update (name, category, brand, modelNumber, serialNumber, purchaseDate, purchasePrice, currency, location, notes).
       - Receipt creation (merchant, purchaseDate, totalAmount, currency, rawOcrText, fileUrl).
       - Warranty creation (provider, warrantyType, durationMonths, startDate, endDate, policyNumber, supportContact, claimUrl, status).
    2. Implement `lib/actions/assets.ts` with `'use server'` actions:
       - `getAssets(filter?: { category?: string; status?: string; search?: string })`: returns assets including related warranty, receipt, and maintenance summary.
       - `getAssetById(id: string)`: returns full asset details with all related records (receipts, warranties, return policies, schedules, documents).
       - `createAsset(input: CreateAssetInput)`: validates data and inserts new asset into Prisma database.
       - `updateAsset(id: string, input: UpdateAssetInput)`: updates asset fields.
       - `deleteAsset(id: string)`: deletes asset record.
    3. Implement `lib/actions/receipts.ts` with `'use server'` actions:
       - `getReceipts(assetId?: string)`: fetches receipts with optional asset filter.
       - `createReceipt(input: CreateReceiptInput)`: links receipt to asset.
    4. Implement `lib/actions/warranties.ts` with `'use server'` actions:
       - `getWarranties(status?: string)`: fetches warranties with asset relation.
       - `createWarranty(input: CreateWarrantyInput)`: attaches warranty to asset.
       - `updateWarrantyStatus(id: string, status: string)`: updates warranty status badge.
    
    AVOID: Unhandled exceptions escaping to the client; always wrap operations in try/catch and return structured `{ success: boolean, data?: T, error?: string }` responses.
    USE: Prisma transaction or relational queries (`include: { warranties: true, receipts: true }`) for optimal query performance.
  </action>
  <verify>
    npm run build
  </verify>
  <done>
    Validation schemas and server actions compile cleanly with full TypeScript type checking.
  </done>
</task>

<task type="auto">
  <name>Build REST API route handlers and end-to-end verification script</name>
  <files>
    app/api/assets/route.ts
    app/api/assets/[id]/route.ts
    app/api/receipts/route.ts
    app/api/warranties/route.ts
    scripts/verify-phase-1.ts
  </files>
  <action>
    Create Next.js 15 API route handlers for programmatic REST access and an automated verification test script.
    
    Steps:
    1. Create `app/api/assets/route.ts`:
       - `GET`: Parse query parameters (`category`, `status`, `search`) and return filtered assets list in JSON.
       - `POST`: Parse request body, validate with `assetSchema`, create asset, and return 201 Created.
    2. Create `app/api/assets/[id]/route.ts`:
       - Note: In Next.js 15, route parameters are asynchronous: `context: { params: Promise<{ id: string }> }`. Await `params` before accessing `id`.
       - `GET`: Fetch asset by ID with relations, return 404 if not found.
       - `PATCH`: Update asset by ID and return updated record.
       - `DELETE`: Delete asset by ID and return confirmation.
    3. Create `app/api/receipts/route.ts`:
       - `GET`: Return all receipts, optional filter by `assetId`.
       - `POST`: Add manual receipt entry.
    4. Create `app/api/warranties/route.ts`:
       - `GET`: Return warranties list, optional filter by `status`.
       - `POST`: Add new warranty record.
    5. Build `scripts/verify-phase-1.ts`:
       - Invokes server actions directly or tests database queries to create a test asset, retrieve it, query its warranties and receipts, update it, and verify seeded items.
       - Confirms that all CRUD operations, filtering, and Prisma relationships behave properly.
       - Prints clear PASS/FAIL report for each check.
    
    AVOID: Synchronously accessing `params.id` in `[id]/route.ts` which breaks under Next.js 15.
    USE: `await params` syntax for Next.js 15 dynamic route segments.
  </action>
  <verify>
    npx tsx scripts/verify-phase-1.ts
  </verify>
  <done>
    API route handlers compile cleanly, and `npx tsx scripts/verify-phase-1.ts` executes with all verification checks passing with status 200/success.
  </done>
</task>

## Must-Haves
After all tasks complete, verify:
- [ ] Server actions for Asset, Receipt, and Warranty CRUD operations exist in `lib/actions/` and handle errors cleanly.
- [ ] Input validation schemas in `lib/validations/` validate fields with type safety.
- [ ] Next.js 15 REST route handlers (`/api/assets`, `/api/assets/[id]`, `/api/receipts`, `/api/warranties`) handle GET, POST, PATCH, and DELETE requests properly.
- [ ] Verification script `scripts/verify-phase-1.ts` runs and passes all CRUD and relation checks.

## Success Criteria
- [ ] All tasks verified passing
- [ ] Must-haves confirmed
