"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Receipt as ReceiptIcon,
  UploadCloud,
  Layers,
  Sparkles,
  ExternalLink,
  Package,
  Calendar,
  DollarSign,
  Search,
  CheckCircle2,
  FileText,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { ReceiptDropzone } from "@/components/receipts/ReceiptDropzone";
import { ReceiptReviewView } from "@/components/receipts/ReceiptReviewView";
import {
  ExtractedReceiptData,
  ReceiptUploadResult,
} from "@/lib/types/receipt";
import { getReceipts } from "@/lib/actions/receipts";

interface ReceiptRecord {
  id: string;
  merchant: string;
  purchaseDate: string | null;
  totalAmount: number | null;
  currency: string;
  rawOcrText: string | null;
  fileUrl: string | null;
  mimeType: string | null;
  createdAt: string;
  asset?: {
    id: string;
    name: string;
    category: string;
    brand: string | null;
  } | null;
}

export default function ReceiptsPage() {
  const [activeTab, setActiveTab] = useState<"scan" | "vault">("scan");
  const [uploadedFile, setUploadedFile] = useState<ReceiptUploadResult | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedReceiptData | null>(null);

  // Vault state
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [isLoadingReceipts, setIsLoadingReceipts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadReceipts = async () => {
    setIsLoadingReceipts(true);
    try {
      const res = await getReceipts();
      if (res.success && Array.isArray(res.data)) {
        setReceipts(res.data as ReceiptRecord[]);
      }
    } catch (err) {
      console.error("Failed to load receipts:", err);
    } finally {
      setIsLoadingReceipts(false);
    }
  };

  useEffect(() => {
    loadReceipts();
  }, []);

  const handleExtractionComplete = (file: ReceiptUploadResult, extracted: ExtractedReceiptData) => {
    setUploadedFile(file);
    setExtractedData(extracted);
  };

  const handleReset = () => {
    setUploadedFile(null);
    setExtractedData(null);
    loadReceipts();
  };

  // Demo receipt loader for instant preview without physical receipt
  const loadDemoReceipt = () => {
    const demoFile: ReceiptUploadResult = {
      fileUrl: "/uploads/receipts/demo-bestbuy-receipt.png",
      filePath: "public/uploads/receipts/demo-bestbuy-receipt.png",
      fileName: "bestbuy-purchase-sample.png",
      mimeType: "image/png",
      size: 142800,
      hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    };

    const demoExtracted: ExtractedReceiptData = {
      merchant: "Best Buy #1042",
      purchaseDate: new Date().toISOString().split("T")[0],
      totalAmount: 1299.99,
      currency: "USD",
      taxAmount: 104.0,
      paymentMethod: "Visa ending in 4921",
      items: [
        {
          name: "Sony WH-1000XM5 Noise Canceling Headphones",
          category: "Electronics",
          price: 399.99,
          quantity: 1,
          brand: "Sony",
          modelNumber: "WH1000XM5/B",
          serialNumber: "SN-9481203",
          suggestedWarrantyMonths: 12,
        },
        {
          name: "Apple iPad Air 11-inch M2 128GB Space Gray",
          category: "Electronics",
          price: 899.99,
          quantity: 1,
          brand: "Apple",
          modelNumber: "MU9D3LL/A",
          serialNumber: "DMPX729KLQ",
          suggestedWarrantyMonths: 12,
        },
      ],
      detectedWarranty: {
        provider: "Best Buy TotalTech & AppleCare",
        durationMonths: 24,
        warrantyType: "EXTENDED",
        details: "Includes 24-month comprehensive accidental coverage.",
      },
      returnPolicy: {
        windowDays: 15,
        details: "Standard Best Buy 15-day return window for consumer electronics.",
      },
      rawSummary: "Best Buy receipt for Sony WH-1000XM5 and iPad Air M2 with AppleCare protection.",
    };

    setUploadedFile(demoFile);
    setExtractedData(demoExtracted);
  };

  // Filtered vault receipts
  const filteredReceipts = receipts.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.merchant.toLowerCase().includes(q) ||
      (r.asset?.name && r.asset.name.toLowerCase().includes(q)) ||
      (r.asset?.brand && r.asset.brand.toLowerCase().includes(q))
    );
  });

  const totalReceiptsValue = receipts.reduce(
    (acc, curr) => acc + (curr.totalAmount || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <ReceiptIcon className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Receipt & Invoice Ingestion
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Scan paper receipts, import PDF invoices, and extract structured assets with Gemini AI.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab("scan")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "scan"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <UploadCloud className="h-3.5 w-3.5" />
            <span>Scan & Ingest</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("vault");
              loadReceipts();
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "vault"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Receipts Vault ({receipts.length})</span>
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Invoices</span>
            <ReceiptIcon className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {receipts.length}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium">
            Archived in Document Vault
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Tracked Purchases</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            ${totalReceiptsValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-500">
            Extracted purchase capital
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Extraction Engine</span>
            <Sparkles className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
            Gemini 2.5 Flash
          </p>
          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
            Structured JSON + OCR Fallback
          </span>
        </div>
      </div>

      {/* Mode Content */}
      {activeTab === "scan" ? (
        <div className="space-y-6">
          {!uploadedFile || !extractedData ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Upload Receipt or Invoice
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={loadDemoReceipt}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Try Sample Receipt</span>
                </button>
              </div>

              <ReceiptDropzone onExtractionComplete={handleExtractionComplete} />
            </div>
          ) : (
            <ReceiptReviewView
              file={uploadedFile}
              initialData={extractedData}
              onCancel={handleReset}
              onSuccess={() => {
                loadReceipts();
              }}
            />
          )}
        </div>
      ) : (
        /* Vault / History View */
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Receipts Repository
              </h2>
              <p className="text-xs text-slate-500">
                Browse stored receipts and invoices linked to assets.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by merchant or item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white w-64"
                />
              </div>

              <button
                type="button"
                onClick={loadReceipts}
                className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                title="Refresh receipts"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoadingReceipts ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {filteredReceipts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-slate-300 dark:text-slate-700" />
              <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                No receipts found
              </p>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                {searchQuery
                  ? "No records matched your search query."
                  : "You haven't scanned or uploaded any receipts yet. Switch to 'Scan & Ingest' to add your first receipt."}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("scan")}
                className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                Scan First Receipt
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800">
                    <th className="pb-3 font-medium">Merchant</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Linked Asset</th>
                    <th className="pb-3 font-medium">Document</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredReceipts.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3.5 font-medium text-slate-900 dark:text-white">
                        {r.merchant}
                      </td>
                      <td className="py-3.5 text-slate-600 dark:text-slate-400">
                        {r.purchaseDate
                          ? new Date(r.purchaseDate).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "N/A"}
                      </td>
                      <td className="py-3.5 font-semibold text-slate-900 dark:text-white">
                        {r.totalAmount !== null
                          ? `${r.currency} ${r.totalAmount.toFixed(2)}`
                          : "N/A"}
                      </td>
                      <td className="py-3.5">
                        {r.asset ? (
                          <Link
                            href="/assets"
                            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300"
                          >
                            <Package className="h-3 w-3" />
                            <span>{r.asset.name}</span>
                          </Link>
                        ) : (
                          <span className="text-slate-400">Unlinked</span>
                        )}
                      </td>
                      <td className="py-3.5">
                        {r.fileUrl ? (
                          <a
                            href={r.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                          >
                            <span>View</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400 text-[11px]">No file</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
