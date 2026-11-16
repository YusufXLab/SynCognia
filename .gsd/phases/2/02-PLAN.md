---
phase: 2
plan: 2
wave: 2
depends_on: ["01"]
gap_closure: false
---

# Plan 2.2: Interactive Review/Edit UI, Atomic Multi-Model Persistence & End-to-End Verification

## Objective
Deliver the interactive user experience for receipt capture and human-in-the-loop verification. This includes the drag-and-drop file dropzone with camera capture support, the side-by-side receipt review and edit interface, the atomic transactional Server Action persisting Assets, Receipts, Warranties, Return Policies, and Documents in SQLite, and an automated end-to-end integration verification script.

## Context
Load these files for context:
- .gsd/SPEC.md
- .gsd/ROADMAP.md
- .gsd/phases/2/RESEARCH.md
- .gsd/phases/2/01-PLAN.md
- prisma/schema.prisma
- lib/types/receipt.ts
- lib/actions/assets.ts
- components/dashboard/QuickActions.tsx

## Tasks

<task type="auto">
  <name>Implement atomic database persistence Server Action and validation schemas</name>
  <files>
    lib/validations/ingest.ts
    lib/actions/ingest.ts
  </files>
  <action>
    Create the transactional Server Action to atomically persist extracted and reviewed receipt data across related Prisma models.

    Steps:
    1. Create `lib/validations/ingest.ts`:
       - Define `PersistReceiptInput` schema: `fileUrl`, `merchant`, `purchaseDate`, `totalAmount`, `currency`, `rawSummary?`, `items` (array with `name`, `category`, `price`, `quantity`, `brand?`, `modelNumber?`, `serialNumber?`), `warranty?` (`provider`, `durationMonths`, `warrantyType`), `returnPolicy?` (`returnWindowDays`), `location?`, `notes?`.
       - Validation helper ensuring valid dates, positive amounts, and at least one item or merchant name.
    2. Create `lib/actions/ingest.ts` with `'use server'` action `persistExtractedReceipt(input: PersistReceiptInput)`:
       - Resolve default `userId` (first user found in database, e.g. `user_demo_1`).
       - Execute atomic database mutation using `prisma.$transaction(async (tx) => { ... })`:
         - Determine primary product from items array (first item or fallback to merchant purchase).
         - Calculate warranty `startDate` (defaults to purchase date) and `endDate` (`purchaseDate + durationMonths`). Determine warranty status (`ACTIVE` vs `EXPIRING_SOON` if within 30 days).
         - Calculate return policy `returnDeadline` (`purchaseDate + returnWindowDays`). Determine return status (`OPEN` vs `EXPIRED`).
         - Create `Asset` with name, category, brand, modelNumber, serialNumber, purchaseDate, purchasePrice, currency, location, and notes.
         - Create `Receipt` linked to `asset.id` with `fileUrl`, `merchant`, `purchaseDate`, `totalAmount`, `currency`, and `rawOcrText`.
         - If warranty information is provided, create `Warranty` record linked to `asset.id`.
         - If return policy information is provided, create `ReturnPolicy` record linked to `asset.id`.
         - Create `Document` record in Document Vault linked to `asset.id` with `title: "${merchant} Receipt"`, `documentType: "INVOICE"`, and `fileUrl`.
       - Revalidate dashboard and catalog paths: `revalidatePath("/")`, `revalidatePath("/assets")`, `revalidatePath("/receipts")`.
       - Return `{ success: true, data: { assetId, receiptId, warrantyId, returnPolicyId, documentId } }`.
       - Wrap in try/catch returning `{ success: false, error }` on any transactional failure.

    AVOID: Partial database writes where an Asset is created but its Receipt or Warranty fails, causing orphaned or corrupted records.
    USE: Single `prisma.$transaction` ensuring all 4 domain records succeed or roll back atomically.
  </action>
  <verify>
    npm run build
  </verify>
  <done>
    `lib/actions/ingest.ts` compiles cleanly and executes atomic persistence within a single Prisma transaction.
  </done>
</task>

