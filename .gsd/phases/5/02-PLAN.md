---
phase: 5
plan: 2
wave: 2
depends_on: ["5.1"]
gap_closure: false
---

# Plan 5.2: Insurance Inventory Export & 1-Click Warranty Claim Dossier Engine

## Objective
Build the insurance inventory reporting engine and the 1-click warranty claim dossier generation engine. Enables households to export full household inventory schedules with declared replacement values and attached proofs of purchase in CSV/print format, and to assemble complete claim dossier packets with automatically drafted formal manufacturer claim letters.

## Context
Load these files for context:
- .gsd/SPEC.md
- .gsd/ROADMAP.md
- .gsd/phases/5/RESEARCH.md
- prisma/schema.prisma
- lib/prisma.ts
- lib/types/vault.ts
- lib/actions/vault.ts

## Tasks

<task type="auto">
  <name>Build Insurance Inventory Schedule export engine and REST API endpoint</name>
  <files>
    lib/services/insuranceExport.ts
    app/api/vault/insurance-schedule/route.ts
  </files>
  <action>
    Implement the insurance inventory schedule generator compiling household assets, declared replacement values, and linked proofs of purchase into CSV and printable formats.

    Steps:
    1. Create `lib/services/insuranceExport.ts`:
       - Define data structures:
         - `InsuranceScheduleItem`: `assetId`, `name`, `category`, `brand`, `modelNumber`, `serialNumber`, `purchaseDate`, `declaredValue`, `currency`, `location`, `proofOfPurchaseStatus` ("VERIFIED_RECEIPT" | "ATTACHED_INVOICE" | "NO_PROOF"), `receiptFileName?`, `warrantyStatus?`, `warrantyProvider?`, `policyNumber?`, `vaultDocumentsCount`.
         - `InsuranceScheduleData`: `items: InsuranceScheduleItem[]`, `totalAssets: number`, `totalDeclaredValue: number`, `itemsWithProofCount: number`, `itemsWithWarrantyCount: number`, `generatedAt: Date`.
       - Implement `generateInsuranceScheduleData(): Promise<InsuranceScheduleData>`:
         - Queries active assets (`prisma.asset.findMany({ where: { status: "ACTIVE" }, include: { receipts: true, warranties: true, documents: true } })`).
         - Computes proof status based on linked receipts and documents with type `INVOICE`.
         - Computes total declared value summing `purchasePrice ?? 0`.
         - Aggregates metrics and returns `InsuranceScheduleData`.
       - Implement `generateInsuranceScheduleCsv(data: InsuranceScheduleData): string`:
         - Formats RFC 4180 compliant CSV:
           - Escapes quotes and commas cleanly.
           - Column headers: `Asset Name, Category, Brand, Model Number, Serial / VIN, Purchase Date, Declared Replacement Value (USD), Location, Proof of Purchase, Receipt File, Warranty Status, Warranty Provider, Policy #, Vault Documents Count`.
           - Data rows for all items.
           - Trailing summary section displaying `Total Declared Replacement Value`, `Total Items Registered`, `Items With Attached Proofs`, and generation timestamp.
       - Implement `generateInsuranceScheduleHtml(data: InsuranceScheduleData): string`:
         - Produces clean, professional, self-contained HTML report designed for printing or "Save as PDF".
         - Includes header with SynCognia branding, date of schedule generation, summary metric boxes (Total Items, Total Declared Value, Verified Proofs), high-contrast styled table, and printable footer.
         - Includes inline "Print Insurance Schedule" button invoking `window.print()`.

    2. Create `app/api/vault/insurance-schedule/route.ts`:
       - GET endpoint accepting optional `?format=csv|html|json` (defaults to `csv`).
       - If `format === "csv"`:
         - Returns 200 with `Content-Type: text/csv; charset=utf-8` and `Content-Disposition: attachment; filename="syncognia-insurance-schedule.csv"`.
       - If `format === "html"`:
         - Returns 200 with `Content-Type: text/html; charset=utf-8`.
       - If `format === "json"`:
         - Returns 200 with `{ success: true, schedule: data }`.

    AVOID: Unescaped CSV fields that break when names or notes contain commas or quotes.
    USE: RFC 4180 cell quotation `"${value.replace(/"/g, '""')}"`.
  </action>
  <verify>
    npx tsx -e "import { generateInsuranceScheduleData, generateInsuranceScheduleCsv } from './lib/services/insuranceExport'; generateInsuranceScheduleData().then(d => { const csv = generateInsuranceScheduleCsv(d); console.log('Generated CSV lines:', csv.split('\n').length, 'Total Value:', d.totalDeclaredValue); });"
  </verify>
  <done>
    `generateInsuranceScheduleData` calculates accurate inventory values, `generateInsuranceScheduleCsv` outputs valid CSV, and `/api/vault/insurance-schedule` returns CSV/HTML formats.
  </done>
</task>

