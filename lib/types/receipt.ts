/**
 * Receipt Ingestion & Extraction Types
 * Strongly typed contracts for multi-modal OCR ingestion pipeline.
 */

export interface ExtractedReceiptItem {
  name: string;
  category: string;
  price: number;
  quantity: number;
  brand?: string;
  modelNumber?: string;
  serialNumber?: string;
  suggestedWarrantyMonths?: number;
}

export interface DetectedWarranty {
  provider: string;
  durationMonths: number;
  warrantyType: "MANUFACTURER" | "EXTENDED";
  details?: string;
}

export interface DetectedReturnPolicy {
  windowDays: number;
  details?: string;
}

export interface ExtractedReceiptData {
  merchant: string;
  purchaseDate: string; // ISO formatted YYYY-MM-DD
  totalAmount: number;
  currency: string;
  taxAmount?: number;
  paymentMethod?: string;
  items: ExtractedReceiptItem[];
  detectedWarranty?: DetectedWarranty;
  returnPolicy?: DetectedReturnPolicy;
  rawSummary: string;
}

export interface ReceiptUploadResult {
  fileUrl: string;
  filePath: string;
  fileName: string;
  mimeType: string;
  size: number;
  hash: string;
}

export interface IngestExtractApiResponse {
  success: boolean;
  file?: ReceiptUploadResult;
  extracted?: ExtractedReceiptData;
  error?: string;
}
