"use client";

import React from "react";
import Link from "next/link";
import {
  FileText,
  FileImage,
  File,
  ShieldCheck,
  Eye,
  Download,
  Trash2,
  Package,
} from "lucide-react";
import {
  DocumentWithAsset,
  DocumentType,
  DOCUMENT_TYPE_LABELS,
} from "@/lib/types/vault";

export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function getCategoryBadgeClasses(type: string): string {
  switch (type) {
    case "INVOICE":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
    case "WARRANTY_CARD":
      return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800";
    case "TITLE_DEED":
      return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800";
    case "CERTIFICATE":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
    case "INSURANCE_POLICY":
      return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800";
    case "APPRAISAL":
      return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
    case "MANUAL":
    default:
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
  }
}

export function getFileIcon(mimeType?: string | null, fileUrl?: string) {
  const mime = mimeType || "";
  const url = fileUrl || "";
  if (mime.includes("pdf") || url.toLowerCase().endsWith(".pdf")) {
    return FileText;
  }
  if (mime.includes("image") || /\.(png|jpe?g|webp|heic)$/i.test(url)) {
    return FileImage;
  }
  return File;
}

interface DocumentCardProps {
  document: DocumentWithAsset;
  onPreview: (doc: DocumentWithAsset) => void;
  onDelete: (id: string) => void;
}

export function DocumentCard({ document, onPreview, onDelete }: DocumentCardProps) {
  const {
    id,
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

  const formattedDate = new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div>
        {/* Category Badge & Encryption Indicator */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeClasses}`}
          >
            {categoryLabel}
          </span>
          {isEncrypted && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
              title="Encrypted with simulated AES-GCM"
            >
              <ShieldCheck className="h-3 w-3" />
              <span>Encrypted</span>
            </span>
          )}
        </div>

        {/* Title with MIME Icon */}
        <div className="mt-3.5 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:group-hover:bg-indigo-950/50 dark:group-hover:text-indigo-400 transition-colors">
            <IconComponent className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3
              onClick={() => onPreview(document)}
              className="cursor-pointer font-semibold text-slate-900 line-clamp-2 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400 transition-colors"
              title={title}
            >
              {title}
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              {formatFileSize(fileSize)} &bull; {formattedDate}
            </p>
          </div>
        </div>

        {/* Associated Asset Link */}
        <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 pt-3 dark:border-slate-800">
          <Package className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          {asset ? (
            <Link
              href={`/assets/${asset.id}`}
              className="truncate font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:underline"
              title={`View ${asset.name}`}
            >
              {asset.name}
            </Link>
          ) : (
            <span className="italic text-slate-400">Unassigned / General</span>
          )}
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="mt-5 flex items-center justify-between gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
        <button
          type="button"
          onClick={() => onPreview(document)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <Eye className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
          <span>Preview</span>
        </button>

        <div className="flex items-center gap-1.5">
          <a
            href={fileUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            title="Download document file"
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
          </a>

          <button
            type="button"
            onClick={() => {
              if (confirm(`Are you sure you want to delete "${title}"?`)) {
                onDelete(id);
              }
            }}
            title="Delete document"
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 text-slate-400 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:hover:border-rose-900 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
