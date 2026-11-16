# Plan 5.2 Summary: Insurance Inventory Export & 1-Click Warranty Claim Dossier Engine

## Overview
Plan 5.2 delivered the automated insurance reporting engine and the 1-click warranty claim dossier generation engine for SynCognia. Households can now generate certified household inventory schedules with declared replacement values and linked proofs of purchase in both RFC 4180 CSV and printable HTML formats, as well as compile complete claim dossier packets featuring auto-crafted formal manufacturer warranty claim letters.

## Objectives Accomplished

1. **Insurance Inventory Schedule Export Engine (`lib/services/insuranceExport.ts`)**:
   - Defined `InsuranceScheduleItem` and `InsuranceScheduleData` domain structures.
   - `generateInsuranceScheduleData()`: Queries active household assets with associated receipts, warranties, and documents; computes proof of purchase status (`VERIFIED_RECEIPT`, `ATTACHED_INVOICE`, `NO_PROOF`); links active warranty status, provider, and policy numbers; aggregates declared replacement valuation (`purchasePrice`); and tallies inventory metrics.
   - `generateInsuranceScheduleCsv()`: Formats RFC 4180 compliant CSV escaping cells (`"${val.replace(/"/g, '""')}"`) with full asset records and a trailing valuation summary section (Total Value, Total Assets, Items With Attached Proofs, Items With Active Warranty).
   - `generateInsuranceScheduleHtml()`: Produces a self-contained, print-optimized (`@media print`) HTML report with SynCognia branding, summary cards, high-contrast inventory table, adjusters' legal notice, and a 1-click `window.print()` trigger.

2. **Insurance Schedule REST API Endpoint (`app/api/vault/insurance-schedule/route.ts`)**:
   - GET endpoint supporting format parameter `?format=csv|html|json` (default `csv`).
   - `csv`: Returns 200 with `Content-Type: text/csv; charset=utf-8` and `Content-Disposition: attachment; filename="syncognia-insurance-schedule.csv"`.
   - `html`: Returns 200 with `Content-Type: text/html; charset=utf-8`.
   - `json`: Returns 200 with `{ success: true, schedule: data }`.

3. **1-Click Warranty Claim Dossier Generator Engine (`lib/services/claimDossier.ts`)**:
   - Defined `ClaimDossierData` interface bundling dossier reference code, claimant details, asset specifications, active warranty terms, proof of purchase records, vault enclosures, and pre-drafted claim letters.
   - `generateClaimDossierData()`:
     - Retrieves asset with user profile, warranties, receipts, and vault documents.
     - Generates reference identifier: `CLM-[YEAR]-[MODEL]-[HASH]`.
     - Synthesizes professional formal manufacturer warranty claim letter addressing support contact, citing product specs, serial number, policy number, statement of hardware defect during normal use, inventory of enclosed evidence, and requesting formal RMA instructions.
     - Implements graceful fallbacks for unregistered or optional fields (e.g., "Not Recorded on Registration").
   - `generateClaimDossierHtml()`: Formats an executive, printable HTML claim packet with two-column overview cards, letterhead correspondence block, vault evidence checklist, and print styling with automatic page breaks.

4. **Claim Dossier REST API Route (`app/api/claim-dossier/[assetId]/route.ts`)**:
   - Dynamic Next.js 15 route handler using async context params: `params: Promise<{ assetId: string }>`.
   - GET endpoint supporting `?format=html|json|download` (default `html`).
   - `json`: Returns 200 `{ success: true, dossier }`.
   - `download`: Returns 200 with `Content-Disposition: attachment; filename="claim-dossier-${dossier.dossierId}.html"`.
   - `html`: Returns 200 with printable HTML claim packet.
   - Handles missing assets with 404 and structured JSON errors.

## Commits Landed
- `65af63d` feat(phase-5): implement Insurance Inventory Schedule export engine and REST API endpoint
- `0e7db0f` feat(phase-5): implement 1-Click Warranty Claim Dossier generator engine and API route handler

## Verification Evidence
- **Insurance Schedule Test**: Successfully generated schedule across active registered assets, calculating $33,996.93 in declared replacement valuation and generating 14 CSV lines with summary totals.
- **Claim Dossier Generation Test**: Successfully compiled full claim packet for MacBook Pro 16" M3 Max (`Ref: CLM-2026-A2991-9T6P`, `Subject: Warranty Claim Request: Apple MacBook Pro 16" M3 Max (S/N: C02G9012MD6R) - Policy #AC-MBP-9923841`).
- **HTML Render Verification**: Both insurance schedule (13,181 bytes) and claim dossier (16,556 bytes) render complete HTML structures with embedded print actions and verification notices.
- **TypeScript Check**: `npx.cmd tsc --noEmit` exited with code 0.
- **Next.js Production Build**: `npm.cmd run build` passed with all dynamic routes (`/api/vault/insurance-schedule`, `/api/claim-dossier/[assetId]`) recognized and compiled cleanly.

## Next Steps
Proceed to Plan 5.3: Document Vault Hub UI, Claim Dossier Integration & Automated Verification Suite (`.gsd/phases/5/03-PLAN.md`).
