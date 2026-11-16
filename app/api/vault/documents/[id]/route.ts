import { NextRequest, NextResponse } from "next/server";
import {
  getDocumentById,
  updateDocument,
  deleteDocument,
} from "@/lib/actions/vault";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await getDocumentById(id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error === "Document not found" ? 404 : 500 }
      );
    }

    return NextResponse.json(
      { success: true, document: result.data },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/vault/documents/[id] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message || "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const result = await updateDocument(id, body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error === "Document not found" ? 404 : 400 }
      );
    }

    return NextResponse.json(
      { success: true, document: result.data },
      { status: 200 }
    );
  } catch (error) {
    console.error("PATCH /api/vault/documents/[id] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message || "Invalid request payload",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await deleteDocument(id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error === "Document not found" ? 404 : 400 }
      );
    }

    return NextResponse.json(
      { success: true, id: result.data?.id },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE /api/vault/documents/[id] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
