import { NextRequest, NextResponse } from "next/server";
import {
  getMaintenanceSchedules,
  createMaintenanceSchedule,
} from "@/lib/actions/maintenance";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || undefined;
    const assetId = searchParams.get("assetId") || undefined;
    const category = searchParams.get("category") || undefined;

    const result = await getMaintenanceSchedules({ status, assetId, category });
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ schedules: result.data }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await createMaintenanceSchedule(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ schedule: result.data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
