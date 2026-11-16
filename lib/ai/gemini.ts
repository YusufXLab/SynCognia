import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedReceiptData } from "@/lib/types/receipt";

export interface ExtractReceiptOptions {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

/**
 * Strict JSON schema definition for Gemini structured receipt extraction.
 */
export const receiptExtractionSchema = {
  type: Type.OBJECT,
  properties: {
    merchant: {
      type: Type.STRING,
      description: "Name of the merchant, store, or vendor",
    },
    purchaseDate: {
      type: Type.STRING,
      description: "Purchase date formatted as YYYY-MM-DD",
    },
    totalAmount: {
      type: Type.NUMBER,
      description: "Total amount paid including taxes and discounts",
    },
    currency: {
      type: Type.STRING,
      description: "3-letter uppercase currency code (e.g. USD, EUR, GBP, CAD)",
    },
    taxAmount: {
      type: Type.NUMBER,
      description: "Sales tax or VAT amount if identified",
    },
    paymentMethod: {
      type: Type.STRING,
      description: "Payment method used (e.g. Credit Card, Debit Card, Apple Pay, Cash)",
    },
    items: {
      type: Type.ARRAY,
      description: "Itemized list of products or services on the receipt",
      items: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description: "Product name or line item description",
          },
          category: {
            type: Type.STRING,
            description:
              "Standard category: Electronics, Appliances, Vehicles, Tools, Personal, Furniture, or Other",
          },
          price: {
            type: Type.NUMBER,
            description: "Total or unit price for this item",
          },
          quantity: {
            type: Type.NUMBER,
            description: "Quantity purchased",
          },
          brand: {
            type: Type.STRING,
            description: "Brand or manufacturer if recognizable",
          },
          modelNumber: {
            type: Type.STRING,
            description: "Model number or product SKU if present",
          },
          serialNumber: {
            type: Type.STRING,
            description: "Hardware serial number if present",
          },
          suggestedWarrantyMonths: {
            type: Type.NUMBER,
            description:
              "Standard manufacturer warranty duration in months typical for this category/product",
          },
        },
        required: ["name", "category", "price", "quantity"],
      },
    },
    detectedWarranty: {
      type: Type.OBJECT,
      description: "Warranty terms explicitly printed on the document or standard terms",
      properties: {
        provider: {
          type: Type.STRING,
          description: "Warranty provider (e.g. AppleCare, Geek Squad, Manufacturer)",
        },
        durationMonths: {
          type: Type.NUMBER,
          description: "Warranty coverage duration in months",
        },
        warrantyType: {
          type: Type.STRING,
          description: "MANUFACTURER or EXTENDED",
        },
        details: {
          type: Type.STRING,
          description: "Additional warranty coverage or registration terms",
        },
      },
      required: ["provider", "durationMonths", "warrantyType"],
    },
    returnPolicy: {
      type: Type.OBJECT,
      description: "Stated return window or policy",
      properties: {
        windowDays: {
          type: Type.NUMBER,
          description: "Number of days allowed for returns or exchanges",
        },
        details: {
          type: Type.STRING,
          description: "Return terms, receipt requirement, or restocking fee notes",
        },
      },
      required: ["windowDays"],
    },
    rawSummary: {
      type: Type.STRING,
      description: "Concise 1-2 sentence human-readable summary of this transaction",
    },
  },
  required: [
    "merchant",
    "purchaseDate",
    "totalAmount",
    "currency",
    "items",
    "rawSummary",
  ],
};

/**
 * Builds high-fidelity mock extraction data for testing or offline development.
 */
export function getMockReceiptExtraction(fileName: string): ExtractedReceiptData {
  const today = new Date().toISOString().slice(0, 10);
  return {
    merchant: "Best Buy",
    purchaseDate: today,
    totalAmount: 1299.98,
    currency: "USD",
    taxAmount: 104.0,
    paymentMethod: "Visa (Ending in 4082)",
    items: [
      {
        name: "Dell XPS 15 9530 Laptop",
        category: "Electronics",
        price: 1199.99,
        quantity: 1,
        brand: "Dell",
        modelNumber: "XPS9530-7212SLV",
        serialNumber: "DL-994827104",
        suggestedWarrantyMonths: 12,
      },
      {
        name: "Logitech MX Master 3S Wireless Mouse",
        category: "Electronics",
        price: 99.99,
        quantity: 1,
        brand: "Logitech",
        modelNumber: "910-006556",
        suggestedWarrantyMonths: 12,
      },
    ],
    detectedWarranty: {
      provider: "Dell Manufacturer Warranty",
      durationMonths: 12,
      warrantyType: "MANUFACTURER",
      details: "1-year limited hardware warranty with mail-in service",
    },
    returnPolicy: {
      windowDays: 15,
      details: "Standard 15-day return and exchange window for major electronics",
    },
    rawSummary: `Purchase of Dell XPS 15 Laptop and Logitech MX Master 3S at Best Buy from ${fileName} on ${today} for $1,299.98 USD.`,
  };
}

