import prisma from "@/lib/prisma";
import {
  MaintenanceStatus,
  EnhancedMaintenanceSchedule,
  RecurrenceAdvancementResult,
  MaintenanceSyncResult,
} from "@/lib/types/maintenance";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Safely adds months to a date, properly clamping end-of-month dates
 * (e.g. Jan 31 + 1 month -> Feb 28/29, rather than overflowing into March).
 */
export function addMonthsSafely(date: Date | string, months: number): Date {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date provided to addMonthsSafely: ${date}`);
  }

  const originalDay = d.getDate();
  // Move to day 1 first to prevent intermediate month overflow
  d.setDate(1);
  d.setMonth(d.getMonth() + months);

  // Determine the max days in target month (day 0 of following month)
  const maxDaysInTargetMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(originalDay, maxDaysInTargetMonth));

  return d;
}

/**
 * Calculates remaining days from referenceDate to nextServiceDate.
 * Returns ceiling rounded difference in days, or null if date is missing/invalid.
 */
export function calculateRemainingDays(
  nextServiceDate: Date | string | null | undefined,
  referenceDate: Date = new Date()
): number | null {
  if (!nextServiceDate) return null;

  const target = new Date(nextServiceDate);
  if (isNaN(target.getTime())) return null;

  const diffMs = target.getTime() - referenceDate.getTime();
  const days = Math.ceil(diffMs / MS_PER_DAY);
  return days === 0 ? 0 : days;
}

/**
 * Calculates remaining mileage until next service.
 * Baseline is lastServiceMileage (or currentMileage if no prior baseline).
 * Returns null if intervalMileage or currentMileage is not provided.
 */
export function calculateRemainingMileage(
  lastServiceMileage: number | null | undefined,
  intervalMileage: number | null | undefined,
  currentMileage: number | null | undefined
): number | null {
  if (
    intervalMileage === null ||
    intervalMileage === undefined ||
    currentMileage === null ||
    currentMileage === undefined
  ) {
    return null;
  }

  const baseline = lastServiceMileage !== null && lastServiceMileage !== undefined
    ? lastServiceMileage
    : currentMileage;

  const targetMileage = baseline + intervalMileage;
  return targetMileage - currentMileage;
}

/**
 * Calculates progress percentage towards next service (0% - 100%).
 * Evaluates both calendar and mileage elapsed if available and takes the highest.
 */
export function calculateProgressPercentage(params: {
  lastServiceDate?: Date | string | null;
  nextServiceDate?: Date | string | null;
  lastServiceMileage?: number | null;
  intervalMileage?: number | null;
  currentMileage?: number | null;
  referenceDate?: Date;
}): number | null {
  const ref = params.referenceDate ?? new Date();
  let timeProgress: number | null = null;
  let mileageProgress: number | null = null;

  // Calendar progress
  if (params.nextServiceDate && params.lastServiceDate) {
    const start = new Date(params.lastServiceDate).getTime();
    const end = new Date(params.nextServiceDate).getTime();
    const now = ref.getTime();
    if (!isNaN(start) && !isNaN(end) && end > start) {
      const elapsed = now - start;
      const total = end - start;
      timeProgress = Math.round((elapsed / total) * 100);
    }
  }

  // Mileage progress
  if (
    params.intervalMileage &&
    params.intervalMileage > 0 &&
    params.currentMileage !== null &&
    params.currentMileage !== undefined
  ) {
    const baseline = params.lastServiceMileage ?? (params.currentMileage - params.intervalMileage);
    const driven = params.currentMileage - baseline;
    mileageProgress = Math.round((driven / params.intervalMileage) * 100);
  }

  if (timeProgress === null && mileageProgress === null) {
    return null;
  }

  const maxProgress = Math.max(timeProgress ?? 0, mileageProgress ?? 0);
  return Math.min(100, Math.max(0, maxProgress));
}

/**
 * Classifies maintenance schedule status based on date and mileage thresholds:
 * - Explicitly completed: "COMPLETED"
 * - Overdue: remainingDays < 0 OR remainingMileage < 0
 * - Due soon: 0 <= remainingDays <= 14 OR 0 <= remainingMileage <= 500
 * - Upcoming: remainingDays > 14 AND remainingMileage > 500 (or unconstrained)
 */
export function calculateMaintenanceStatus(params: {
  nextServiceDate?: Date | string | null;
  remainingDays?: number | null;
  remainingMileage?: number | null;
  isExplicitlyCompleted?: boolean;
}): MaintenanceStatus {
  if (params.isExplicitlyCompleted) {
    return "COMPLETED";
  }

  const remDays =
    params.remainingDays !== undefined
      ? params.remainingDays
      : params.nextServiceDate
      ? calculateRemainingDays(params.nextServiceDate)
      : null;

  const remMiles = params.remainingMileage !== undefined ? params.remainingMileage : null;

  // Overdue check
  const isOverdueByDays = remDays !== null && remDays < 0;
  const isOverdueByMileage = remMiles !== null && remMiles < 0;
  if (isOverdueByDays || isOverdueByMileage) {
    return "OVERDUE";
  }

  // Due soon check (within 14 days or 500 miles)
  const isDueByDays = remDays !== null && remDays >= 0 && remDays <= 14;
  const isDueByMileage = remMiles !== null && remMiles >= 0 && remMiles <= 500;
  if (isDueByDays || isDueByMileage) {
    return "DUE";
  }

  return "UPCOMING";
}

/**
 * Enhances a raw MaintenanceSchedule record with dynamically calculated status,
 * time remaining, mileage remaining, and progress percentage.
 */
export function enhanceMaintenanceSchedule(
  schedule: any,
  referenceDate: Date = new Date()
): EnhancedMaintenanceSchedule {
  const remainingDays = calculateRemainingDays(schedule.nextServiceDate, referenceDate);
  const remainingMileage = calculateRemainingMileage(
    schedule.lastServiceMileage,
    schedule.intervalMileage,
    schedule.currentMileage
  );

  const isExplicitlyCompleted = schedule.status === "COMPLETED";
  const calculatedStatus = calculateMaintenanceStatus({
    nextServiceDate: schedule.nextServiceDate,
    remainingDays,
    remainingMileage,
    isExplicitlyCompleted,
  });

  const progressPercentage = calculateProgressPercentage({
    lastServiceDate: schedule.lastServiceDate,
    nextServiceDate: schedule.nextServiceDate,
    lastServiceMileage: schedule.lastServiceMileage,
    intervalMileage: schedule.intervalMileage,
    currentMileage: schedule.currentMileage,
    referenceDate,
  });

  return {
    ...schedule,
    remainingDays,
    remainingMileage,
    calculatedStatus,
    isDueSoon: calculatedStatus === "DUE",
    isOverdue: calculatedStatus === "OVERDUE",
    isCompleted: calculatedStatus === "COMPLETED",
    progressPercentage,
  };
}

/**
 * Advances a maintenance schedule to its next recurrence cycle upon logging service.
 */
export function advanceRecurrenceCycle(
  schedule: any,
  serviceData: {
    serviceDate: Date | string;
    mileage?: number | null;
    cost?: number | null;
  }
): RecurrenceAdvancementResult {
  const sDate = new Date(serviceData.serviceDate);
  const validServiceDate = isNaN(sDate.getTime()) ? new Date() : sDate;

  // Next service date calculation
  let nextServiceDate: Date | null = null;
  if (schedule.intervalMonths && schedule.intervalMonths > 0) {
    nextServiceDate = addMonthsSafely(validServiceDate, schedule.intervalMonths);
  }

  // Mileage advancement
  const hasServiceMileage =
    serviceData.mileage !== undefined && serviceData.mileage !== null;
  const lastServiceMileage = hasServiceMileage
    ? serviceData.mileage!
    : schedule.lastServiceMileage ?? null;

  const currentMileage = hasServiceMileage
    ? Math.max(schedule.currentMileage ?? 0, serviceData.mileage!)
    : schedule.currentMileage ?? null;

  const lastServiceCost =
    serviceData.cost !== undefined && serviceData.cost !== null
      ? serviceData.cost
      : schedule.lastServiceCost ?? null;

  // Status transition: if non-recurring (neither intervalMonths nor intervalMileage set) -> COMPLETED
  const isRecurring =
    (schedule.intervalMonths && schedule.intervalMonths > 0) ||
    (schedule.intervalMileage && schedule.intervalMileage > 0);

  let status: MaintenanceStatus = "COMPLETED";

  if (isRecurring) {
    const remainingDays = calculateRemainingDays(nextServiceDate);
    const remainingMileage = calculateRemainingMileage(
      lastServiceMileage,
      schedule.intervalMileage,
      currentMileage
    );

    status = calculateMaintenanceStatus({
      nextServiceDate,
      remainingDays,
      remainingMileage,
    });
  }

  return {
    lastServiceDate: validServiceDate,
    nextServiceDate,
    lastServiceMileage,
    currentMileage,
    lastServiceCost,
    status,
  };
}

/**
 * Synchronizes persisted status fields for active maintenance schedules.
 */
export function syncAllMaintenanceStatuses(): Promise<MaintenanceSyncResult> {
  return (async () => {
    const activeSchedules = await prisma.maintenanceSchedule.findMany({
      where: {
        status: { not: "COMPLETED" },
      },
    });

    let schedulesUpdated = 0;

    for (const schedule of activeSchedules) {
      const enhanced = enhanceMaintenanceSchedule(schedule);
      if (enhanced.calculatedStatus !== schedule.status) {
        await prisma.maintenanceSchedule.update({
          where: { id: schedule.id },
          data: { status: enhanced.calculatedStatus },
        });
        schedulesUpdated++;
      }
    }

    return {
      schedulesChecked: activeSchedules.length,
      schedulesUpdated,
    };
  })();
}
