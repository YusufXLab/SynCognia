import { NextRequest, NextResponse } from "next/server";
import {
  getMaintenanceScheduleById,
  updateMaintenanceSchedule,
  deleteMaintenanceSchedule,
} from "@/lib/actions/maintenance";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await getMaintenanceScheduleById(id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "Maintenance schedule not found" ? 404 : 500 }
      );
    }

    return NextResponse.json({ schedule: result.data }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const result = await updateMaintenanceSchedule(id, body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "Maintenance schedule not found" ? 404 : 400 }
      );
    }

    return NextResponse.json({ schedule: result.data }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await deleteMaintenanceSchedule(id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "Maintenance schedule not found" ? 404 : 400 }
      );
    }

    return NextResponse.json({ success: true, id: result.data?.id }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
