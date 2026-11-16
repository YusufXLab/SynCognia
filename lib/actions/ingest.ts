"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ActionResult } from "@/lib/actions/assets";
import {
  PersistReceiptInput,
  validatePersistReceiptInput,
} from "@/lib/validations/ingest";

export interface PersistResultData {
  assetId: string;
  receiptId: string;
  warrantyId?: string;
  returnPolicyId?: string;
  documentId?: string;
  assetName: string;
}

export async function persistExtractedReceipt(
  input: PersistReceiptInput
): Promise<ActionResult<PersistResultData>> {
  try {
    const validation = validatePersistReceiptInput(input);
    if (!validation.valid || !validation.data) {
      return {
        success: false,
        error: validation.errors.join("; "),
      };
    }

    const validData = validation.data;

    // Resolve userId: either explicitly passed, or look up first user, or create demo user
    let userId = validData.userId;
    if (!userId) {
      const existingUser = await prisma.user.findFirst();
      if (existingUser) {
        userId = existingUser.id;
      } else {
        const newUser = await prisma.user.create({
          data: {
            email: "demo@syncognia.local",
            name: "Demo User",
          },
        });
        userId = newUser.id;
      }
    }

    // Execute atomic mutation inside a single Prisma transaction
    const result = await prisma.$transaction(async (tx) => {
      // Primary item details
      const primaryItem = validData.items[0];
      const purchaseDate = validData.purchaseDate ? new Date(validData.purchaseDate) : new Date();

      // 1. Create Asset
      const asset = await tx.asset.create({
        data: {
          userId: userId!,
          name: primaryItem?.name || `${validData.merchant} Purchase`,
          category: primaryItem?.category || "Personal",
          brand: primaryItem?.brand || null,
          modelNumber: primaryItem?.modelNumber || null,
          serialNumber: primaryItem?.serialNumber || null,
          purchaseDate: purchaseDate,
          purchasePrice: validData.totalAmount || primaryItem?.price || 0,
          currency: validData.currency || "USD",
          location: validData.location || "Home Office",
          status: "ACTIVE",
          notes:
            validData.notes ||
            (validData.rawSummary
              ? `Receipt scanned: ${validData.rawSummary}`
              : null),
        },
      });

      // 2. Create Receipt linked to Asset
      const receipt = await tx.receipt.create({
        data: {
          assetId: asset.id,
          merchant: validData.merchant,
          purchaseDate: purchaseDate,
          totalAmount: validData.totalAmount,
          currency: validData.currency || "USD",
          rawOcrText: validData.rawSummary || null,
          fileUrl: validData.fileUrl || null,
          mimeType: validData.mimeType || "image/jpeg",
        },
      });

      // 3. Create Warranty if provided
      let warrantyId: string | undefined;
      if (validData.warranty && validData.warranty.durationMonths > 0) {
        const startDate = purchaseDate;
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + validData.warranty.durationMonths);

        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        let status = "ACTIVE";
        if (endDate < now) {
          status = "EXPIRED";
        } else if (endDate <= thirtyDaysFromNow) {
          status = "EXPIRING_SOON";
        }

        const warranty = await tx.warranty.create({
          data: {
            assetId: asset.id,
            provider: validData.warranty.provider || validData.merchant,
            warrantyType: validData.warranty.warrantyType || "MANUFACTURER",
            durationMonths: validData.warranty.durationMonths,
            startDate,
            endDate,
            policyNumber: validData.warranty.policyNumber || null,
            supportContact: validData.warranty.supportContact || null,
            claimUrl: validData.warranty.claimUrl || null,
            status,
          },
        });
        warrantyId = warranty.id;
      }

      // 4. Create ReturnPolicy if provided
      let returnPolicyId: string | undefined;
      if (validData.returnPolicy && validData.returnPolicy.returnWindowDays > 0) {
        const returnDeadline = new Date(purchaseDate);
        returnDeadline.setDate(
          returnDeadline.getDate() + validData.returnPolicy.returnWindowDays
        );

        const now = new Date();
        const returnStatus = returnDeadline < now ? "EXPIRED" : "OPEN";

        const returnPolicy = await tx.returnPolicy.create({
          data: {
            assetId: asset.id,
            returnWindowDays: validData.returnPolicy.returnWindowDays,
            returnDeadline,
            policyDetails:
              validData.returnPolicy.policyDetails ||
              `${validData.returnPolicy.returnWindowDays}-day return policy from ${validData.merchant}`,
            returnStatus,
          },
        });
        returnPolicyId = returnPolicy.id;
      }

      // 5. Create Document Vault entry if fileUrl is provided
      let documentId: string | undefined;
      if (validData.fileUrl) {
        const doc = await tx.document.create({
          data: {
            assetId: asset.id,
            title: `${validData.merchant} Receipt`,
            documentType: "INVOICE",
            fileUrl: validData.fileUrl,
            mimeType: validData.mimeType || "image/jpeg",
          },
        });
        documentId = doc.id;
      }

      return {
        assetId: asset.id,
        receiptId: receipt.id,
        warrantyId,
        returnPolicyId,
        documentId,
        assetName: asset.name,
      };
    });

    // Revalidate relevant pages
    revalidatePath("/");
    revalidatePath("/assets");
    revalidatePath("/receipts");

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Failed to persist extracted receipt:", error);
    return {
      success: false,
      error:
        (error as Error).message ||
        "An unexpected error occurred while persisting receipt data",
    };
  }
}
