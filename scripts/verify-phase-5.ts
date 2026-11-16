import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";
import prisma from "../lib/prisma";
import {
  saveVaultDocument,
  verifyFileHash,
  deleteVaultDocument,
  isSupportedVaultMimeType,
  MAX_VAULT_FILE_SIZE_BYTES,
  ALLOWED_VAULT_MIME_TYPES,
} from "../lib/storage/vault";
import {
  getDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
  getVaultMetrics,
} from "../lib/actions/vault";
import {
  generateInsuranceScheduleData,
  generateInsuranceScheduleCsv,
  generateInsuranceScheduleHtml,
} from "../lib/services/insuranceExport";
import {
  generateClaimDossierData,
  generateClaimDossierHtml,
} from "../lib/services/claimDossier";
import { POST as postVaultUpload } from "../app/api/vault/upload/route";
import {
  GET as getVaultDocs,
  POST as postVaultDoc,
} from "../app/api/vault/documents/route";
import {
  GET as getVaultDocById,
  PATCH as patchVaultDoc,
  DELETE as deleteVaultDoc,
} from "../app/api/vault/documents/[id]/route";
import { GET as getInsuranceSchedule } from "../app/api/vault/insurance-schedule/route";
import { GET as getClaimDossier } from "../app/api/claim-dossier/[assetId]/route";

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

