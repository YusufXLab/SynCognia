import React from "react";
import { Package, ShieldCheck, Clock, Wrench } from "lucide-react";

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

export function MetricCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Registered Assets"
        value={24}
        subtitle="18 physical • 6 digital"
        icon={Package}
        badge={{ text: "+4 this month", variant: "indigo" }}
      />
      <MetricCard
        title="Active Warranties"
        value={19}
        subtitle="79% of current assets covered"
        icon={ShieldCheck}
        badge={{ text: "Protected", variant: "emerald" }}
      />
      <MetricCard
        title="Expiring Soon (30d)"
        value={3}
        subtitle="Return windows & warranties"
        icon={Clock}
        badge={{ text: "Action required", variant: "amber" }}
      />
      <MetricCard
        title="Pending Maintenance"
        value={2}
        subtitle="Next: HVAC Filter (in 5d)"
        icon={Wrench}
        badge={{ text: "Scheduled", variant: "indigo" }}
      />
    </div>
  );
}
