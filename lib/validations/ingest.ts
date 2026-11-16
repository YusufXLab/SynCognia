/**
 * Ingestion & Receipt Persistence Validation
 */

export interface PersistReceiptItemInput {
  name: string;
  category: string;
  price: number;
  quantity: number;
  brand?: string;
  modelNumber?: string;
  serialNumber?: string;
  suggestedWarrantyMonths?: number;
}

export interface PersistWarrantyInput {
  provider: string;
  durationMonths: number;
  warrantyType?: "MANUFACTURER" | "EXTENDED";
  policyNumber?: string;
  supportContact?: string;
  claimUrl?: string;
  details?: string;
}

export interface PersistReturnPolicyInput {
  returnWindowDays: number;
  policyDetails?: string;
}

export interface PersistReceiptInput {
  userId?: string;
  fileUrl?: string;
  mimeType?: string;
  merchant: string;
  purchaseDate?: string | Date;
  totalAmount: number;
  currency?: string;
  rawSummary?: string;
  location?: string;
  notes?: string;
  items: PersistReceiptItemInput[];
  warranty?: PersistWarrantyInput;
  returnPolicy?: PersistReturnPolicyInput;
}

export function validatePersistReceiptInput(input: unknown): {
  valid: boolean;
  errors: string[];
  data?: PersistReceiptInput;
} {
  const errors: string[] = [];
  if (!input || typeof input !== "object") {
    return { valid: false, errors: ["Invalid input payload"] };
  }

  const record = input as Record<string, unknown>;

  if (!record.merchant || typeof record.merchant !== "string" || record.merchant.trim() === "") {
    errors.push("Merchant name is required");
  }

  if (record.totalAmount === undefined || isNaN(Number(record.totalAmount)) || Number(record.totalAmount) < 0) {
    errors.push("Total amount must be a positive number or zero");
  }

  if (!Array.isArray(record.items) || record.items.length === 0) {
    errors.push("At least one item is required");
  }

  const items: PersistReceiptItemInput[] = [];
  if (Array.isArray(record.items)) {
    for (let i = 0; i < record.items.length; i++) {
      const item = record.items[i];
      if (!item || typeof item !== "object") {
        errors.push(`Item at index ${i} is invalid`);
        continue;
      }
      const itemRec = item as Record<string, unknown>;
      if (!itemRec.name || typeof itemRec.name !== "string" || itemRec.name.trim() === "") {
        errors.push(`Item at index ${i} requires a name`);
      }
      items.push({
        name: typeof itemRec.name === "string" ? itemRec.name.trim() : `Item ${i + 1}`,
        category: typeof itemRec.category === "string" && itemRec.category.trim() ? itemRec.category.trim() : "Electronics",
        price: typeof itemRec.price === "number" && !isNaN(itemRec.price) ? itemRec.price : 0,
        quantity: typeof itemRec.quantity === "number" && itemRec.quantity > 0 ? itemRec.quantity : 1,
        brand: typeof itemRec.brand === "string" ? itemRec.brand.trim() : undefined,
        modelNumber: typeof itemRec.modelNumber === "string" ? itemRec.modelNumber.trim() : undefined,
        serialNumber: typeof itemRec.serialNumber === "string" ? itemRec.serialNumber.trim() : undefined,
        suggestedWarrantyMonths: typeof itemRec.suggestedWarrantyMonths === "number" ? itemRec.suggestedWarrantyMonths : undefined,
      });
    }
  }

  let warranty: PersistWarrantyInput | undefined;
  if (record.warranty && typeof record.warranty === "object") {
    const w = record.warranty as Record<string, unknown>;
    const durationMonths = typeof w.durationMonths === "number" ? w.durationMonths : 0;
    if (durationMonths > 0) {
      warranty = {
        provider: typeof w.provider === "string" && w.provider.trim() ? w.provider.trim() : "Manufacturer",
        durationMonths,
        warrantyType: w.warrantyType === "EXTENDED" ? "EXTENDED" : "MANUFACTURER",
        policyNumber: typeof w.policyNumber === "string" ? w.policyNumber.trim() : undefined,
        supportContact: typeof w.supportContact === "string" ? w.supportContact.trim() : undefined,
        claimUrl: typeof w.claimUrl === "string" ? w.claimUrl.trim() : undefined,
        details: typeof w.details === "string" ? w.details.trim() : undefined,
      };
    }
  }

  let returnPolicy: PersistReturnPolicyInput | undefined;
  if (record.returnPolicy && typeof record.returnPolicy === "object") {
    const rp = record.returnPolicy as Record<string, unknown>;
    const returnWindowDays = typeof rp.returnWindowDays === "number" ? rp.returnWindowDays : (typeof rp.windowDays === "number" ? rp.windowDays : 0);
    if (returnWindowDays > 0) {
      returnPolicy = {
        returnWindowDays,
        policyDetails: typeof rp.policyDetails === "string" ? rp.policyDetails.trim() : (typeof rp.details === "string" ? rp.details.trim() : undefined),
      };
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      userId: typeof record.userId === "string" ? record.userId : undefined,
      fileUrl: typeof record.fileUrl === "string" ? record.fileUrl : undefined,
      mimeType: typeof record.mimeType === "string" ? record.mimeType : undefined,
      merchant: (record.merchant as string).trim(),
      purchaseDate: record.purchaseDate ? new Date(record.purchaseDate as string | number) : new Date(),
      totalAmount: Number(record.totalAmount),
      currency: typeof record.currency === "string" && record.currency.trim() ? record.currency.trim().toUpperCase() : "USD",
      rawSummary: typeof record.rawSummary === "string" ? record.rawSummary.trim() : undefined,
      location: typeof record.location === "string" ? record.location.trim() : "Home Office",
      notes: typeof record.notes === "string" ? record.notes.trim() : undefined,
      items,
      warranty,
      returnPolicy,
    },
  };
}
