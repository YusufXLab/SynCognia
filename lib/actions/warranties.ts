"use server";

import prisma from "@/lib/prisma";
import { CreateWarrantyInput } from "@/lib/validations/asset";
import { ActionResult } from "@/lib/actions/assets";

export async function getWarranties(status?: string): Promise<ActionResult<unknown[]>> {
  try {
    const warranties = await prisma.warranty.findMany({
      where: status ? { status } : undefined,
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            category: true,
            brand: true,
            modelNumber: true,
            serialNumber: true,
          },
        },
      },
      orderBy: { endDate: "asc" },
    });

    return { success: true, data: warranties };
  } catch (error) {
    console.error("Failed to get warranties:", error);
    return { success: false, error: (error as Error).message || "Failed to fetch warranties" };
  }
}

export async function createWarranty(input: CreateWarrantyInput): Promise<ActionResult<unknown>> {
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
        asset: true,
      },
    });

    return { success: true, data: warranty };
  } catch (error) {
    console.error("Failed to create warranty:", error);
    return { success: false, error: (error as Error).message || "Failed to create warranty" };
  }
}

export async function updateWarrantyStatus(id: string, status: string): Promise<ActionResult<unknown>> {
  try {
    const updated = await prisma.warranty.update({
      where: { id },
      data: { status },
    });

    return { success: true, data: updated };
  } catch (error) {
    console.error(`Failed to update warranty status ${id}:`, error);
    return { success: false, error: (error as Error).message || "Failed to update warranty status" };
  }
}
