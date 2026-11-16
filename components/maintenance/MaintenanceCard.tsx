"use client";

import React from "react";
import {
  Wrench,
  Clock,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  CheckCheck,
  Calendar,
  Gauge,
  Pencil,
  Trash2,
  DollarSign,
} from "lucide-react";
import { EnhancedMaintenanceSchedule } from "@/lib/types/maintenance";

interface MaintenanceCardProps {
  schedule: EnhancedMaintenanceSchedule;
  onLogService: (schedule: EnhancedMaintenanceSchedule) => void;
  onEdit: (schedule: EnhancedMaintenanceSchedule) => void;
  onDelete: (id: string) => void;
}

export function MaintenanceCard({
  schedule,
  onLogService,
  onEdit,
  onDelete,
}: MaintenanceCardProps) {
  const {
    id,
    title,
    asset,
    intervalMonths,
    intervalMileage,
    lastServiceDate,
    nextServiceDate,
    lastServiceMileage,
    currentMileage,
    lastServiceCost,
    notes,
    calculatedStatus,
    remainingDays,
    remainingMileage,
    progressPercentage,
  } = schedule;

  // Format date helper
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

  const lastDateFormatted = formatDate(lastServiceDate);
  const nextDateFormatted = formatDate(nextServiceDate);

  // Status badge styling and label
  let statusBadgeClasses =
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
  let statusBadgeText = "Upcoming";
  let StatusIcon = CheckCircle;
  let progressBarColor = "bg-indigo-600";

  switch (calculatedStatus) {
    case "OVERDUE":
      statusBadgeClasses =
        "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
      StatusIcon = AlertTriangle;
      progressBarColor = "bg-rose-500";
      if (remainingDays !== null && remainingDays < 0) {
        const days = Math.abs(remainingDays);
        statusBadgeText = `Overdue by ${days} ${days === 1 ? "day" : "days"}`;
      } else if (remainingMileage !== null && remainingMileage < 0) {
        statusBadgeText = `Overdue by ${Math.abs(remainingMileage).toLocaleString()} mi`;
      } else {
        statusBadgeText = "Overdue";
      }
      break;

    case "DUE":
      statusBadgeClasses =
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
      StatusIcon = Clock;
      progressBarColor = "bg-amber-500";
      if (remainingDays !== null && remainingDays >= 0 && remainingDays <= 14) {
        statusBadgeText =
          remainingDays === 0
            ? "Due Today"
            : `Due in ${remainingDays} ${remainingDays === 1 ? "day" : "days"}`;
      } else if (remainingMileage !== null && remainingMileage >= 0 && remainingMileage <= 500) {
        statusBadgeText = `Due in ${remainingMileage.toLocaleString()} mi`;
      } else {
        statusBadgeText = "Due Soon";
      }
      break;

    case "COMPLETED":
      statusBadgeClasses =
        "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
      StatusIcon = CheckCheck;
      statusBadgeText = "Completed";
      progressBarColor = "bg-slate-400";
      break;

    case "UPCOMING":
    default:
      statusBadgeClasses =
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
      StatusIcon = CheckCircle;
      statusBadgeText = nextDateFormatted ? `Due on ${nextDateFormatted}` : "Upcoming";
      progressBarColor = "bg-emerald-600";
      break;
  }

  // Mileage progress details
  const hasMileageTracking = intervalMileage && intervalMileage > 0;
  const mileageDriven =
    currentMileage !== null && currentMileage !== undefined && lastServiceMileage !== null && lastServiceMileage !== undefined
      ? Math.max(0, currentMileage - lastServiceMileage)
      : null;

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div>
        {/* Asset Header Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                {asset?.name || "Unassigned Asset"}
              </span>
              {asset?.category && (
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {asset.category}
                </span>
              )}
            </div>
            {(asset?.brand || asset?.modelNumber) && (
              <p className="mt-0.5 truncate text-[11px] text-slate-400 dark:text-slate-500">
                {[asset.brand, asset.modelNumber].filter(Boolean).join(" • ")}
              </p>
            )}
          </div>

          {/* Status Badge */}
          <span
            className={`inline-flex items-center gap-1.5 shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-xs ${statusBadgeClasses}`}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            <span>{statusBadgeText}</span>
          </span>
        </div>

        {/* Schedule Title */}
        <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
          {title}
        </h3>

        {/* Interval Pills */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {intervalMonths && intervalMonths > 0 && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50/70 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
              <Calendar className="h-3.5 w-3.5 text-indigo-500" />
              <span>
                Every {intervalMonths} {intervalMonths === 1 ? "month" : "months"}
              </span>
            </span>
          )}

          {hasMileageTracking && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-sky-50/70 px-2.5 py-1 text-xs font-medium text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
              <Gauge className="h-3.5 w-3.5 text-sky-500" />
              <span>Every {intervalMileage.toLocaleString()} mi</span>
            </span>
          )}
        </div>

        {/* Mileage Progress Bar */}
        {hasMileageTracking && (
          <div className="mt-3.5">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span>Mileage Interval</span>
              <span>
                {mileageDriven !== null
                  ? `${mileageDriven.toLocaleString()} / ${intervalMileage.toLocaleString()} mi`
                  : remainingMileage !== null
                  ? `${remainingMileage.toLocaleString()} mi left`
                  : `${intervalMileage.toLocaleString()} mi`}
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-300 ${progressBarColor}`}
                style={{
                  width: `${Math.min(100, Math.max(0, progressPercentage ?? 0))}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Historical Metadata */}
        <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800/80 dark:text-slate-400">
          <div className="flex items-center justify-between">
            <span>Last Done:</span>
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {lastDateFormatted || "Never"}
            </span>
          </div>
          {lastServiceCost !== null && lastServiceCost !== undefined && (
            <div className="mt-1 flex items-center justify-between">
              <span>Last Cost:</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">
                ${Number(lastServiceCost).toFixed(2)}
              </span>
            </div>
          )}
          {notes && (
            <p className="mt-2 line-clamp-2 text-[11px] italic text-slate-400 dark:text-slate-500">
              &ldquo;{notes}&rdquo;
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons Footer */}
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <button
          type="button"
          onClick={() => onLogService(schedule)}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-indigo-700"
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>Log Service</span>
        </button>

        <button
          type="button"
          onClick={() => onEdit(schedule)}
          title="Edit Schedule"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-xs transition-all hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Pencil className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => onDelete(id)}
          title="Delete Schedule"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-xs transition-all hover:bg-rose-50 hover:text-rose-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
