# Phase 5 Research: Ownership Vault & 1-Click Claim Dossier Generator

## Problem Space & Goals

Phase 5 delivers the **Ownership Document Vault** and **1-Click Claim Dossier Generator** for SynCognia. It empowers households to:
1. Centralize and secure physical/digital proof of ownership (manuals, invoices, warranty certificates, title deeds, insurance policies, and appraisals).
2. Store documents up to 15MB with SHA-256 integrity hash verification and simulated encryption.
3. Export an RFC-compliant Insurance Inventory Schedule (CSV and printable view) listing all registered assets, brand, model, serial numbers, declared replacement values, and linked proofs of purchase.
4. Generate a 1-Click Warranty Claim Dossier packet bundling asset details, serial number, proof of purchase receipt, warranty policy, and an automatically drafted formal claim letter addressed to the manufacturer or retailer support contact.

---

## Architectural Findings & Integrations

### 1. Database Schema (`Document` Model in SQLite via Prisma)

Current `Document` model in `prisma/schema.prisma`:
```prisma
model Document {
  id           String   @id @default(cuid())
  assetId      String
  asset        Asset    @relation(fields: [assetId], references: [id], onDelete: Cascade)
  
  title        String
  documentType String   @default("MANUAL") // MANUAL, INVOICE, WARRANTY_CARD, TITLE_DEED, CERTIFICATE
  fileUrl      String
  fileSize     Int?
  mimeType     String?
  isEncrypted  Boolean  @default(false)
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([assetId])
  @@index([documentType])
}
```

**Key Observation**:
In the existing schema, `assetId` is required (`String`). However, users may wish to store unassigned documents (or whole-household insurance policies) prior to linking them to an asset, similar to `Receipt.assetId String?`.
To provide maximum flexibility while retaining full asset linkage:
- Update `assetId` to `String?` with `onDelete: Cascade` (or `SetNull` when unassigned).
- Ensure existing seeds and seeded documents remain 100% intact.
- Document types to support:
  - `MANUAL`: Product user manuals, operating guides
  - `INVOICE`: Purchase receipts, bills of sale, invoices
  - `WARRANTY_CARD`: Warranty certificates, extended service agreements
  - `TITLE_DEED`: Property titles, vehicle registrations, certificates of origin
  - `CERTIFICATE`: Authenticity certificates, provenance records
  - `INSURANCE_POLICY`: Household, item, or umbrella insurance policies
  - `APPRAISAL`: Professional jewelry, collectible, or vehicle appraisals

### 2. File Storage & Security Adapter (`lib/storage/vault.ts`)

- Storage directory: `public/uploads/vault/`
- Supported MIME types:
  - `application/pdf` (.pdf)
  - `image/jpeg` (.jpg, .jpeg)
  - `image/png` (.png)
  - `image/webp` (.webp)
  - `image/heic` (.heic)
- Maximum file size: **15MB** (`15 * 1024 * 1024` bytes = `15,728,640` bytes).
- Security & Hash Integrity:
  - Deterministic unique file naming: `${Date.now()}-${crypto.randomUUID()}${extension}`.
  - SHA-256 hash calculation on upload buffer.
  - Path traversal defense: resolve against `public/uploads/vault/` before deleting or reading.
  - Encryption simulation:
    - Support simulated encryption flag `isEncrypted: boolean`.
    - Provide utility to simulate encrypted payloads and decrypt/verify metadata hashes.
    - Provide file hash integrity verification function `verifyFileHash(filePath, expectedHash)`.

### 3. Insurance Inventory Schedule Export (`lib/services/insuranceExport.ts`)

- Queries all registered assets (`status: "ACTIVE"`).
- For each asset, aggregates:
  - Asset Name, Category, Brand, Model Number, Serial Number / VIN
  - Purchase Date & Purchase Price / Declared Replacement Value
  - Physical Location (e.g. Home Office, Garage, Kitchen)
  - Proof of Purchase Status (`Verified Receipt Attached`, `Invoice Attached`, `No Proof`)
  - Linked Warranty Status (Active, Expiring Soon, Expired, None) & Policy Number
  - Linked Vault Documents Count
- Calculates total portfolio replacement valuation and item count.
- Exports RFC 4180 compliant CSV (`/api/vault/insurance-schedule?format=csv`).
- Produces clean, professional printable HTML schedule (`/api/vault/insurance-schedule?format=html`).

### 4. 1-Click Warranty Claim Dossier Generator (`lib/services/claimDossier.ts`)

