import { Document, Asset } from "@prisma/client";

export const DOCUMENT_TYPES = [
  "MANUAL",
  "INVOICE",
  "WARRANTY_CARD",
  "TITLE_DEED",
  "CERTIFICATE",
  "INSURANCE_POLICY",
  "APPRAISAL",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  MANUAL: "User Manual",
  INVOICE: "Invoice / Bill of Sale",
  WARRANTY_CARD: "Warranty Certificate",
  TITLE_DEED: "Title / Registration",
  CERTIFICATE: "Certificate of Authenticity",
  INSURANCE_POLICY: "Insurance Policy",
  APPRAISAL: "Professional Appraisal",
};

export interface DocumentUploadResult {
  fileUrl: string;
  filePath: string;
  fileName: string;
  mimeType: string;
  size: number;
  hash: string;
  isEncrypted: boolean;
}

export interface CreateDocumentInput {
  assetId?: string | null;
  title: string;
  documentType?: DocumentType;
  fileUrl: string;
  fileSize?: number | null;
  mimeType?: string | null;
  isEncrypted?: boolean;
}

export interface UpdateDocumentInput {
  title?: string;
  assetId?: string | null;
  documentType?: DocumentType;
  isEncrypted?: boolean;
}

export interface VaultFilter {
  assetId?: string;
  documentType?: string;
  isEncrypted?: boolean;
  search?: string;
}

export interface VaultMetrics {
  totalDocuments: number;
  encryptedCount: number;
  totalSizeBytes: number;
  assetsCoveredCount: number;
  categoryCounts: Record<DocumentType, number>;
}

export interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type DocumentWithAsset = Document & {
  asset?: Asset | null;
};
