"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import {
  DocumentType,
  DOCUMENT_TYPES,
  CreateDocumentInput,
  UpdateDocumentInput,
  VaultFilter,
  VaultMetrics,
  ActionResult,
  DocumentWithAsset,
} from "@/lib/types/vault";
import { deleteVaultDocument } from "@/lib/storage/vault";

function safeRevalidate(paths: string[] = ["/vault", "/assets"]) {
  try {
    for (const p of paths) {
      revalidatePath(p);
    }
  } catch {
    // Ignored outside active Next.js request context
  }
}

/**
 * Retrieves all vault documents with optional filtering and search.
 */
export async function getDocuments(
  filter?: VaultFilter
): Promise<ActionResult<DocumentWithAsset[]>> {
  try {
    const where: Record<string, unknown> = {};

    if (filter?.assetId) {
      where.assetId = filter.assetId;
    }

    if (filter?.documentType) {
      where.documentType = filter.documentType;
    }

    if (filter?.isEncrypted !== undefined) {
      where.isEncrypted = filter.isEncrypted;
    }

    if (filter?.search && filter.search.trim()) {
      const query = filter.search.trim();
      where.OR = [
        { title: { contains: query } },
        { asset: { name: { contains: query } } },
      ];
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        asset: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, data: documents };
  } catch (error) {
    console.error("Failed to fetch documents:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to fetch documents",
    };
  }
}

/**
 * Retrieves a single vault document by its unique ID.
 */
export async function getDocumentById(
  id: string
): Promise<ActionResult<DocumentWithAsset>> {
  try {
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        asset: true,
      },
    });

    if (!document) {
      return { success: false, error: "Document not found" };
    }

    return { success: true, data: document };
  } catch (error) {
    console.error(`Failed to fetch document ${id}:`, error);
    return {
      success: false,
      error: (error as Error).message || "Failed to fetch document",
    };
  }
}

/**
 * Creates and stores a new vault document record in Prisma.
 */
export async function createDocument(
  input: CreateDocumentInput
): Promise<ActionResult<DocumentWithAsset>> {
  try {
    if (!input.title || !input.title.trim()) {
      return { success: false, error: "Document title is required" };
    }

    if (!input.fileUrl || !input.fileUrl.trim()) {
      return { success: false, error: "Document file URL is required" };
    }

    const docType: DocumentType =
      input.documentType && DOCUMENT_TYPES.includes(input.documentType)
        ? input.documentType
        : "MANUAL";

    // If assetId is provided, verify asset existence
    let assetId: string | null = null;
    if (input.assetId && input.assetId.trim()) {
      const asset = await prisma.asset.findUnique({
        where: { id: input.assetId },
      });
      if (asset) {
        assetId = asset.id;
      }
    }

    const document = await prisma.document.create({
      data: {
        title: input.title.trim(),
        documentType: docType,
        fileUrl: input.fileUrl.trim(),
        fileSize: input.fileSize ?? null,
        mimeType: input.mimeType ?? null,
        isEncrypted: !!input.isEncrypted,
        assetId,
      },
      include: {
        asset: true,
      },
    });

    safeRevalidate(["/vault", "/assets"]);
    return { success: true, data: document };
  } catch (error) {
    console.error("Failed to create document:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to create document",
    };
  }
}

/**
 * Updates an existing document record.
 */
export async function updateDocument(
  id: string,
  input: UpdateDocumentInput
): Promise<ActionResult<DocumentWithAsset>> {
  try {
    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Document not found" };
    }

    const updateData: Record<string, unknown> = {};

    if (input.title !== undefined) {
      if (!input.title.trim()) {
        return { success: false, error: "Document title cannot be empty" };
      }
      updateData.title = input.title.trim();
    }

    if (input.documentType !== undefined) {
      if (!DOCUMENT_TYPES.includes(input.documentType)) {
        return {
          success: false,
          error: `Invalid document type. Allowed: ${DOCUMENT_TYPES.join(", ")}`,
        };
      }
      updateData.documentType = input.documentType;
    }

    if (input.isEncrypted !== undefined) {
      updateData.isEncrypted = !!input.isEncrypted;
    }

    if (input.assetId !== undefined) {
      if (!input.assetId) {
        updateData.assetId = null;
      } else {
        const asset = await prisma.asset.findUnique({
          where: { id: input.assetId },
        });
        if (!asset) {
          return { success: false, error: "Associated asset not found" };
        }
        updateData.assetId = asset.id;
      }
    }

    const updated = await prisma.document.update({
      where: { id },
      data: updateData,
      include: {
        asset: true,
      },
    });

    safeRevalidate(["/vault", "/assets"]);
    return { success: true, data: updated };
  } catch (error) {
    console.error(`Failed to update document ${id}:`, error);
    return {
      success: false,
      error: (error as Error).message || "Failed to update document",
    };
  }
}

/**
 * Deletes a document record and optionally deletes the physical file from disk.
 */
export async function deleteDocument(
  id: string,
  deleteFromDisk = true
): Promise<ActionResult<{ id: string }>> {
  try {
    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Document not found" };
    }

    if (deleteFromDisk && existing.fileUrl) {
      await deleteVaultDocument(existing.fileUrl);
    }

    await prisma.document.delete({ where: { id } });

    safeRevalidate(["/vault", "/assets"]);
    return { success: true, data: { id } };
  } catch (error) {
    console.error(`Failed to delete document ${id}:`, error);
    return {
      success: false,
      error: (error as Error).message || "Failed to delete document",
    };
  }
}

/**
 * Calculates aggregate metrics for all vault documents.
 */
export async function getVaultMetrics(): Promise<ActionResult<VaultMetrics>> {
  try {
    const documents = await prisma.document.findMany();

    const categoryCounts: Record<DocumentType, number> = {
      MANUAL: 0,
      INVOICE: 0,
      WARRANTY_CARD: 0,
      TITLE_DEED: 0,
      CERTIFICATE: 0,
      INSURANCE_POLICY: 0,
      APPRAISAL: 0,
    };

    let encryptedCount = 0;
    let totalSizeBytes = 0;
    const coveredAssetIds = new Set<string>();

    for (const doc of documents) {
      if (doc.isEncrypted) {
        encryptedCount++;
      }
      if (doc.fileSize) {
        totalSizeBytes += doc.fileSize;
      }
      if (doc.assetId) {
        coveredAssetIds.add(doc.assetId);
      }
      const type = doc.documentType as DocumentType;
      if (categoryCounts[type] !== undefined) {
        categoryCounts[type]++;
      }
    }

    const metrics: VaultMetrics = {
      totalDocuments: documents.length,
      encryptedCount,
      totalSizeBytes,
      assetsCoveredCount: coveredAssetIds.size,
      categoryCounts,
    };

    return { success: true, data: metrics };
  } catch (error) {
    console.error("Failed to compute vault metrics:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to compute vault metrics",
    };
  }
}
