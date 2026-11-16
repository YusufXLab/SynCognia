"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ActionResult } from "@/lib/actions/assets";
import { enhanceReturnPolicy } from "@/lib/services/deadlines";
import { EnhancedReturnPolicy, ReturnPolicyStatus } from "@/lib/types/deadline";

export interface CreateReturnPolicyInput {
  assetId: string;
  returnWindowDays?: number;
  returnDeadline?: Date | string;
  policyDetails?: string;
  returnStatus?: ReturnPolicyStatus | string;
}

export interface UpdateReturnPolicyInput {
  id: string;
  returnWindowDays?: number;
  returnDeadline?: Date | string;
  policyDetails?: string;
  returnStatus?: ReturnPolicyStatus | string;
}

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
 * Retrieves return policies with associated asset details,
 * enhanced with calculated status, remaining days, and flags.
 */
export async function getReturnPolicies(
  statusFilter?: string
): Promise<ActionResult<EnhancedReturnPolicy[]>> {
  try {
    const rawPolicies = await prisma.returnPolicy.findMany({
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
      orderBy: { returnDeadline: "asc" },
    });

    const enhanced = rawPolicies.map((p) => enhanceReturnPolicy(p));

    const filtered = statusFilter
      ? enhanced.filter(
          (p) => p.calculatedStatus.toUpperCase() === statusFilter.toUpperCase()
        )
      : enhanced;

    return { success: true, data: filtered };
  } catch (error) {
    console.error("Failed to get return policies:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to fetch return policies",
    };
  }
}

/**
 * Creates a return policy record for an asset.
 * If returnDeadline is omitted, it is computed from the asset's purchaseDate + returnWindowDays.
 */
export async function createReturnPolicy(
  input: CreateReturnPolicyInput
): Promise<ActionResult<EnhancedReturnPolicy>> {
  try {
    if (!input.assetId) {
      return { success: false, error: "Asset ID is required to create a return policy" };
    }

    const asset = await prisma.asset.findUnique({
      where: { id: input.assetId },
      select: { id: true, purchaseDate: true },
    });

    if (!asset) {
      return { success: false, error: `Asset with ID ${input.assetId} not found` };
    }

    const windowDays = input.returnWindowDays !== undefined ? Number(input.returnWindowDays) : 30;

    let deadline: Date | null = null;
    if (input.returnDeadline) {
      deadline = new Date(input.returnDeadline);
    } else if (asset.purchaseDate) {
      deadline = new Date(asset.purchaseDate.getTime() + windowDays * 24 * 60 * 60 * 1000);
    } else {
      deadline = new Date(Date.now() + windowDays * 24 * 60 * 60 * 1000);
    }

    const created = await prisma.returnPolicy.create({
      data: {
        assetId: input.assetId,
        returnWindowDays: windowDays,
        returnDeadline: deadline,
        policyDetails: input.policyDetails?.trim() || null,
        returnStatus: input.returnStatus || "OPEN",
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

    return { success: true, data: enhanceReturnPolicy(created) };
  } catch (error) {
    console.error("Failed to create return policy:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to create return policy",
    };
  }
}

/**
 * Updates the return policy status (e.g., marks as RETURNED, OPEN, or EXPIRED)
 */
export async function updateReturnPolicyStatus(
  id: string,
  status: string
): Promise<ActionResult<EnhancedReturnPolicy>> {
  try {
    if (!id) {
      return { success: false, error: "Return policy ID is required" };
    }

    const updated = await prisma.returnPolicy.update({
      where: { id },
      data: { returnStatus: status },
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

    return { success: true, data: enhanceReturnPolicy(updated) };
  } catch (error) {
    console.error(`Failed to update return policy status ${id}:`, error);
    return {
      success: false,
      error: (error as Error).message || "Failed to update return policy status",
    };
  }
}