async function runPhase5Verification() {
  console.log("==========================================================");
  console.log("🔍 SynCognia Phase 5 End-to-End Verification Test Suite");
  console.log("==========================================================");

  let testAssetId: string | null = null;
  let testCreatedDocId: string | null = null;
  const tempFilesToClean: string[] = [];

  try {
    // ----------------------------------------------------
    // Section 1: Vault Storage Adapter
    // ----------------------------------------------------
    console.log("\n[1] Testing Vault Storage Adapter:");

    const samplePdfBuffer = Buffer.from(
      "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000120 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n170\n%%EOF"
    );

    // Test saveVaultDocument
    const uploadRes = await saveVaultDocument(
      samplePdfBuffer,
      "test-receipt-invoice.pdf",
      "application/pdf",
      { isEncrypted: true }
    );
    tempFilesToClean.push(uploadRes.filePath);

    check(
      "saveVaultDocument returns valid metadata and relative URL",
      uploadRes.fileUrl.startsWith("/uploads/vault/") &&
        uploadRes.fileName.endsWith(".pdf") &&
        uploadRes.size === samplePdfBuffer.length,
      `fileUrl: ${uploadRes.fileUrl}, size: ${uploadRes.size}`
    );

    check(
      "saveVaultDocument calculates 64-char SHA-256 hash",
      typeof uploadRes.hash === "string" && uploadRes.hash.length === 64,
      `Hash: ${uploadRes.hash}`
    );

    check(
      "Uploaded file physically exists on disk",
      fs.existsSync(uploadRes.filePath),
      `Path: ${uploadRes.filePath}`
    );

    // Test verifyFileHash
    const isHashValid = await verifyFileHash(uploadRes.filePath, uploadRes.hash);
    check(
      "verifyFileHash verifies matching SHA-256 digest",
      isHashValid === true,
      "Expected hash match"
    );

    const isCorruptHashValid = await verifyFileHash(
      uploadRes.filePath,
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    );
    check(
      "verifyFileHash rejects altered/corrupted hash",
      isCorruptHashValid === false,
      "Expected hash mismatch for altered digest"
    );

    // Test 15MB file size boundary
    let rejectedOversize = false;
    try {
      const oversizeBuffer = Buffer.alloc(MAX_VAULT_FILE_SIZE_BYTES + 1024);
      await saveVaultDocument(oversizeBuffer, "large.pdf", "application/pdf");
    } catch {
      rejectedOversize = true;
    }
    check(
      "saveVaultDocument enforces 15MB file size limit",
      rejectedOversize,
      "Expected rejection for buffer > 15MB"
    );

    // Test unsupported MIME type rejection
    let rejectedUnsupportedMime = false;
    try {
      await saveVaultDocument(
        Buffer.from("PK..."),
        "archive.zip",
        "application/zip"
      );
    } catch {
      rejectedUnsupportedMime = true;
    }
    check(
      "saveVaultDocument rejects unsupported media types (e.g. application/zip)",
      rejectedUnsupportedMime,
      "Expected rejection for non-PDF/image MIME"
    );

    // Test deleteVaultDocument and path traversal prevention
    const pathTraversalResult = await deleteVaultDocument("../../../etc/passwd");
    check(
      "deleteVaultDocument blocks directory traversal attacks",
      pathTraversalResult === false,
      "Expected path traversal to return false"
    );

    const deletedOk = await deleteVaultDocument(uploadRes.filePath);
    check(
      "deleteVaultDocument successfully cleans up file from disk",
      deletedOk && !fs.existsSync(uploadRes.filePath),
      "File should be removed from disk"
    );

    // ----------------------------------------------------
    // Section 2: Document Server Actions
    // ----------------------------------------------------
    console.log("\n[2] Testing Document Server Actions:");

    const testUser = await prisma.user.findFirst();
    if (!testUser) {
      throw new Error("No user found in database to associate test asset with");
    }

    // Create temporary asset for relationship testing
    const testAsset = await prisma.asset.create({
      data: {
        userId: testUser.id,
        name: "Phase 5 Verification Test Appliance",
        category: "ELECTRONICS",
        brand: "TestBrand",
        modelNumber: "TB-9000",
        serialNumber: "SN-P5-TEST-99",
        purchasePrice: 1499.99,
        status: "ACTIVE",
      },
    });
    testAssetId = testAsset.id;

    // Create document
    const createRes = await createDocument({
      assetId: testAsset.id,
      title: "Commercial Property Insurance Policy",
      documentType: "INSURANCE_POLICY",
      fileUrl: "/uploads/vault/test-policy.pdf",
      fileSize: 245760,
      mimeType: "application/pdf",
      isEncrypted: true,
    });

    check(
      "createDocument persists new document record with asset relation",
      createRes.success &&
        !!createRes.data &&
        createRes.data.assetId === testAsset.id &&
        createRes.data.documentType === "INSURANCE_POLICY" &&
        createRes.data.isEncrypted === true,
      createRes.error
    );

    if (createRes.data) {
      testCreatedDocId = createRes.data.id;
    }

    // Filter by assetId
    const docsByAsset = await getDocuments({ assetId: testAsset.id });
    check(
      "getDocuments filters documents by assetId",
      docsByAsset.success &&
        Array.isArray(docsByAsset.data) &&
        docsByAsset.data.length === 1 &&
        docsByAsset.data[0].id === testCreatedDocId,
      docsByAsset.error
    );

    // Filter by documentType
    const docsByType = await getDocuments({
      documentType: "INSURANCE_POLICY",
    });
    check(
      "getDocuments filters documents by category type",
      docsByType.success &&
        Array.isArray(docsByType.data) &&
        docsByType.data.some((d) => d.id === testCreatedDocId),
      docsByType.error
    );

    // Search filter
    const docsBySearch = await getDocuments({ search: "Commercial Property" });
    check(
      "getDocuments searches documents by title substring",
      docsBySearch.success &&
        Array.isArray(docsBySearch.data) &&
        docsBySearch.data.some((d) => d.id === testCreatedDocId),
      docsBySearch.error
    );

    // Retrieve by ID
    const singleDoc = await getDocumentById(testCreatedDocId!);
    check(
      "getDocumentById retrieves document with populated asset object",
      singleDoc.success &&
        singleDoc.data?.id === testCreatedDocId &&
        singleDoc.data?.asset?.name === "Phase 5 Verification Test Appliance",
      singleDoc.error
    );

    // Update document
    const updateRes = await updateDocument(testCreatedDocId!, {
      title: "Updated Property Policy 2026",
      isEncrypted: false,
    });
    check(
      "updateDocument updates title and encryption metadata",
      updateRes.success &&
        updateRes.data?.title === "Updated Property Policy 2026" &&
        updateRes.data?.isEncrypted === false,
      updateRes.error
    );

    // Aggregate metrics
    const metricsRes = await getVaultMetrics();
    check(
      "getVaultMetrics aggregates total, encrypted, and category counts",
      metricsRes.success &&
        !!metricsRes.data &&
        metricsRes.data.totalDocuments >= 1 &&
        metricsRes.data.assetsCoveredCount >= 1 &&
        metricsRes.data.categoryCounts.INSURANCE_POLICY >= 1,
      `total: ${metricsRes.data?.totalDocuments}, covered: ${metricsRes.data?.assetsCoveredCount}`
    );

    // Delete document
    const deleteRes = await deleteDocument(testCreatedDocId!, false);
    check(
      "deleteDocument removes document from database",
      deleteRes.success && deleteRes.data?.id === testCreatedDocId,
      deleteRes.error
    );

    const checkDeleted = await getDocumentById(testCreatedDocId!);
    check(
      "Deleted document is no longer retrievable",
      checkDeleted.success === false,
      "Expected not found"
    );
    testCreatedDocId = null;

    // ----------------------------------------------------
    // Section 3: REST API Handlers
    // ----------------------------------------------------
    console.log("\n[3] Testing REST API Handlers:");

    check(
      "Vault upload route exports POST handler",
      typeof postVaultUpload === "function"
    );
    check(
      "Vault documents route exports GET and POST handlers",
      typeof getVaultDocs === "function" && typeof postVaultDoc === "function"
    );
    check(
      "Vault document by ID route exports GET, PATCH, and DELETE handlers",
      typeof getVaultDocById === "function" &&
        typeof patchVaultDoc === "function" &&
        typeof deleteVaultDoc === "function"
    );
    check(
      "Insurance schedule route exports GET handler",
      typeof getInsuranceSchedule === "function"
    );
    check(
      "Claim dossier route exports GET handler",
      typeof getClaimDossier === "function"
    );

    // Invoke GET /api/vault/documents
    const mockDocsReq = new NextRequest("http://localhost:3000/api/vault/documents");
    const apiDocsRes = await getVaultDocs(mockDocsReq);
    check(
      "GET /api/vault/documents returns HTTP 200 with JSON payload",
      apiDocsRes.status === 200 &&
        apiDocsRes.headers.get("content-type")?.includes("application/json") === true,
      `Status: ${apiDocsRes.status}`
    );

    // Invoke GET /api/vault/insurance-schedule?format=json
    const mockScheduleJsonReq = new NextRequest(
      "http://localhost:3000/api/vault/insurance-schedule?format=json"
    );
    const apiScheduleJsonRes = await getInsuranceSchedule(mockScheduleJsonReq);
    const scheduleJson = await apiScheduleJsonRes.json();
    check(
      "GET /api/vault/insurance-schedule?format=json returns HTTP 200 with compiled schedule",
      apiScheduleJsonRes.status === 200 &&
        scheduleJson.success === true &&
        scheduleJson.schedule.totalAssets >= 1,
      `Status: ${apiScheduleJsonRes.status}, assets: ${scheduleJson.schedule?.totalAssets}`
    );

    // Invoke GET /api/vault/insurance-schedule?format=csv
    const mockScheduleCsvReq = new NextRequest(
      "http://localhost:3000/api/vault/insurance-schedule?format=csv"
    );
    const apiScheduleCsvRes = await getInsuranceSchedule(mockScheduleCsvReq);
    check(
      "GET /api/vault/insurance-schedule?format=csv returns text/csv attachment",
      apiScheduleCsvRes.status === 200 &&
        apiScheduleCsvRes.headers.get("content-type")?.includes("text/csv") === true &&
        apiScheduleCsvRes.headers.get("content-disposition")?.includes("attachment") === true,
      `Content-Type: ${apiScheduleCsvRes.headers.get("content-type")}`
    );

    // Invoke GET /api/vault/insurance-schedule?format=html
    const mockScheduleHtmlReq = new NextRequest(
      "http://localhost:3000/api/vault/insurance-schedule?format=html"
    );
    const apiScheduleHtmlRes = await getInsuranceSchedule(mockScheduleHtmlReq);
    check(
      "GET /api/vault/insurance-schedule?format=html returns text/html printable view",
      apiScheduleHtmlRes.status === 200 &&
        apiScheduleHtmlRes.headers.get("content-type")?.includes("text/html") === true,
      `Content-Type: ${apiScheduleHtmlRes.headers.get("content-type")}`
    );

    // ----------------------------------------------------
    // Section 4: Insurance Inventory Schedule Export
    // ----------------------------------------------------
    console.log("\n[4] Testing Insurance Inventory Schedule Export Engine:");

    const insuranceData = await generateInsuranceScheduleData();

    check(
      "generateInsuranceScheduleData compiles household assets and replacement values",
      insuranceData.totalAssets >= 1 && insuranceData.totalDeclaredValue > 0,
      `Total assets: ${insuranceData.totalAssets}, total value: ${insuranceData.totalDeclaredValue}`
    );

    check(
      "Insurance schedule items include proof of purchase and warranty attributes",
      insuranceData.items.every(
        (it) =>
          it.assetId &&
          it.name &&
          ["VERIFIED_RECEIPT", "ATTACHED_INVOICE", "NO_PROOF"].includes(
            it.proofOfPurchaseStatus
          )
      ),
      "Proof of purchase classification invalid"
    );

    const scheduleCsv = generateInsuranceScheduleCsv(insuranceData);
    check(
      "generateInsuranceScheduleCsv creates RFC 4180 CSV with required columns",
      scheduleCsv.includes('"Asset Name"') &&
        scheduleCsv.includes('"Declared Replacement Value (USD)"') &&
        scheduleCsv.includes('"Proof of Purchase"') &&
        scheduleCsv.includes('"Warranty Status"') &&
        scheduleCsv.includes("--- SUMMARY SCHEDULE TOTALS ---") &&
        scheduleCsv.includes("Total Declared Replacement Value"),
      "CSV output missing required headers or summary rows"
    );

    const scheduleHtml = generateInsuranceScheduleHtml(insuranceData);
    check(
      "generateInsuranceScheduleHtml creates self-contained printable report",
      scheduleHtml.includes("<!DOCTYPE html>") &&
        scheduleHtml.includes("SynCognia Household Inventory Schedule") &&
        scheduleHtml.includes("@media print") &&
        scheduleHtml.includes("summary-grid"),
      "HTML schedule missing required markup or print CSS"
    );

    // ----------------------------------------------------
    // Section 5: 1-Click Warranty Claim Dossier Generator
    // ----------------------------------------------------
    console.log("\n[5] Testing 1-Click Claim Dossier Generator:");

    // Find seeded asset with warranty
    const seededAsset = await prisma.asset.findFirst({
      where: {
        warranties: {
          some: {},
        },
      },
      include: {
        warranties: true,
        receipts: true,
        documents: true,
      },
    });

    check(
      "Found seeded asset with warranty for dossier testing",
      !!seededAsset,
      "No seeded asset with warranty found in database"
    );

    if (seededAsset) {
      const dossier = await generateClaimDossierData(seededAsset.id);

      check(
        "generateClaimDossierData assigns unique CLM- dossier ID",
        dossier.dossierId.startsWith("CLM-") && dossier.dossierId.length >= 12,
        `Dossier ID: ${dossier.dossierId}`
      );

      check(
        "Claim dossier bundles claimant, asset specs, and warranty details",
        !!dossier.claimant.name &&
          dossier.asset.name === seededAsset.name &&
          !!dossier.warranty?.provider,
        `Claimant: ${dossier.claimant.name}, Provider: ${dossier.warranty?.provider}`
      );

      check(
        "Pre-drafted claim letter includes formal RMA request and product details",
        dossier.draftedLetter.subject.includes("Warranty Claim Request:") &&
          dossier.draftedLetter.body.includes("PRODUCT & REGISTRATION IDENTIFICATION:") &&
          dossier.draftedLetter.body.includes("WARRANTY COVERAGE RECORD:") &&
          dossier.draftedLetter.body.includes("REMEDY REQUESTED:") &&
          dossier.draftedLetter.body.includes("RMA (Return Merchandise Authorization)"),
        "Letter body missing required sections or RMA request"
      );

      const dossierHtml = generateClaimDossierHtml(dossier);
      check(
        "generateClaimDossierHtml creates executive printable dossier packet",
        dossierHtml.includes("<!DOCTYPE html>") &&
          dossierHtml.includes("SynCognia Claim Dossier") &&
          dossierHtml.includes(dossier.dossierId) &&
          dossierHtml.includes("@media print") &&
          dossierHtml.includes("letter-box"),
        "Claim dossier HTML missing letter box or print styling"
      );

      // Test GET /api/claim-dossier/[assetId]?format=json
      const mockDossierJsonReq = new NextRequest(
        `http://localhost:3000/api/claim-dossier/${seededAsset.id}?format=json`
      );
      const apiDossierJsonRes = await getClaimDossier(mockDossierJsonReq, {
        params: Promise.resolve({ assetId: seededAsset.id }),
      });
      const dossierJson = await apiDossierJsonRes.json();
      check(
        "GET /api/claim-dossier/[assetId]?format=json returns HTTP 200 with full dossier",
        apiDossierJsonRes.status === 200 &&
          dossierJson.success === true &&
          dossierJson.dossier.dossierId.startsWith("CLM-"),
        `Status: ${apiDossierJsonRes.status}`
      );

      // Test GET /api/claim-dossier/[assetId]?format=html
      const mockDossierHtmlReq = new NextRequest(
        `http://localhost:3000/api/claim-dossier/${seededAsset.id}?format=html`
      );
      const apiDossierHtmlRes = await getClaimDossier(mockDossierHtmlReq, {
        params: Promise.resolve({ assetId: seededAsset.id }),
      });
      check(
        "GET /api/claim-dossier/[assetId]?format=html returns HTTP 200 text/html view",
        apiDossierHtmlRes.status === 200 &&
          apiDossierHtmlRes.headers.get("content-type")?.includes("text/html") === true,
        `Content-Type: ${apiDossierHtmlRes.headers.get("content-type")}`
      );
    }
  } catch (error) {
    console.error("\n💥 Unhandled error in verification run:", error);
    check("Verification suite execution completed without fatal crash", false, (error as Error).message);
  } finally {
    // ----------------------------------------------------
    // Section 6: Clean Up
    // ----------------------------------------------------
    console.log("\n[6] Cleaning Up Test Records & Files:");

    if (testCreatedDocId) {
      await prisma.document.delete({ where: { id: testCreatedDocId } }).catch(() => {});
    }

    if (testAssetId) {
      await prisma.asset.delete({ where: { id: testAssetId } }).catch(() => {});
      console.log(`  🧹 Cleaned up temporary test asset: ${testAssetId}`);
    }

    for (const f of tempFilesToClean) {
      if (fs.existsSync(f)) {
        fs.unlinkSync(f);
        console.log(`  🧹 Removed temporary vault test file: ${path.basename(f)}`);
      }
    }
  }

  // Final Scorecard
  const total = checks.length;
  const passed = checks.filter((c) => c.passed).length;
  const failed = checks.filter((c) => !c.passed).length;

  console.log("\n==========================================================");
  console.log(`🏁 Phase 5 Verification Summary: ${passed}/${total} checks passed (${Math.round((passed / total) * 100)}%)`);
  console.log("==========================================================");

  if (failed > 0) {
    console.error(`\n❌ ${failed} assertion(s) failed.`);
    process.exit(1);
  } else {
    console.log("\n✨ All Phase 5 verification assertions passed successfully!");
    process.exit(0);
  }
}

runPhase5Verification();
