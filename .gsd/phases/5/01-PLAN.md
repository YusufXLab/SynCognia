---
phase: 5
plan: 1
wave: 1
depends_on: []
gap_closure: false
---

# Plan 5.1: Document Vault Storage Adapter, Security Engine & Document Server Actions

## Objective
Implement the foundational Document Vault storage adapter, security/encryption simulation engine, document domain types, server actions, and REST route handlers. Enables storing, categorizing, and querying ownership documents (manuals, invoices, warranty cards, titles, certificates, insurance policies, appraisals) up to 15MB with SHA-256 integrity verification.

## Context
Load these files for context:
- .gsd/SPEC.md
- .gsd/ROADMAP.md
- .gsd/phases/5/RESEARCH.md
- prisma/schema.prisma
- lib/prisma.ts
- lib/storage/receipts.ts
- lib/actions/assets.ts

## Tasks

<task type="auto">
  <name>Prisma schema update for Document flexibility, Vault domain types, and secure storage adapter</name>
  <files>
    prisma/schema.prisma
    lib/types/vault.ts
    lib/storage/vault.ts
  </files>
  <action>
    Update the Prisma schema for flexible asset linking, define strongly-typed Vault contracts, and build the 15MB vault storage adapter with encryption simulation and hash verification.

    Steps:
    1. Update `prisma/schema.prisma`:
       - In `model Document`:
         - Change `assetId String` to `assetId String?` to allow standalone or general household documents (e.g. umbrella insurance policies).
         - Update relation to `asset Asset? @relation(fields: [assetId], references: [id], onDelete: Cascade)`.
         - Update comments on `documentType` to document supported categories: `MANUAL`, `INVOICE`, `WARRANTY_CARD`, `TITLE_DEED`, `CERTIFICATE`, `INSURANCE_POLICY`, `APPRAISAL`.
       - Run `npx prisma db push` to synchronize SQLite schema and regenerate Prisma Client.

    2. Create `lib/types/vault.ts`:
       - `DocumentType`: `"MANUAL" | "INVOICE" | "WARRANTY_CARD" | "TITLE_DEED" | "CERTIFICATE" | "INSURANCE_POLICY" | "APPRAISAL"`.
       - `DOCUMENT_TYPES`: readonly array of all valid document types.
       - `DocumentUploadResult`:
         - `fileUrl: string`
         - `filePath: string`
         - `fileName: string`
         - `mimeType: string`
         - `size: number`
         - `hash: string`
         - `isEncrypted: boolean`
       - `CreateDocumentInput`: `assetId?: string | null`, `title: string`, `documentType?: DocumentType`, `fileUrl: string`, `fileSize?: number | null`, `mimeType?: string | null`, `isEncrypted?: boolean`.
       - `UpdateDocumentInput`: `title?: string`, `assetId?: string | null`, `documentType?: DocumentType`, `isEncrypted?: boolean`.
       - `VaultFilter`: `assetId?: string`, `documentType?: string`, `isEncrypted?: boolean`, `search?: string`.
       - `VaultMetrics`: `totalDocuments: number`, `encryptedCount: number`, `totalSizeBytes: number`, `assetsCoveredCount: number`, `categoryCounts: Record<DocumentType, number>`.
       - `ActionResult<T>`: standard result wrapper with `success: boolean`, `data?: T`, `error?: string`.

    3. Create `lib/storage/vault.ts`:
       - `ALLOWED_VAULT_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"] as const`.
       - `MAX_VAULT_FILE_SIZE_BYTES = 15 * 1024 * 1024` (15MB).
       - `UPLOAD_DIR_RELATIVE = "public/uploads/vault"`.
       - `saveVaultDocument(buffer: Buffer, originalFilename: string, mimeType: string, options?: { isEncrypted?: boolean }): Promise<DocumentUploadResult>`:
         - Validate MIME type against `ALLOWED_VAULT_MIME_TYPES`. Reject unsupported types with informative error.
         - Validate buffer length <= `MAX_VAULT_FILE_SIZE_BYTES`. Reject oversized files with error.
         - Ensure `public/uploads/vault/` directory exists.
         - Generate collision-resistant unique filename: `${Date.now()}-${crypto.randomUUID()}${extension}`.
         - Compute SHA-256 checksum of buffer.
         - Write file to disk.
         - Return `DocumentUploadResult` with relative file URL (`/uploads/vault/...`).
       - `verifyFileHash(filePath: string, expectedHash: string): Promise<boolean>`:
         - Reads stored file from disk, computes SHA-256 hash, and compares against `expectedHash`.
       - `deleteVaultDocument(filePath: string): Promise<boolean>`:
         - Prevent path traversal by asserting resolved path starts with vault upload directory.
         - Removes file if it exists.

    AVOID: Path traversal vulnerabilities when deleting or reading vault files.
    USE: Deterministic sanitization and path boundary enforcement matching `lib/storage/receipts.ts`.
  </action>
  <verify>
    npx prisma validate && npx tsx -e "import { saveVaultDocument, verifyFileHash, ALLOWED_VAULT_MIME_TYPES } from './lib/storage/vault'; console.log('Vault storage engine initialized, allowed types:', ALLOWED_VAULT_MIME_TYPES.length);"
  </verify>
  <done>
    Prisma schema allows optional assetId, db push succeeds, `lib/types/vault.ts` defines all contracts, and `lib/storage/vault.ts` enforces 15MB limit and SHA-256 hashing.
  </done>
