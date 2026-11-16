import prisma from "../lib/prisma";
import { getAssets, getAssetById, createAsset, updateAsset, deleteAsset } from "../lib/actions/assets";
import { getReceipts, createReceipt } from "../lib/actions/receipts";
import { getWarranties, createWarranty, updateWarrantyStatus } from "../lib/actions/warranties";

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

const results: TestResult[] = [];

function check(name: string, condition: boolean, message?: string) {
  results.push({ name, passed: condition, message });
  if (condition) {
    console.log(`  ✅ PASS: ${name}`);
  } else {
    console.error(`  ❌ FAIL: ${name} (${message || "Condition not met"})`);
  }
}

async function runPhase1Verification() {
  console.log("==========================================================");
  console.log("🔍 SynCognia Phase 1 Verification Test Suite");
  console.log("==========================================================");

  // 1. Verify Seed Data Exists
  console.log("\n[1] Verifying Seed Data in Database:");
  const usersCount = await prisma.user.count();
  const assetsCount = await prisma.asset.count();
  const warrantiesCount = await prisma.warranty.count();
  const receiptsCount = await prisma.receipt.count();

  check("User seed exists", usersCount >= 1, `Found ${usersCount} users`);
  check("Seeded assets exist", assetsCount >= 5, `Found ${assetsCount} assets`);
  check("Seeded warranties exist", warrantiesCount >= 5, `Found ${warrantiesCount} warranties`);
  check("Seeded receipts exist", receiptsCount >= 5, `Found ${receiptsCount} receipts`);

  // 2. Test Asset Retrieval with Filtering
  console.log("\n[2] Testing Asset Queries & Filtering:");
  const allAssetsResult = await getAssets();
  check("getAssets() returns success", allAssetsResult.success);
  check("getAssets() returned array", Array.isArray(allAssetsResult.data) && (allAssetsResult.data as unknown[]).length >= 5);

  const electronicsResult = await getAssets({ category: "Electronics" });
  check("Filter by category 'Electronics' succeeds", electronicsResult.success);
  const electronicsList = electronicsResult.data as Array<{ category: string }>;
  check("All filtered assets have category Electronics", electronicsList.length > 0 && electronicsList.every(a => a.category === "Electronics"));

  const searchResult = await getAssets({ search: "Sony" });
  check("Search by keyword 'Sony' returns match", searchResult.success && (searchResult.data as unknown[]).length >= 1);

  // 3. Test Full Asset Detail Retrieval
  console.log("\n[3] Testing Detail View Relations:");
  const sampleAsset = (allAssetsResult.data as Array<{ id: string; name: string }>)[0];
  const detailResult = await getAssetById(sampleAsset.id);
  check("getAssetById() succeeds", detailResult.success);
  const detailData = detailResult.data as { warranties?: unknown[]; receipts?: unknown[]; user?: unknown };
  check("Detail asset includes relations", Array.isArray(detailData.warranties) && detailData.user !== undefined);

  // 4. Test Asset Lifecycle (Create -> Read -> Update -> Delete)
  console.log("\n[4] Testing Asset Lifecycle CRUD:");
  const createResult = await createAsset({
    name: "Apple Watch Ultra 2 Test",
    category: "Electronics",
    brand: "Apple",
    modelNumber: "A2986",
    serialNumber: "TEST-SN-998811",
    purchasePrice: 799.0,
    currency: "USD",
    location: "Wrist",
    status: "ACTIVE",
    notes: "Temporary verification asset",
  });

  check("createAsset() succeeds", createResult.success);
  const newAsset = createResult.data as { id: string; name: string; brand: string };
  check("Created asset has valid ID", typeof newAsset?.id === "string");

  // Add Receipt to new asset
  const receiptResult = await createReceipt({
    assetId: newAsset.id,
    merchant: "Apple Online Store",
    totalAmount: 799.0,
    currency: "USD",
    rawOcrText: "TEST RECEIPT APPLE WATCH ULTRA 2",
  });
  check("createReceipt() attaches to asset", receiptResult.success);

  // Add Warranty to new asset
  const warrantyResult = await createWarranty({
    assetId: newAsset.id,
    provider: "AppleCare+",
    warrantyType: "EXTENDED",
    durationMonths: 24,
    status: "ACTIVE",
  });
  check("createWarranty() attaches to asset", warrantyResult.success);
  const newWarranty = warrantyResult.data as { id: string };

  // Update Warranty Status
  const statusUpdate = await updateWarrantyStatus(newWarranty.id, "EXPIRING_SOON");
  check("updateWarrantyStatus() updates status badge", statusUpdate.success);

  // Update Asset
  const updateResult = await updateAsset(newAsset.id, {
    location: "Home Safe",
    notes: "Updated verification asset notes",
  });
  check("updateAsset() succeeds", updateResult.success);

  // Delete Asset
  const deleteResult = await deleteAsset(newAsset.id);
  check("deleteAsset() succeeds", deleteResult.success);

  const fetchDeleted = await getAssetById(newAsset.id);
  check("Deleted asset returns not found", !fetchDeleted.success && fetchDeleted.error === "Asset not found");

  // Summary
  console.log("\n==========================================================");
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;

  console.log(`Results: ${passed}/${total} checks passed (${failed} failed)`);
  if (failed === 0) {
    console.log("🎉 ALL PHASE 1 SYSTEM CHECKS PASSED!");
    console.log("==========================================================");
    process.exit(0);
  } else {
    console.error("❌ Some verification checks failed.");
    console.log("==========================================================");
    process.exit(1);
  }
}

runPhase1Verification()
  .catch((e) => {
    console.error("Verification crashed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
