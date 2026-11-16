"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Printer,
  Copy,
  Check,
  FileText,
  ShieldCheck,
  Package,
  Calendar,
  AlertCircle,
  ExternalLink,
  Loader2,
  FileCheck,
  Mail,
  Receipt,
  Download,
} from "lucide-react";
import { ClaimDossierData } from "@/lib/services/claimDossier";

interface ClaimDossierModalProps {
  assetId: string | null;
  isOpen: boolean;
  onClose: () => void;
  assetName?: string;
}

export function ClaimDossierModal({
  assetId,
  isOpen,
  onClose,
  assetName,
}: ClaimDossierModalProps) {
  const [dossier, setDossier] = useState<ClaimDossierData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && assetId) {
      setIsLoading(true);
      setError(null);
      fetch(`/api/claim-dossier/${assetId}?format=json`)
        .then(async (res) => {
          const json = await res.json();
          if (!res.ok || !json.success) {
            throw new Error(json.error || "Failed to generate claim dossier");
          }
          setDossier(json.dossier);
        })
        .catch((err) => {
          console.error("Failed to fetch claim dossier:", err);
          setError(err.message || "Failed to load claim dossier");
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setDossier(null);
      setError(null);
    }
  }, [isOpen, assetId]);

  if (!isOpen) return null;

  const handleCopyLetter = () => {
    if (dossier?.draftedLetter) {
      const fullText = `Subject: ${dossier.draftedLetter.subject}\n\n${dossier.draftedLetter.body}`;
      navigator.clipboard.writeText(fullText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

  const formattedDate = dossier
    ? new Date(dossier.generatedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const printUrl = assetId ? `/api/claim-dossier/${assetId}?format=html` : "#";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-10 flex flex-col w-full max-w-5xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
              <FileCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  1-Click Warranty Claim Dossier
                </span>
                {dossier && (
                  <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-400 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900">
                    {dossier.dossierId}
                  </span>
                )}
              </div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white truncate mt-0.5">
                {dossier?.asset ? dossier.asset.name : assetName || "Claim Packet"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {dossier && (
              <a
                href={printUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Dossier / PDF</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Generating Claim Dossier Packet...
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Compiling hardware specs, warranty terms, proof of purchase, and formal RMA request letter.
              </p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-6 text-center dark:border-rose-900 dark:bg-rose-950/30">
              <AlertCircle className="h-10 w-10 mx-auto text-rose-600 dark:text-rose-400 mb-2" />
              <h3 className="text-sm font-semibold text-rose-900 dark:text-rose-200">
                Failed to Generate Claim Dossier
              </h3>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 max-w-md mx-auto">
                {error}
              </p>
            </div>
          ) : dossier ? (
            <>
              {/* Claimant & Overview Subheader */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-300">
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">Claimant: </span>
                  <span>{dossier.claimant.name} ({dossier.claimant.email})</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">Generated: </span>
                  <span>{formattedDate}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">Status: </span>
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300">
                    Ready for Filing
                  </span>
                </div>
              </div>

              {/* 2-Column Specs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Hardware Specifications */}
                <div className="rounded-xl border border-slate-200 bg-white p-4.5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-3 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    <Package className="h-4 w-4 text-indigo-500" />
                    <span>Hardware Specification</span>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                    <div>
                      <dt className="text-slate-400">Brand / Make</dt>
                      <dd className="font-semibold text-slate-800 dark:text-slate-200">
                        {dossier.asset.brand || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Model Number</dt>
                      <dd className="font-mono font-medium text-slate-800 dark:text-slate-200">
                        {dossier.asset.modelNumber || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Serial / VIN</dt>
                      <dd className="font-mono font-medium text-indigo-600 dark:text-indigo-400">
                        {dossier.asset.serialNumber || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Purchase Date</dt>
                      <dd className="font-medium text-slate-800 dark:text-slate-200">
                        {dossier.asset.purchaseDate
                          ? new Date(dossier.asset.purchaseDate).toLocaleDateString()
                          : "Not recorded"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Replacement Value</dt>
                      <dd className="font-semibold text-slate-800 dark:text-slate-200">
                        {dossier.asset.purchasePrice
                          ? `$${dossier.asset.purchasePrice.toFixed(2)}`
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Location</dt>
                      <dd className="font-medium text-slate-800 dark:text-slate-200">
                        {dossier.asset.location || "Primary Residence"}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Warranty Coverage Terms */}
                <div className="rounded-xl border border-slate-200 bg-white p-4.5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-3 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    <span>Warranty Coverage Terms</span>
                  </div>
                  {dossier.warranty ? (
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                      <div>
                        <dt className="text-slate-400">Provider</dt>
                        <dd className="font-semibold text-slate-800 dark:text-slate-200">
                          {dossier.warranty.provider}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-400">Coverage Type</dt>
                        <dd className="font-medium text-slate-800 dark:text-slate-200">
                          {dossier.warranty.warrantyType}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-400">Policy / Cert #</dt>
                        <dd className="font-mono font-medium text-slate-800 dark:text-slate-200">
                          {dossier.warranty.policyNumber || "Not Recorded"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-400">Coverage Window</dt>
                        <dd className="font-medium text-slate-800 dark:text-slate-200">
                          {dossier.warranty.endDate
                            ? `Until ${new Date(dossier.warranty.endDate).toLocaleDateString()}`
                            : "Ongoing"}
                        </dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-slate-400">Support Contact</dt>
                        <dd className="font-medium text-indigo-600 dark:text-indigo-400 truncate">
                          {dossier.warranty.supportContact || "Manufacturer Customer Support"}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      No registered warranty on file. Claim letter is prepared using standard consumer warranty protection guidelines.
                    </p>
                  )}
                </div>
              </div>

              {/* Proof of Purchase & Attached Vault Evidence */}
              <div className="rounded-xl border border-slate-200 bg-white p-4.5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    <Receipt className="h-4 w-4 text-sky-500" />
                    <span>Proof of Purchase &amp; Vault Enclosures</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {dossier.attachedDocuments.length + (dossier.proofOfPurchase ? 1 : 0)} Enclosure(s)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Proof of purchase receipt */}
                  <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                      <Receipt className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-900 dark:text-white truncate">
                        {dossier.proofOfPurchase?.merchant || "Purchase Receipt"}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {dossier.proofOfPurchase?.totalAmount
                          ? `$${dossier.proofOfPurchase.totalAmount.toFixed(2)}`
                          : "Verified on file"}
                      </div>
                    </div>
                    {dossier.proofOfPurchase?.fileUrl && (
                      <a
                        href={dossier.proofOfPurchase.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-700 p-1"
                        title="View receipt"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>

                  {/* Vault attached documents */}
                  {dossier.attachedDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/40"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">
                          {doc.title}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {doc.documentType} {doc.isEncrypted && "• Encrypted"}
                        </div>
                      </div>
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-700 p-1"
                        title="View document"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pre-Drafted Formal Claim Letter */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Pre-Drafted Formal Claim Letter
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyLetter}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Letter</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Recipient & Subject Header */}
                <div className="rounded-lg bg-slate-50 p-3 text-xs mb-3 space-y-1 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="font-semibold text-slate-500">To: </span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {dossier.draftedLetter.recipient}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500">Subject: </span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {dossier.draftedLetter.subject}
                    </span>
                  </div>
                </div>

                {/* Preformatted Letter Body */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4 font-serif text-xs leading-relaxed text-slate-800 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-200 whitespace-pre-wrap max-h-72 overflow-y-auto">
                  {dossier.draftedLetter.body}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-6 py-3.5 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="text-[11px] text-slate-400">
            SynCognia Ownership Vault &bull; 1-Click Warranty Claim Dossier Engine
          </div>
          <div className="flex items-center gap-2">
            {dossier && (
              <a
                href={printUrl}
                download
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors inline-flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                <span>Save HTML</span>
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
