---
phase: 5
plan: 3
wave: 3
depends_on: ["5.2"]
gap_closure: false
---

# Plan 5.3: Document Vault Hub UI, Claim Dossier Integration & Automated Verification Suite

## Objective
Deliver the user-facing Document Vault Hub (`/vault`), document card/table views, preview modal, upload modal with drag-and-drop file upload, claim dossier modal on Warranty cards and QuickActions, and create the comprehensive automated Phase 5 verification test suite.

## Context
Load these files for context:
- .gsd/SPEC.md
- .gsd/ROADMAP.md
- .gsd/phases/5/RESEARCH.md
- lib/types/vault.ts
- lib/actions/vault.ts
- lib/services/insuranceExport.ts
- lib/services/claimDossier.ts
- components/warranties/WarrantyCard.tsx
- components/dashboard/QuickActions.tsx
- components/layout/Sidebar.tsx
- scripts/verify-phase-4.ts

## Tasks

<task type="auto">
  <name>Build Document Vault Hub UI (/vault), preview modal, and upload modal with drag-and-drop</name>
  <files>
    app/vault/page.tsx
    components/vault/DocumentCard.tsx
    components/vault/DocumentTableRow.tsx
    components/vault/DocumentPreviewModal.tsx
    components/vault/UploadDocumentModal.tsx
  </files>
  <action>
    Create the Document Vault Hub page, card/table view components, preview modal with SHA-256 integrity display, and drag-and-drop upload modal.

    Steps:
    1. Create `components/vault/DocumentCard.tsx` and `DocumentTableRow.tsx`:
       - Display document title, category badge with distinct Tailwind styling (`MANUAL`, `INVOICE`, `WARRANTY_CARD`, `TITLE_DEED`, `CERTIFICATE`, `INSURANCE_POLICY`, `APPRAISAL`).
       - Display linked asset name and link to asset details.
       - Display formatted file size (e.g. `2.4 MB`, `450 KB`), MIME icon (PDF vs Image), and formatted creation date.
       - Display encryption badge (`ShieldCheck` icon: "Encrypted") if `isEncrypted: true`.
       - Provide quick action triggers: Preview, Direct Download, Delete.
    2. Create `components/vault/DocumentPreviewModal.tsx`:
       - Responsive modal for viewing document contents.
       - If PDF: embedded `<iframe>` viewer.
       - If Image: scaled preview container.
       - Metadata panel: Category, Associated Asset, File Size, Upload Date, Encryption status, and calculated/stored SHA-256 hash badge.
       - Action buttons: "Download File" and "Close".
    3. Create `components/vault/UploadDocumentModal.tsx`:
       - Drag-and-drop dropzone supporting PDF, JPEG, PNG, WEBP, HEIC up to 15MB.
       - Client-side size check rejecting files > 15MB before upload.
       - Form controls:
         - Title input (defaults to sanitized original filename)
         - Category select dropdown (`DOCUMENT_TYPES`)
         - Asset association dropdown (fetches user assets)
         - Encryption checkbox toggle ("Enable simulated metadata encryption")
       - Multipart submission to `/api/vault/upload`.
       - Error banner for unsupported formats or upload failures.
       - Callback to refresh vault items upon successful upload.
    4. Create `app/vault/page.tsx`:
       - Header with title "Ownership Document Vault", active record counter, "Upload Document" CTA button, and "Export Insurance Schedule" dropdown (offering CSV download or printable HTML view).
       - 4 Metric Summary Cards:
         - Total Documents
         - Encrypted Files
         - Covered Assets
         - Vault Storage Used (formatted MB)
       - Category filter pills (`ALL`, `MANUAL`, `INVOICE`, `WARRANTY_CARD`, `TITLE_DEED`, `CERTIFICATE`, `INSURANCE_POLICY`, `APPRAISAL`) with counts.
       - Real-time search bar filtering across title, category, and associated asset name.
       - Grid vs Table view toggle.
       - Responsive grid of `DocumentCard`s or table of `DocumentTableRow`s.
       - Empty state with upload CTA when no matching documents are found.
       - Modal mounts for `DocumentPreviewModal` and `UploadDocumentModal`.

    AVOID: Unhandled large file uploads that fail silently without notifying the user.
    USE: Explicit file size validation (<= 15MB) with user-friendly error banners.
  </action>
  <verify>
    npm run build
  </verify>
  <done>
    `app/vault/page.tsx` builds cleanly, renders summary metrics, category filters, grid/table views, and allows previewing and uploading documents.
  </done>
</task>

