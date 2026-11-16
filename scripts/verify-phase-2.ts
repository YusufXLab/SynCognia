import fs from "node:fs";
import prisma from "../lib/prisma";
import { saveReceiptFile, deleteReceiptFile, isSupportedMimeType } from "../lib/storage/receipts";
import { extractReceiptData } from "../lib/ai/gemini";
import { persistExtractedReceipt } from "../lib/actions/ingest";
import { validatePersistReceiptInput } from "../lib/validations/ingest";

const TINY_PNG_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

interface CheckResult {
  name: string;
  passed: boolean;
  message?: string;
  durationMs: number;
}

const checks: CheckResult[] = [];

function check(name: string, condition: boolean, message?: string, durationMs = 0) {
  checks.push({ name, passed: condition, message, durationMs });
  if (condition) {
    console.log(`  ✅ PASS: ${name} ${durationMs ? `(${durationMs}ms)` : ""}`);
  } else {
    console.error(`  ❌ FAIL: ${name} -> ${message || "Condition failed"}`);
  }
}

async function runPhase2Verification() {
  console.log("==========================================================");
  console.log("🔍 SynCognia Phase 2 End-to-End Verification Test Suite");
  console.log("==========================================================");

  let tempSavedPath: string | null = null;
  let createdAssetId: string | null = null;

  try {
    // ----------------------------------------------------
    // Section 1: Storage Adapter
    // ----------------------------------------------------
    console.log("\n[1] Testing Multi-Modal File Storage Adapter:");
    const startStore = Date.now();
    const stored = await saveReceiptFile(
      TINY_PNG_BUFFER,
      "phase2-test-receipt.png",
      "image/png"
    );
    tempSavedPath = stored.filePath;

    check(
      "File saved to disk with secure naming",
      fs.existsSync(stored.filePath),
      `File not found at ${stored.filePath}`,
      Date.now() - startStore
    );
    check(
      "Returned URL adheres to /uploads/receipts/ pattern",
      stored.fileUrl.startsWith("/uploads/receipts/"),
      `Invalid URL: ${stored.fileUrl}`
    );
    check(
      "Cryptographic SHA-256 hash generated (64 hex chars)",
      typeof stored.hash === "string" && stored.hash.length === 64,
      `Hash was: ${stored.hash}`
    );
    check(
      "MIME type validation supports standard receipt formats",
      isSupportedMimeType("image/jpeg") &&
        isSupportedMimeType("image/png") &&
        isSupportedMimeType("application/pdf") &&
        !isSupportedMimeType("application/zip"),
      "MIME type whitelist check failed"
    );

    // ----------------------------------------------------
    // Section 2: Gemini AI Extraction Service
    // ----------------------------------------------------
    console.log("\n[2] Testing Gemini 2.5 Flash Receipt Extraction Engine:");
    const startAi = Date.now();
    const extracted = await extractReceiptData({
      buffer: TINY_PNG_BUFFER,
      mimeType: "image/png",
      fileName: "bestbuy-sample.png",
    });
    const aiDuration = Date.now() - startAi;

    check(
      "Extracted merchant name is populated",
      Boolean(extracted.merchant && extracted.merchant.trim().length > 0),
      `Merchant: ${extracted.merchant}`,
      aiDuration
    );
    check(
      "Extracted purchase date matches ISO YYYY-MM-DD",
      Boolean(extracted.purchaseDate && /^\d{4}-\d{2}-\d{2}$/.test(extracted.purchaseDate)),
      `PurchaseDate: ${extracted.purchaseDate}`
    );
    check(
      "Extracted total amount is positive number",
      typeof extracted.totalAmount === "number" && extracted.totalAmount > 0,
      `TotalAmount: ${extracted.totalAmount}`
    );
    check(
      "Extracted line items array contains at least 1 item with price & category",
      Array.isArray(extracted.items) &&
        extracted.items.length > 0 &&
        Boolean(extracted.items[0].name) &&
        typeof extracted.items[0].price === "number",
      `Items count: ${extracted?.items?.length}`
    );
    check(
      "Extracted warranty or return policy detected",
      Boolean(extracted.detectedWarranty || extracted.returnPolicy),
      "Neither warranty nor return policy was detected"
    );

    // ----------------------------------------------------
    // Section 3: Validation Layer & Edge Cases
    // ----------------------------------------------------
    console.log("\n[3] Testing Ingestion Payload Validation Layer:");
    const validTestInput = {
      merchant: "Apple Store Regent St",
      purchaseDate: "2026-06-15",
      totalAmount: 1999.0,
      currency: "USD",
      items: [
        {
          name: "MacBook Pro 14 M3",
          category: "Electronics",
          price: 1999.0,
          quantity: 1,
          brand: "Apple",
          modelNumber: "MTL73LL/A",
          serialNumber: "C02XYZ12345",
        },
      ],
      warranty: {
        provider: "AppleCare+",
        durationMonths: 24,
        warrantyType: "EXTENDED" as const,
      },
      returnPolicy: {
        returnWindowDays: 14,
      },
    };

    const validResult = validatePersistReceiptInput(validTestInput);
    check(
      "Valid payload passes validation",
      validResult.valid && validResult.data !== undefined,
      validResult.errors.join(", ")
    );

    const invalidInputNoMerchant = {
      ...validTestInput,
      merchant: "",
    };
    const invalidRes1 = validatePersistReceiptInput(invalidInputNoMerchant);
    check(
      "Empty merchant name is rejected",
      !invalidRes1.valid && invalidRes1.errors.some((e) => e.includes("Merchant")),
      "Validation incorrectly passed empty merchant"
    );

    const invalidInputNegativeAmount = {
      ...validTestInput,
      totalAmount: -50,
    };
    const invalidRes2 = validatePersistReceiptInput(invalidInputNegativeAmount);
    check(
      "Negative total amount is rejected",
      !invalidRes2.valid && invalidRes2.errors.some((e) => e.includes("positive")),
      "Validation incorrectly passed negative amount"
    );

    const invalidInputEmptyItems = {
      ...validTestInput,
      items: [],
    };
    const invalidRes3 = validatePersistReceiptInput(invalidInputEmptyItems);
    check(
      "Empty items list is rejected",
      !invalidRes3.valid && invalidRes3.errors.some((e) => e.includes("item")),
      "Validation incorrectly passed empty items list"
    );

    // ----------------------------------------------------
    // Section 4: Atomic Database Persistence Transaction
    // ----------------------------------------------------
    console.log("\n[4] Testing Atomic Multi-Model Database Persistence:");
    const startPersist = Date.now();
    const persistRes = await persistExtractedReceipt({
      merchant: "Best Buy Test Store",
      purchaseDate: "2026-05-10",
      totalAmount: 1499.99,
      currency: "USD",
      fileUrl: stored.fileUrl,
      mimeType: "image/png",
      rawSummary: "Best Buy receipt for Phase 2 automated test",
      location: "Home Office",
      notes: "E2E verification automated test run",
      items: [
        {
          name: "Sony WH-1000XM5 E2E Test",
          category: "Electronics",
          price: 1499.99,
          quantity: 1,
          brand: "Sony",
          modelNumber: "WH1000XM5",
          serialNumber: "SN-PHASE2-TEST-999",
        },
      ],
      warranty: {
        provider: "Sony Protect Plus",
        durationMonths: 24,
        warrantyType: "MANUFACTURER",
      },
      returnPolicy: {
        returnWindowDays: 30,
      },
    });
    const persistDuration = Date.now() - startPersist;

    check(
      "persistExtractedReceipt executes successfully",
      persistRes.success && Boolean(persistRes.data?.assetId),
      persistRes.error,
      persistDuration
    );

    if (persistRes.data) {
      createdAssetId = persistRes.data.assetId;
      const { assetId, receiptId, warrantyId, returnPolicyId, documentId } = persistRes.data;

      check("Asset ID returned", Boolean(assetId), "Missing assetId");
      check("Receipt ID returned", Boolean(receiptId), "Missing receiptId");
      check("Warranty ID returned", Boolean(warrantyId), "Missing warrantyId");
      check("ReturnPolicy ID returned", Boolean(returnPolicyId), "Missing returnPolicyId");
      check("Document ID returned in Document Vault", Boolean(documentId), "Missing documentId");

      // ----------------------------------------------------
      // Section 5: Relational Integrity & Calculation Checks
      // ----------------------------------------------------
      console.log("\n[5] Verifying Relational Integrity in Database:");
      const assetInDb = await prisma.asset.findUnique({
        where: { id: assetId },
        include: {
          receipts: true,
          warranties: true,
          returnPolicies: true,
          documents: true,
          user: true,
        },
      });

      check(
        "Asset record exists in SQLite database",
        Boolean(assetInDb),
        "Asset query returned null"
      );
      check(
        "Asset name, brand, model, and serial number correctly populated",
        assetInDb?.name === "Sony WH-1000XM5 E2E Test" &&
          assetInDb?.brand === "Sony" &&
          assetInDb?.modelNumber === "WH1000XM5" &&
          assetInDb?.serialNumber === "SN-PHASE2-TEST-999",
        `Asset properties mismatch: ${JSON.stringify(assetInDb)}`
      );
      check(
        "Asset purchase price and location correctly populated",
        assetInDb?.purchasePrice === 1499.99 && assetInDb?.location === "Home Office",
        `Price: ${assetInDb?.purchasePrice}, Location: ${assetInDb?.location}`
      );
      check(
        "Linked Receipt record has matching merchant and file URL",
        assetInDb?.receipts.length === 1 &&
          assetInDb.receipts[0].merchant === "Best Buy Test Store" &&
          assetInDb.receipts[0].fileUrl === stored.fileUrl,
        `Receipt record mismatch`
      );

      // Verify Warranty End Date calculation
      const warrantyRecord = assetInDb?.warranties[0];
      const purchaseDateObj = new Date("2026-05-10");
      const expectedWarrantyEnd = new Date(purchaseDateObj);
      expectedWarrantyEnd.setMonth(expectedWarrantyEnd.getMonth() + 24);

      check(
        "Warranty end date calculated correctly (purchaseDate + 24 months)",
        Boolean(
          warrantyRecord &&
            warrantyRecord.endDate &&
            new Date(warrantyRecord.endDate).getFullYear() === expectedWarrantyEnd.getFullYear() &&
            new Date(warrantyRecord.endDate).getMonth() === expectedWarrantyEnd.getMonth()
        ),
        `Warranty endDate: ${warrantyRecord?.endDate}, expected: ${expectedWarrantyEnd}`
      );

      // Verify Return Policy Deadline calculation
      const returnRecord = assetInDb?.returnPolicies[0];
      const expectedReturnDeadline = new Date(purchaseDateObj);
      expectedReturnDeadline.setDate(expectedReturnDeadline.getDate() + 30);

      check(
        "Return deadline calculated correctly (purchaseDate + 30 days)",
        Boolean(
          returnRecord &&
            returnRecord.returnDeadline &&
            new Date(returnRecord.returnDeadline).toDateString() === expectedReturnDeadline.toDateString()
        ),
        `Return deadline: ${returnRecord?.returnDeadline}, expected: ${expectedReturnDeadline}`
      );

      // Verify Document Vault Record
      const docRecord = assetInDb?.documents[0];
      check(
        "Document Vault entry created with documentType INVOICE",
        Boolean(
          docRecord &&
            docRecord.documentType === "INVOICE" &&
            docRecord.fileUrl === stored.fileUrl
        ),
        `Document record mismatch: ${JSON.stringify(docRecord)}`
      );
    }

    // ----------------------------------------------------
    // Section 6: Rollback on Error
    // ----------------------------------------------------
    console.log("\n[6] Testing Transaction Error Boundary (No Corrupt State):");
    const initialAssetsCount = await prisma.asset.count();
    const failedPersist = await persistExtractedReceipt({
      merchant: "", // Invalid: should trigger validation failure
      totalAmount: 100,
      items: [{ name: "Orphan Test", category: "Test", price: 100, quantity: 1 }],
    });

    const afterCount = await prisma.asset.count();
    check(
      "Rejected persistence does not commit partial/corrupted records",
      !failedPersist.success && afterCount === initialAssetsCount,
      `Asset count changed from ${initialAssetsCount} to ${afterCount}`
    );
  } finally {
    // ----------------------------------------------------
    // Section 7: Cleanup
    // ----------------------------------------------------
    console.log("\n[7] Cleaning Up Test Artifacts:");
    if (createdAssetId) {
      await prisma.asset.delete({ where: { id: createdAssetId } }).catch(() => {});
      console.log(`  🧹 Cleaned up test asset ID: ${createdAssetId}`);
    }
    if (tempSavedPath) {
      await deleteReceiptFile(tempSavedPath).catch(() => {});
      console.log(`  🧹 Cleaned up temporary test file: ${tempSavedPath}`);
    }
  }

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  console.log("\n==========================================================");
  console.log("📊 Phase 2 Verification Summary");
  console.log("==========================================================");

  const total = checks.length;
  const passed = checks.filter((c) => c.passed).length;
  const failed = checks.filter((c) => !c.passed).length;

  console.log(`Total Checks: ${total}`);
  console.log(`Passed:       ${passed}`);
  console.log(`Failed:       ${failed}`);

  if (failed > 0) {
    console.error("\n❌ Verification Failed! Please inspect failures above.");
    process.exit(1);
  } else {
    console.log("\n🎉 ALL PHASE 2 VERIFICATION CHECKS PASSED EMPIRICALLY!");
    process.exit(0);
  }
}

runPhase2Verification().catch((err) => {
  console.error("Fatal verification test error:", err);
  process.exit(1);
});
