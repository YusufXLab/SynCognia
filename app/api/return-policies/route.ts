import { NextRequest, NextResponse } from "next/server";
import {
  getReturnPolicies,
  createReturnPolicy,
  updateReturnPolicyStatus,
} from "@/lib/actions/returnPolicies";

export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get("status") || undefined;
    const result = await getReturnPolicies(status);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ returnPolicies: result.data }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to fetch return policies" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await createReturnPolicy(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ returnPolicy: result.data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to create return policy" },
      { status: 400 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: "Both 'id' and 'status' are required in PATCH body" },
        { status: 400 }
      );
    }

    const result = await updateReturnPolicyStatus(id, status);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ returnPolicy: result.data }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to update return policy" },
      { status: 400 }
    );
  }
}
