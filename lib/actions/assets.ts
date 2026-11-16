"use server";

import prisma from "@/lib/prisma";
import { CreateAssetInput, UpdateAssetInput, validateAssetInput } from "@/lib/validations/asset";

export interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getAssets(filter?: {
  category?: string;
  status?: string;
  search?: string;
}): Promise<ActionResult<unknown[]>> {
  try {
    const where: Record<string, unknown> = {};

    if (filter?.category) {
      where.category = filter.category;
    }
    if (filter?.status) {
      where.status = filter.status;
    }
    if (filter?.search) {
      where.OR = [
        { name: { contains: filter.search } },
        { brand: { contains: filter.search } },
        { modelNumber: { contains: filter.search } },
        { serialNumber: { contains: filter.search } },
      ];
    }

    const assets = await prisma.asset.findMany({
      where,
      include: {
        warranties: {
          orderBy: { endDate: "asc" },
        },
        receipts: {
          take: 1,
          orderBy: { purchaseDate: "desc" },
        },
        returnPolicies: true,
        maintenanceSchedules: {
          where: { status: { in: ["UPCOMING", "DUE"] } },
          orderBy: { nextServiceDate: "asc" },
        },
        documents: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: assets };
  } catch (error) {
    console.error("Failed to get assets:", error);
    return { success: false, error: (error as Error).message || "Failed to fetch assets" };
  }
}

export async function getAssetById(id: string): Promise<ActionResult<unknown>> {
  try {
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        warranties: true,
        receipts: true,
        returnPolicies: true,
        maintenanceSchedules: true,
        documents: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!asset) {
      return { success: false, error: "Asset not found" };
    }

    return { success: true, data: asset };
  } catch (error) {
    console.error(`Failed to get asset ${id}:`, error);
    return { success: false, error: (error as Error).message || "Failed to fetch asset" };
  }
}

export async function createAsset(input: CreateAssetInput): Promise<ActionResult<unknown>> {
  try {
    const validation = validateAssetInput(input);
    if (!validation.valid || !validation.data) {
      return { success: false, error: validation.errors.join(", ") };
    }

    // Default to the first user in database if not provided
    let userId = validation.data.userId;
    if (!userId) {
      const defaultUser = await prisma.user.findFirst();
      if (!defaultUser) {
        return { success: false, error: "No user found in database to associate asset" };
      }
      userId = defaultUser.id;
    }

    const asset = await prisma.asset.create({
      data: {
        userId,
        name: validation.data.name,
        category: validation.data.category,
        brand: validation.data.brand,
        modelNumber: validation.data.modelNumber,
        serialNumber: validation.data.serialNumber,
        purchaseDate: validation.data.purchaseDate,
        purchasePrice: validation.data.purchasePrice,
        currency: validation.data.currency || "USD",
        location: validation.data.location,
        status: validation.data.status || "ACTIVE",
        notes: validation.data.notes,
      },
      include: {
        warranties: true,
        receipts: true,
      },
    });

    return { success: true, data: asset };
  } catch (error) {
    console.error("Failed to create asset:", error);
    return { success: false, error: (error as Error).message || "Failed to create asset" };
  }
}

export async function updateAsset(id: string, input: UpdateAssetInput): Promise<ActionResult<unknown>> {
  try {
    const existing = await prisma.asset.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Asset not found" };
    }

    const updated = await prisma.asset.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name.trim() }),
        ...(input.category && { category: input.category.trim() }),
        ...(input.brand !== undefined && { brand: input.brand }),
        ...(input.modelNumber !== undefined && { modelNumber: input.modelNumber }),
        ...(input.serialNumber !== undefined && { serialNumber: input.serialNumber }),
        ...(input.purchaseDate !== undefined && {
          purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : null,
        }),
        ...(input.purchasePrice !== undefined && { purchasePrice: input.purchasePrice }),
        ...(input.currency !== undefined && { currency: input.currency }),
        ...(input.location !== undefined && { location: input.location }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.notes !== undefined && { notes: input.notes }),
      },
    });

    return { success: true, data: updated };
  } catch (error) {
    console.error(`Failed to update asset ${id}:`, error);
    return { success: false, error: (error as Error).message || "Failed to update asset" };
  }
}

export async function deleteAsset(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    await prisma.asset.delete({ where: { id } });
    return { success: true, data: { id } };
  } catch (error) {
    console.error(`Failed to delete asset ${id}:`, error);
    return { success: false, error: (error as Error).message || "Failed to delete asset" };
  }
}
