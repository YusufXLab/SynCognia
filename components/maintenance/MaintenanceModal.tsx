"use client";

import React, { useState, useEffect } from "react";
import { X, Calendar, Gauge, Wrench, Loader2, Plus, Check } from "lucide-react";
import { EnhancedMaintenanceSchedule } from "@/lib/types/maintenance";
import {
  createMaintenanceSchedule,
  updateMaintenanceSchedule,
} from "@/lib/actions/maintenance";

interface AssetOption {
  id: string;
  name: string;
  category?: string | null;
  brand?: string | null;
}

interface MaintenanceModalProps {
  schedule?: EnhancedMaintenanceSchedule | null;
  assets: AssetOption[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MaintenanceModal({
  schedule,
  assets,
  isOpen,
  onClose,
  onSuccess,
}: MaintenanceModalProps) {
  const isEditing = Boolean(schedule?.id);

  const [assetId, setAssetId] = useState("");
  const [title, setTitle] = useState("");
  const [intervalMonths, setIntervalMonths] = useState<string>("");
  const [intervalMileage, setIntervalMileage] = useState<string>("");
  const [lastServiceDate, setLastServiceDate] = useState("");
  const [nextServiceDate, setNextServiceDate] = useState("");
  const [lastServiceMileage, setLastServiceMileage] = useState<string>("");
  const [currentMileage, setCurrentMileage] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to format ISO date string to YYYY-MM-DD
  const toDateInputString = (val?: Date | string | null): string => {
    if (!val) return "";
    const d = new Date(val);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (schedule) {
        setAssetId(schedule.assetId || "");
        setTitle(schedule.title || "");
        setIntervalMonths(
          schedule.intervalMonths !== null && schedule.intervalMonths !== undefined
            ? schedule.intervalMonths.toString()
            : ""
        );
        setIntervalMileage(
          schedule.intervalMileage !== null && schedule.intervalMileage !== undefined
            ? schedule.intervalMileage.toString()
            : ""
        );
        setLastServiceDate(toDateInputString(schedule.lastServiceDate));
        setNextServiceDate(toDateInputString(schedule.nextServiceDate));
        setLastServiceMileage(
          schedule.lastServiceMileage !== null && schedule.lastServiceMileage !== undefined
            ? schedule.lastServiceMileage.toString()
            : ""
        );
        setCurrentMileage(
          schedule.currentMileage !== null && schedule.currentMileage !== undefined
            ? schedule.currentMileage.toString()
            : ""
        );
        setNotes(schedule.notes || "");
      } else {
        setAssetId(assets.length > 0 ? assets[0].id : "");
        setTitle("");
        setIntervalMonths("6");
        setIntervalMileage("");
        setLastServiceDate("");
        // Default next service date to 6 months from now
        const now = new Date();
        now.setMonth(now.getMonth() + 6);
        setNextServiceDate(now.toISOString().split("T")[0]);
        setLastServiceMileage("");
        setCurrentMileage("");
        setNotes("");
      }
    }
  }, [isOpen, schedule, assets]);

  if (!isOpen) {
    return null;
  }

  // Auto calculate next service date when intervalMonths changes if desired
  const handleMonthsChange = (val: string) => {
    setIntervalMonths(val);
    const monthsNum = parseInt(val, 10);
    if (!isNaN(monthsNum) && monthsNum > 0) {
      const base = lastServiceDate ? new Date(lastServiceDate) : new Date();
      if (!isNaN(base.getTime())) {
        base.setMonth(base.getMonth() + monthsNum);
        setNextServiceDate(base.toISOString().split("T")[0]);
      }
    }
  };

