---
phase: 2
researched_at: 2026-11-16
discovery_level: 2
---

# Phase 2 Research: AI Multi-Modal Ingestion & Receipt Extraction

## Objective
Establish an end-to-end receipt and invoice capture pipeline that accepts images (PNG, JPEG, HEIC, WebP) and PDF documents, extracts structured asset, warranty, and return metadata using Google Gemini API (`gemini-2.5-flash`), and presents an interactive verification interface for user review and confirmation before database persistence.

## Discovery Level
**Level 2** — Standard Research covering `@google/genai` multimodal extraction, structured JSON schema output, file upload handling, and human-in-the-loop review UI.

## Key Decisions

### Decision 1: AI SDK & Model Selection
- **Decision:** Google Gen AI SDK (`@google/genai`) using `gemini-2.5-flash`.
- **Rationale:** High throughput, lowest latency multimodal OCR capability, native support for `responseMimeType: "application/json"` and strict `responseSchema`. Fallback support for simulated/mock extraction when `GEMINI_API_KEY` is not configured locally, enabling deterministic testing.

### Decision 2: Multi-Modal Ingestion Flow
- **Decision:** Direct client drag-and-drop / file input with instant image preview, uploaded via multipart FormData to a Next.js API route (`/api/ingest/extract`).
- **File Storage:** Local secure asset directory (`public/uploads/receipts/`) for development with unique UUID filenames and SHA-256 integrity hashing.

### Decision 3: Structured Extraction Schema
The Gemini model will output typed JSON adhering to this structure:
```typescript
interface ExtractedReceiptData {
  merchant: string;
  purchaseDate: string; // YYYY-MM-DD
  totalAmount: number;
  currency: string;
  taxAmount?: number;
  paymentMethod?: string;
  items: Array<{
    name: string;
    category: string;
    price: number;
    quantity: number;
    brand?: string;
    modelNumber?: string;
    serialNumber?: string;
    suggestedWarrantyMonths?: number;
  }>;
  detectedWarranty?: {
    provider: string;
    durationMonths: number;
    warrantyType: "MANUFACTURER" | "EXTENDED";
    details?: string;
  };
  returnPolicy?: {
    windowDays: number;
    details?: string;
  };
  rawSummary: string;
}
```

### Decision 4: Human-in-the-Loop Review & Persistence
- **Decision:** After extraction, the user is presented with a side-by-side verification dialog / page showing:
  - Left panel: Original receipt image or document preview.
  - Right panel: Editable form fields populated by the AI extraction.
- **Confirmation Action:** One-click "Confirm & Add to Inventory" executes a transactional Server Action creating `Asset`, `Receipt`, `Warranty`, and `ReturnPolicy` in a single atomic database operation.

## Dependencies Identified
| Package | Version | Purpose |
|---|---|---|
| @google/genai | ^0.1.2 | Official Google Gen AI TypeScript SDK |

## Recommendations for Planning
- **Plan 2.1 (Wave 1)**: Ingestion backend & Gemini extraction service (`lib/ai/gemini.ts`, `/api/ingest/extract`, storage adapter, mock fallback mode).
- **Plan 2.2 (Wave 2, depends on 2.1)**: Interactive receipt upload zone component, side-by-side review & edit modal, confirmation persistence action, and verification test.
