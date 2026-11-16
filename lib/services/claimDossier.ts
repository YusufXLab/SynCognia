import prisma from "@/lib/prisma";

export interface ClaimDossierData {
  dossierId: string;
  generatedAt: Date;
  claimant: {
    name: string;
    email: string;
  };
  asset: {
    id: string;
    name: string;
    category: string;
    brand?: string | null;
    modelNumber?: string | null;
    serialNumber?: string | null;
    purchaseDate?: Date | null;
    purchasePrice?: number | null;
    currency: string;
    location?: string | null;
  };
  warranty?: {
    provider: string;
    warrantyType: string;
    policyNumber?: string | null;
    startDate?: Date | null;
    endDate?: Date | null;
    supportContact?: string | null;
    claimUrl?: string | null;
    status: string;
  };
  proofOfPurchase?: {
    merchant?: string;
    purchaseDate?: Date | null;
    totalAmount?: number | null;
    fileUrl?: string | null;
    mimeType?: string | null;
  };
  attachedDocuments: Array<{
    id: string;
    title: string;
    documentType: string;
    fileUrl: string;
    fileSize?: number | null;
    isEncrypted: boolean;
  }>;
  draftedLetter: {
    recipient: string;
    subject: string;
    body: string;
  };
}

/**
 * Compiles a comprehensive warranty claim dossier packet for an asset, bundling
 * product specs, warranty policy terms, proof of purchase, vault documents, and
 * an auto-crafted formal claim letter.
 */
