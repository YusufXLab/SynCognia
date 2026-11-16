---
phase: 2
plan: 1
wave: 1
depends_on: []
gap_closure: false
---

# Plan 2.1: Multi-Modal Document Ingestion Pipeline, Storage Adapter & Gemini Extraction Engine

## Objective
Implement the server-side multi-modal receipt ingestion pipeline and AI extraction service. This includes a local file storage adapter for receipt scans and PDF invoices, strongly typed extraction data contracts, the Google Gemini API integration (`@google/genai` using structured JSON schema) with an automated mock fallback for offline/test environments, and the Next.js API route handler for file uploads.

## Context
Load these files for context:
- .gsd/SPEC.md
- .gsd/ROADMAP.md
- .gsd/phases/2/RESEARCH.md
- prisma/schema.prisma
- lib/prisma.ts

## Tasks

<task type="auto">
  <name>Install Google Gen AI SDK, define extraction types, and build receipt storage adapter</name>
  <files>
    package.json
    lib/types/receipt.ts
    lib/storage/receipts.ts
  </files>
  <action>
    Install `@google/genai` and implement the file storage adapter and receipt extraction types.

    Steps:
    1. Install `@google/genai` dependency using `npm install @google/genai`.
    2. Create `lib/types/receipt.ts` defining strict TypeScript interfaces:
       - `ExtractedReceiptItem`: `name`, `category`, `price`, `quantity`, `brand?`, `modelNumber?`, `serialNumber?`, `suggestedWarrantyMonths?`.
       - `DetectedWarranty`: `provider`, `durationMonths`, `warrantyType` ("MANUFACTURER" | "EXTENDED"), `details?`.
       - `DetectedReturnPolicy`: `windowDays`, `details?`.
       - `ExtractedReceiptData`: `merchant`, `purchaseDate` (YYYY-MM-DD), `totalAmount`, `currency`, `taxAmount?`, `paymentMethod?`, `items`, `detectedWarranty?`, `returnPolicy?`, `rawSummary`.
       - `ReceiptUploadResult`: `fileUrl`, `filePath`, `fileName`, `mimeType`, `size`, `hash`.
       - `IngestExtractApiResponse`: structured response containing upload metadata and extracted receipt data.
    3. Create `lib/storage/receipts.ts` with helper functions:
       - `saveReceiptFile(buffer: Buffer, originalFilename: string, mimeType: string)`:
         - Verifies MIME type is supported (`image/jpeg`, `image/png`, `image/webp`, `image/heic`, `application/pdf`).
         - Validates file size (max 10MB).
         - Generates collision-resistant unique filename using timestamp and random UUID (`${Date.now()}-${uuid}.${ext}`).
         - Ensures directory `public/uploads/receipts` exists (using `node:fs` / `node:path`).
         - Writes file to disk, calculates SHA-256 hash.
         - Returns `ReceiptUploadResult` with relative URL (`/uploads/receipts/...`).
       - `deleteReceiptFile(filePath: string)`: safe cleanup helper for failed operations or removals.

    AVOID: Saving uploaded files with arbitrary un-sanitized user filenames, which creates path traversal security vulnerabilities.
    USE: Deterministic sanitization, UUID prefixes, and validation of file extensions and MIME headers.
  </action>
  <verify>
    npm run build
  </verify>
  <done>
    `@google/genai` is listed in `package.json`, `lib/types/receipt.ts` exports all extraction schemas, and `lib/storage/receipts.ts` safely saves files to `public/uploads/receipts` without compile errors.
  </done>
</task>

