"use client";

import React from "react";
import { Package, ShieldCheck, Clock, RotateCcw, Wrench } from "lucide-react";
import { DashboardMetrics } from "@/lib/actions/dashboard";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  badge?: {
    text: string;
    variant: "emerald" | "amber" | "indigo" | "rose";
  };
}

function MetricCard({ title, value, subtitle, icon: Icon, badge }: MetricCardProps) {
  const badgeClasses = {
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</span>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {value}
        </div>
        {badge && (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClasses[badge.variant]}`}>
            {badge.text}
          </span>
        )}
      </div>

      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
    </div>
  );
}

interface MetricCardsProps {
  metrics?: DashboardMetrics;
}

export function MetricCards({ metrics }: MetricCardsProps) {
  const totalAssets = metrics?.totalAssets ?? 0;
  const physicalCount = metrics?.physicalCount ?? 0;
  const digitalCount = metrics?.digitalCount ?? 0;
  const activeWarranties = metrics?.activeWarranties ?? 0;
  const coveragePercentage = metrics?.coveragePercentage ?? 0;
  const expiringSoonCount = metrics?.expiringSoonCount ?? 0;
  const activeReturnWindows = metrics?.activeReturnWindows ?? 0;
  const pendingMaintenanceCount = metrics?.pendingMaintenanceCount ?? 0;
  const totalMaintenanceSpent = metrics?.totalMaintenanceSpent ?? 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <MetricCard
        title="Total Registered Assets"
        value={totalAssets}
        subtitle={`${physicalCount} physical • ${digitalCount} digital`}
        icon={Package}
        badge={{ text: "In Inventory", variant: "indigo" }}
      />
      <MetricCard
        title="Active Warranties"
        value={activeWarranties}
        subtitle={`${coveragePercentage}% of current assets covered`}
        icon={ShieldCheck}
        badge={{ text: "Protected", variant: "emerald" }}
      />
      <MetricCard
        title="Expiring Soon (30d)"
        value={expiringSoonCount}
        subtitle="Return windows & warranties"
        icon={Clock}
        badge={{
          text: expiringSoonCount > 0 ? "Action required" : "All Clear",
          variant: expiringSoonCount > 0 ? "amber" : "emerald",
        }}
      />
      <MetricCard
        title="Open Return Windows"
        value={activeReturnWindows}
        subtitle="Active return deadlines"
        icon={RotateCcw}
        badge={{ text: "Decisions", variant: "indigo" }}
      />
      <MetricCard
        title="Pending Maintenance"
        value={pendingMaintenanceCount}
        subtitle={
          totalMaintenanceSpent > 0
            ? `$${totalMaintenanceSpent.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} spent`
            : "Preventive upkeep"
        }
        icon={Wrench}
        badge={{
          text: pendingMaintenanceCount > 0 ? `${pendingMaintenanceCount} due` : "All clear",
          variant: pendingMaintenanceCount > 0 ? "rose" : "emerald",
        }}
      />
    </div>
  );
}