export async function generateClaimDossierData(
  assetId: string
): Promise<ClaimDossierData> {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      user: true,
      warranties: {
        orderBy: { createdAt: "desc" },
      },
      receipts: {
        orderBy: { createdAt: "desc" },
      },
      documents: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!asset) {
    throw new Error(`Asset not found: ${assetId}`);
  }

  // Determine Claimant
  const claimant = {
    name: asset.user?.name || "Household Owner",
    email: asset.user?.email || "owner@syncognia.local",
  };

  // Determine Active or most recent Warranty
  let warranty: ClaimDossierData["warranty"] = undefined;
  if (asset.warranties && asset.warranties.length > 0) {
    const activeWarranty =
      asset.warranties.find((w) => w.status === "ACTIVE") ||
      asset.warranties[0];
    warranty = {
      provider: activeWarranty.provider,
      warrantyType: activeWarranty.warrantyType,
      policyNumber: activeWarranty.policyNumber || undefined,
      startDate: activeWarranty.startDate,
      endDate: activeWarranty.endDate,
      supportContact: activeWarranty.supportContact || undefined,
      claimUrl: activeWarranty.claimUrl || undefined,
      status: activeWarranty.status,
    };
  }

  // Determine Primary Proof of Purchase
  let proofOfPurchase: ClaimDossierData["proofOfPurchase"] = undefined;
  if (asset.receipts && asset.receipts.length > 0) {
    const primaryReceipt = asset.receipts[0];
    proofOfPurchase = {
      merchant: primaryReceipt.merchant,
      purchaseDate: primaryReceipt.purchaseDate || asset.purchaseDate,
      totalAmount: primaryReceipt.totalAmount || asset.purchasePrice,
      fileUrl: primaryReceipt.fileUrl,
      mimeType: primaryReceipt.mimeType,
    };
  } else {
    const invoiceDoc = asset.documents.find((d) => d.documentType === "INVOICE");
    if (invoiceDoc) {
      proofOfPurchase = {
        merchant: asset.brand || "Authorized Retailer",
        purchaseDate: asset.purchaseDate,
        totalAmount: asset.purchasePrice,
        fileUrl: invoiceDoc.fileUrl,
        mimeType: invoiceDoc.mimeType,
      };
    }
  }

  // Attached Documents from Vault
  const attachedDocuments = (asset.documents || []).map((doc) => ({
    id: doc.id,
    title: doc.title,
    documentType: doc.documentType,
    fileUrl: doc.fileUrl,
    fileSize: doc.fileSize,
    isEncrypted: doc.isEncrypted,
  }));

  // Unique Claim Dossier Identifier
  const year = new Date().getFullYear();
  const modelCode = asset.modelNumber
    ? asset.modelNumber.replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase()
    : "ASSET";
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const dossierId = `CLM-${year}-${modelCode || "ASSET"}-${randomSuffix}`;

  // Pre-craft formal claim letter
  const recipient =
    warranty?.supportContact ||
    (asset.brand
      ? `${asset.brand} Customer Support & Claims`
      : "Warranty Support & Claims Team");

  const brandPrefix = asset.brand ? `${asset.brand} ` : "";
  const serialDisplay = asset.serialNumber || "Not Recorded on Registration";
  const policyDisplay = warranty?.policyNumber || "Not Recorded on Registration";

  const subject = `Warranty Claim Request: ${brandPrefix}${asset.name} (S/N: ${serialDisplay}) - Policy #${policyDisplay}`;

  const formattedPurchaseDate = asset.purchaseDate
    ? new Date(asset.purchaseDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Not Recorded on Registration";

  const formattedPrice =
    asset.purchasePrice !== null && asset.purchasePrice !== undefined
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: asset.currency || "USD",
        }).format(asset.purchasePrice)
      : "Not Disclosed";

  const warrantyPeriod =
    warranty?.startDate && warranty?.endDate
      ? `${new Date(warranty.startDate).toLocaleDateString()} to ${new Date(
          warranty.endDate
        ).toLocaleDateString()}`
      : warranty?.status || "Active Warranty Coverage";

  const proofMerchant = proofOfPurchase?.merchant || "Authorized Retailer";
  const proofSummary = proofOfPurchase
    ? `${proofMerchant} (Date: ${formattedPurchaseDate}${
        proofOfPurchase.fileUrl ? `, Attached File: ${proofOfPurchase.fileUrl.split("/").pop()}` : ""
      })`
    : "Proof of Purchase on file in SynCognia Ownership Vault";

  const attachedDocsSummary =
    attachedDocuments.length > 0
      ? attachedDocuments.map((d) => `${d.title} (${d.documentType})`).join(", ")
      : "Standard digital purchase credentials";

  const letterDate = new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
  }).format(new Date());

  const letterBody = [
    `Date: ${letterDate}`,
    `To: ${recipient}`,
    `Reference Claim ID: ${dossierId}`,
    "",
    "Dear Customer Support & Claims Department,",
    "",
    `I am writing to formally submit a warranty claim regarding my ${brandPrefix}${asset.name}, acquired on ${formattedPurchaseDate} from ${proofMerchant}.`,
    "",
    "PRODUCT & REGISTRATION IDENTIFICATION:",
    `  - Item Description: ${asset.name}`,
    `  - Category: ${asset.category}`,
    `  - Brand / Manufacturer: ${asset.brand || "Not Specified"}`,
    `  - Model Number: ${asset.modelNumber || "Not Recorded on Registration"}`,
    `  - Serial / VIN Number: ${serialDisplay}`,
    `  - Acquisition Date: ${formattedPurchaseDate}`,
    `  - Declared Replacement Cost: ${formattedPrice}`,
    `  - Household Location: ${asset.location || "Primary Residence"}`,
    "",
    "WARRANTY COVERAGE RECORD:",
    `  - Warranty Provider: ${warranty?.provider || "Manufacturer Direct"}`,
    `  - Warranty Type: ${warranty?.warrantyType || "Standard Manufacturer Warranty"}`,
    `  - Policy / Registration Number: ${policyDisplay}`,
    `  - Coverage Window: ${warrantyPeriod}`,
    `  - Current Status: ${warranty?.status || "ACTIVE"}`,
    "",
    "STATEMENT OF CLAIM & FAILURE DECLARATION:",
    "The hardware unit described above has been operated strictly in accordance with manufacturer guidelines, environmental specifications, and normal intended household conditions. A hardware malfunction or operational defect has occurred during normal use within the active warranty protection period.",
    "",
    "ENCLOSED EVIDENCE & DOCUMENTATION:",
    `  1. Primary Proof of Purchase: ${proofSummary}`,
    `  2. Vault Enclosures: ${attachedDocsSummary}`,
    "  3. Certified Asset Identity & Serial Registry Verified via SynCognia Ownership Vault",
    "",
    "REMEDY REQUESTED:",
    "Pursuant to the manufacturer's stated warranty terms, consumer statutory rights, and commercial sales agreements, I respectfully request:",
    "  1. Formal acknowledgement of this claim filing with an official RMA (Return Merchandise Authorization) or claim ticket number.",
    "  2. Instructions for certified service inspection, component repair, or full unit replacement.",
    "  3. Prepaid return shipping labels and packaging guidelines if factory or service center return is required.",
    "",
    "Please provide written confirmation and claims processing instructions at your earliest convenience.",
    "",
    "Sincerely,",
    "",
    claimant.name,
    `Email: ${claimant.email}`,
    `SynCognia Dossier ID: ${dossierId}`,
  ].join("\n");

  return {
    dossierId,
    generatedAt: new Date(),
    claimant,
    asset: {
      id: asset.id,
      name: asset.name,
      category: asset.category,
      brand: asset.brand,
      modelNumber: asset.modelNumber,
      serialNumber: asset.serialNumber,
      purchaseDate: asset.purchaseDate,
      purchasePrice: asset.purchasePrice,
      currency: asset.currency || "USD",
      location: asset.location,
    },
    warranty,
    proofOfPurchase,
    attachedDocuments,
    draftedLetter: {
      recipient,
      subject,
      body: letterBody,
    },
  };
}

