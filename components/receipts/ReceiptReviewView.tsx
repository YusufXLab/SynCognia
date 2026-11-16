"use client";

import React, { useState } from "react";
import Image from "next/link";
import Link from "next/link";
import {
  FileText,
  ExternalLink,
  Plus,
  Trash2,
  ShieldCheck,
  RotateCcw,
  MapPin,
  FileCheck2,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  Loader2,
  ZoomIn,
  Sparkles,
} from "lucide-react";
import {
  ExtractedReceiptData,
  ReceiptUploadResult,
  ExtractedReceiptItem,
} from "@/lib/types/receipt";
import { persistExtractedReceipt } from "@/lib/actions/ingest";
import { PersistReceiptItemInput } from "@/lib/validations/ingest";

interface ReceiptReviewViewProps {
  file: ReceiptUploadResult;
  initialData: ExtractedReceiptData;
  onCancel: () => void;
  onSuccess: (assetId: string) => void;
}

export function ReceiptReviewView({
  file,
  initialData,
  onCancel,
  onSuccess,
}: ReceiptReviewViewProps) {
  // Form State
  const [merchant, setMerchant] = useState(initialData.merchant || "");
  const [purchaseDate, setPurchaseDate] = useState(
    initialData.purchaseDate || new Date().toISOString().split("T")[0]
  );
  const [totalAmount, setTotalAmount] = useState(
    initialData.totalAmount !== undefined ? initialData.totalAmount : 0
  );
  const [currency, setCurrency] = useState(initialData.currency || "USD");
  const [location, setLocation] = useState("Home Office");
  const [notes, setNotes] = useState(initialData.rawSummary || "");

  // Items State
  const [items, setItems] = useState<ExtractedReceiptItem[]>(
    initialData.items && initialData.items.length > 0
      ? initialData.items
      : [
          {
            name: `${initialData.merchant || "New"} Item`,
            category: "Electronics",
            price: initialData.totalAmount || 0,
            quantity: 1,
          },
        ]
  );

  // Warranty State
  const [hasWarranty, setHasWarranty] = useState(
    Boolean(initialData.detectedWarranty && initialData.detectedWarranty.durationMonths > 0)
  );
  const [warrantyProvider, setWarrantyProvider] = useState(
    initialData.detectedWarranty?.provider || initialData.merchant || "Manufacturer"
  );
  const [warrantyMonths, setWarrantyMonths] = useState(
    initialData.detectedWarranty?.durationMonths || 12
  );
  const [warrantyType, setWarrantyType] = useState<"MANUFACTURER" | "EXTENDED">(
    initialData.detectedWarranty?.warrantyType || "MANUFACTURER"
  );

  // Return Policy State
  const [hasReturnPolicy, setHasReturnPolicy] = useState(
    Boolean(initialData.returnPolicy && initialData.returnPolicy.windowDays > 0)
  );
  const [returnDays, setReturnDays] = useState(
    initialData.returnPolicy?.windowDays || 30
  );

  // Action status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedAssetId, setSavedAssetId] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  // Computed warranty expiration date
  const calculatedWarrantyEndDate = (() => {
    try {
      const base = new Date(purchaseDate);
      if (isNaN(base.getTime())) return null;
      base.setMonth(base.getMonth() + Number(warrantyMonths));
      return base.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return null;
    }
  })();

  // Computed return deadline date
  const calculatedReturnDeadline = (() => {
    try {
      const base = new Date(purchaseDate);
      if (isNaN(base.getTime())) return null;
      base.setDate(base.getDate() + Number(returnDays));
      return base.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return null;
    }
  })();

  // Item handlers
  const handleItemChange = (index: number, field: keyof ExtractedReceiptItem, value: unknown) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        name: `Additional Item ${prev.length + 1}`,
        category: "Personal",
        price: 0,
        quantity: 1,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Submission handler
  const handleConfirmAndSave = async () => {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const formattedItems: PersistReceiptItemInput[] = items.map((item) => ({
        name: item.name.trim(),
        category: item.category || "Electronics",
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
        brand: item.brand?.trim() || undefined,
        modelNumber: item.modelNumber?.trim() || undefined,
        serialNumber: item.serialNumber?.trim() || undefined,
        suggestedWarrantyMonths: item.suggestedWarrantyMonths,
      }));

      const res = await persistExtractedReceipt({
        fileUrl: file.fileUrl,
        mimeType: file.mimeType,
        merchant: merchant.trim(),
        purchaseDate,
        totalAmount: Number(totalAmount),
        currency,
        rawSummary: notes,
        location,
        notes,
        items: formattedItems,
        warranty: hasWarranty
          ? {
              provider: warrantyProvider,
              durationMonths: Number(warrantyMonths),
              warrantyType,
            }
          : undefined,
        returnPolicy: hasReturnPolicy
          ? {
              returnWindowDays: Number(returnDays),
            }
          : undefined,
      });

      if (!res.success || !res.data) {
        throw new Error(res.error || "Failed to persist receipt data");
      }

      setSavedAssetId(res.data.assetId);
      onSuccess(res.data.assetId);
    } catch (err) {
      console.error("Save error:", err);
      setSubmitError((err as Error).message || "Failed to commit record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success view if already committed
  if (savedAssetId) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-8 text-center dark:border-emerald-900/40 dark:bg-emerald-950/20">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-500/20">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
          Receipt Successfully Ingested!
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Created new Asset, linked original Receipt document, and configured intelligent tracking policies.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/assets"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
          >
            <span>View in Assets Catalog</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <Sparkles className="h-4 w-4 text-indigo-500" />
            Scan Another Receipt
          </button>
        </div>
      </div>
    );
  }

  const isPdf = file.mimeType === "application/pdf";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            <FileCheck2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Verify Extracted Information
            </h2>
            <p className="text-xs text-slate-500">
              Review AI extractions before committing atomically to your personal inventory.
            </p>
          </div>
        </div>

        <div className="mt-2 sm:mt-0 flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleConfirmAndSave}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Confirm & Add to Inventory</span>
              </>
            )}
          </button>
        </div>
      </div>

      {submitError && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Side-by-Side Review Grid */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Original Document Preview */}
        <div className="lg:col-span-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Receipt Preview
            </h3>
            <a
              href={file.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              <span>Open Raw</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="mt-2.5 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
            {isPdf ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <FileText className="h-16 w-16 text-indigo-500" />
                <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                  {file.fileName}
                </p>
                <p className="text-xs text-slate-500">PDF Document ({Math.round(file.size / 1024)} KB)</p>
                <a
                  href={file.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700"
                >
                  View Full PDF
                </a>
              </div>
            ) : (
              <div className="relative group">
                {/* Image preview */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={file.fileUrl}
                  alt="Receipt Preview"
                  className={`w-full object-contain transition-all ${
                    isZoomed ? "max-h-[700px] cursor-zoom-out" : "max-h-[460px] cursor-zoom-in"
                  }`}
                  onClick={() => setIsZoomed(!isZoomed)}
                />
                <button
                  type="button"
                  onClick={() => setIsZoomed(!isZoomed)}
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg bg-slate-900/80 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur hover:bg-slate-900"
                >
                  <ZoomIn className="h-3 w-3" />
                  <span>{isZoomed ? "Shrink" : "Zoom"}</span>
                </button>
              </div>
            )}

            <div className="border-t border-slate-200 bg-white p-3 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex justify-between">
                <span>SHA-256 Hash:</span>
                <span className="font-mono text-[10px] truncate max-w-[180px]">{file.hash}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Edit Form */}
        <div className="space-y-5 lg:col-span-7">
          {/* Metadata Section */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Purchase Overview
            </h4>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Merchant / Store
                </label>
                <input
                  type="text"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  placeholder="e.g. Best Buy, Apple"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Purchase Date
                </label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Total Amount
                </label>
                <div className="mt-1 flex rounded-lg shadow-sm">
                  <span className="inline-flex items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-100 px-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800">
                    {currency}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-r-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="AUD">AUD ($)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="INR">INR (₹)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Line Items Section */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Purchased Items ({items.length})
              </h4>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <div className="sm:col-span-6">
                        <label className="text-[10px] font-medium text-slate-500">Item Name</label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleItemChange(idx, "name", e.target.value)}
                          className="w-full rounded border border-slate-300 px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          placeholder="e.g. MacBook Pro 16"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="text-[10px] font-medium text-slate-500">Category</label>
                        <select
                          value={item.category}
                          onChange={(e) => handleItemChange(idx, "category", e.target.value)}
                          className="w-full rounded border border-slate-300 px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        >
                          <option value="Electronics">Electronics</option>
                          <option value="Appliances">Appliances</option>
                          <option value="Vehicles">Vehicles</option>
                          <option value="Tools">Tools</option>
                          <option value="Furniture">Furniture</option>
                          <option value="Personal">Personal</option>
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="text-[10px] font-medium text-slate-500">Price</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.price}
                          onChange={(e) => handleItemChange(idx, "price", parseFloat(e.target.value) || 0)}
                          className="w-full rounded border border-slate-300 px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label className="text-[10px] font-medium text-slate-500">Brand</label>
                        <input
                          type="text"
                          value={item.brand || ""}
                          onChange={(e) => handleItemChange(idx, "brand", e.target.value)}
                          className="w-full rounded border border-slate-300 px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          placeholder="e.g. Apple"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label className="text-[10px] font-medium text-slate-500">Model #</label>
                        <input
                          type="text"
                          value={item.modelNumber || ""}
                          onChange={(e) => handleItemChange(idx, "modelNumber", e.target.value)}
                          className="w-full rounded border border-slate-300 px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          placeholder="e.g. A2485"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label className="text-[10px] font-medium text-slate-500">Serial #</label>
                        <input
                          type="text"
                          value={item.serialNumber || ""}
                          onChange={(e) => handleItemChange(idx, "serialNumber", e.target.value)}
                          className="w-full rounded border border-slate-300 px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          placeholder="Optional"
                        />
                      </div>
                    </div>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="mt-4 rounded p-1 text-slate-400 hover:text-red-600 transition"
                        title="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Warranty & Return Policies Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Warranty Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    Warranty Policy
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={hasWarranty}
                  onChange={(e) => setHasWarranty(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
              </div>

              {hasWarranty && (
                <div className="mt-3 space-y-2.5">
                  <div>
                    <label className="text-[10px] font-medium text-slate-500">Provider</label>
                    <input
                      type="text"
                      value={warrantyProvider}
                      onChange={(e) => setWarrantyProvider(e.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-medium text-slate-500">Duration (Mo)</label>
                      <input
                        type="number"
                        min="1"
                        value={warrantyMonths}
                        onChange={(e) => setWarrantyMonths(parseInt(e.target.value) || 0)}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-slate-500">Type</label>
                      <select
                        value={warrantyType}
                        onChange={(e) => setWarrantyType(e.target.value as "MANUFACTURER" | "EXTENDED")}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      >
                        <option value="MANUFACTURER">Manufacturer</option>
                        <option value="EXTENDED">Extended</option>
                      </select>
                    </div>
                  </div>

                  {calculatedWarrantyEndDate && (
                    <div className="rounded bg-indigo-50 p-2 text-[11px] text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                      <span>Expires: </span>
                      <span className="font-semibold">{calculatedWarrantyEndDate}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Return Policy Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <RotateCcw className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    Return Window
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={hasReturnPolicy}
                  onChange={(e) => setHasReturnPolicy(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
              </div>

              {hasReturnPolicy && (
                <div className="mt-3 space-y-2.5">
                  <div>
                    <label className="text-[10px] font-medium text-slate-500">Window (Days)</label>
                    <input
                      type="number"
                      min="1"
                      value={returnDays}
                      onChange={(e) => setReturnDays(parseInt(e.target.value) || 0)}
                      className="w-full rounded border border-slate-300 px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  {calculatedReturnDeadline && (
                    <div className="rounded bg-emerald-50 p-2 text-[11px] text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <span>Deadline: </span>
                      <span className="font-semibold">{calculatedReturnDeadline}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Location & Placement */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Storage / Physical Location
                </label>
                <div className="mt-1 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="Home Office">Home Office</option>
                    <option value="Living Room">Living Room</option>
                    <option value="Kitchen">Kitchen</option>
                    <option value="Master Bedroom">Master Bedroom</option>
                    <option value="Garage">Garage</option>
                    <option value="Workshop">Workshop</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Notes / AI Summary
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  placeholder="Optional notes or summary"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
