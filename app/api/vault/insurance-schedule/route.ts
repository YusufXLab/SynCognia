import { NextRequest, NextResponse } from "next/server";
import {
  generateInsuranceScheduleData,
  generateInsuranceScheduleCsv,
  generateInsuranceScheduleHtml,
} from "@/lib/services/insuranceExport";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const format = (searchParams.get("format") || "csv").toLowerCase();

    const data = await generateInsuranceScheduleData();

    if (format === "html") {
      const html = generateInsuranceScheduleHtml(data);
      return new NextResponse(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    if (format === "json") {
      return NextResponse.json({
        success: true,
        schedule: data,
      });
    }

    // Default: format === "csv"
    const csv = generateInsuranceScheduleCsv(data);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="syncognia-insurance-schedule.csv"',
      },
    });
  } catch (error) {
    console.error("Failed to generate insurance schedule:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate insurance schedule",
      },
      { status: 500 }
    );
  }
}
