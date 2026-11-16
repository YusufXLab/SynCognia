"use client";

import React from "react";
import Link from "next/link";
import {
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
import {
  formatFileSize,
  getCategoryBadgeClasses,
  getFileIcon,
} from "./DocumentCard";

interface DocumentTableRowProps {
  document: DocumentWithAsset;
  onPreview: (doc: DocumentWithAsset) => void;
  onDelete: (id: string) => void;
}

export function DocumentTableRow({
  document,
  onPreview,
  onDelete,
}: DocumentTableRowProps) {
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
    <tr className="border-b border-slate-100 hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/40 transition-colors">
      {/* Title & Icon */}
      <td className="py-3.5 pl-4 pr-3 text-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <IconComponent className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span
              onClick={() => onPreview(document)}
              className="cursor-pointer font-medium text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400 block truncate max-w-xs transition-colors"
              title={title}
            >
              {title}
            </span>
            <span className="text-xs text-slate-400 md:hidden block">
              {formatFileSize(fileSize)} &bull; {formattedDate}
            </span>
          </div>
        </div>
      </td>

      {/* Category */}
      <td className="px-3 py-3.5 text-xs whitespace-nowrap">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-medium ${badgeClasses}`}
        >
          {categoryLabel}
        </span>
      </td>

      {/* Associated Asset */}
      <td className="px-3 py-3.5 text-xs text-slate-600 dark:text-slate-300">
        {asset ? (
          <Link
            href={`/assets/${asset.id}`}
            className="inline-flex items-center gap-1.5 font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:underline"
          >
            <Package className="h-3 w-3 text-slate-400" />
            <span className="truncate max-w-[160px]">{asset.name}</span>
          </Link>
        ) : (
          <span className="text-slate-400 italic">Unassigned</span>
        )}
      </td>

      {/* File Size */}
      <td className="px-3 py-3.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
        {formatFileSize(fileSize)}
      </td>

      {/* Date */}
      <td className="px-3 py-3.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
        {formattedDate}
      </td>

      {/* Security */}
      <td className="px-3 py-3.5 text-xs whitespace-nowrap">
        {isEncrypted ? (
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Encrypted</span>
          </span>
        ) : (
          <span className="text-slate-400">Standard</span>
        )}
      </td>

      {/* Actions */}
      <td className="py-3.5 pl-3 pr-4 text-right text-xs whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => onPreview(document)}
            title="Preview document"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>

          <a
            href={fileUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            title="Download document file"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
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
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:hover:border-rose-900 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}