<task type="auto">
  <name>Implement Gemini structured receipt extraction service with deterministic mock fallback</name>
  <files>
    lib/ai/gemini.ts
  </files>
  <action>
    Build the multimodal AI extraction service using Google Gen AI SDK with structured JSON output and test fallback support.

    Steps:
    1. Create `lib/ai/gemini.ts` importing `GoogleGenAI` and `Type` from `@google/genai`.
    2. Configure model identifier (default to `process.env.GEMINI_MODEL || "gemini-2.5-flash"`).
    3. Define strict JSON schema matching `ExtractedReceiptData`:
       - Specify `responseMimeType: "application/json"` and `responseJsonSchema` using `Type.OBJECT` with required properties: `merchant`, `purchaseDate`, `totalAmount`, `currency`, `items`, `rawSummary`, and optional objects for `detectedWarranty` and `returnPolicy`.
    4. Implement `extractReceiptData({ buffer, mimeType, fileName }): Promise<ExtractedReceiptData>`:
       - Check if `process.env.GEMINI_API_KEY` is present.
       - **Mock / Offline Fallback Mode**: If `!process.env.GEMINI_API_KEY` or `process.env.MOCK_GEMINI === "true"`, log `[Gemini Service] Using mock extraction engine` and return high-fidelity mock extraction data (e.g. realistic retailer like Best Buy or Apple Store with purchase items, prices, 12-month manufacturer warranty, 14 or 30-day return policy, and summary).
       - **Live Gemini Call**: If `GEMINI_API_KEY` is set:
         - Encode file buffer to base64 string.
         - Invoke `ai.models.generateContent` with system prompt instructing extraction of merchant, date, item breakdown, prices, warranty terms, and return windows from the receipt image or PDF document.
         - Parse and validate JSON response, ensuring fallback defaults if individual optional fields are omitted.
       - Include comprehensive error handling with graceful fallback to sanitized baseline object if extraction fails.

    AVOID: Crashing if `GEMINI_API_KEY` is not set in local development or CI environments.
    USE: Robust fallback mode that enables seamless automated testing and developer onboarding without active cloud credentials.
  </action>
  <verify>
    npx tsx -e "import { extractReceiptData } from './lib/ai/gemini'; extractReceiptData({ buffer: Buffer.from('test'), mimeType: 'image/png', fileName: 'sample.png' }).then(res => console.log('Parsed merchant:', res.merchant));"
  </verify>
  <done>
    `extractReceiptData` can be imported and executed without runtime errors, returning a valid `ExtractedReceiptData` object adhering to the schema.
  </done>
</task>

<task type="auto">
  <name>Build ingestion API route handler and automated extraction test script</name>
  <files>
    app/api/ingest/extract/route.ts
    scripts/test-gemini-extraction.ts
  </files>
  <action>
    Create the REST route handler for multipart receipt ingestion and an automated test script to verify extraction.

    Steps:
    1. Create `app/api/ingest/extract/route.ts`:
       - `POST` handler receiving `multipart/form-data` request with a `file` field.
       - Validates file presence, MIME type (JPEG, PNG, WebP, HEIC, PDF), and size limit (<= 10MB).
       - Converts `File` to Buffer via `Buffer.from(await file.arrayBuffer())`.
       - Persists file to storage using `saveReceiptFile`.
       - Calls `extractReceiptData` to parse receipt metadata via Gemini / fallback mock.
       - Returns `NextResponse.json({ success: true, file: uploadResult, extracted: extractedData }, { status: 200 })`.
       - Returns appropriate HTTP status codes: 400 for missing file, 415 for unsupported media type, 500 for internal errors.
    2. Create `scripts/test-gemini-extraction.ts`:
       - Generates a dummy image buffer (or reads sample receipt image).
       - Tests storage adapter file saving and verifies the file exists on disk.
       - Tests `extractReceiptData` directly and verifies required fields (`merchant`, `totalAmount`, `purchaseDate`, `items`).
       - Cleans up created temporary test files.
       - Prints PASS / FAIL status report.

    AVOID: Next.js App Router body size truncation; handle file buffer streaming cleanly.
    USE: `NextRequest.formData()` and strongly typed responses.
  </action>
  <verify>
    npx tsx scripts/test-gemini-extraction.ts
  </verify>
  <done>
    `app/api/ingest/extract/route.ts` is ready to receive uploads and `npx tsx scripts/test-gemini-extraction.ts` passes all storage and extraction assertions.
  </done>
</task>

## Must-Haves
After all tasks complete, verify:
- [ ] `@google/genai` is installed and imports cleanly.
- [ ] Receipt storage adapter safely stores files in `public/uploads/receipts/` with unique IDs and SHA-256 hashes.
- [ ] Extraction service returns structured `ExtractedReceiptData` adhering to schema in both live and mock fallback modes.
- [ ] Ingestion route `/api/ingest/extract` processes multipart file uploads and returns 200 with extracted JSON.
- [ ] `npx tsx scripts/test-gemini-extraction.ts` runs and passes all tests.

## Success Criteria
- [ ] All tasks verified passing
- [ ] Must-haves confirmed
