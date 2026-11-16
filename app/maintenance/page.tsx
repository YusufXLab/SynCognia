"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import {
  Wrench,
  Clock,
  AlertTriangle,
  DollarSign,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Calendar,
  Filter,
  Check,
  Package,
} from "lucide-react";
import { MaintenanceCard } from "@/components/maintenance/MaintenanceCard";
import { LogServiceModal } from "@/components/maintenance/LogServiceModal";
import { MaintenanceModal } from "@/components/maintenance/MaintenanceModal";
import {
  MaintenanceHistoryTimeline,
  HistoryLogItem,
} from "@/components/maintenance/MaintenanceHistoryTimeline";
import {
  getMaintenanceSchedules,
  getMaintenanceSummaryMetrics,
  getMaintenanceLogs,
  deleteMaintenanceSchedule,
  syncMaintenanceStatuses,
} from "@/lib/actions/maintenance";
import { getAssets } from "@/lib/actions/assets";
import {
  EnhancedMaintenanceSchedule,
  MaintenanceMetrics,
} from "@/lib/types/maintenance";

type TabFilter = "ALL" | "UPCOMING" | "DUE" | "OVERDUE" | "HISTORY";

export default function MaintenanceHubPage() {
  const [schedules, setSchedules] = useState<EnhancedMaintenanceSchedule[]>([]);
  const [logs, setLogs] = useState<HistoryLogItem[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<MaintenanceMetrics>({
    totalSchedules: 0,
    upcomingCount: 0,
    dueSoonCount: 0,
    overdueCount: 0,
    totalExpenditure: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSyncing, startSyncTransition] = useTransition();
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Modals state
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [activeScheduleForLog, setActiveScheduleForLog] =
    useState<EnhancedMaintenanceSchedule | null>(null);

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [activeScheduleForEdit, setActiveScheduleForEdit] =
    useState<EnhancedMaintenanceSchedule | null>(null);

  // Load all maintenance data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [schedulesRes, metricsRes, logsRes, assetsRes] = await Promise.all([
        getMaintenanceSchedules(),
        getMaintenanceSummaryMetrics(),
        getMaintenanceLogs(),
        getAssets(),
      ]);

      if (schedulesRes.success && schedulesRes.data) {
        setSchedules(schedulesRes.data);
      }
      if (metricsRes.success && metricsRes.data) {
        setMetrics(metricsRes.data);
      }
      if (logsRes.success && logsRes.data) {
        setLogs(logsRes.data as HistoryLogItem[]);
      }
      if (assetsRes.success && assetsRes.data) {
        setAssets(assetsRes.data as any[]);
      }
    } catch (err) {
      console.error("Failed to load maintenance hub data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync maintenance statuses handler
  const handleSyncStatuses = () => {
    startSyncTransition(async () => {
      try {
        const res = await syncMaintenanceStatuses();
        if (res.success && res.data) {
          setSyncFeedback(
            `Synchronized ${res.data.schedulesChecked} schedules (${res.data.schedulesUpdated} updated).`
          );
        } else {
          setSyncFeedback("Maintenance statuses synced.");
        }
        await loadData();
        setTimeout(() => setSyncFeedback(null), 4000);
      } catch (err) {
        setSyncFeedback("Failed to synchronize statuses. Please retry.");
        setTimeout(() => setSyncFeedback(null), 4000);
      }
    });
  };

  // Schedule deletion handler
  const handleDeleteSchedule = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this maintenance schedule?")) {
      return;
    }

    try {
      const res = await deleteMaintenanceSchedule(id);
      if (res.success) {
        setSchedules((prev) => prev.filter((s) => s.id !== id));
        loadData();
      } else {
        alert(res.error || "Failed to delete schedule");
      }
    } catch (err) {
      console.error("Error deleting schedule:", err);
      alert("An error occurred while deleting the schedule.");
    }
  };

  // Open Log Service Modal
  const handleOpenLogModal = (schedule: EnhancedMaintenanceSchedule) => {
    setActiveScheduleForLog(schedule);
    setIsLogModalOpen(true);
  };

  // Open Edit Schedule Modal
  const handleOpenEditModal = (schedule: EnhancedMaintenanceSchedule) => {
    setActiveScheduleForEdit(schedule);
    setIsScheduleModalOpen(true);
  };

  // Open Create Schedule Modal
  const handleOpenCreateModal = () => {
    setActiveScheduleForEdit(null);
    setIsScheduleModalOpen(true);
  };

  // Available categories extracted from assets
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    assets.forEach((a) => {
      if (a.category) set.add(a.category);
    });
    // Ensure default common categories exist
    ["Vehicles", "Appliances", "Electronics", "Tools"].forEach((cat) => set.add(cat));
    return Array.from(set);
  }, [assets]);

  // Unified Filtering for Schedules
  const query = searchQuery.trim().toLowerCase();

  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      // Tab matching
      if (activeTab === "UPCOMING" && s.calculatedStatus !== "UPCOMING") return false;
      if (activeTab === "DUE" && s.calculatedStatus !== "DUE") return false;
      if (activeTab === "OVERDUE" && s.calculatedStatus !== "OVERDUE") return false;

      // Category matching
      if (selectedCategory !== "ALL" && s.asset?.category !== selectedCategory) {
        return false;
      }

      // Search matching
      if (!query) return true;
      const title = s.title?.toLowerCase() || "";
      const assetName = s.asset?.name?.toLowerCase() || "";
      const brand = s.asset?.brand?.toLowerCase() || "";
      const model = s.asset?.modelNumber?.toLowerCase() || "";
      const notes = s.notes?.toLowerCase() || "";

      return (
        title.includes(query) ||
        assetName.includes(query) ||
        brand.includes(query) ||
        model.includes(query) ||
        notes.includes(query)
      );
    });
  }, [schedules, activeTab, selectedCategory, query]);

  // Unified Filtering for History Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      // Category matching
      if (selectedCategory !== "ALL" && l.asset?.category !== selectedCategory) {
        return false;
      }

      // Search matching
      if (!query) return true;
      const title = l.title?.toLowerCase() || "";
      const assetName = l.asset?.name?.toLowerCase() || "";
      const provider = l.serviceProvider?.toLowerCase() || "";
      const notes = l.notes?.toLowerCase() || "";

      return (
        title.includes(query) ||
        assetName.includes(query) ||
        provider.includes(query) ||
        notes.includes(query)
      );
    });
  }, [logs, selectedCategory, query]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Preventive Maintenance Hub
            </h1>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              {schedules.length} Active Schedules
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Track dual-interval service schedules, mileage thresholds, past repairs, and log preventive completions.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSyncStatuses}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition-all hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-indigo-600" : ""}`}
            />
            <span>{isSyncing ? "Syncing..." : "Sync Status"}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            <span>+ New Schedule</span>
          </button>
        </div>
      </div>

      {/* Sync Feedback Toast */}
      {syncFeedback && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Upcoming Services */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Upcoming Services
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Wrench className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {metrics.upcomingCount}
          </div>
          <p className="mt-1 text-xs text-slate-500">Scheduled routine maintenance</p>
        </div>

        {/* Metric 2: Due Soon */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Due Soon
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {metrics.dueSoonCount}
          </div>
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            Due within 14 days or 500 mi
          </p>
        </div>

        {/* Metric 3: Overdue */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Overdue
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {metrics.overdueCount}
          </div>
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
            Immediate service required
          </p>
        </div>

        {/* Metric 4: Total Spent */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Spent
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            $
            {metrics.totalExpenditure.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <p className="mt-1 text-xs text-slate-500">Cumulative service expenditures</p>
        </div>
      </div>

      {/* Control Bar: Status Tabs, Category Filter & Search */}
      <div className="flex flex-col gap-4">
        {/* Row 1: Status Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "ALL", label: "All Schedules", count: schedules.length },
              { id: "UPCOMING", label: "Upcoming", count: metrics.upcomingCount },
              { id: "DUE", label: "Due Soon", count: metrics.dueSoonCount },
              { id: "OVERDUE", label: "Overdue", count: metrics.overdueCount },
              { id: "HISTORY", label: "Completed History", count: logs.length },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as TabFilter)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      isActive
                        ? "bg-indigo-500/50 text-white"
                        : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search schedules, assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Row 2: Category Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-semibold text-slate-400">Category:</span>
          <button
            type="button"
            onClick={() => setSelectedCategory("ALL")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              selectedCategory === "ALL"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            }`}
          >
            All Categories
          </button>
          {availableCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                selectedCategory === cat
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <RefreshCw className="h-5 w-5 animate-spin text-indigo-600" />
            <span>Loading maintenance records...</span>
          </div>
        </div>
      ) : activeTab === "HISTORY" ? (
        /* History Timeline Tab View */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Service Completion History
            </h2>
            <span className="text-xs text-slate-500">
              Showing {filteredLogs.length} logged events
            </span>
          </div>
          <MaintenanceHistoryTimeline logs={filteredLogs} onRefresh={loadData} />
        </div>
      ) : (
        /* Maintenance Schedules Cards Grid View */
        <div>
          {filteredSchedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                <Wrench className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">
                No Maintenance Schedules Found
              </h3>
              <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
                {searchQuery || selectedCategory !== "ALL" || activeTab !== "ALL"
                  ? "No schedules match your current filters. Try resetting search or category."
                  : "Create your first preventive maintenance schedule to track oil changes, filter replacements, and regular checkups."}
              </p>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                <span>+ Create Maintenance Schedule</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSchedules.map((schedule) => (
                <MaintenanceCard
                  key={schedule.id}
                  schedule={schedule}
                  onLogService={handleOpenLogModal}
                  onEdit={handleOpenEditModal}
                  onDelete={handleDeleteSchedule}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Log Service Modal */}
      <LogServiceModal
        schedule={activeScheduleForLog}
        isOpen={isLogModalOpen}
        onClose={() => {
          setIsLogModalOpen(false);
          setActiveScheduleForLog(null);
        }}
        onSuccess={loadData}
      />

      {/* Create / Edit Schedule Modal */}
      <MaintenanceModal
        schedule={activeScheduleForEdit}
        assets={assets}
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setActiveScheduleForEdit(null);
        }}
        onSuccess={loadData}
      />
    </div>
  );
}
