"use server";

import prisma from "@/lib/prisma";
import { CreateReceiptInput } from "@/lib/validations/asset";
import { ActionResult } from "@/lib/actions/assets";

export async function getReceipts(assetId?: string): Promise<ActionResult<unknown[]>> {
  try {
    const receipts = await prisma.receipt.findMany({
      where: assetId ? { assetId } : undefined,
      include: {
        asset: {
          select: { id: true, name: true, category: true, brand: true },
        },
      },
      orderBy: { purchaseDate: "desc" },
    });

    return { success: true, data: receipts };
  } catch (error) {
    console.error("Failed to get receipts:", error);
    return { success: false, error: (error as Error).message || "Failed to fetch receipts" };
  }
}

export async function createReceipt(input: CreateReceiptInput): Promise<ActionResult<unknown>> {
  try {
    if (!input.merchant || input.merchant.trim() === "") {
      return { success: false, error: "Merchant name is required" };
    }

    const receipt = await prisma.receipt.create({
      data: {
        assetId: input.assetId || null,
        merchant: input.merchant.trim(),
        purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : null,
        totalAmount: input.totalAmount !== undefined ? Number(input.totalAmount) : null,
        currency: input.currency || "USD",
        rawOcrText: input.rawOcrText || null,
        fileUrl: input.fileUrl || null,
        mimeType: input.mimeType || null,
      },
      include: {
        asset: true,
      },
    });

    return { success: true, data: receipt };
  } catch (error) {
    console.error("Failed to create receipt:", error);
    return { success: false, error: (error as Error).message || "Failed to create receipt" };
  }
}