  const handleLastDateChange = (val: string) => {
    setLastServiceDate(val);
    const monthsNum = parseInt(intervalMonths, 10);
    if (!isNaN(monthsNum) && monthsNum > 0 && val) {
      const base = new Date(val);
      if (!isNaN(base.getTime())) {
        base.setMonth(base.getMonth() + monthsNum);
        setNextServiceDate(base.toISOString().split("T")[0]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!assetId) {
      setError("Please select an asset");
      return;
    }
    if (!title.trim()) {
      setError("Schedule title is required");
      return;
    }

    const parsedIntervalMonths = intervalMonths.trim() ? Number(intervalMonths) : null;
    const parsedIntervalMileage = intervalMileage.trim() ? Number(intervalMileage) : null;
    const parsedLastMileage = lastServiceMileage.trim() ? Number(lastServiceMileage) : null;
    const parsedCurrentMileage = currentMileage.trim() ? Number(currentMileage) : null;

    if (parsedIntervalMonths !== null && (isNaN(parsedIntervalMonths) || parsedIntervalMonths <= 0)) {
      setError("Interval months must be a positive number");
      return;
    }
    if (parsedIntervalMileage !== null && (isNaN(parsedIntervalMileage) || parsedIntervalMileage <= 0)) {
      setError("Interval mileage must be a positive number");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && schedule?.id) {
        const res = await updateMaintenanceSchedule(schedule.id, {
          assetId,
          title: title.trim(),
          intervalMonths: parsedIntervalMonths,
          intervalMileage: parsedIntervalMileage,
          lastServiceDate: lastServiceDate ? new Date(lastServiceDate) : null,
          nextServiceDate: nextServiceDate ? new Date(nextServiceDate) : null,
          lastServiceMileage: parsedLastMileage,
          currentMileage: parsedCurrentMileage,
          notes: notes.trim() || null,
        });

        if (!res.success) {
          setError(res.error || "Failed to update maintenance schedule");
          setIsSubmitting(false);
          return;
        }
      } else {
        const res = await createMaintenanceSchedule({
          assetId,
          title: title.trim(),
          intervalMonths: parsedIntervalMonths,
          intervalMileage: parsedIntervalMileage,
          lastServiceDate: lastServiceDate ? new Date(lastServiceDate) : null,
          nextServiceDate: nextServiceDate ? new Date(nextServiceDate) : null,
          lastServiceMileage: parsedLastMileage,
          currentMileage: parsedCurrentMileage,
          notes: notes.trim() || null,
        });

        if (!res.success) {
          setError(res.error || "Failed to create maintenance schedule");
          setIsSubmitting(false);
          return;
        }
      }

      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error saving maintenance schedule:", err);
      setError((err as Error).message || "An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {isEditing ? "Edit Maintenance Schedule" : "New Maintenance Schedule"}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Configure dual calendar and mileage intervals for preventive upkeep.
            </p>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Asset Selection */}
          <div>
            <label
              htmlFor="assetId"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Target Asset *
            </label>
            <div className="mt-1">
              <select
                id="assetId"
                required
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              >
                {assets.length === 0 ? (
                  <option value="">No assets found</option>
                ) : (
                  assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} {a.brand ? `(${a.brand})` : ""} {a.category ? `[${a.category}]` : ""}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Schedule Title */}
          <div>
            <label
              htmlFor="title"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Task Title *
            </label>
            <div className="mt-1">
              <input
                id="title"
                type="text"
                required
                placeholder="e.g., Synthetic Oil Change & Filter, HVAC Filter Replacement"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Recurrence Intervals */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800/60 dark:bg-slate-950/40">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Recurrence Intervals (Dual-Tracking)
            </span>
            <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="intervalMonths"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Interval (Months)
                </label>
                <div className="relative mt-1">
                  <input
                    id="intervalMonths"
                    type="number"
                    min="1"
                    placeholder="e.g., 6"
                    value={intervalMonths}
                    onChange={(e) => handleMonthsChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="intervalMileage"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Interval (Miles / km)
                </label>
                <div className="relative mt-1">
                  <input
                    id="intervalMileage"
                    type="number"
                    min="1"
                    placeholder="e.g., 5000"
                    value={intervalMileage}
                    onChange={(e) => setIntervalMileage(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dates Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="lastServiceDate"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Last Service Date
              </label>
              <div className="mt-1">
                <input
                  id="lastServiceDate"
                  type="date"
                  value={lastServiceDate}
                  onChange={(e) => handleLastDateChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="nextServiceDate"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Next Due Date
              </label>
              <div className="mt-1">
                <input
                  id="nextServiceDate"
                  type="date"
                  value={nextServiceDate}
                  onChange={(e) => setNextServiceDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Mileage Readings Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="lastServiceMileage"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Last Service Mileage
              </label>
              <div className="mt-1">
                <input
                  id="lastServiceMileage"
                  type="number"
                  min="0"
                  placeholder="e.g., 35000"
                  value={lastServiceMileage}
                  onChange={(e) => setLastServiceMileage(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="currentMileage"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Current Asset Mileage
              </label>
              <div className="mt-1">
                <input
                  id="currentMileage"
                  type="number"
                  min="0"
                  placeholder="e.g., 38500"
                  value={currentMileage}
                  onChange={(e) => setCurrentMileage(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="scheduleNotes"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Special Instructions / Maintenance Notes
            </label>
            <div className="mt-1">
              <textarea
                id="scheduleNotes"
                rows={2}
                placeholder="Recommended oil filter part numbers, torque specifications, warranty requirement..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving Schedule...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>{isEditing ? "Update Schedule" : "Create Schedule"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
