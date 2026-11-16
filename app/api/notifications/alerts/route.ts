import { NextRequest, NextResponse } from "next/server";
import { getActiveAlerts, AlertUrgency } from "@/lib/services/notifications";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const urgencyParam = searchParams.get("urgency")?.toUpperCase() as
      | AlertUrgency
      | undefined;

    const { alerts, summary } = await getActiveAlerts();

    const filteredAlerts = urgencyParam
      ? alerts.filter((a) => a.urgency === urgencyParam)
      : alerts;

    return NextResponse.json(
      {
        success: true,
        alerts: filteredAlerts,
        summary,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to fetch notification alerts:", error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message || "Failed to fetch notification alerts",
      },
      { status: 500 }
    );
  }
}
