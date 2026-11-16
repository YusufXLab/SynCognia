import fs from "node:fs";
import {
  saveReceiptFile,
  deleteReceiptFile,
  isSupportedMimeType,
} from "../lib/storage/receipts";
import { extractReceiptData } from "../lib/ai/gemini";
import { ExtractedReceiptData } from "../lib/types/receipt";

// Minimal valid 1x1 PNG image buffer for testing
const TINY_PNG_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, passed: true, durationMs: Date.now() - start });
    console.log(`  ✓ PASS: ${name}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({
      name,
      passed: false,
      error: errorMsg,
      durationMs: Date.now() - start,
    });
    console.error(`  ✗ FAIL: ${name} -> ${errorMsg}`);
  }
}

async function main() {
  console.log("==================================================");
  console.log(" SynCognia Phase 2: Ingestion & Extraction Tests ");
  console.log("==================================================");

  let tempSavedPath: string | null = null;

  // 1. Test Storage Adapter: Save
  await runTest("Storage Adapter: Save receipt image safely", async () => {
    const result = await saveReceiptFile(
      TINY_PNG_BUFFER,
      "test-receipt.png",
      "image/png"
    );

    tempSavedPath = result.filePath;

    if (!result.fileUrl.startsWith("/uploads/receipts/")) {
      throw new Error(`Unexpected fileUrl: ${result.fileUrl}`);
    }
    if (!fs.existsSync(result.filePath)) {
      throw new Error(`File was not created on disk: ${result.filePath}`);
    }
    if (result.size !== TINY_PNG_BUFFER.length) {
      throw new Error(`Size mismatch: expected ${TINY_PNG_BUFFER.length}, got ${result.size}`);
    }
    if (result.hash.length !== 64) {
      throw new Error(`Invalid SHA-256 hash length: ${result.hash.length}`);
    }
  });

  // 2. Test Storage Adapter: Delete
  await runTest("Storage Adapter: Safe deletion helper", async () => {
    if (!tempSavedPath) throw new Error("No file path to delete");
    const deleted = await deleteReceiptFile(tempSavedPath);
    if (!deleted) throw new Error("deleteReceiptFile returned false");
    if (fs.existsSync(tempSavedPath)) {
      throw new Error("File still exists on disk after deletion");
    }
  });

  // 3. Test Storage Adapter: Reject Unsupported Media Type
  await runTest("Storage Adapter: Reject unsupported MIME type", async () => {
    let threw = false;
    try {
      await saveReceiptFile(
        Buffer.from("invalid"),
        "bad.exe",
        "application/x-msdownload"
      );
    } catch {
      threw = true;
    }
    if (!threw) {
      throw new Error("Storage adapter allowed unsupported MIME type");
    }
  });

  // 4. Test MIME Type Validator
  await runTest("Storage Adapter: MIME type validation helper", async () => {
    if (!isSupportedMimeType("image/jpeg")) throw new Error("image/jpeg should be supported");
    if (!isSupportedMimeType("image/png")) throw new Error("image/png should be supported");
    if (!isSupportedMimeType("application/pdf")) throw new Error("application/pdf should be supported");
    if (isSupportedMimeType("text/plain")) throw new Error("text/plain should not be supported");
  });

  // 5. Test AI Extraction Service
  await runTest("Gemini Extraction: Extract structured receipt data", async () => {
    const data: ExtractedReceiptData = await extractReceiptData({
      buffer: TINY_PNG_BUFFER,
      mimeType: "image/png",
      fileName: "bestbuy-receipt.png",
    });

    if (!data.merchant || typeof data.merchant !== "string") {
      throw new Error("Missing or invalid 'merchant' field");
    }
    if (!data.purchaseDate || !/^\d{4}-\d{2}-\d{2}$/.test(data.purchaseDate)) {
      throw new Error(`Invalid purchaseDate format: ${data.purchaseDate}`);
    }
    if (typeof data.totalAmount !== "number" || data.totalAmount <= 0) {
      throw new Error(`Invalid totalAmount: ${data.totalAmount}`);
    }
    if (!data.currency || data.currency.length !== 3) {
      throw new Error(`Invalid currency code: ${data.currency}`);
    }
    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw new Error("Extracted items array is empty or invalid");
    }

    const firstItem = data.items[0];
    if (!firstItem.name || typeof firstItem.price !== "number" || !firstItem.category) {
      throw new Error(`Line item missing required properties: ${JSON.stringify(firstItem)}`);
    }

    if (!data.rawSummary || typeof data.rawSummary !== "string") {
      throw new Error("Missing or invalid rawSummary string");
    }

    console.log(`    Extracted merchant: ${data.merchant}`);
    console.log(`    Total: ${data.totalAmount} ${data.currency}`);
    console.log(`    Line items count: ${data.items.length}`);
    if (data.detectedWarranty) {
      console.log(`    Warranty: ${data.detectedWarranty.durationMonths}m (${data.detectedWarranty.warrantyType})`);
    }
    if (data.returnPolicy) {
      console.log(`    Return policy: ${data.returnPolicy.windowDays} days`);
    }
  });

  console.log("\n==================================================");
  console.log(" Test Results Summary ");
  console.log("==================================================");

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    console.error("\nSome tests failed. See errors above.");
    process.exit(1);
  } else {
    console.log("\nAll ingestion and extraction tests PASSED successfully!");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Unhandled test runner exception:", err);
  process.exit(1);
});
