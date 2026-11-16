"use client";

import React from "react";
import {
  Calendar,
  Gauge,
  DollarSign,
  FileText,
  User,
  Wrench,
  CheckCircle2,
  ExternalLink,
  Clock,
} from "lucide-react";

export interface HistoryLogItem {
  id: string;
  maintenanceScheduleId?: string | null;
  assetId: string;
  title: string;
  serviceDate: Date | string;
  mileage?: number | null;
  cost?: number | null;
  serviceProvider?: string | null;
  notes?: string | null;
  receiptUrl?: string | null;
  createdAt?: Date | string;
  asset?: {
    id: string;
    name: string;
    category?: string | null;
    brand?: string | null;
    modelNumber?: string | null;
  } | null;
  maintenanceSchedule?: {
    id: string;
    title: string;
  } | null;
}

interface MaintenanceHistoryTimelineProps {
  logs: HistoryLogItem[];
  onRefresh?: () => void;
}

export function MaintenanceHistoryTimeline({
  logs,
  onRefresh,
}: MaintenanceHistoryTimelineProps) {
  const formatDate = (val?: Date | string | null) => {
    if (!val) return "Unknown Date";
    const d = new Date(val);
    if (isNaN(d.getTime())) return "Unknown Date";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!logs || logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
          <Clock className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">
          No Service History Logged Yet
        </h3>
        <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
          Complete scheduled maintenance tasks or log past repairs to automatically build your chronological service timeline.
        </p>
      </div>
    );
  }

  return (
    <div className="relative space-y-6 before:absolute before:bottom-4 before:left-3 before:top-4 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800 sm:before:left-3.5">
      {logs.map((log) => {
        const dateStr = formatDate(log.serviceDate);

        return (
          <div key={log.id} className="relative flex items-start gap-4 pl-8 sm:gap-6 sm:pl-10">
            {/* Timeline Node Dot */}
            <div className="absolute left-1 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-white dark:ring-slate-900 sm:left-1.5 sm:h-5 sm:w-5">
              <CheckCircle2 className="h-3 w-3 text-white sm:h-3.5 sm:w-3.5" />
            </div>

            {/* Service Log Card */}
            <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs transition-all hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      {dateStr}
                    </span>
                    {log.asset && (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {log.asset.name}
                        {log.asset.category ? ` • ${log.asset.category}` : ""}
                      </span>
                    )}
                  </div>
                  <h4 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                    {log.title}
                  </h4>
                </div>

                {/* Metadata Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {log.cost !== null && log.cost !== undefined && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>${Number(log.cost).toFixed(2)}</span>
                    </span>
                  )}

                  {log.mileage !== null && log.mileage !== undefined && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
                      <Gauge className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                      <span>{log.mileage.toLocaleString()} mi</span>
                    </span>
                  )}

                  {log.serviceProvider && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <User className="h-3.5 w-3.5 text-slate-500" />
                      <span>{log.serviceProvider}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Notes Block */}
              {log.notes && (
                <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-950/60 dark:text-slate-300">
                  <p className="whitespace-pre-line leading-relaxed">{log.notes}</p>
                </div>
              )}

              {/* Receipt Attachment Link */}
              {log.receiptUrl && (
                <div className="mt-3 flex items-center justify-end border-t border-slate-100 pt-2.5 dark:border-slate-800">
                  <a
                    href={log.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <FileText className="h-3.5 w-3.5 text-indigo-500" />
                    <span>View Receipt Attachment</span>
                    <ExternalLink className="h-3 w-3 text-slate-400" />
                  </a>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
