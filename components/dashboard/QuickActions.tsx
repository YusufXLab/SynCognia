"use client";

import React from "react";
import Link from "next/link";
import { PlusCircle, UploadCloud, CalendarPlus, FileCheck } from "lucide-react";

export function QuickActions() {
  return (
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

        <Link
          href="/warranties"
          className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-slate-700"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-600 text-white shadow-sm">
            <FileCheck className="h-5 w-5" />
          </div>
          <span className="mt-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
            Claim Dossier
          </span>
          <span className="text-[11px] text-slate-500">1-click export</span>
        </Link>
      </div>
    </div>
  );
}
