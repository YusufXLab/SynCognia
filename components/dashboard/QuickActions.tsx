"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  PlusCircle,
  UploadCloud,
  CalendarPlus,
  FileCheck,
  X,
  Package,
  Loader2,
  FolderLock,
} from "lucide-react";
import { ClaimDossierModal } from "@/components/vault/ClaimDossierModal";
import { getAssets } from "@/lib/actions/assets";

interface AssetQuickItem {
  id: string;
  name: string;
  brand?: string | null;
  category: string;
}

export function QuickActions() {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedAssetName, setSelectedAssetName] = useState<string | undefined>(undefined);
  const [assets, setAssets] = useState<AssetQuickItem[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);

  useEffect(() => {
    if (isPickerOpen && assets.length === 0) {
      setIsLoadingAssets(true);
      getAssets()
        .then((res) => {
          if (res.success && Array.isArray(res.data)) {
            setAssets(
              (res.data as Array<{ id: string; name: string; brand?: string | null; category: string }>).map((a) => ({
                id: a.id,
                name: a.name,
                brand: a.brand,
                category: a.category,
              }))
            );
          }
        })
        .catch((err) => console.error("Failed to load assets for claim dossier picker:", err))
        .finally(() => setIsLoadingAssets(false));
    }
  }, [isPickerOpen, assets.length]);

  const handleSelectAsset = (asset: AssetQuickItem) => {
    setSelectedAssetId(asset.id);
    setSelectedAssetName(asset.name);
    setIsPickerOpen(false);
  };

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          Quick Operations
        </h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Instantly register belongings, scan documents, or package warranty claims.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link
            href="/assets"
            className="flex flex-col items-center justify-center rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 p-4 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50 dark:border-indigo-900/60 dark:bg-indigo-950/20 dark:hover:border-indigo-700"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm">
              <PlusCircle className="h-5 w-5" />
            </div>
            <span className="mt-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
              Register Asset
            </span>
            <span className="text-[11px] text-slate-500">Manual entry</span>
          </Link>

          <Link
            href="/receipts"
            className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-slate-700"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm dark:bg-slate-700">
              <UploadCloud className="h-5 w-5" />
            </div>
            <span className="mt-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
              Scan Receipt
            </span>
            <span className="text-[11px] text-slate-500">AI auto-extract</span>
          </Link>

          <Link
            href="/maintenance"
            className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-slate-700"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
              <CalendarPlus className="h-5 w-5" />
            </div>
            <span className="mt-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
              Add Service
            </span>
            <span className="text-[11px] text-slate-500">Maintenance schedule</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsPickerOpen(true)}
            className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center transition-colors hover:border-amber-400 hover:bg-amber-50/40 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-amber-700 text-left"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-600 text-white shadow-sm">
              <FileCheck className="h-5 w-5" />
            </div>
            <span className="mt-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
              Claim Dossier
            </span>
            <span className="text-[11px] text-slate-500">1-click export</span>
          </button>
        </div>
      </div>

      {/* Asset Selection Modal for Claim Dossier */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsPickerOpen(false)}
          />

          <div className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                  <FileCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    Select Asset for Claim Dossier
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Generate an official warranty packet and RMA request letter.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPickerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              {isLoadingAssets ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-amber-600 mb-2" />
                  <p className="text-xs text-slate-500">Loading registered assets...</p>
                </div>
              ) : assets.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">No active assets registered yet.</p>
                  <Link
                    href="/assets"
                    onClick={() => setIsPickerOpen(false)}
                    className="mt-3 inline-block text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    Register an asset first &rarr;
                  </Link>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {assets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => handleSelectAsset(asset)}
                      className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors hover:border-amber-300 hover:bg-amber-50/40 dark:border-slate-800 dark:bg-slate-850 dark:hover:border-amber-800 dark:hover:bg-amber-950/20"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          {asset.category} {asset.brand && `• ${asset.brand}`}
                        </div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {asset.name}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                        Generate Dossier
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <Link
                  href="/vault"
                  onClick={() => setIsPickerOpen(false)}
                  className="inline-flex items-center gap-1.5 text-indigo-600 hover:underline font-medium"
                >
                  <FolderLock className="h-3.5 w-3.5" />
                  <span>Go to Document Vault</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setIsPickerOpen(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Claim Dossier Modal */}
      <ClaimDossierModal
        assetId={selectedAssetId}
        assetName={selectedAssetName}
        isOpen={!!selectedAssetId}
        onClose={() => {
          setSelectedAssetId(null);
          setSelectedAssetName(undefined);
        }}
      />
    </>
  );
}
