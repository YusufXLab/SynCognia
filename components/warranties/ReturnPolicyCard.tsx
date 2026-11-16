"use client";

import React, { useState, useTransition } from "react";
import {
  RotateCcw,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Clock,
  Sparkles,
  Loader2,
} from "lucide-react";
import { updateReturnPolicyStatus } from "@/lib/actions/returnPolicies";
import { EnhancedReturnPolicy } from "@/lib/types/deadline";

export interface ReturnPolicyAssetSummary {
  id: string;
  name: string;
  category?: string | null;
  brand?: string | null;
  modelNumber?: string | null;
  serialNumber?: string | null;
  purchaseDate?: Date | string | null;
}

export interface ReturnPolicyCardData {
  id: string;
  assetId: string;
  returnWindowDays: number;
  returnDeadline?: Date | string | null;
  policyDetails?: string | null;
  returnStatus: string;
  remainingDays: number;
  calculatedStatus: "OPEN" | "EXPIRING_SOON" | "EXPIRED" | "RETURNED";
  asset?: ReturnPolicyAssetSummary | null;
}

interface ReturnPolicyCardProps {
  policy: EnhancedReturnPolicy<ReturnPolicyCardData>;
  onStatusUpdated?: (policyId: string, newStatus: string) => void;
}

export function ReturnPolicyCard({ policy, onStatusUpdated }: ReturnPolicyCardProps) {
  const {
    id,
    returnWindowDays,
    returnDeadline,
    policyDetails,
    remainingDays,
    calculatedStatus,
    asset,
  } = policy;

  const [currentStatus, setCurrentStatus] = useState<string>(calculatedStatus);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isReturned = currentStatus === "RETURNED";
  const isExpired = currentStatus === "EXPIRED" || (!isReturned && remainingDays < 0);
  const isUrgent = !isReturned && !isExpired && remainingDays <= 7;

  // Format deadline date
  const formatDeadline = (val?: Date | string | null) => {
    if (!val) return "Not specified";
    const d = new Date(val);
    if (isNaN(d.getTime())) return "Not specified";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const deadlineFormatted = formatDeadline(returnDeadline);

  // Status Badge styling & text
  let badgeClasses = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
  let badgeText = `${remainingDays} days left to return`;
  let BadgeIcon = Clock;

  if (isReturned) {
    badgeClasses = "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800";
    badgeText = "Returned";
    BadgeIcon = CheckCircle2;
  } else if (isExpired) {
    badgeClasses = "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
    const daysAgo = Math.abs(remainingDays);
    badgeText = daysAgo === 0 ? "Window closed today" : `Window closed (${daysAgo}d ago)`;
    BadgeIcon = AlertCircle;
  } else if (isUrgent) {
    badgeClasses = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
    badgeText = remainingDays === 0 ? "Return today!" : `${remainingDays} day${remainingDays === 1 ? "" : "s"} left to return`;
    BadgeIcon = Clock;
  }

  // Handle Mark as Returned
  const handleMarkAsReturned = () => {
    startTransition(async () => {
      try {
        const result = await updateReturnPolicyStatus(id, "RETURNED");
        if (result.success) {
          setCurrentStatus("RETURNED");
          setFeedbackMessage("Item marked as returned successfully!");
          if (onStatusUpdated) {
            onStatusUpdated(id, "RETURNED");
          }
          setTimeout(() => setFeedbackMessage(null), 4000);
        } else {
          setFeedbackMessage(result.error || "Failed to update return status");
          setTimeout(() => setFeedbackMessage(null), 4000);
        }
      } catch (err) {
        setFeedbackMessage((err as Error).message || "An unexpected error occurred");
        setTimeout(() => setFeedbackMessage(null), 4000);
      }
    });
  };

  const calendarExportUrl = `/api/calendar/export?id=${id}&scope=returns`;

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div>
        {/* Top Header: Asset Info & Countdown Badge */}
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
            className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClasses}`}
          >
            <BadgeIcon className="h-3.5 w-3.5" />
            <span>{badgeText}</span>
          </span>
        </div>

        {/* Return Window Meta */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <RotateCcw className="h-3 w-3 text-slate-500" />
            <span>{returnWindowDays}-Day Window</span>
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            Deadline: <strong className="text-slate-700 dark:text-slate-300">{deadlineFormatted}</strong>
          </span>
        </div>

        {/* Policy Details Notes */}
        {policyDetails ? (
          <div className="mt-3 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
            <p className="line-clamp-2">{policyDetails}</p>
          </div>
        ) : (
          <p className="mt-3 text-xs italic text-slate-400">Standard retailer return terms apply.</p>
        )}

        {/* Feedback Message Banner */}
        {feedbackMessage && (
          <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span>{feedbackMessage}</span>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="mt-5 flex items-center justify-between gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
        <a
          href={calendarExportUrl}
          download
          title="Add return deadline to calendar (.ics)"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <Calendar className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
          <span>Calendar</span>
        </a>

        {isReturned ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Item Returned</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={handleMarkAsReturned}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Mark as Returned</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