<task type="auto">
  <name>Integrate Claim Dossier generator modal into Warranty cards and QuickActions</name>
  <files>
    components/vault/ClaimDossierModal.tsx
    components/warranties/WarrantyCard.tsx
    components/dashboard/QuickActions.tsx
  </files>
  <action>
    Build the interactive Claim Dossier modal and integrate 1-click claim dossier generation triggers into Warranty cards and Dashboard QuickActions.

    Steps:
    1. Create `components/vault/ClaimDossierModal.tsx`:
       - Modal that receives `assetId: string` and optional `warrantyId?: string`.
       - Fetches dossier data from `/api/claim-dossier/[assetId]?format=json`.
       - Renders interactive dossier packet view:
         - Claim reference badge (`CLM-...`), generation date, claimant info.
         - Asset specifications table (Brand, Model, Serial #, Purchase Date, Retailer).
         - Warranty coverage terms (Provider, Policy #, Status, Support Contact).
         - Proof of purchase thumbnail and receipt details.
         - Pre-drafted formal claim letter in a styled letterhead card with "Copy Letter" clipboard action.
         - Attached vault documents checklist.
       - Header actions:
         - "Print Dossier / Save as PDF" button opening printable view `/api/claim-dossier/[assetId]?format=html` in new tab / window.
         - "Download HTML" button.
         - "Close" button.
    2. Update `components/warranties/WarrantyCard.tsx`:
       - Add a "Claim Dossier" button in the card footer alongside Calendar and Start Claim.
       - When clicked, opens `ClaimDossierModal` for the warranty's associated asset.
       - If asset or warranty is expired or missing claim URL, user can still generate the complete dossier packet to file manually.
    3. Update `components/dashboard/QuickActions.tsx`:
       - Wire "Claim Dossier" action card:
         - Opens a selection dialog or navigates to `/vault` with the claim dossier export tools.

    AVOID: Breaking existing WarrantyCard or QuickActions functionality.
    USE: Modal state toggles that enhance user workflows without page reload.
  </action>
  <verify>
    npm run build
  </verify>
  <done>
    Claim dossier modal renders complete claim details and pre-drafted letters, and is accessible directly from Warranty cards and Dashboard QuickActions.
  </done>
</task>

<task type="auto">
  <name>Create comprehensive Phase 5 automated verification suite and add npm test script</name>
  <files>
    scripts/verify-phase-5.ts
    package.json
  </files>
  <action>
    Build the automated end-to-end verification script testing vault storage, CRUD actions, REST APIs, insurance CSV export, and claim dossier generation.

    Steps:
    1. Create `scripts/verify-phase-5.ts`:
       - Setup check runner tracking total, passed, and failed assertions.
       - **Section 1: Vault Storage Adapter**:
         - Store a test file buffer (PDF or JPEG) using `saveVaultDocument`.
         - Verify returned file size, unique filename, and SHA-256 hash.
         - Test `verifyFileHash` returns true for matching hash and false for corrupted hash.
         - Verify 15MB limit rejects buffers > 15MB with appropriate error.
         - Verify unsupported MIME types (e.g. `application/zip`) are rejected.
         - Test `deleteVaultDocument` cleans up file from disk and prevents path traversal.
       - **Section 2: Document Server Actions**:
         - Create a temporary test asset.
         - Call `createDocument` with `assetId`, `title`, `documentType: "INSURANCE_POLICY"`, `isEncrypted: true`.
         - Call `getDocuments({ assetId })` and verify returned record.
         - Call `getDocuments({ documentType: "INSURANCE_POLICY" })` and verify category filtering.
         - Call `getDocumentById` and verify asset relationship.
         - Call `updateDocument` modifying title and encryption flag.
         - Call `getVaultMetrics` and verify `totalDocuments >= 1`, `encryptedCount >= 1`, `assetsCoveredCount >= 1`, and `categoryCounts.INSURANCE_POLICY >= 1`.
         - Call `deleteDocument` and verify record removal.
       - **Section 3: REST API Handlers**:
         - Verify `app/api/vault/upload/route.ts` exports POST.
         - Verify `app/api/vault/documents/route.ts` exports GET and POST.
         - Verify `app/api/vault/documents/[id]/route.ts` exports GET, PATCH, DELETE.
         - Verify `app/api/vault/insurance-schedule/route.ts` exports GET.
         - Verify `app/api/claim-dossier/[assetId]/route.ts` exports GET.
       - **Section 4: Insurance Inventory Schedule Export**:
         - Call `generateInsuranceScheduleData()` and verify `totalAssets >= 1` and `totalDeclaredValue > 0`.
         - Call `generateInsuranceScheduleCsv()` and verify:
           - CSV contains required header columns (`Asset Name`, `Category`, `Serial / VIN`, `Declared Replacement Value (USD)`, `Proof of Purchase`, etc.).
           - Summary rows exist at bottom displaying total declared value.
         - Call `generateInsuranceScheduleHtml()` and verify HTML contains printable structure and table headers.
       - **Section 5: 1-Click Warranty Claim Dossier Generator**:
         - Call `generateClaimDossierData(assetId)` on a seeded asset with warranty (e.g. MacBook or Honda Civic).
         - Verify dossier contains `dossierId` matching `CLM-...` format.
         - Verify `draftedLetter` contains recipient support contact, product serial number, and policy number.
         - Call `generateClaimDossierHtml(dossier)` and verify HTML contains `@media print`, formal letter, and enclosure checklist.
       - **Section 6: Clean Up**:
         - Clean up test assets and temporary vault files.
       - Exits with 0 if all checks pass, 1 if any check fails.
    2. Update `package.json`:
       - Add `"test:phase5": "tsx scripts/verify-phase-5.ts"` to scripts.

    AVOID: Orphaned test records or files in `public/uploads/vault/`.
    USE: Robust try/finally block ensuring complete test data cleanup.
  </action>
  <verify>
    npm run test:phase5
  </verify>
  <done>
    `scripts/verify-phase-5.ts` runs all checks, `npm run test:phase5` is registered in `package.json`, and all checks pass empirically.
  </done>
</task>

## Must-Haves
After all tasks complete, verify:
- [ ] User can navigate to `/vault` to see summary metrics, filter by document category, search, and toggle grid/table view.
- [ ] Drag-and-drop modal allows uploading documents up to 15MB with asset linking and category assignment.
- [ ] Document preview modal renders PDFs and images with file metadata and SHA-256 verification hash.
- [ ] "Export Insurance Schedule" button allows downloading CSV inventory or viewing printable insurance schedule.
- [ ] "Claim Dossier" button on Warranty cards and QuickActions opens interactive modal previewing pre-drafted letter and bundled proofs.
- [ ] `npm run test:phase5` passes with 100% success validating storage, actions, APIs, insurance export, and claim dossiers.

## Success Criteria
- [ ] All tasks verified passing
- [ ] Must-haves confirmed