<task type="auto">
  <name>Build drag-and-drop dropzone, side-by-side review UI, and receipts page</name>
  <files>
    components/receipts/ReceiptDropzone.tsx
    components/receipts/ReceiptReviewView.tsx
    app/receipts/page.tsx
    components/dashboard/QuickActions.tsx
  </files>
  <action>
    Build the user-facing receipt capture components, side-by-side verification editor, and receipts hub page.

    Steps:
    1. Create `components/receipts/ReceiptDropzone.tsx`:
       - Client component (`"use client"`) with drag-and-drop event handlers (`onDragOver`, `onDragLeave`, `onDrop`).
       - Visual states: idle (clean dashed border, upload icon), dragging (highlighted indigo border/background), uploading (spinner and extraction progress indicator).
       - File input with `accept="image/*,application/pdf"` and camera capture trigger (`capture="environment"`).
       - File validation: alerts for files > 10MB or unsupported extensions.
       - Submits file to `/api/ingest/extract` via `FormData` and invokes `onExtractionComplete(fileInfo, extractedData)` on success.
    2. Create `components/receipts/ReceiptReviewView.tsx`:
       - Client component (`"use client"`) presenting side-by-side human-in-the-loop verification:
         - **Left panel (Preview)**: Original receipt image preview with zoom toggle and link to open original file; or PDF icon for PDFs.
         - **Right panel (Edit Form)**: Editable fields initialized from AI extraction:
           - Merchant Name, Purchase Date, Total Amount, Currency.
           - Line items list with item name, category, price, quantity, serial number, and ability to add/remove line items.
           - Warranty card with editable provider, duration (months), warranty type, and live calculated expiration date preview.
           - Return policy card with editable return window (days) and live calculated return deadline preview.
           - Location selector (e.g. Home Office, Kitchen, Living Room, Garage) and notes.
         - **Action controls**: "Discard / Cancel" button and primary "Confirm & Save to Inventory" button triggering `persistExtractedReceipt`.
         - Success state displaying confirmed asset card with links to "View in Assets Catalog" or "Scan Another Receipt".
    3. Create `app/receipts/page.tsx`:
       - Ingestion center page with header title, stats summary, and mode toggle between "Upload Receipt" and "Receipts Library".
       - Seamlessly switches between `ReceiptDropzone` and `ReceiptReviewView` when a receipt is uploaded and extracted.
       - Displays historical list of receipts from `getReceipts()` showing merchant, purchase date, total amount, attached asset badge, and receipt file thumbnail preview.
    4. Update `components/dashboard/QuickActions.tsx`:
       - Wire "Scan Receipt" button with `<Link href="/receipts">` so clicking it from the dashboard navigates directly to the receipt capture interface.

    AVOID: Un-editable AI extractions that force users to accept hallucinated OCR numbers or incorrect categories.
    USE: Human-in-the-loop review interface allowing one-click confirmation or rapid correction before database commitment.
  </action>
  <verify>
    npm run build
  </verify>
  <done>
    `app/receipts/page.tsx` renders cleanly with interactive dropzone, side-by-side review editor, and `npm run build` succeeds without TypeScript errors.
  </done>
</task>

<task type="auto">
  <name>Create and run comprehensive Phase 2 end-to-end verification test script</name>
  <files>
    scripts/verify-phase-2.ts
  </files>
  <action>
    Implement an automated integration test script validating the full Phase 2 receipt ingestion and persistence pipeline.

    Steps:
    1. Create `scripts/verify-phase-2.ts`:
       - **Test 1: Storage Adapter**: Saves a dummy receipt buffer to `public/uploads/receipts/` and asserts file exists, hash is generated, and URL is formatted correctly.
       - **Test 2: Gemini Extraction Service**: Executes `extractReceiptData` with test image/document buffer and validates returned fields (`merchant`, `purchaseDate`, `items`, `totalAmount`, `detectedWarranty`, `returnPolicy`).
       - **Test 3: Atomic Persistence Transaction**: Calls `persistExtractedReceipt` with structured input:
         - Verifies Asset is created in SQLite with correct properties.
         - Verifies Receipt is created and linked to the Asset.
         - Verifies Warranty is created with `endDate` matching `purchaseDate + durationMonths`.
         - Verifies ReturnPolicy is created with `returnDeadline` matching `purchaseDate + returnWindowDays`.
         - Verifies Document record is created with `documentType: "INVOICE"`.
       - **Test 4: Relational Query Check**: Queries `prisma.asset.findUnique` with `{ include: { receipts: true, warranties: true, returnPolicies: true, documents: true } }` and verifies all relationships are populated.
       - **Test 5: Cleanup & Integrity**: Removes test records created during test run.
       - Prints comprehensive checklist with individual check timings and PASS/FAIL summary.
    2. Run the script: `npx tsx scripts/verify-phase-2.ts`.

    AVOID: Test scripts that leave untracked junk records in the database.
    USE: Clean test lifecycle that cleans up test IDs or uses isolated test records.
  </action>
  <verify>
    npx tsx scripts/verify-phase-2.ts
  </verify>
  <done>
    `npx tsx scripts/verify-phase-2.ts` executes all 5 test phases and passes 100% of assertions.
  </done>
</task>

## Must-Haves
After all tasks complete, verify:
- [ ] Atomic persistence Server Action `persistExtractedReceipt` creates Asset, Receipt, Warranty, ReturnPolicy, and Document in a single transaction.
- [ ] Interactive dropzone component supports drag-and-drop, file picking, and camera capture.
- [ ] Side-by-side review UI allows users to inspect original file and edit fields before saving.
- [ ] Ingestion page `/receipts` is accessible and linked from dashboard "Scan Receipt" quick action.
- [ ] `npx tsx scripts/verify-phase-2.ts` passes all tests.

## Success Criteria
- [ ] All tasks verified passing
- [ ] Must-haves confirmed
