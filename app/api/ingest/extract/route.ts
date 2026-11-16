import { NextRequest, NextResponse } from "next/server";
import {
  saveReceiptFile,
  isSupportedMimeType,
  MAX_FILE_SIZE_BYTES,
  deleteReceiptFile,
  ALLOWED_MIME_TYPES,
} from "@/lib/storage/receipts";
import { extractReceiptData } from "@/lib/ai/gemini";
import { IngestExtractApiResponse } from "@/lib/types/receipt";

export async function POST(
  request: NextRequest
): Promise<NextResponse<IngestExtractApiResponse>> {
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

    // Determine MIME type with fallback to filename extension mapping if generic
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

    if (!isSupportedMimeType(mimeType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported media type: '${mimeType}'. Supported types: ${ALLOWED_MIME_TYPES.join(", ")}`,
        },
        { status: 415 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds maximum limit of 10MB`,
        },
        { status: 400 }
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Persist file safely to disk
    const uploadResult = await saveReceiptFile(fileBuffer, file.name, mimeType);
    uploadedFilePath = uploadResult.filePath;

    // Run AI structured extraction (with fallback mock support)
    const extractedData = await extractReceiptData({
      buffer: fileBuffer,
      mimeType,
      fileName: file.name,
    });

    return NextResponse.json(
      {
        success: true,
        file: uploadResult,
        extracted: extractedData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API Ingest Extract Error]:", error);

    // If an upload file was written but a subsequent fatal failure occurred, clean it up
    if (uploadedFilePath) {
      await deleteReceiptFile(uploadedFilePath).catch(() => {});
    }

    const message =
      error instanceof Error ? error.message : "Internal ingestion processing error";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
