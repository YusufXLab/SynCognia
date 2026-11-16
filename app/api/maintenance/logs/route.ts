import { NextRequest, NextResponse } from "next/server";
import { getMaintenanceLogs, logServiceCompleted } from "@/lib/actions/maintenance";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const assetId = searchParams.get("assetId") || undefined;
    const scheduleId = searchParams.get("scheduleId") || undefined;

    const result = await getMaintenanceLogs({ assetId, scheduleId });
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ logs: result.data }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await logServiceCompleted(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(
      { log: result.data?.log, schedule: result.data?.schedule },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