<task type="auto">
  <name>Build 1-Click Warranty Claim Dossier generator engine and API route handler</name>
  <files>
    lib/services/claimDossier.ts
    app/api/claim-dossier/[assetId]/route.ts
  </files>
  <action>
    Implement the 1-click claim dossier generator bundling asset info, proof of purchase, warranty policy, an auto-crafted formal claim letter, and printable HTML packet.

    Steps:
    1. Create `lib/services/claimDossier.ts`:
       - Define `ClaimDossierData` interface:
         - `dossierId: string` (e.g. `CLM-2026-A2991-8419`)
         - `generatedAt: Date`
         - `claimant: { name: string; email: string }`
         - `asset: { id: string; name: string; category: string; brand?: string | null; modelNumber?: string | null; serialNumber?: string | null; purchaseDate?: Date | null; purchasePrice?: number | null; currency: string; location?: string | null }`
         - `warranty?: { provider: string; warrantyType: string; policyNumber?: string | null; startDate?: Date | null; endDate?: Date | null; supportContact?: string | null; claimUrl?: string | null; status: string }`
         - `proofOfPurchase?: { merchant?: string; purchaseDate?: Date | null; totalAmount?: number | null; fileUrl?: string | null; mimeType?: string | null }`
         - `attachedDocuments: Array<{ id: string; title: string; documentType: string; fileUrl: string; fileSize?: number | null; isEncrypted: boolean }>`
         - `draftedLetter: { recipient: string; subject: string; body: string }`
       - Implement `generateClaimDossierData(assetId: string): Promise<ClaimDossierData>`:
         - Retrieves asset from Prisma including `user`, `warranties`, `receipts`, and `documents`.
         - Throws informative error if asset is not found.
         - Selects active warranty (or most recent).
         - Selects primary proof of purchase (most recent receipt or invoice document).
         - Generates formal claim reference: `CLM-${new Date().getFullYear()}-${asset.modelNumber ? asset.modelNumber.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase() : 'ASSET'}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`.
         - Crafts pre-drafted formal claim letter:
           - Recipient: `warranty?.supportContact || (asset.brand ? asset.brand + " Customer Support & Claims" : "Warranty Support Team")`.
           - Subject: `Warranty Claim Request: ${asset.brand ? asset.brand + " " : ""}${asset.name} (S/N: ${asset.serialNumber || "N/A"}) - Policy #${warranty?.policyNumber || "N/A"}`.
           - Body: Professional claim letter referencing purchase date, retailer, serial number, warranty policy number, declaration that failure occurred during normal intended use within the active warranty period, list of enclosed proofs, and requesting formal RMA number and repair/replacement instructions.
       - Implement `generateClaimDossierHtml(dossier: ClaimDossierData): string`:
         - Produces complete, beautiful, printable HTML document (`@media print` rules, page breaks, professional letterhead, structured asset and warranty specs table, claim letter, and attachments inventory).
         - Includes "Print Dossier / Save as PDF" button.

    2. Create `app/api/claim-dossier/[assetId]/route.ts`:
       - GET endpoint accepting `params.assetId` and optional `?format=html|json|download` (default `html`).
       - Validates asset exists; returns 404 if not found.
       - If `format === "json"`: Returns 200 `{ success: true, dossier }`.
       - If `format === "download"`: Returns 200 with `Content-Type: text/html` and `Content-Disposition: attachment; filename="claim-dossier-${dossier.dossierId}.html"`.
       - Default (`format === "html"`): Returns 200 with `Content-Type: text/html; charset=utf-8` displaying the printable claim packet.

    AVOID: Generic or broken letters when optional fields like serial number or provider contact are missing.
    USE: Graceful fallbacks (e.g. "Not Recorded on Registration", "Authorized Customer Support") so every generated letter is always syntactically and professionally complete.
  </action>
  <verify>
    npx tsx -e "import { generateClaimDossierData, generateClaimDossierHtml } from './lib/services/claimDossier'; import prisma from './lib/prisma'; prisma.asset.findFirst().then(a => { if (a) generateClaimDossierData(a.id).then(d => console.log('Claim Dossier compiled for:', d.asset.name, 'Ref:', d.dossierId, 'Subject:', d.draftedLetter.subject)); });"
  </verify>
  <done>
    `generateClaimDossierData` bundles asset specs, warranty policy, proof of purchase, and drafted letter; `generateClaimDossierHtml` formats printable packet; and `/api/claim-dossier/[assetId]` returns both JSON and HTML.
  </done>
</task>

## Must-Haves
After all tasks complete, verify:
- [ ] `generateInsuranceScheduleData` calculates total declared replacement value across active registered assets.
- [ ] `generateInsuranceScheduleCsv` outputs valid RFC 4180 CSV with item details and summary row totals.
- [ ] `/api/vault/insurance-schedule` route serves both downloadable CSV and printable HTML views.
- [ ] `generateClaimDossierData` bundles asset details, serial number, proof of purchase, and warranty policy info.
- [ ] Formal pre-drafted claim letter includes asset serial number, policy number, support contact, and list of attached proofs.
- [ ] `app/api/claim-dossier/[assetId]/route.ts` serves dossier JSON and printable HTML ready for claims adjusters or browser printing.

## Success Criteria
- [ ] All tasks verified passing
- [ ] Must-haves confirmed
