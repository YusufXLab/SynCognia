import { NextRequest, NextResponse } from "next/server";
import { getAssetById, updateAsset, deleteAsset } from "@/lib/actions/assets";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await getAssetById(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.error === "Asset not found" ? 404 : 500 });
    }

    return NextResponse.json({ asset: result.data }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const result = await updateAsset(id, body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.error === "Asset not found" ? 404 : 400 });
    }

    return NextResponse.json({ asset: result.data }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await deleteAsset(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, id: (result.data as { id: string }).id }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
