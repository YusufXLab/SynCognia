"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { CreateWarrantyInput } from "@/lib/validations/asset";
import { ActionResult } from "@/lib/actions/assets";
import { enhanceWarranty, syncAllDeadlineStatuses } from "@/lib/services/deadlines";
import { EnhancedWarranty, DeadlineSyncResult } from "@/lib/types/deadline";

function safeRevalidate(paths: string[]) {
  try {
    for (const p of paths) {
      revalidatePath(p);
    }
  } catch {
    // revalidatePath is a no-op outside Next.js request contexts (e.g. CLI/tests)
  }
}

/**
 * Retrieves warranties with associated asset details,
 * enhanced with calculated status, elapsed percentage, and remaining days.
 */
export async function getWarranties(
  statusFilter?: string
): Promise<ActionResult<EnhancedWarranty[]>> {
  try {
    const rawWarranties = await prisma.warranty.findMany({
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            category: true,
            brand: true,
            modelNumber: true,
            serialNumber: true,
            purchaseDate: true,
          },
        },
      },
      orderBy: { endDate: "asc" },
    });

    const enhanced = rawWarranties.map((w) => enhanceWarranty(w));

    const filtered = statusFilter
      ? enhanced.filter(
          (w) => w.calculatedStatus.toUpperCase() === statusFilter.toUpperCase()
        )
      : enhanced;

    return { success: true, data: filtered };
  } catch (error) {
    console.error("Failed to get warranties:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to fetch warranties",
    };
  }
}

/**
 * Creates a warranty record and triggers route revalidation.
 */
export async function createWarranty(
  input: CreateWarrantyInput
): Promise<ActionResult<EnhancedWarranty>> {
  try {
    if (!input.assetId) {
      return { success: false, error: "Asset ID is required to associate warranty" };
    }
    if (!input.provider || input.provider.trim() === "") {
      return { success: false, error: "Warranty provider name is required" };
    }

    const warranty = await prisma.warranty.create({
      data: {
        assetId: input.assetId,
        provider: input.provider.trim(),
        warrantyType: input.warrantyType || "MANUFACTURER",
        durationMonths: input.durationMonths !== undefined ? Number(input.durationMonths) : null,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        policyNumber: input.policyNumber?.trim() || null,
        supportContact: input.supportContact?.trim() || null,
        claimUrl: input.claimUrl?.trim() || null,
        status: input.status || "ACTIVE",
      },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            category: true,
            brand: true,
            modelNumber: true,
            serialNumber: true,
            purchaseDate: true,
          },
        },
      },
    });

    safeRevalidate(["/warranties", "/assets", "/"]);

    return { success: true, data: enhanceWarranty(warranty) };
  } catch (error) {
    console.error("Failed to create warranty:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to create warranty",
    };
  }
}

/**
 * Updates a warranty record status.
 */
export async function updateWarrantyStatus(
  id: string,
  status: string
): Promise<ActionResult<EnhancedWarranty>> {
  try {
    const updated = await prisma.warranty.update({
      where: { id },
      data: { status },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            category: true,
            brand: true,
            modelNumber: true,
            serialNumber: true,
            purchaseDate: true,
          },
        },
      },
    });

    safeRevalidate(["/warranties", "/assets", "/"]);

    return { success: true, data: enhanceWarranty(updated) };
  } catch (error) {
    console.error(`Failed to update warranty status ${id}:`, error);
    return {
      success: false,
      error: (error as Error).message || "Failed to update warranty status",
    };
  }
}

/**
 * Server Action to run real-time calendar synchronization for both
 * warranties and return policies, synchronizing DB state and revalidating routes.
 */
export async function syncWarrantiesAndReturns(): Promise<ActionResult<DeadlineSyncResult>> {
  try {
    const syncResult = await syncAllDeadlineStatuses();
    safeRevalidate(["/warranties", "/assets", "/"]);
    return { success: true, data: syncResult };
  } catch (error) {
    console.error("Failed to sync warranties and returns:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to sync deadline statuses",
    };
  }
}
