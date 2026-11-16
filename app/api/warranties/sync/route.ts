import { NextResponse } from "next/server";
import { syncAllDeadlineStatuses } from "@/lib/services/deadlines";
import { revalidatePath } from "next/cache";

export async function POST() {
  try {
    const syncResult = await syncAllDeadlineStatuses();

    try {
      revalidatePath("/warranties");
      revalidatePath("/assets");
      revalidatePath("/");
    } catch {
      // no-op if outside request store
    }

    return NextResponse.json({ success: true, syncResult }, { status: 200 });
  } catch (error) {
    console.error("Deadline sync failed:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || "Deadline sync failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
