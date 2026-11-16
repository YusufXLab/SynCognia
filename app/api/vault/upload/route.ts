import { NextRequest, NextResponse } from "next/server";
import {
  saveVaultDocument,
  isSupportedVaultMimeType,
  MAX_VAULT_FILE_SIZE_BYTES,
  deleteVaultDocument,
  ALLOWED_VAULT_MIME_TYPES,
} from "@/lib/storage/vault";
import { createDocument } from "@/lib/actions/vault";
import { DocumentType, DOCUMENT_TYPES } from "@/lib/types/vault";

export async function POST(request: NextRequest) {
  let uploadedFilePath: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required file upload under 'file' form field",
        },
        { status: 400 }
      );
    }

    // Determine MIME type with extension fallback
    let mimeType = file.type;
    if (!mimeType || mimeType === "application/octet-stream") {
      const lowerName = file.name.toLowerCase();
      if (lowerName.endsWith(".pdf")) mimeType = "application/pdf";
      else if (lowerName.endsWith(".png")) mimeType = "image/png";
      else if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg"))
        mimeType = "image/jpeg";
      else if (lowerName.endsWith(".webp")) mimeType = "image/webp";
      else if (lowerName.endsWith(".heic")) mimeType = "image/heic";
    }

    if (!isSupportedVaultMimeType(mimeType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported media type: '${mimeType}'. Supported types: ${ALLOWED_VAULT_MIME_TYPES.join(
            ", "
          )}`,
        },
        { status: 415 }
      );
    }

    if (file.size > MAX_VAULT_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `File size (${(file.size / (1024 * 1024)).toFixed(
            2
          )}MB) exceeds maximum limit of 15MB`,
        },
        { status: 413 }
      );
    }

    const titleField = formData.get("title");
    const assetIdField = formData.get("assetId");
    const documentTypeField = formData.get("documentType");
    const isEncryptedField = formData.get("isEncrypted");

    const isEncrypted =
      isEncryptedField === "true" ||
      isEncryptedField === "1" ||
      isEncryptedField === "yes";

    const title =
      typeof titleField === "string" && titleField.trim()
        ? titleField.trim()
        : file.name;

    const assetId =
      typeof assetIdField === "string" && assetIdField.trim()
        ? assetIdField.trim()
        : undefined;

    let documentType: DocumentType = "MANUAL";
    if (
      typeof documentTypeField === "string" &&
      DOCUMENT_TYPES.includes(documentTypeField as DocumentType)
    ) {
      documentType = documentTypeField as DocumentType;
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await saveVaultDocument(
      buffer,
      file.name,
      mimeType,
      { isEncrypted }
    );
    uploadedFilePath = uploadResult.filePath;

    // Persist document record in database
    const documentResult = await createDocument({
      title,
      assetId,
      documentType,
      fileUrl: uploadResult.fileUrl,
      fileSize: uploadResult.size,
      mimeType: uploadResult.mimeType,
      isEncrypted,
    });

    if (!documentResult.success || !documentResult.data) {
      if (uploadedFilePath) {
        await deleteVaultDocument(uploadedFilePath);
      }
      return NextResponse.json(
        {
          success: false,
          error: documentResult.error || "Failed to persist document metadata",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        document: documentResult.data,
        file: uploadResult,
      },
      { status: 201 }
    );
  } catch (error) {
    if (uploadedFilePath) {
      await deleteVaultDocument(uploadedFilePath).catch(() => {});
    }
    console.error("Vault document upload failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message || "Internal server error during upload",
      },
      { status: 500 }
    );
  }
}
