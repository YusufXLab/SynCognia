import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateICalendar, CalendarEventInput } from "@/lib/utils/calendar";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = (searchParams.get("scope") || "all").toLowerCase();
    const specificId = searchParams.get("id");

    const events: CalendarEventInput[] = [];

    const includeWarranties = scope === "all" || scope === "warranties";
    const includeReturns = scope === "all" || scope === "returns";

    if (includeWarranties) {
      const warranties = await prisma.warranty.findMany({
        where: specificId
          ? {
              OR: [{ id: specificId }, { assetId: specificId }],
            }
          : undefined,
        include: {
          asset: {
            select: {
              id: true,
              name: true,
              brand: true,
              modelNumber: true,
              serialNumber: true,
            },
          },
        },
      });

      for (const w of warranties) {
        if (!w.endDate || w.warrantyType === "LIFETIME") continue;

        const endDate = new Date(w.endDate);
        const descParts = [
          `Asset: ${w.asset?.name || "Asset"}`,
          w.asset?.brand ? `Brand: ${w.asset.brand}` : null,
          w.asset?.modelNumber ? `Model: ${w.asset.modelNumber}` : null,
          w.asset?.serialNumber ? `Serial: ${w.asset.serialNumber}` : null,
          `Provider: ${w.provider}`,
          `Warranty Type: ${w.warrantyType}`,
          w.policyNumber ? `Policy Number: ${w.policyNumber}` : null,
          w.supportContact ? `Support: ${w.supportContact}` : null,
          w.claimUrl ? `Claim URL: ${w.claimUrl}` : null,
        ]
          .filter(Boolean)
          .join("\n");

        events.push({
          id: `warranty-${w.id}`,
          title: `[Warranty Expiry] ${w.asset?.name || "Asset"} (${w.provider})`,
          description: descParts,
          startDate: endDate,
          endDate: endDate,
          url: w.claimUrl || undefined,
          alarms: [30, 7], // 30-day and 7-day prior reminders
        });
      }
    }

    if (includeReturns) {
      const returnPolicies = await prisma.returnPolicy.findMany({
        where: specificId
          ? {
              OR: [{ id: specificId }, { assetId: specificId }],
            }
          : undefined,
        include: {
          asset: {
            select: {
              id: true,
              name: true,
              brand: true,
              modelNumber: true,
              serialNumber: true,
            },
          },
        },
      });

      for (const p of returnPolicies) {
        if (!p.returnDeadline || p.returnStatus === "RETURNED") continue;

        const deadlineDate = new Date(p.returnDeadline);
        const descParts = [
          `Asset: ${p.asset?.name || "Asset"}`,
          p.asset?.brand ? `Brand: ${p.asset.brand}` : null,
          p.asset?.modelNumber ? `Model: ${p.asset.modelNumber}` : null,
          `Return Window: ${p.returnWindowDays} days`,
          p.policyDetails ? `Policy Details: ${p.policyDetails}` : null,
          `Status: ${p.returnStatus}`,
        ]
          .filter(Boolean)
          .join("\n");

        events.push({
          id: `return-${p.id}`,
          title: `[Return Deadline] ${p.asset?.name || "Asset"}`,
          description: descParts,
          startDate: deadlineDate,
          endDate: deadlineDate,
          alarms: [7, 1], // 7-day and 24-hour prior reminders
        });
      }
    }

    const calName =
      scope === "warranties"
        ? "SynCognia Warranties"
        : scope === "returns"
        ? "SynCognia Return Windows"
        : "SynCognia Expirations & Deadlines";

    const icsContent = generateICalendar(events, { calName });

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="syncognia-deadlines.ics"',
        "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Failed to generate iCalendar export:", error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message || "Failed to generate iCalendar export",
      },
      { status: 500 }
    );
  }
}
