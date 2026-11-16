"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FolderLock,
  Plus,
  Search,
  LayoutGrid,
  List,
  ShieldCheck,
  FileText,
  Package,
  HardDrive,
  Download,
  Printer,
  ChevronDown,
  RefreshCw,
  FolderOpen,
  FileCheck,
} from "lucide-react";
import {
  DocumentWithAsset,
  DocumentType,
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  VaultMetrics,
} from "@/lib/types/vault";
import {
  getDocuments,
  getVaultMetrics,
  deleteDocument,
} from "@/lib/actions/vault";
import { getAssets } from "@/lib/actions/assets";
import { DocumentCard, formatFileSize } from "@/components/vault/DocumentCard";
import { DocumentTableRow } from "@/components/vault/DocumentTableRow";
import { DocumentPreviewModal } from "@/components/vault/DocumentPreviewModal";
import { UploadDocumentModal } from "@/components/vault/UploadDocumentModal";

type CategoryFilter = "ALL" | DocumentType;

export default function DocumentVaultPage() {
  const [documents, setDocuments] = useState<DocumentWithAsset[]>([]);
  const [metrics, setMetrics] = useState<VaultMetrics | null>(null);
  const [assets, setAssets] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Views
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Modals state
  const [previewDoc, setPreviewDoc] = useState<DocumentWithAsset | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [docsRes, metricsRes, assetsRes] = await Promise.all([
        getDocuments(),
        getVaultMetrics(),
        getAssets(),
      ]);

      if (docsRes.success && docsRes.data) {
        setDocuments(docsRes.data);
      }
      if (metricsRes.success && metricsRes.data) {
        setMetrics(metricsRes.data);
      }
      if (assetsRes.success && Array.isArray(assetsRes.data)) {
        setAssets(
          (assetsRes.data as Array<{ id: string; name: string }>).map((a) => ({
            id: a.id,
            name: a.name,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to load vault data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const res = await deleteDocument(id, true);
      if (res.success) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        // Refresh metrics in background
        getVaultMetrics().then((mRes) => {
          if (mRes.success && mRes.data) setMetrics(mRes.data);
        });
      } else {
        alert(res.error || "Failed to delete document.");
      }
    } catch (err) {
      console.error("Error deleting document:", err);
      alert("An unexpected error occurred while deleting the document.");
    }
  };

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Category filter
      if (selectedCategory !== "ALL" && doc.documentType !== selectedCategory) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = doc.title.toLowerCase().includes(query);
        const matchesType = doc.documentType.toLowerCase().includes(query);
        const matchesLabel = (
          DOCUMENT_TYPE_LABELS[doc.documentType as DocumentType] || ""
        )
          .toLowerCase()
          .includes(query);
        const matchesAsset = doc.asset?.name?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesType && !matchesLabel && !matchesAsset) {
          return false;
        }
      }
      return true;
    });
  }, [documents, selectedCategory, searchQuery]);

  // Dynamic category counts from current documents
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: documents.length };
    for (const t of DOCUMENT_TYPES) {
      counts[t] = 0;
    }
    for (const d of documents) {
      if (counts[d.documentType] !== undefined) {
        counts[d.documentType]++;
      }
    }
    return counts;
  }, [documents]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Ownership Document Vault
            </h1>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              {documents.length} Records
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Secure repository for appliance manuals, invoices, proof of purchase, and insurance policies.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Export Insurance Schedule Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <FileCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Insurance Schedule</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {isExportDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsExportDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 z-30 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                  <a
                    href="/api/vault/insurance-schedule?format=csv"
                    download
                    onClick={() => setIsExportDropdownOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-200 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300 transition-colors"
                  >
                    <Download className="h-4 w-4 text-slate-400" />
                    <div>
                      <div className="font-semibold">Export CSV Schedule</div>
                      <div className="text-[10px] text-slate-400">RFC 4180 spreadsheet</div>
                    </div>
                  </a>
                  <a
                    href="/api/vault/insurance-schedule?format=html"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsExportDropdownOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-200 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300 transition-colors"
                  >
                    <Printer className="h-4 w-4 text-slate-400" />
                    <div>
                      <div className="font-semibold">Print Schedule / PDF</div>
                      <div className="text-[10px] text-slate-400">Executive underwriters report</div>
                    </div>
                  </a>
                </div>
              </>
            )}
          </div>

          {/* Upload Document CTA Button */}
          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total Documents */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <FileText className="h-4 w-4 text-indigo-500" />
            <span>Total Documents</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {metrics?.totalDocuments ?? documents.length}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">Archived in personal vault</p>
        </div>

        {/* Encrypted Files */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Encrypted Files</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {metrics?.encryptedCount ?? documents.filter((d) => d.isEncrypted).length}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">Envelope security active</p>
        </div>

        {/* Covered Assets */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Package className="h-4 w-4 text-sky-500" />
            <span>Covered Assets</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-sky-600 dark:text-sky-400">
            {metrics?.assetsCoveredCount ??
              new Set(documents.map((d) => d.assetId).filter(Boolean)).size}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">Assets with documentation</p>
        </div>

        {/* Vault Storage Used */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <HardDrive className="h-4 w-4 text-amber-500" />
            <span>Storage Used</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {formatFileSize(
              metrics?.totalSizeBytes ??
                documents.reduce((acc, d) => acc + (d.fileSize || 0), 0)
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">Physical filesystem cache</p>
        </div>
      </div>

      {/* Category Filter Pills & Search & View Toggle Toolbar */}
      <div className="space-y-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory("ALL")}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              selectedCategory === "ALL"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            <span>All Documents</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                selectedCategory === "ALL"
                  ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800"
              }`}
            >
              {categoryCounts.ALL}
            </span>
          </button>

          {DOCUMENT_TYPES.map((type) => {
            const isSelected = selectedCategory === type;
            const count = categoryCounts[type] || 0;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedCategory(type)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isSelected
                    ? "bg-indigo-600 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <span>{DOCUMENT_TYPE_LABELS[type]}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar & View Toggle */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents by title, category, or linked asset..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                title="Grid view"
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === "grid"
                    ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                title="Table view"
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === "table"
                    ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {/* Refresh button */}
            <button
              type="button"
              onClick={loadData}
              title="Refresh vault documents"
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors shadow-sm"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Documents Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Loading Document Vault...
          </p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 mb-4">
            <FolderOpen className="h-7 w-7" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {searchQuery || selectedCategory !== "ALL"
              ? "No matching documents found"
              : "Your Document Vault is empty"}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">
            {searchQuery || selectedCategory !== "ALL"
              ? "Try clearing your search or category filters to locate other records."
              : "Securely upload appliance manuals, purchase receipts, warranty cards, or title deeds."}
          </p>
          <div className="mt-5 flex items-center gap-2">
            {(searchQuery || selectedCategory !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("ALL");
                }}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Clear Filters
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Upload Document</span>
            </button>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onPreview={setPreviewDoc}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <th
                    scope="col"
                    className="py-3 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                  >
                    Document Title
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                  >
                    Category
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                  >
                    Associated Asset
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                  >
                    Size
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                  >
                    Uploaded
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                  >
                    Security
                  </th>
                  <th
                    scope="col"
                    className="py-3 pl-3 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDocuments.map((doc) => (
                  <DocumentTableRow
                    key={doc.id}
                    document={doc}
                    onPreview={setPreviewDoc}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        document={previewDoc}
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
      />

      {/* Upload Document Modal */}
      <UploadDocumentModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={loadData}
        assets={assets}
      />
    </div>
  );
}