- Bundles complete asset profile:
  - Asset info (Brand, Model, Serial #, Purchase Date, Purchase Price)
  - Proof of Purchase (Receipt details, merchant, transaction amount, uploaded receipt image/PDF link)
  - Warranty Policy (Provider, Policy #, Warranty Type, Duration, Coverage Dates, Support Contact, Claim URL)
  - Attached Documents in Vault (manuals, warranty cards, title deeds)
- Auto-crafts formal pre-drafted claim letter:
  - Addressed to: Support Contact / Manufacturer Customer Relations
  - Subject: `Warranty Claim Request: [Brand] [Asset Name] (S/N: [Serial]) - Policy #[PolicyNumber]`
  - Standard formal warranty invocation language
  - Detailed product identity block (Model, Serial, Purchase Date, Merchant)
  - Statement of defect / failure notice placeholder
  - Inventory of attached proofs of purchase
  - Signature block with claimant's name and contact email
- Generates self-contained printable HTML dossier packet (`/api/claim-dossier/[assetId]`):
  - `@media print` optimized CSS with page breaks
  - Printable header with claim reference code (`CLM-[TIMESTAMP]-[ASSET_PREFIX]`)
  - Visual summary tables for Asset, Warranty, and Receipt
  - Pre-drafted letter formatted for printing or PDF export
  - Checklist of attached documentation

### 5. UI Integration Points

1. **Document Vault Hub (`/vault`)**:
   - Navigation already present in `components/layout/Sidebar.tsx` (`/vault`).
   - Summary metric cards: Total Documents, Encrypted Files, Covered Assets, Storage Used.
   - Category filter pills + real-time search bar.
   - Grid & Table view toggle.
   - DocumentCard & DocumentTableRow with thumbnail/icon, metadata, encryption badge, and actions.
   - DocumentPreviewModal for viewing PDFs and images in-app.
   - UploadDocumentModal with drag-and-drop file upload, category picker, asset dropdown, and encryption toggle.
2. **Warranty Card Claim Dossier Trigger (`components/warranties/WarrantyCard.tsx`)**:
   - Add "Claim Dossier" button on each warranty card.
   - Opens `ClaimDossierModal` previewing the claim letter and offering 1-click print / HTML download.
3. **Quick Operations (`components/dashboard/QuickActions.tsx`)**:
   - Connect "Claim Dossier" action button to open the dossier modal or navigate to claim generator.

---

## Plan Decomposition Strategy

To comply with the 2-3 tasks per plan rule and ensure each plan remains well within 50% context:

1. **Plan 5.1 (Wave 1)**: Document Vault Storage Adapter, Security Engine & Document Server Actions
   - Task 1: Prisma schema update (`assetId String?`), vault domain types (`lib/types/vault.ts`), and vault storage adapter with 15MB limit, MIME checks, SHA-256 hash and encryption simulation (`lib/storage/vault.ts`).
   - Task 2: Document Server Actions (`lib/actions/vault.ts`) and REST API upload and CRUD route handlers (`app/api/vault/upload/route.ts`, `app/api/vault/documents/route.ts`, `app/api/vault/documents/[id]/route.ts`).

2. **Plan 5.2 (Wave 2, depends on 5.1)**: Insurance Inventory Export & 1-Click Warranty Claim Dossier Engine
   - Task 1: Insurance schedule export service (`lib/services/insuranceExport.ts`) and REST route handler (`app/api/vault/insurance-schedule/route.ts`) supporting CSV export & valuation summary.
   - Task 2: 1-Click Warranty Claim Dossier generator service (`lib/services/claimDossier.ts`), API route handler (`app/api/claim-dossier/[assetId]/route.ts`), and pre-drafted claim letter engine.

3. **Plan 5.3 (Wave 3, depends on 5.2)**: Document Vault Hub UI, Claim Dossier Integration & Automated Verification Suite
   - Task 1: Ownership Vault Hub page (`app/vault/page.tsx`), DocumentCard / table row components, preview modal, and upload modal with drag-and-drop (`components/vault/`).
   - Task 2: Claim Dossier UI integration (`components/vault/ClaimDossierModal.tsx`, update `WarrantyCard.tsx` and `QuickActions.tsx`) for 1-click dossier preview and print.
   - Task 3: Comprehensive automated verification suite (`scripts/verify-phase-5.ts`) and `package.json` test script (`npm run test:phase5`).
