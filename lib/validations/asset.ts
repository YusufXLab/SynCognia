export interface CreateAssetInput {
  userId?: string;
  name: string;
  category: string;
  brand?: string;
  modelNumber?: string;
  serialNumber?: string;
  purchaseDate?: string | Date;
  purchasePrice?: number;
  currency?: string;
  location?: string;
  status?: string;
  notes?: string;
}

export interface UpdateAssetInput {
  name?: string;
  category?: string;
  brand?: string;
  modelNumber?: string;
  serialNumber?: string;
  purchaseDate?: string | Date;
  purchasePrice?: number;
  currency?: string;
  location?: string;
  status?: string;
  notes?: string;
}

export interface CreateReceiptInput {
  assetId?: string;
  merchant: string;
  purchaseDate?: string | Date;
  totalAmount?: number;
  currency?: string;
  rawOcrText?: string;
  fileUrl?: string;
  mimeType?: string;
}

export interface CreateWarrantyInput {
  assetId: string;
  provider: string;
  warrantyType?: string;
  durationMonths?: number;
  startDate?: string | Date;
  endDate?: string | Date;
  policyNumber?: string;
  supportContact?: string;
  claimUrl?: string;
  status?: string;
}

export function validateAssetInput(input: unknown): { valid: boolean; errors: string[]; data?: CreateAssetInput } {
  const errors: string[] = [];
  if (!input || typeof input !== "object") {
    return { valid: false, errors: ["Invalid input payload"] };
  }

  const record = input as Record<string, unknown>;

  if (!record.name || typeof record.name !== "string" || record.name.trim() === "") {
    errors.push("Asset name is required");
  }

  if (!record.category || typeof record.category !== "string" || record.category.trim() === "") {
    errors.push("Asset category is required");
  }

  if (record.purchasePrice !== undefined && typeof record.purchasePrice !== "number" && isNaN(Number(record.purchasePrice))) {
    errors.push("Purchase price must be a valid number");
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      userId: typeof record.userId === "string" ? record.userId : undefined,
      name: (record.name as string).trim(),
      category: (record.category as string).trim(),
      brand: typeof record.brand === "string" ? record.brand.trim() : undefined,
      modelNumber: typeof record.modelNumber === "string" ? record.modelNumber.trim() : undefined,
      serialNumber: typeof record.serialNumber === "string" ? record.serialNumber.trim() : undefined,
      purchaseDate: record.purchaseDate ? new Date(record.purchaseDate as string | number) : undefined,
      purchasePrice: record.purchasePrice !== undefined ? Number(record.purchasePrice) : undefined,
      currency: typeof record.currency === "string" ? record.currency : "USD",
      location: typeof record.location === "string" ? record.location.trim() : undefined,
      status: typeof record.status === "string" ? record.status : "ACTIVE",
      notes: typeof record.notes === "string" ? record.notes : undefined,
    },
  };
}
