"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Clock,
  RotateCcw,
  Calendar,
  Search,
  RefreshCw,
  XCircle,
  FileQuestion,
  CheckCircle,
  AlertOctagon,
} from "lucide-react";
import { WarrantyCard, WarrantyCardData } from "@/components/warranties/WarrantyCard";
import { ReturnPolicyCard, ReturnPolicyCardData } from "@/components/warranties/ReturnPolicyCard";
import { getWarranties } from "@/lib/actions/warranties";
import { getReturnPolicies } from "@/lib/actions/returnPolicies";
import { EnhancedWarranty, EnhancedReturnPolicy } from "@/lib/types/deadline";

type TabFilter = "ALL" | "ACTIVE" | "EXPIRING" | "RETURNS" | "EXPIRED";

export default function WarrantiesHubPage() {
  const [warranties, setWarranties] = useState<EnhancedWarranty<WarrantyCardData>[]>([]);
  const [returnPolicies, setReturnPolicies] = useState<EnhancedReturnPolicy<ReturnPolicyCardData>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSyncing, startSyncTransition] = useTransition();
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Fetch all warranties and return policies
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [wRes, rRes] = await Promise.all([
        getWarranties(),
        getReturnPolicies(),
      ]);

      if (wRes.success && wRes.data) {
        setWarranties(wRes.data as EnhancedWarranty<WarrantyCardData>[]);
      }
      if (rRes.success && rRes.data) {
        setReturnPolicies(rRes.data as EnhancedReturnPolicy<ReturnPolicyCardData>[]);
      }
    } catch (err) {
      console.error("Failed to load warranties and return policies:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Synchronize deadline statuses with physical calendar
  const handleRefreshStatuses = () => {
    startSyncTransition(async () => {
      try {
        const response = await fetch("/api/warranties/sync", { method: "POST" });
        const res = await response.json();
        if (res.success) {
          setSyncFeedback(
            `Synchronized ${res.syncResult?.warrantiesChecked ?? 0} warranties and ${
              res.syncResult?.returnsChecked ?? 0
            } return policies.`
          );
          await loadData();
          setTimeout(() => setSyncFeedback(null), 4000);
        } else {
          setSyncFeedback("Sync completed with warnings.");
          setTimeout(() => setSyncFeedback(null), 4000);
        }
      } catch (err) {
        setSyncFeedback("Failed to synchronize statuses. Please retry.");
        setTimeout(() => setSyncFeedback(null), 4000);
      }
    });
  };

  const handleReturnPolicyUpdated = (policyId: string, newStatus: string) => {
    setReturnPolicies((prev) =>
      prev.map((p) =>
        p.id === policyId
          ? {
              ...p,
              returnStatus: newStatus,
              calculatedStatus: newStatus as any,
              isOpen: false,
              isExpiringSoon: false,
              isExpired: false,
            }
          : p
      )
    );
  };

  // Compute Summary Metrics
  const metrics = useMemo(() => {
    const activeWarranties = warranties.filter((w) => w.calculatedStatus === "ACTIVE").length;
    const expiringSoonWarranties = warranties.filter(
      (w) => w.calculatedStatus === "EXPIRING_SOON"
    ).length;
    const expiringSoonReturns = returnPolicies.filter(
      (p) => p.calculatedStatus === "EXPIRING_SOON" && p.returnStatus !== "RETURNED"
    ).length;
    const openReturns = returnPolicies.filter(
      (p) =>
        (p.calculatedStatus === "OPEN" || p.calculatedStatus === "EXPIRING_SOON") &&
        p.returnStatus !== "RETURNED"
    ).length;
    const expiredWarranties = warranties.filter((w) => w.calculatedStatus === "EXPIRED").length;
    const expiredReturns = returnPolicies.filter(
      (p) => p.calculatedStatus === "EXPIRED" && p.returnStatus !== "RETURNED"
    ).length;

    return {
      activeWarranties,
      expiringSoon: expiringSoonWarranties + expiringSoonReturns,
      openReturns,
      expired: expiredWarranties + expiredReturns,
    };
  }, [warranties, returnPolicies]);

  // Unified Filter and Search
  const query = searchQuery.trim().toLowerCase();

  const filteredWarranties = useMemo(() => {
    return warranties.filter((w) => {
      // Tab matching
      if (activeTab === "ACTIVE" && w.calculatedStatus !== "ACTIVE") return false;
      if (activeTab === "EXPIRING" && w.calculatedStatus !== "EXPIRING_SOON") return false;
      if (activeTab === "EXPIRED" && w.calculatedStatus !== "EXPIRED") return false;
      if (activeTab === "RETURNS") return false; // warranties not shown in Returns tab

      // Search matching
      if (!query) return true;
      const assetName = w.asset?.name?.toLowerCase() || "";
      const provider = w.provider?.toLowerCase() || "";
      const brand = w.asset?.brand?.toLowerCase() || "";
      const policyNumber = w.policyNumber?.toLowerCase() || "";
      const model = w.asset?.modelNumber?.toLowerCase() || "";

      return (
        assetName.includes(query) ||
        provider.includes(query) ||
        brand.includes(query) ||
        policyNumber.includes(query) ||
        model.includes(query)
      );
    });
  }, [warranties, activeTab, query]);

  const filteredReturnPolicies = useMemo(() => {
    return returnPolicies.filter((p) => {
      // Tab matching
      if (activeTab === "ACTIVE") return false; // return policies not shown in Active Warranties tab
      if (activeTab === "EXPIRING" && p.calculatedStatus !== "EXPIRING_SOON") return false;
      if (activeTab === "EXPIRED" && p.calculatedStatus !== "EXPIRED") return false;
      // In RETURNS tab or ALL tab, return policies are shown

      // Search matching
      if (!query) return true;
      const assetName = p.asset?.name?.toLowerCase() || "";
      const brand = p.asset?.brand?.toLowerCase() || "";
      const details = p.policyDetails?.toLowerCase() || "";
      const model = p.asset?.modelNumber?.toLowerCase() || "";

      return (
        assetName.includes(query) ||
        brand.includes(query) ||
        details.includes(query) ||
        model.includes(query)
      );
    });
  }, [returnPolicies, activeTab, query]);

  const totalFilteredCount = filteredWarranties.length + filteredReturnPolicies.length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Warranties & Expirations Hub
            </h1>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              {warranties.length + returnPolicies.length} Active Records
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Track warranty coverage, impending expirations, return deadlines, and sync with your personal calendar.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRefreshStatuses}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-indigo-600" : ""}`} />
            <span>{isSyncing ? "Syncing..." : "Refresh Statuses"}</span>
          </button>

          <a
            href="/api/calendar/export"
            download="syncognia-deadlines.ics"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-indigo-700"
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Export All Deadlines (.ics)</span>
          </a>
        </div>
      </div>

      {/* Sync Feedback Toast */}
      {syncFeedback && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Active Warranties */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Warranties
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {metrics.activeWarranties}
          </div>
          <p className="mt-1 text-xs text-slate-500">Fully covered under warranty</p>
        </div>

        {/* Metric 2: Expiring Soon */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Expiring Soon (30d)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {metrics.expiringSoon}
          </div>
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Immediate action advised</p>
        </div>

        {/* Metric 3: Open Return Windows */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Open Return Windows
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <RotateCcw className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {metrics.openReturns}
          </div>
          <p className="mt-1 text-xs text-slate-500">Eligible for return or refund</p>
        </div>

        {/* Metric 4: Expired Items */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Expired Items
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <AlertOctagon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {metrics.expired}
          </div>
          <p className="mt-1 text-xs text-slate-500">Coverage or return past deadline</p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar Row */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        {/* Interactive Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "ALL"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            All ({warranties.length + returnPolicies.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ACTIVE")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "ACTIVE"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            Active Warranties ({metrics.activeWarranties})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("EXPIRING")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "EXPIRING"
                ? "bg-amber-500 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            Expiring Soon ({metrics.expiringSoon})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("RETURNS")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "RETURNS"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            Return Windows ({returnPolicies.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("EXPIRED")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "EXPIRED"
                ? "bg-rose-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            Expired ({metrics.expired})
          </button>
        </div>

        {/* Real-time Search Bar */}
        <div className="relative min-w-[280px] lg:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by asset, provider, or brand..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-9 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <XCircle className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid or Loading State */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800/40"
            />
          ))}
        </div>
      ) : totalFilteredCount === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
            <FileQuestion className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
            No matching deadlines found
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            {searchQuery
              ? `No warranties or returns match your search for "${searchQuery}".`
              : "No items match the selected filter category."}
          </p>
          {(searchQuery || activeTab !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setActiveTab("ALL");
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        /* Rendered Cards Grid */
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {/* Warranties */}
          {filteredWarranties.map((w) => (
            <WarrantyCard key={w.id} warranty={w} />
          ))}

          {/* Return Policies */}
          {filteredReturnPolicies.map((p) => (
            <ReturnPolicyCard
              key={p.id}
              policy={p}
              onStatusUpdated={handleReturnPolicyUpdated}
            />
          ))}
        </div>
      )}
    </div>
  );
}
