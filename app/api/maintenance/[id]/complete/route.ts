import { NextRequest, NextResponse } from "next/server";
import { logServiceCompleted } from "@/lib/actions/maintenance";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    let body = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is allowed, defaults will be used
      body = {};
    }

    const result = await logServiceCompleted({
      ...body,
      scheduleId: id,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "Maintenance schedule not found" ? 404 : 400 }
      );
    }

    return NextResponse.json(
      {
        schedule: result.data?.schedule,
        log: result.data?.log,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
