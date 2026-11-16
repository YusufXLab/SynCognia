import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DocumentUploadResult } from "@/lib/types/vault";

export const ALLOWED_VAULT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
] as const;

export type SupportedVaultMimeType = (typeof ALLOWED_VAULT_MIME_TYPES)[number];

const MIME_EXTENSION_MAP: Record<SupportedVaultMimeType, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
};

export const MAX_VAULT_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
export const UPLOAD_DIR_RELATIVE = "public/uploads/vault";

/**
 * Returns the resolved absolute upload directory for vault files.
 */
export function getVaultUploadDirectory(): string {
  return path.resolve(process.cwd(), UPLOAD_DIR_RELATIVE);
}

/**
 * Validates whether a given MIME type is supported for vault storage.
 */
export function isSupportedVaultMimeType(
  mimeType: string
): mimeType is SupportedVaultMimeType {
  return ALLOWED_VAULT_MIME_TYPES.includes(mimeType as SupportedVaultMimeType);
}

/**
 * Computes SHA-256 hash of a buffer.
 */
export function computeBufferHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Sanitizes original filename and extracts a safe canonical extension.
 */
export function sanitizeVaultExtension(
  originalFilename: string,
  mimeType: SupportedVaultMimeType
): string {
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
 * Resolves a vault file URL or path to an absolute filesystem path.
 */
export function resolveVaultFilePath(pathOrUrl: string): string {
  const uploadDir = getVaultUploadDirectory();

  if (path.isAbsolute(pathOrUrl)) {
    return path.resolve(pathOrUrl);
  }

  const normalized = pathOrUrl.replace(/^[/\\]+/, "");
  if (normalized.startsWith("public")) {
    return path.resolve(process.cwd(), normalized);
  }
  if (normalized.startsWith("uploads/vault") || normalized.startsWith("uploads\\vault")) {
    return path.resolve(process.cwd(), "public", normalized);
  }

  return path.resolve(uploadDir, path.basename(pathOrUrl));
}

/**
 * Saves an uploaded vault document buffer safely into public/uploads/vault/.
 * Validates MIME type, enforces 15MB file size limit, generates collision-resistant
 * unique filename, calculates SHA-256 integrity hash, and saves file.
 */
export async function saveVaultDocument(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string,
  options?: { isEncrypted?: boolean }
): Promise<DocumentUploadResult> {
  if (!isSupportedVaultMimeType(mimeType)) {
    throw new Error(
      `Unsupported file type: ${mimeType}. Allowed types: ${ALLOWED_VAULT_MIME_TYPES.join(", ")}`
    );
  }

  if (buffer.length > MAX_VAULT_FILE_SIZE_BYTES) {
    throw new Error(
      `File size (${(buffer.length / (1024 * 1024)).toFixed(2)}MB) exceeds maximum allowed limit of ${
        MAX_VAULT_FILE_SIZE_BYTES / (1024 * 1024)
      }MB`
    );
  }

  const uploadDir = getVaultUploadDirectory();
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const extension = sanitizeVaultExtension(originalFilename, mimeType);
  const uniqueId = crypto.randomUUID();
  const timestamp = Date.now();
  const safeFileName = `${timestamp}-${uniqueId}${extension}`;
  const targetFilePath = path.join(uploadDir, safeFileName);

  // Calculate SHA-256 checksum
  const hash = computeBufferHash(buffer);

  // Write file to target destination
  await fs.promises.writeFile(targetFilePath, buffer);

  const relativeUrl = `/uploads/vault/${safeFileName}`;

  return {
    fileUrl: relativeUrl,
    filePath: targetFilePath,
    fileName: safeFileName,
    mimeType,
    size: buffer.length,
    hash,
    isEncrypted: !!options?.isEncrypted,
  };
}

/**
 * Reads stored file from disk, computes SHA-256 hash, and compares against expectedHash.
 */
export async function verifyFileHash(
  filePathOrUrl: string,
  expectedHash: string
): Promise<boolean> {
  try {
    const uploadDir = getVaultUploadDirectory();
    const resolvedPath = resolveVaultFilePath(filePathOrUrl);

    // Path boundary check
    if (!resolvedPath.startsWith(uploadDir)) {
      console.warn(`[Vault Storage Warning] Attempted hash verification outside upload dir: ${resolvedPath}`);
      return false;
    }

    if (!fs.existsSync(resolvedPath)) {
      return false;
    }

    const fileBuffer = await fs.promises.readFile(resolvedPath);
    const computedHash = computeBufferHash(fileBuffer);

    return computedHash.toLowerCase() === expectedHash.toLowerCase();
  } catch (error) {
    console.error(`[Vault Storage Error] Failed to verify file hash for ${filePathOrUrl}:`, error);
    return false;
  }
}

/**
 * Safely deletes a stored vault file from disk if it exists within the upload directory.
 * Prevents directory traversal attacks.
 */
export async function deleteVaultDocument(filePathOrUrl: string): Promise<boolean> {
  try {
    const uploadDir = getVaultUploadDirectory();
    const resolvedPath = resolveVaultFilePath(filePathOrUrl);

    // Security check: ensure path resides within the upload directory
    if (!resolvedPath.startsWith(uploadDir)) {
      console.warn(`[Vault Storage Warning] Attempted deletion outside upload dir: ${resolvedPath}`);
      return false;
    }

    if (fs.existsSync(resolvedPath)) {
      await fs.promises.unlink(resolvedPath);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`[Vault Storage Error] Failed to delete file at ${filePathOrUrl}:`, error);
    return false;
  }
}
