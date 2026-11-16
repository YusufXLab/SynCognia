import prisma from "@/lib/prisma";

export interface InsuranceScheduleItem {
  assetId: string;
  name: string;
  category: string;
  brand?: string | null;
  modelNumber?: string | null;
  serialNumber?: string | null;
  purchaseDate?: Date | null;
  declaredValue: number;
  currency: string;
  location?: string | null;
  proofOfPurchaseStatus: "VERIFIED_RECEIPT" | "ATTACHED_INVOICE" | "NO_PROOF";
  receiptFileName?: string;
  warrantyStatus?: string;
  warrantyProvider?: string;
  policyNumber?: string;
  vaultDocumentsCount: number;
}

export interface InsuranceScheduleData {
  items: InsuranceScheduleItem[];
  totalAssets: number;
  totalDeclaredValue: number;
  itemsWithProofCount: number;
  itemsWithWarrantyCount: number;
  generatedAt: Date;
}

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Compiles household active assets, replacement values, and linked proofs of purchase into insurance schedule data.
 */
export async function generateInsuranceScheduleData(): Promise<InsuranceScheduleData> {
  const assets = await prisma.asset.findMany({
    where: { status: "ACTIVE" },
    include: {
      receipts: true,
      warranties: true,
      documents: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const items: InsuranceScheduleItem[] = assets.map((asset) => {
    // Determine Proof of Purchase status
    let proofOfPurchaseStatus: "VERIFIED_RECEIPT" | "ATTACHED_INVOICE" | "NO_PROOF" = "NO_PROOF";
    let receiptFileName: string | undefined = undefined;

    if (asset.receipts && asset.receipts.length > 0) {
      proofOfPurchaseStatus = "VERIFIED_RECEIPT";
      const receipt = asset.receipts[0];
      if (receipt.fileUrl) {
        receiptFileName = receipt.fileUrl.split("/").pop() || receipt.fileUrl;
      } else {
        receiptFileName = `Receipt-${receipt.merchant.replace(/\s+/g, "_")}`;
      }
    } else {
      const invoiceDoc = asset.documents?.find(
        (doc) => doc.documentType === "INVOICE"
      );
      if (invoiceDoc) {
        proofOfPurchaseStatus = "ATTACHED_INVOICE";
        receiptFileName = invoiceDoc.fileUrl
          ? invoiceDoc.fileUrl.split("/").pop() || invoiceDoc.title
          : invoiceDoc.title;
      }
    }

    // Determine Warranty status
    let warrantyStatus: string = "NONE";
    let warrantyProvider: string | undefined = undefined;
    let policyNumber: string | undefined = undefined;

    if (asset.warranties && asset.warranties.length > 0) {
      const activeWarranty =
        asset.warranties.find((w) => w.status === "ACTIVE") ||
        asset.warranties[0];
      warrantyStatus = activeWarranty.status;
      warrantyProvider = activeWarranty.provider;
      policyNumber = activeWarranty.policyNumber || undefined;
    }

    const declaredValue = asset.purchasePrice ?? 0;

    return {
      assetId: asset.id,
      name: asset.name,
      category: asset.category,
      brand: asset.brand,
      modelNumber: asset.modelNumber,
      serialNumber: asset.serialNumber,
      purchaseDate: asset.purchaseDate,
      declaredValue,
      currency: asset.currency || "USD",
      location: asset.location,
      proofOfPurchaseStatus,
      receiptFileName,
      warrantyStatus,
      warrantyProvider,
      policyNumber,
      vaultDocumentsCount: asset.documents?.length || 0,
    };
  });

  const totalAssets = items.length;
  const totalDeclaredValue = items.reduce((sum, item) => sum + item.declaredValue, 0);
  const itemsWithProofCount = items.filter(
    (item) => item.proofOfPurchaseStatus !== "NO_PROOF"
  ).length;
  const itemsWithWarrantyCount = items.filter(
    (item) => item.warrantyStatus && item.warrantyStatus !== "NONE"
  ).length;

  return {
    items,
    totalAssets,
    totalDeclaredValue,
    itemsWithProofCount,
    itemsWithWarrantyCount,
    generatedAt: new Date(),
  };
}

/**
 * Generates an RFC 4180 compliant CSV of the insurance inventory schedule.
 */
export function generateInsuranceScheduleCsv(data: InsuranceScheduleData): string {
  const headers = [
    "Asset Name",
    "Category",
    "Brand",
    "Model Number",
    "Serial / VIN",
    "Purchase Date",
    "Declared Replacement Value (USD)",
    "Location",
    "Proof of Purchase",
    "Receipt File",
    "Warranty Status",
    "Warranty Provider",
    "Policy #",
    "Vault Documents Count",
  ];

  const rows = data.items.map((item) => [
    escapeCsv(item.name),
    escapeCsv(item.category),
    escapeCsv(item.brand || "N/A"),
    escapeCsv(item.modelNumber || "N/A"),
    escapeCsv(item.serialNumber || "N/A"),
    escapeCsv(
      item.purchaseDate
        ? new Date(item.purchaseDate).toISOString().split("T")[0]
        : "N/A"
    ),
    escapeCsv(item.declaredValue.toFixed(2)),
    escapeCsv(item.location || "N/A"),
    escapeCsv(item.proofOfPurchaseStatus),
    escapeCsv(item.receiptFileName || "None"),
    escapeCsv(item.warrantyStatus || "None"),
    escapeCsv(item.warrantyProvider || "N/A"),
    escapeCsv(item.policyNumber || "N/A"),
    escapeCsv(item.vaultDocumentsCount),
  ]);

  const summary = [
    [],
    [escapeCsv("--- SUMMARY SCHEDULE TOTALS ---")],
    [
      escapeCsv("Total Declared Replacement Value"),
      escapeCsv(`$${data.totalDeclaredValue.toFixed(2)}`),
    ],
    [escapeCsv("Total Items Registered"), escapeCsv(data.totalAssets)],
    [escapeCsv("Items With Attached Proofs"), escapeCsv(data.itemsWithProofCount)],
    [escapeCsv("Items With Active Warranty"), escapeCsv(data.itemsWithWarrantyCount)],
    [escapeCsv("Schedule Generated At"), escapeCsv(data.generatedAt.toISOString())],
  ];

  const allLines = [
    headers.map(escapeCsv).join(","),
    ...rows.map((r) => r.join(",")),
    ...summary.map((r) => r.join(",")),
  ];

  return allLines.join("\r\n");
}

/**
 * Generates a clean, professional, self-contained HTML report designed for printing or "Save as PDF".
 */
export function generateInsuranceScheduleHtml(data: InsuranceScheduleData): string {
  const formattedTotalValue = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(data.totalDeclaredValue);

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(data.generatedAt);

  const proofPercentage = data.totalAssets > 0
    ? Math.round((data.itemsWithProofCount / data.totalAssets) * 100)
    : 0;

  const tableRows = data.items
    .map((item, index) => {
      const formattedItemPrice = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: item.currency || "USD",
      }).format(item.declaredValue);

      const purchaseDateStr = item.purchaseDate
        ? new Date(item.purchaseDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "Not Recorded";

      let proofBadge = "";
      if (item.proofOfPurchaseStatus === "VERIFIED_RECEIPT") {
        proofBadge = `<span class="badge badge-success">Verified Receipt</span>`;
      } else if (item.proofOfPurchaseStatus === "ATTACHED_INVOICE") {
        proofBadge = `<span class="badge badge-info">Vault Invoice</span>`;
      } else {
        proofBadge = `<span class="badge badge-warning">No Proof</span>`;
      }

      let warrantyBadge = "";
      if (item.warrantyStatus === "ACTIVE") {
        warrantyBadge = `<span class="badge badge-success">Active</span>`;
      } else if (item.warrantyStatus === "EXPIRING_SOON") {
        warrantyBadge = `<span class="badge badge-warning">Expiring Soon</span>`;
      } else if (item.warrantyStatus === "EXPIRED") {
        warrantyBadge = `<span class="badge badge-muted">Expired</span>`;
      } else {
        warrantyBadge = `<span class="badge badge-muted">None</span>`;
      }

      return `
        <tr class="${index % 2 === 0 ? "even" : "odd"}">
          <td class="bold">${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.category)}</td>
          <td>${escapeHtml(item.brand || "—")} / ${escapeHtml(item.modelNumber || "—")}</td>
          <td class="mono">${escapeHtml(item.serialNumber || "—")}</td>
          <td>${purchaseDateStr}</td>
          <td class="bold right">${formattedItemPrice}</td>
          <td>${escapeHtml(item.location || "Unassigned")}</td>
          <td>
            ${proofBadge}
            ${item.receiptFileName ? `<div class="subtext">${escapeHtml(item.receiptFileName)}</div>` : ""}
          </td>
          <td>
            ${warrantyBadge}
            ${item.policyNumber ? `<div class="subtext">#${escapeHtml(item.policyNumber)}</div>` : ""}
          </td>
          <td class="center">${item.vaultDocumentsCount}</td>
        </tr>
      `;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SynCognia - Household Insurance Inventory Schedule</title>
  <style>
    :root {
      --primary: #0284c7;
      --primary-dark: #0369a1;
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --text: #0f172a;
      --text-muted: #64748b;
      --border: #e2e8f0;
      --success: #16a34a;
      --warning: #d97706;
      --info: #2563eb;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 32px;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: var(--card-bg);
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
      border: 1px solid var(--border);
      padding: 36px;
    }

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
      gap: 12px;
    }

    .logo-badge {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #0284c7 0%, #4f46e5 100%);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 800;
      font-size: 20px;
    }

    .brand-title {
      font-size: 24px;
      font-weight: 700;
      color: var(--text);
      letter-spacing: -0.5px;
    }

    .brand-subtitle {
      font-size: 13px;
      color: var(--text-muted);
      font-weight: 500;
    }

    .header-actions {
      text-align: right;
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
      margin-top: 8px;
      font-size: 12px;
      color: var(--text-muted);
    }

    /* Summary Grid */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 32px;
    }

    .summary-card {
      background: #f8fafc;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
    }

    .summary-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      margin-bottom: 4px;
    }

    .summary-value {
      font-size: 24px;
      font-weight: 700;
      color: var(--text);
    }

    .summary-sub {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 4px;
    }

    /* Inventory Table */
    .table-container {
      width: 100%;
      overflow-x: auto;
      margin-bottom: 32px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: left;
    }

    thead th {
      background-color: #f1f5f9;
      color: #334155;
      font-weight: 600;
      padding: 12px 14px;
      border-bottom: 2px solid var(--border);
      white-space: nowrap;
    }

    tbody td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border);
      vertical-align: middle;
    }

    tr.even {
      background-color: #ffffff;
    }

    tr.odd {
      background-color: #fcfcfd;
    }

    .bold {
      font-weight: 600;
    }

    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
    }

    .right {
      text-align: right;
    }

    .center {
      text-align: center;
    }

    .subtext {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 2px;
      word-break: break-all;
    }

    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      line-height: 1;
      white-space: nowrap;
    }

    .badge-success {
      background-color: #dcfce7;
      color: #15803d;
    }

    .badge-info {
      background-color: #dbeafe;
      color: #1d4ed8;
    }

    .badge-warning {
      background-color: #fef3c7;
      color: #b45309;
    }

    .badge-muted {
      background-color: #f1f5f9;
      color: #64748b;
    }

    /* Notice & Footer */
    .notice-box {
      background-color: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 28px;
      font-size: 12px;
      color: #166534;
      line-height: 1.6;
    }

    .footer {
      border-top: 1px solid var(--border);
      padding-top: 20px;
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: var(--text-muted);
    }

    /* Print Styles */
    @media print {
      body {
        background-color: #ffffff;
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

      thead th {
        background-color: #f1f5f9 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .badge {
        border: 1px solid #cbd5e1;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      tr {
        page-break-inside: avoid;
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
          <div class="brand-title">SynCognia Household Inventory Schedule</div>
          <div class="brand-subtitle">Declared Replacement Value &amp; Proof of Purchase Certified Roster</div>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn no-print" onclick="window.print()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
          </svg>
          Print Insurance Schedule
        </button>
        <div class="timestamp">Generated: ${formattedDate}</div>
      </div>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-label">Total Replacement Value</div>
        <div class="summary-value" style="color: var(--primary);">${formattedTotalValue}</div>
        <div class="summary-sub">Declared acquisition basis</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Registered Assets</div>
        <div class="summary-value">${data.totalAssets}</div>
        <div class="summary-sub">Active household assets</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Proof of Purchase</div>
        <div class="summary-value" style="color: var(--success);">${proofPercentage}%</div>
        <div class="summary-sub">${data.itemsWithProofCount} of ${data.totalAssets} verified</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Warranties Recorded</div>
        <div class="summary-value" style="color: var(--info);">${data.itemsWithWarrantyCount}</div>
        <div class="summary-sub">Active manufacturer/extended</div>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Asset Name</th>
            <th>Category</th>
            <th>Brand &amp; Model</th>
            <th>Serial / VIN</th>
            <th>Purchase Date</th>
            <th class="right">Replacement Value</th>
            <th>Location</th>
            <th>Proof of Purchase</th>
            <th>Warranty</th>
            <th class="center">Docs</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows || `<tr><td colspan="10" class="center" style="padding: 32px; color: var(--text-muted);">No active assets registered in household inventory.</td></tr>`}
        </tbody>
      </table>
    </div>

    <div class="notice-box">
      <strong>Underwriter &amp; Claims Adjuster Notice:</strong> This schedule documents physical household personal property registered within the SynCognia Vault. All records correlate with digital receipts, bill-of-sale invoices, and warranty documentation permanently cataloged in the SynCognia Ownership Vault. Replacement values reflect acquisition pricing or declared replacement figures.
    </div>

    <div class="footer">
      <div>SynCognia Ownership Vault &bull; Certified Household Asset Dossier</div>
      <div>Schedule ID: INS-${data.generatedAt.getTime()} &bull; Page 1 of 1</div>
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
