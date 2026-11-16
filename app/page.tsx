import React from "react";
import { MetricCards } from "@/components/dashboard/MetricCards";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { ShieldCheck, AlertTriangle, Clock, ArrowRight, FileText, Package, Wrench } from "lucide-react";
import Link from "next/link";
import { getDashboardData } from "@/lib/actions/dashboard";

export default async function DashboardPage() {
  const result = await getDashboardData();
  const dashboard = result.success ? result.data : undefined;

  const metrics = dashboard?.metrics;
  const upcomingDeadlines = dashboard?.upcomingDeadlines ?? [];
  const recentAssets = dashboard?.recentAssets ?? [];

  return (
    <div className="space-y-6">
      {/* Top Welcome Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Asset Intelligence Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time status of your purchases, active warranties, and upcoming deadlines.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {metrics?.pendingMaintenanceCount !== undefined && metrics.pendingMaintenanceCount > 0 ? (
            <Link
              href="/maintenance"
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
            >
              <Wrench className="h-3.5 w-3.5" />
              {metrics.pendingMaintenanceCount} {metrics.pendingMaintenanceCount === 1 ? "Service" : "Services"} Due
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              System Healthy
            </span>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <MetricCards metrics={metrics} />

      {/* Quick Operations Row */}
      <QuickActions />

      {/* Main Grid: Deadlines & Recent Activities */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Urgent Deadlines & Expirations */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Upcoming Deadlines
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/warranties"
                className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                Warranties
              </Link>
              <Link
                href="/maintenance"
                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
              >
                Maintenance <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {upcomingDeadlines.length === 0 ? (
              <div className="py-8 text-center">
                <ShieldCheck className="mx-auto h-8 w-8 text-emerald-500" />
                <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  No upcoming deadlines
                </p>
                <p className="text-[11px] text-slate-500">
                  All warranties, return windows, and maintenance schedules are comfortably active.
                </p>
              </div>
            ) : (
              upcomingDeadlines.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg ${
                        item.type === "Service Schedule"
                          ? "bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
                          : item.status === "urgent"
                          ? "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                          : "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
                      }`}
                    >
                      {item.type === "Service Schedule" ? (
                        <Wrench className="h-4 w-4" />
                      ) : (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <Link
                        href={item.link}
                        className="text-sm font-medium text-slate-900 transition-colors hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
                      >
                        {item.name}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {item.category} • {item.type}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        item.status === "urgent"
                          ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                          : item.status === "expiring"
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                          : "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                      }`}
                    >
                      {item.daysLeft < 0
                        ? `${Math.abs(item.daysLeft)}d overdue`
                        : item.daysLeft === 0
                        ? "Due today"
                        : `${item.daysLeft} days left`}
                    </span>
                    <p className="mt-0.5 text-[11px] text-slate-400">{item.date}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recently Ingested Assets */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Recently Added Assets
              </h3>
            </div>
            <Link
              href="/assets"
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              View catalog <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {recentAssets.length === 0 ? (
              <div className="py-8 text-center">
                <Package className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  No assets found
                </p>
                <p className="text-[11px] text-slate-500">
                  Scan receipts or add assets to start tracking.
                </p>
              </div>
            ) : (
              recentAssets.map((asset) => (
                <div key={asset.id} className="flex items-center justify-between py-3">
                  <div>
                    <h4 className="text-sm font-medium text-slate-900 dark:text-white">
                      {asset.name}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {asset.merchant} • {asset.purchaseDate}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {asset.price}
                    </div>
                    <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {asset.warranty}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
