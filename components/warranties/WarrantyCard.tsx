"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  ExternalLink,
  Calendar,
  Phone,
  Mail,
  FileCheck,
  Info,
} from "lucide-react";
import { EnhancedWarranty } from "@/lib/types/deadline";
import { ClaimDossierModal } from "@/components/vault/ClaimDossierModal";

export interface WarrantyAssetSummary {
  id: string;
  name: string;
  category?: string | null;
  brand?: string | null;
  modelNumber?: string | null;
  serialNumber?: string | null;
  purchaseDate?: Date | string | null;
}

export interface WarrantyCardData {
  id: string;
  assetId: string;
  provider: string;
  warrantyType: string;
  durationMonths?: number | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  policyNumber?: string | null;
  supportContact?: string | null;
  claimUrl?: string | null;
  status: string;
  remainingDays: number;
  percentageElapsed: number;
  calculatedStatus: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED";
  asset?: WarrantyAssetSummary | null;
}

interface WarrantyCardProps {
  warranty: EnhancedWarranty<WarrantyCardData>;
}

export function WarrantyCard({ warranty }: WarrantyCardProps) {
  const [isDossierOpen, setIsDossierOpen] = useState(false);

  const {
    id,
    assetId,
    provider,
    warrantyType,
    startDate,
    endDate,
    policyNumber,
    supportContact,
    claimUrl,
    remainingDays,
    percentageElapsed,
    calculatedStatus,
    asset,
  } = warranty;

  const isLifetime = warrantyType === "LIFETIME" || !endDate;

  // Format dates
  const formatDate = (val?: Date | string | null) => {
    if (!val) return null;
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const startFormatted = formatDate(startDate);
  const endFormatted = isLifetime ? "Lifetime" : formatDate(endDate);

  // Status badge styling and text
  let statusBadgeClasses = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
  let statusBadgeText = "Active";
  let progressBarColor = "bg-emerald-500";
  let StatusIcon = ShieldCheck;

  if (isLifetime) {
    statusBadgeClasses = "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800";
    statusBadgeText = "Lifetime Coverage";
    progressBarColor = "bg-indigo-500";
    StatusIcon = ShieldCheck;
  } else if (calculatedStatus === "EXPIRED" || remainingDays < 0) {
    statusBadgeClasses = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
    const daysAgo = Math.abs(remainingDays);
    statusBadgeText = daysAgo === 0 ? "Expired Today" : `Expired (${daysAgo}d ago)`;
    progressBarColor = "bg-rose-500";
    StatusIcon = AlertTriangle;
  } else if (calculatedStatus === "EXPIRING_SOON" || remainingDays <= 30) {
    statusBadgeClasses = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
    statusBadgeText = remainingDays === 0 ? "Expires Today" : `Expiring in ${remainingDays}d`;
    progressBarColor = "bg-amber-500";
    StatusIcon = Clock;
  } else {
    statusBadgeClasses = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
    statusBadgeText = `Active (${remainingDays}d left)`;
    progressBarColor = "bg-emerald-500";
    StatusIcon = ShieldCheck;
  }

  // Parse support contact link
  const renderSupportContact = () => {
    if (!supportContact) {
      return (
        <span className="text-xs text-slate-400 italic">Not specified</span>
      );
    }

    const trimmed = supportContact.trim();
    if (trimmed.includes("@")) {
      return (
        <a
          href={`mailto:${trimmed}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline"
        >
          <Mail className="h-3 w-3" />
          <span className="truncate max-w-[150px]">{trimmed}</span>
        </a>
      );
    }

    const phoneRegex = /^[\d\s+\-().]{7,}$/;
    if (phoneRegex.test(trimmed)) {
      return (
        <a
          href={`tel:${trimmed.replace(/\s+/g, "")}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline"
        >
          <Phone className="h-3 w-3" />
          <span className="truncate max-w-[150px]">{trimmed}</span>
        </a>
      );
    }

    return (
      <span className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-[150px]">
        {trimmed}
      </span>
    );
  };

  const calendarExportUrl = `/api/calendar/export?id=${id}&scope=warranties`;

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div>
        {/* Top Header: Asset Name & Status Badge */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">
              <span>{asset?.category || "Asset"}</span>
              {asset?.brand && (
                <>
                  <span>•</span>
                  <span>{asset.brand}</span>
                </>
              )}
            </div>
            <h3 className="mt-1 text-base font-semibold text-slate-900 dark:text-white line-clamp-1">
              {asset?.name || "Unnamed Asset"}
            </h3>
          </div>

          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClasses}`}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            <span>{statusBadgeText}</span>
          </span>
        </div>

        {/* Provider and Type info */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {provider}
          </span>
          <span className="rounded-md border border-slate-200 px-2 py-0.5 text-slate-600 dark:border-slate-700 dark:text-slate-400">
            {warrantyType}
          </span>
          {policyNumber && (
            <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <FileCheck className="h-3 w-3 text-slate-400" />
              <span>#{policyNumber}</span>
            </span>
          )}
        </div>

        {/* Progress Bar & Timeline */}
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{startFormatted || "Covered"}</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {isLifetime ? "Lifetime" : `${percentageElapsed}% elapsed`}
            </span>
            <span>{endFormatted || "Ongoing"}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full transition-all duration-500 ${progressBarColor}`}
              style={{ width: `${Math.max(3, Math.min(100, percentageElapsed))}%` }}
            />
          </div>
        </div>

        {/* Support & Details Row */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400">Support Contact:</span>
          {renderSupportContact()}
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-5 flex items-center justify-between gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <a
            href={calendarExportUrl}
            download
            title="Add deadline to calendar (.ics)"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Calendar className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            <span>Calendar</span>
          </a>

          <button
            type="button"
            onClick={() => setIsDossierOpen(true)}
            title="Generate 1-click warranty claim dossier packet"
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/70 px-2.5 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/70"
          >
            <FileCheck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>Claim Dossier</span>
          </button>
        </div>

        {claimUrl ? (
          <a
            href={claimUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            <span>Start Claim</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : (
          <span
            className="inline-flex items-center gap-1 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-500 cursor-not-allowed"
            title="No direct claim portal recorded for this warranty"
          >
            <Info className="h-3.5 w-3.5" />
            <span>No Claim URL</span>
          </span>
        )}
      </div>

      {/* Claim Dossier Modal */}
      <ClaimDossierModal
        assetId={assetId}
        assetName={asset?.name}
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
      />
    </div>
  );
}