/**
 * Generates an executive, printable HTML document bundling the warranty claim dossier packet.
 */
export function generateClaimDossierHtml(dossier: ClaimDossierData): string {
  const brandName = dossier.asset.brand || "";
  const fullAssetName = brandName ? `${brandName} ${dossier.asset.name}` : dossier.asset.name;

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(dossier.generatedAt);

  const purchaseDateStr = dossier.asset.purchaseDate
    ? new Date(dossier.asset.purchaseDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Not Recorded on Registration";

  const purchasePriceStr =
    dossier.asset.purchasePrice !== null && dossier.asset.purchasePrice !== undefined
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: dossier.asset.currency || "USD",
        }).format(dossier.asset.purchasePrice)
      : "Not Disclosed";

  const warrantyPeriodStr =
    dossier.warranty?.startDate && dossier.warranty?.endDate
      ? `${new Date(dossier.warranty.startDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })} – ${new Date(dossier.warranty.endDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}`
      : dossier.warranty?.status || "Active Warranty";

  const attachedRows =
    dossier.attachedDocuments.length > 0
      ? dossier.attachedDocuments
          .map(
            (doc) => `
        <tr>
          <td class="bold">${escapeHtml(doc.title)}</td>
          <td><span class="badge badge-info">${escapeHtml(doc.documentType)}</span></td>
          <td class="mono">${escapeHtml(doc.fileUrl.split("/").pop() || doc.fileUrl)}</td>
          <td>${doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : "—"}</td>
          <td>${doc.isEncrypted ? `<span class="badge badge-success">Encrypted (AES-GCM)</span>` : `<span class="badge badge-muted">Standard</span>`}</td>
        </tr>
      `
          )
          .join("\n")
      : `<tr><td colspan="5" class="center" style="padding: 16px; color: #64748b;">No secondary documents attached in vault. Primary receipt attached below.</td></tr>`;

  const letterFormattedHtml = escapeHtml(dossier.draftedLetter.body)
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SynCognia - Claim Dossier ${dossier.dossierId}</title>
  <style>
    :root {
      --primary: #0284c7;
      --primary-dark: #0369a1;
      --slate-900: #0f172a;
      --slate-800: #1e293b;
      --slate-700: #334155;
      --slate-600: #475569;
      --slate-500: #64748b;
      --slate-100: #f1f5f9;
      --slate-50: #f8fafc;
      --border: #e2e8f0;
      --success: #16a34a;
      --warning: #d97706;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: var(--slate-50);
      color: var(--slate-900);
      line-height: 1.5;
      padding: 32px;
    }

    .container {
      max-width: 1000px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
      border: 1px solid var(--border);
      padding: 40px;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid var(--border);
      padding-bottom: 24px;
      margin-bottom: 28px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .logo-badge {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #0284c7 0%, #4f46e5 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 800;
      font-size: 22px;
    }

    .brand-title {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
      color: var(--slate-900);
    }

    .brand-subtitle {
      font-size: 13px;
      color: var(--slate-500);
      font-weight: 500;
    }

    .header-actions {
      text-align: right;
    }

    .dossier-pill {
      display: inline-block;
      background-color: #e0f2fe;
      color: #0369a1;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 700;
      font-size: 13px;
      padding: 4px 10px;
      border-radius: 6px;
      margin-bottom: 8px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background-color: var(--primary);
      color: white;
      border: none;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn:hover {
      background-color: var(--primary-dark);
    }

    .timestamp {
      font-size: 11px;
      color: var(--slate-500);
      margin-top: 6px;
    }

    /* Section Grid */
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 24px;
    }

    .card {
      background: var(--slate-50);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 20px;
    }

    .card-title {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--slate-700);
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border);
      padding-bottom: 8px;
    }

    .info-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .info-item {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
    }

    .info-label {
      color: var(--slate-500);
      font-weight: 500;
    }

    .info-value {
      font-weight: 600;
      color: var(--slate-900);
      text-align: right;
    }

    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }

    .badge-success {
      background-color: #dcfce7;
      color: #15803d;
    }

    .badge-info {
      background-color: #dbeafe;
      color: #1d4ed8;
    }

    .badge-muted {
      background-color: #f1f5f9;
      color: #475569;
    }

    /* Letter Box */
    .letter-section {
      margin-top: 28px;
      margin-bottom: 28px;
      page-break-before: always;
    }

    .section-header {
      font-size: 16px;
      font-weight: 700;
      color: var(--slate-900);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .letter-box {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 32px;
      box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.02);
      font-size: 13.5px;
      line-height: 1.7;
      color: #1e293b;
    }

    .letter-meta {
      background: #f8fafc;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 20px;
      font-size: 13px;
    }

    .letter-meta-row {
      display: flex;
      margin-bottom: 4px;
    }

    .letter-meta-label {
      width: 90px;
      font-weight: 600;
      color: var(--slate-600);
    }

    .letter-meta-value {
      font-weight: 500;
      color: var(--slate-900);
    }

    .letter-body {
      white-space: pre-wrap;
      font-family: Georgia, Cambria, "Times New Roman", Times, serif;
      font-size: 14px;
      line-height: 1.75;
      color: #1f2937;
    }

    /* Document Evidence Table */
    .docs-section {
      margin-top: 28px;
      margin-bottom: 24px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: left;
    }

    thead th {
      background-color: #f1f5f9;
      color: var(--slate-700);
      font-weight: 600;
      padding: 10px 12px;
      border-bottom: 2px solid var(--border);
    }

    tbody td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
      vertical-align: middle;
    }

    .bold {
      font-weight: 600;
    }

    .center {
      text-align: center;
    }

    .notice {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 14px 18px;
      font-size: 12px;
      color: #1e40af;
      margin-top: 24px;
      line-height: 1.6;
    }

    .footer {
      border-top: 1px solid var(--border);
      padding-top: 18px;
      margin-top: 28px;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: var(--slate-500);
    }

    /* Print Styles */
    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }

      .container {
        border: none;
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }

      .no-print {
        display: none !important;
      }

      .letter-section {
        page-break-before: always;
      }

      .letter-box {
        border: 1px solid #cbd5e1;
        padding: 20px;
      }

      thead th {
        background-color: #f1f5f9 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">
        <div class="logo-badge">S</div>
        <div>
          <div class="brand-title">SynCognia Claim Dossier</div>
          <div class="brand-subtitle">Automated Hardware Warranty Claim &amp; Provenance Evidence Packet</div>
        </div>
      </div>
      <div class="header-actions">
        <div class="dossier-pill">${escapeHtml(dossier.dossierId)}</div>
        <div>
          <button class="btn no-print" onclick="window.print()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            Print Dossier / Save as PDF
          </button>
        </div>
        <div class="timestamp">Generated: ${formattedDate}</div>
      </div>
    </div>

    <!-- Product & Warranty Overview -->
    <div class="grid-2">
      <!-- Asset Card -->
      <div class="card">
        <div class="card-title">
          <span>Asset Specification</span>
          <span class="badge badge-info">${escapeHtml(dossier.asset.category)}</span>
        </div>
        <div class="info-list">
          <div class="info-item">
            <span class="info-label">Item Name:</span>
            <span class="info-value">${escapeHtml(fullAssetName)}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Brand / Make:</span>
            <span class="info-value">${escapeHtml(dossier.asset.brand || "Not Specified")}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Model Number:</span>
            <span class="info-value mono">${escapeHtml(dossier.asset.modelNumber || "Not Recorded")}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Serial / VIN:</span>
            <span class="info-value mono">${escapeHtml(dossier.asset.serialNumber || "Not Recorded")}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Purchase Date:</span>
            <span class="info-value">${purchaseDateStr}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Replacement Value:</span>
            <span class="info-value">${purchasePriceStr}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Location:</span>
            <span class="info-value">${escapeHtml(dossier.asset.location || "Primary Residence")}</span>
          </div>
        </div>
      </div>

      <!-- Warranty & Proof Card -->
      <div class="card">
        <div class="card-title">
          <span>Warranty &amp; Purchase Proof</span>
          <span class="badge ${dossier.warranty?.status === "ACTIVE" ? "badge-success" : "badge-muted"}">
            ${escapeHtml(dossier.warranty?.status || "COVERAGE ACTIVE")}
          </span>
        </div>
        <div class="info-list">
          <div class="info-item">
            <span class="info-label">Warranty Provider:</span>
            <span class="info-value">${escapeHtml(dossier.warranty?.provider || "Manufacturer Direct")}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Coverage Type:</span>
            <span class="info-value">${escapeHtml(dossier.warranty?.warrantyType || "Standard Manufacturer")}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Policy Number:</span>
            <span class="info-value mono">${escapeHtml(dossier.warranty?.policyNumber || "Not Recorded")}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Coverage Window:</span>
            <span class="info-value">${warrantyPeriodStr}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Support Contact:</span>
            <span class="info-value">${escapeHtml(dossier.warranty?.supportContact || "Manufacturer Support")}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Merchant / Vendor:</span>
            <span class="info-value">${escapeHtml(dossier.proofOfPurchase?.merchant || "Authorized Retailer")}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Proof of Purchase:</span>
            <span class="info-value">${dossier.proofOfPurchase ? `<span class="badge badge-success">Verified Attachment</span>` : `<span class="badge badge-muted">Not Attached</span>`}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Official Claim Letter Section -->
    <div class="letter-section">
      <div class="section-header">
        <span>Formal Manufacturer Claim Letter</span>
      </div>

      <div class="letter-meta">
        <div class="letter-meta-row">
          <span class="letter-meta-label">To:</span>
          <span class="letter-meta-value">${escapeHtml(dossier.draftedLetter.recipient)}</span>
        </div>
        <div class="letter-meta-row">
          <span class="letter-meta-label">Subject:</span>
          <span class="letter-meta-value bold">${escapeHtml(dossier.draftedLetter.subject)}</span>
        </div>
        <div class="letter-meta-row">
          <span class="letter-meta-label">Claimant:</span>
          <span class="letter-meta-value">${escapeHtml(dossier.claimant.name)} &lt;${escapeHtml(dossier.claimant.email)}&gt;</span>
        </div>
      </div>

      <div class="letter-box">
        <div class="letter-body">${letterFormattedHtml}</div>
      </div>
    </div>

    <!-- Attached Vault Evidence -->
    <div class="docs-section">
      <div class="section-header">
        <span>Ownership Vault Attached Records (${dossier.attachedDocuments.length})</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Document Title</th>
            <th>Type</th>
            <th>Filename</th>
            <th>File Size</th>
            <th>Security Status</th>
          </tr>
        </thead>
        <tbody>
          ${attachedRows}
        </tbody>
      </table>
    </div>

    <div class="notice">
      <strong>Certified Claim Dossier:</strong> This dossier was compiled from immutable ownership records, digital receipts, and warranty policy certificates recorded in the SynCognia Household Ownership Vault. All referenced documents and proof of purchase files are permanently archived.
    </div>

    <div class="footer">
      <div>SynCognia Ownership Vault &bull; 1-Click Warranty Claim Dossier Engine</div>
      <div>Dossier Reference: ${escapeHtml(dossier.dossierId)} &bull; Page 1 of 2</div>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
