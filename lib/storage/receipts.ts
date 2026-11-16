import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ReceiptUploadResult } from "@/lib/types/receipt";

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
] as const;

export type SupportedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

const MIME_EXTENSION_MAP: Record<SupportedMimeType, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "application/pdf": ".pdf",
};

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const UPLOAD_DIR_RELATIVE = "public/uploads/receipts";

/**
 * Returns the resolved absolute upload directory.
 */
export function getUploadDirectory(): string {
  return path.resolve(process.cwd(), UPLOAD_DIR_RELATIVE);
}

/**
 * Validates whether a given MIME type is supported for receipt ingestion.
 */
export function isSupportedMimeType(mimeType: string): mimeType is SupportedMimeType {
  return ALLOWED_MIME_TYPES.includes(mimeType as SupportedMimeType);
}

/**
 * Sanitizes original filename and extracts a safe extension.
 */
export function sanitizeExtension(originalFilename: string, mimeType: SupportedMimeType): string {
  const parsedExt = path.extname(originalFilename).toLowerCase();
  const canonicalExt = MIME_EXTENSION_MAP[mimeType];

  if (canonicalExt === ".jpg" && (parsedExt === ".jpeg" || parsedExt === ".jpg")) {
    return parsedExt;
  }

  if (parsedExt === canonicalExt) {
    return canonicalExt;
  }

  return canonicalExt;
}

/**
 * Saves an uploaded receipt buffer safely into public/uploads/receipts/.
 * Generates a unique collision-resistant filename, calculates SHA-256 hash,
 * and prevents path traversal attacks.
 */
export async function saveReceiptFile(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string
): Promise<ReceiptUploadResult> {
  if (!isSupportedMimeType(mimeType)) {
    throw new Error(
      `Unsupported file type: ${mimeType}. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`
    );
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File size exceeds maximum allowed limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`
    );
  }

  const uploadDir = getUploadDirectory();
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const extension = sanitizeExtension(originalFilename, mimeType);
  const uniqueId = crypto.randomUUID();
  const timestamp = Date.now();
  const safeFileName = `${timestamp}-${uniqueId}${extension}`;
  const targetFilePath = path.join(uploadDir, safeFileName);

  // Calculate SHA-256 hash of the buffer
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");

  // Write file to target destination
  await fs.promises.writeFile(targetFilePath, buffer);

  const relativeUrl = `/uploads/receipts/${safeFileName}`;

  return {
    fileUrl: relativeUrl,
    filePath: targetFilePath,
    fileName: safeFileName,
    mimeType,
    size: buffer.length,
    hash,
  };
}

/**
 * Safely deletes a stored receipt file from disk if it exists within the upload directory.
 */
export async function deleteReceiptFile(filePath: string): Promise<boolean> {
  try {
    const uploadDir = getUploadDirectory();
    const resolvedPath = path.resolve(filePath);

    // Security check: ensure path resides within the upload directory
    if (!resolvedPath.startsWith(uploadDir)) {
      console.warn(`[Storage Warning] Attempted deletion outside upload dir: ${resolvedPath}`);
      return false;
    }

    if (fs.existsSync(resolvedPath)) {
      await fs.promises.unlink(resolvedPath);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`[Storage Error] Failed to delete file at ${filePath}:`, error);
    return false;
  }
}
