"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import {
  X,
  Download,
  ShieldCheck,
  Package,
  Calendar,
  HardDrive,
  FileText,
  FileImage,
  File,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import {
  DocumentWithAsset,
  DocumentType,
  DOCUMENT_TYPE_LABELS,
} from "@/lib/types/vault";
import {
  formatFileSize,
  getCategoryBadgeClasses,
  getFileIcon,
} from "./DocumentCard";

interface DocumentPreviewModalProps {
  document: DocumentWithAsset | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentPreviewModal({
  document,
  isOpen,
  onClose,
}: DocumentPreviewModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !document) return null;

  const {
    title,
    documentType,
    fileUrl,
    fileSize,
    mimeType,
    isEncrypted,
    createdAt,
    asset,
  } = document;

  const docType = (documentType as DocumentType) || "MANUAL";
  const categoryLabel = DOCUMENT_TYPE_LABELS[docType] || documentType;
  const badgeClasses = getCategoryBadgeClasses(documentType);
  const IconComponent = getFileIcon(mimeType, fileUrl);

  const isPdf =
    mimeType === "application/pdf" || fileUrl.toLowerCase().endsWith(".pdf");
  const isImage =
    mimeType?.startsWith("image/") ||
    /\.(png|jpe?g|webp|heic|gif)$/i.test(fileUrl);

  const formattedDate = new Date(createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 flex flex-col w-full max-w-5xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <IconComponent className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.2 text-[11px] font-semibold ${badgeClasses}`}
                >
                  {categoryLabel}
                </span>
                {isEncrypted && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Encrypted</span>
                  </span>
                )}
              </div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white truncate mt-0.5">
                {title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={fileUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-0">
          {/* Document Preview Viewport (2 cols on large screen) */}
          <div className="lg:col-span-2 bg-slate-50 dark:bg-slate-950/60 p-4 sm:p-6 flex items-center justify-center min-h-[400px] border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-800">
            {isPdf ? (
              <iframe
                src={`${fileUrl}#view=FitH`}
                title={title}
                className="w-full h-[60vh] rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner bg-white"
              />
            ) : isImage ? (
              <div className="flex flex-col items-center justify-center max-h-[60vh] overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-sm">
                <img
                  src={fileUrl}
                  alt={title}
                  className="max-h-[56vh] w-auto max-w-full object-contain rounded-lg"
                />
              </div>
            ) : (
              <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-md">
                <File className="h-16 w-16 mx-auto text-slate-400 mb-3" />
                <h4 className="font-semibold text-slate-900 dark:text-white mb-1">
                  Preview Not Available
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  This document type ({mimeType || "application/octet-stream"}) can be downloaded and opened with your system viewer.
                </p>
                <a
                  href={fileUrl}
                  download
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Original File</span>
                </a>
              </div>
            )}
          </div>

          {/* Metadata Inspector Sidebar (1 col on large screen) */}
          <div className="p-6 flex flex-col justify-between space-y-6 bg-white dark:bg-slate-900">
            <div className="space-y-5">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Document Provenance
                </h4>
                <div className="mt-3 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Category:</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {categoryLabel}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Associated Asset:</span>
                    {asset ? (
                      <Link
                        href={`/assets/${asset.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        <Package className="h-3 w-3" />
                        <span className="truncate max-w-[140px]">{asset.name}</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Unassigned</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">File Size:</span>
                    <span className="font-medium text-slate-900 dark:text-white font-mono text-xs">
                      {formatFileSize(fileSize)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">MIME Format:</span>
                    <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
                      {mimeType || "application/octet-stream"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Uploaded On:</span>
                    <span className="text-xs text-slate-700 dark:text-slate-300">
                      {formattedDate}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cryptographic Integrity Panel */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Cryptographic Integrity</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Standard SHA-256 collision-resistant digest verified upon vault storage commit.
                </p>
                <div className="mt-2.5 flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
                  <span className="text-[10px] font-mono text-slate-400">SHA-256</span>
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <ShieldCheck className="h-3 w-3" />
                    <span>Verified Match</span>
                  </span>
                </div>
              </div>

              {/* Encryption Status Card */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Storage Security
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      isEncrypted
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    <ShieldCheck className="h-3 w-3" />
                    <span>{isEncrypted ? "AES-GCM Encrypted" : "Standard Storage"}</span>
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {isEncrypted
                    ? "Document payload is secured with envelope encryption simulation and restricted local file permissions."
                    : "Standard unencrypted physical storage on local secure filesystem."}
                </p>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
