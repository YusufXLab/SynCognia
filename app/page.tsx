import React from "react";
import { MetricCards } from "@/components/dashboard/MetricCards";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { ShieldCheck, AlertTriangle, Clock, ArrowRight, FileText } from "lucide-react";
import Link from "next/link";

const expiringItems = [
  {
    id: "1",
    name: "Sony WH-1000XM5 Headphones",
    category: "Electronics",
    type: "Warranty",
    daysLeft: 12,
    date: "Nov 28, 2026",
    status: "expiring",
  },
  {
    id: "2",
    name: "MacBook Pro M3 Max",
    category: "Computers",
    type: "AppleCare+ Renewal",
    daysLeft: 22,
    date: "Dec 08, 2026",
    status: "expiring",
  },
  {
    id: "3",
    name: "Dyson V15 Vacuum Cleaner",
    category: "Appliances",
    type: "Return Window",
    daysLeft: 4,
    date: "Nov 20, 2026",
    status: "urgent",
  },
];

const recentAssets = [
  {
    id: "a1",
    name: "LG OLED 65\" C4 TV",
    merchant: "Best Buy",
    purchaseDate: "Nov 10, 2026",
    price: "$1,799.99",
    warranty: "2 Years Active",
  },
  {
    id: "a2",
    name: "Breville Barista Touch Espresso Machine",
    merchant: "Amazon",
    purchaseDate: "Oct 24, 2026",
    price: "$899.95",
    warranty: "1 Year Active",
  },
  {
    id: "a3",
    name: "DeWalt 20V Max Cordless Drill Kit",
    merchant: "Home Depot",
    purchaseDate: "Sep 15, 2026",
    price: "$199.00",
    warranty: "3 Years Active",
  },
];

export default function DashboardPage() {
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
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            System Healthy
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <MetricCards />

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
            <Link
              href="/warranties"
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {expiringItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg ${
                      item.status === "urgent"
                        ? "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                        : "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
                    }`}
                  >
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-900 dark:text-white">
                      {item.name}
                    </h4>
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
                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                    }`}
                  >
                    {item.daysLeft} days left
                  </span>
                  <p className="mt-0.5 text-[11px] text-slate-400">{item.date}</p>
                </div>
              </div>
            ))}
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
            {recentAssets.map((asset) => (
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
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
