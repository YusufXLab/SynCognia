"use client";

import React, { useState, useEffect } from "react";
import { X, CheckCircle2, Loader2, DollarSign, Gauge, Calendar, Wrench, Link as LinkIcon } from "lucide-react";
import { EnhancedMaintenanceSchedule } from "@/lib/types/maintenance";
import { logServiceCompleted } from "@/lib/actions/maintenance";

interface LogServiceModalProps {
  schedule: EnhancedMaintenanceSchedule | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LogServiceModal({
  schedule,
  isOpen,
  onClose,
  onSuccess,
}: LogServiceModalProps) {
  const [serviceDate, setServiceDate] = useState("");
  const [mileage, setMileage] = useState<string>("");
  const [cost, setCost] = useState<string>("");
  const [serviceProvider, setServiceProvider] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize or reset form values when schedule changes or modal opens
  useEffect(() => {
    if (schedule && isOpen) {
      const today = new Date().toISOString().split("T")[0];
      setServiceDate(today);

      const defaultMileage =
        schedule.currentMileage !== null && schedule.currentMileage !== undefined
          ? schedule.currentMileage.toString()
          : schedule.lastServiceMileage !== null && schedule.lastServiceMileage !== undefined
          ? schedule.lastServiceMileage.toString()
          : "";
      setMileage(defaultMileage);

      setCost(
        schedule.lastServiceCost !== null && schedule.lastServiceCost !== undefined
          ? schedule.lastServiceCost.toString()
          : ""
      );

      setServiceProvider("");
      setNotes("");
      setReceiptUrl("");
      setError(null);
    }
  }, [schedule, isOpen]);

  if (!isOpen || !schedule) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const parsedMileage = mileage.trim() ? Number(mileage) : null;
      const parsedCost = cost.trim() ? Number(cost) : null;

      if (parsedMileage !== null && (isNaN(parsedMileage) || parsedMileage < 0)) {
        setError("Mileage must be a positive number");
        setIsSubmitting(false);
        return;
      }

      if (parsedCost !== null && (isNaN(parsedCost) || parsedCost < 0)) {
        setError("Cost must be a positive number");
        setIsSubmitting(false);
        return;
      }

      const res = await logServiceCompleted({
        scheduleId: schedule.id,
        assetId: schedule.assetId,
        title: schedule.title,
        serviceDate: new Date(serviceDate),
        mileage: parsedMileage,
        cost: parsedCost,
        serviceProvider: serviceProvider.trim() || null,
        notes: notes.trim() || null,
        receiptUrl: receiptUrl.trim() || null,
      });

      if (!res.success) {
        setError(res.error || "Failed to log service completion");
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error submitting log service form:", err);
      setError((err as Error).message || "An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Log Service Completion
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {schedule.title} • {schedule.asset?.name || "Asset"}
              {schedule.asset?.category && ` (${schedule.asset.category})`}
            </p>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Service Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Service Date */}
            <div>
              <label
                htmlFor="serviceDate"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Service Date *
              </label>
              <div className="relative mt-1">
                <input
                  id="serviceDate"
                  type="date"
                  required
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Odometer / Mileage */}
            <div>
              <label
                htmlFor="mileage"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Mileage / Odometer Reading
              </label>
              <div className="relative mt-1">
                <input
                  id="mileage"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g., 45000"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Actual Cost */}
            <div>
              <label
                htmlFor="cost"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Actual Cost ($)
              </label>
              <div className="relative mt-1">
                <input
                  id="cost"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g., 89.95"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Service Provider */}
            <div>
              <label
                htmlFor="serviceProvider"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Service Provider
              </label>
              <div className="relative mt-1">
                <input
                  id="serviceProvider"
                  type="text"
                  placeholder="e.g., Valvoline, Dealer, DIY"
                  value={serviceProvider}
                  onChange={(e) => setServiceProvider(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Service Notes & Details */}
          <div>
            <label
              htmlFor="notes"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Service Notes & Maintenance Details
            </label>
            <div className="mt-1">
              <textarea
                id="notes"
                rows={3}
                placeholder="Technician notes, parts replaced, oil grade (e.g. 5W-30 Full Synthetic), tire rotation notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Receipt / Invoice Attachment Link */}
          <div>
            <label
              htmlFor="receiptUrl"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Receipt / Invoice Link (Optional URL)
            </label>
            <div className="mt-1">
              <input
                id="receiptUrl"
                type="url"
                placeholder="https://..."
                value={receiptUrl}
                onChange={(e) => setReceiptUrl(e.target.value)}
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
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Advancing Cycle...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Save & Advance Cycle</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