</task>

<task type="auto">
  <name>Implement Document Server Actions and REST API upload and CRUD route handlers</name>
  <files>
    lib/actions/vault.ts
    app/api/vault/upload/route.ts
    app/api/vault/documents/route.ts
    app/api/vault/documents/[id]/route.ts
  </files>
  <action>
    Create server actions and REST route handlers for vault document management and metrics.

    Steps:
    1. Create `lib/actions/vault.ts`:
       - `getDocuments(filter?: VaultFilter): Promise<ActionResult<DocumentWithAsset[]>>`:
         - Builds Prisma where clause: `assetId`, `documentType`, `isEncrypted`, and search over `title` and `asset.name`.
         - Includes `asset` relation.
         - Orders by `createdAt: "desc"`.
       - `getDocumentById(id: string): Promise<ActionResult<DocumentWithAsset>>`:
         - Queries single document including `asset`.
       - `createDocument(input: CreateDocumentInput): Promise<ActionResult<Document>>`:
         - Validates title is non-empty.
         - Validates documentType is one of the valid types (defaults to "MANUAL").
         - Persists record in Prisma.
         - Safely revalidates `["/vault", "/assets"]`.
       - `updateDocument(id: string, input: UpdateDocumentInput): Promise<ActionResult<Document>>`:
         - Updates fields (`title`, `assetId`, `documentType`, `isEncrypted`).
         - Safely revalidates `["/vault", "/assets"]`.
       - `deleteDocument(id: string, deleteFromDisk = true): Promise<ActionResult<{ id: string }>>`:
         - Fetches document to get `fileUrl`.
         - If `deleteFromDisk` is true, calls `deleteVaultDocument`.
         - Deletes record from Prisma.
         - Safely revalidates `["/vault", "/assets"]`.
       - `getVaultMetrics(): Promise<ActionResult<VaultMetrics>>`:
         - Queries all documents in database.
         - Computes `totalDocuments`, `encryptedCount`, `totalSizeBytes` (sum of `fileSize`), `assetsCoveredCount` (distinct non-null `assetId`s), and `categoryCounts` (record mapping each `DocumentType` to count).
         - Returns `ActionResult<VaultMetrics>`.

    2. Create REST API route handlers:
       - `app/api/vault/upload/route.ts`:
         - POST: Receives `multipart/form-data`.
         - Reads `file`, `title`, `assetId`, `documentType`, `isEncrypted`.
         - Validates file presence and size <= 15MB.
         - Converts `File` to Buffer via `Buffer.from(await file.arrayBuffer())`.
         - Persists to disk using `saveVaultDocument`.
         - Creates Document in Prisma via `createDocument`.
         - Returns 201 with `{ success: true, document, file }` or 400/415/500 on error.
       - `app/api/vault/documents/route.ts`:
         - GET: Handles query params `assetId`, `documentType`, `isEncrypted`, `search`. Calls `getDocuments`. Returns 200 `{ documents }`.
         - POST: Parses JSON body, calls `createDocument`, returns 201 `{ document }`.
       - `app/api/vault/documents/[id]/route.ts`:
         - GET: Calls `getDocumentById(id)`, returns 200 `{ document }` or 404.
         - PATCH: Parses JSON body, calls `updateDocument(id, body)`, returns 200 `{ document }`.
         - DELETE: Calls `deleteDocument(id)`, returns 200 `{ success: true }`.

    AVOID: Unhandled exceptions during file stream read or body parsing.
    USE: Safe try/catch error wrapping and standard HTTP status codes.
  </action>
  <verify>
    npx tsx -e "import { getDocuments, getVaultMetrics, createDocument } from './lib/actions/vault'; console.log('Vault actions imported successfully');"
  </verify>
  <done>
    Server actions for vault CRUD and metrics are operational, and REST route handlers `/api/vault/upload` and `/api/vault/documents` respond with expected payloads.
  </done>
</task>

## Must-Haves
After all tasks complete, verify:
- [ ] Prisma schema supports optional `assetId` on `Document` model without breaking existing relations.
- [ ] Vault storage adapter enforces 15MB file size limit and restricts uploads to PDF, JPEG, PNG, WEBP, and HEIC.
- [ ] SHA-256 hash calculation and file hash verification functions are available in `lib/storage/vault.ts`.
- [ ] Server actions in `lib/actions/vault.ts` support full CRUD and rollup of vault metrics (total docs, encrypted count, storage size, category counts).
- [ ] REST API routes `/api/vault/upload` and `/api/vault/documents` accept multipart uploads and return structured JSON.

## Success Criteria
- [ ] All tasks verified passing
- [ ] Must-haves confirmed
