import { NextRequest, NextResponse } from "next/server";
import { getReceipts, createReceipt } from "@/lib/actions/receipts";

export async function GET(request: NextRequest) {
  try {
    const assetId = request.nextUrl.searchParams.get("assetId") || undefined;
    const result = await getReceipts(assetId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ receipts: result.data }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await createReceipt(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ receipt: result.data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
