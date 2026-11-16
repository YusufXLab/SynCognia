import { NextRequest, NextResponse } from "next/server";
import {
  generateClaimDossierData,
  generateClaimDossierHtml,
} from "@/lib/services/claimDossier";

interface RouteContext {
  params: Promise<{ assetId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { assetId } = await context.params;

    if (!assetId) {
      return NextResponse.json(
        { success: false, error: "Asset ID parameter is required" },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const format = (searchParams.get("format") || "html").toLowerCase();

    let dossier;
    try {
      dossier = await generateClaimDossierData(assetId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Asset not found")) {
        return NextResponse.json(
          { success: false, error: msg },
          { status: 404 }
        );
      }
      throw err;
    }

    if (format === "json") {
      return NextResponse.json(
        { success: true, dossier },
        { status: 200 }
      );
    }

    const html = generateClaimDossierHtml(dossier);

    if (format === "download") {
      return new NextResponse(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="claim-dossier-${dossier.dossierId}.html"`,
        },
      });
    }

    // Default: format === "html"
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("GET /api/claim-dossier/[assetId] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