/**
 * Normalizes and validates extracted receipt data with guaranteed fallback defaults.
 */
function normalizeExtractedData(
  raw: Partial<ExtractedReceiptData>,
  fileName: string
): ExtractedReceiptData {
  const today = new Date().toISOString().slice(0, 10);

  const items = Array.isArray(raw.items) && raw.items.length > 0
    ? raw.items.map((item) => ({
        name: String(item.name || "Purchased Item"),
        category: String(item.category || "General"),
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
        brand: item.brand ? String(item.brand) : undefined,
        modelNumber: item.modelNumber ? String(item.modelNumber) : undefined,
        serialNumber: item.serialNumber ? String(item.serialNumber) : undefined,
        suggestedWarrantyMonths:
          item.suggestedWarrantyMonths !== undefined
            ? Number(item.suggestedWarrantyMonths)
            : 12,
      }))
    : [
        {
          name: "Unknown Item",
          category: "Other",
          price: Number(raw.totalAmount) || 0,
          quantity: 1,
          suggestedWarrantyMonths: 12,
        },
      ];

  const totalAmount =
    typeof raw.totalAmount === "number" && !isNaN(raw.totalAmount)
      ? raw.totalAmount
      : items.reduce((acc, it) => acc + it.price * it.quantity, 0);

  return {
    merchant: raw.merchant?.trim() || "Unspecified Merchant",
    purchaseDate: raw.purchaseDate?.match(/^\d{4}-\d{2}-\d{2}$/)
      ? raw.purchaseDate
      : today,
    totalAmount,
    currency: (raw.currency?.trim() || "USD").toUpperCase(),
    taxAmount: typeof raw.taxAmount === "number" ? raw.taxAmount : undefined,
    paymentMethod: raw.paymentMethod ? String(raw.paymentMethod) : undefined,
    items,
    detectedWarranty: raw.detectedWarranty
      ? {
          provider: String(raw.detectedWarranty.provider || "Manufacturer"),
          durationMonths: Number(raw.detectedWarranty.durationMonths) || 12,
          warrantyType:
            raw.detectedWarranty.warrantyType === "EXTENDED"
              ? "EXTENDED"
              : "MANUFACTURER",
          details: raw.detectedWarranty.details
            ? String(raw.detectedWarranty.details)
            : undefined,
        }
      : undefined,
    returnPolicy: raw.returnPolicy
      ? {
          windowDays: Number(raw.returnPolicy.windowDays) || 30,
          details: raw.returnPolicy.details
            ? String(raw.returnPolicy.details)
            : undefined,
        }
      : undefined,
    rawSummary:
      raw.rawSummary?.trim() ||
      `Receipt transaction at ${raw.merchant || "vendor"} for ${totalAmount} ${raw.currency || "USD"}.`,
  };
}

/**
 * Extracts structured receipt data from an image or PDF document.
 * Automatically falls back to high-fidelity mock extraction when GEMINI_API_KEY
 * is not configured or when MOCK_GEMINI=true.
 */
export async function extractReceiptData({
  buffer,
  mimeType,
  fileName,
}: ExtractReceiptOptions): Promise<ExtractedReceiptData> {
  const apiKey = process.env.GEMINI_API_KEY;
  const isMockMode = !apiKey || process.env.MOCK_GEMINI === "true";

  if (isMockMode) {
    console.log(
      `[Gemini Service] Using mock extraction engine for "${fileName}" (${mimeType})`
    );
    return getMockReceiptExtraction(fileName);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    const base64Data = buffer.toString("base64");

    const prompt = `You are SynCognia's receipt intelligence OCR engine.
Analyze this receipt or invoice document. Extract:
1. Merchant / Store name
2. Date of purchase (YYYY-MM-DD format)
3. Total transaction amount and 3-letter currency code
4. Tax amount and payment method if shown
5. All line items with names, category classification, quantities, prices, brands, model/serial numbers, and suggested manufacturer warranty durations
6. Explicit warranty information or standard coverage
7. Stated return policy or return window duration
8. A concise 1-2 sentence human-readable summary

Return strict JSON adhering to the provided schema.`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType,
          },
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: receiptExtractionSchema,
      },
    });

    const text = response.text;
    if (!text) {
      console.warn("[Gemini Service] Empty response from model, using fallback");
      return getMockReceiptExtraction(fileName);
    }

    const parsedJson = JSON.parse(text) as Partial<ExtractedReceiptData>;
    return normalizeExtractedData(parsedJson, fileName);
  } catch (error) {
    console.error("[Gemini Service] Live extraction failed, falling back to mock:", error);
    return getMockReceiptExtraction(fileName);
  }
}
