import { NextRequest, NextResponse } from "next/server";
import { getDocuments, createDocument } from "@/lib/actions/vault";
import { VaultFilter } from "@/lib/types/vault";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const assetId = searchParams.get("assetId") || undefined;
    const documentType = searchParams.get("documentType") || undefined;
    const search = searchParams.get("search") || undefined;
    const isEncryptedParam = searchParams.get("isEncrypted");

    const filter: VaultFilter = {};
    if (assetId) filter.assetId = assetId;
    if (documentType) filter.documentType = documentType;
    if (search) filter.search = search;
    if (isEncryptedParam !== null) {
      filter.isEncrypted = isEncryptedParam === "true" || isEncryptedParam === "1";
    }

    const result = await getDocuments(filter);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, documents: result.data },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/vault/documents error:", error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message || "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await createDocument(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true, document: result.data },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/vault/documents error:", error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message || "Invalid JSON payload",
      },
      { status: 400 }
    );
  }
}
