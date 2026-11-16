import prisma from "@/lib/prisma";
import {
  WarrantyStatus,
  ReturnPolicyStatus,
  CalculatedWarrantyFields,
  CalculatedReturnPolicyFields,
  DeadlineSyncResult,
} from "@/lib/types/deadline";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Calculates remaining days from referenceDate to targetDate.
 * Returns ceiling rounded difference in days.
 * Returns Infinity if targetDate is not provided or invalid.
 */
export function calculateRemainingDays(
  targetDate: Date | string | null | undefined,
  referenceDate: Date = new Date()
): number {
  if (!targetDate) return Infinity;

  const target = new Date(targetDate);
  if (isNaN(target.getTime())) return Infinity;

  const diffMs = target.getTime() - referenceDate.getTime();
  const days = Math.ceil(diffMs / MS_PER_DAY);
  return days === 0 ? 0 : days;
}

/**
 * Calculates percentage of warranty elapsed between startDate and endDate.
 * Always clamped between 0 and 100.
 * Returns 0 for LIFETIME warranties or missing endDate.
 */
export function calculatePercentageElapsed(
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined,
  warrantyType?: string | null,
  referenceDate: Date = new Date()
): number {
  if (warrantyType === "LIFETIME" || !endDate) {
    return 0;
  }

  const end = new Date(endDate);
  if (isNaN(end.getTime())) return 0;

  if (!startDate) {
    const daysLeft = calculateRemainingDays(end, referenceDate);
    return daysLeft <= 0 ? 100 : 0;
  }

  const start = new Date(startDate);
  if (isNaN(start.getTime())) {
    const daysLeft = calculateRemainingDays(end, referenceDate);
    return daysLeft <= 0 ? 100 : 0;
  }

  const totalMs = end.getTime() - start.getTime();
  if (totalMs <= 0) {
    return 100;
  }

  const elapsedMs = referenceDate.getTime() - start.getTime();
  const percentage = Math.round((elapsedMs / totalMs) * 100);

  return Math.min(100, Math.max(0, percentage));
}

/**
 * Evaluates warranty status:
 * - LIFETIME or null endDate: ACTIVE
 * - remainingDays < 0: EXPIRED
 * - 0 <= remainingDays <= 30: EXPIRING_SOON
 * - remainingDays > 30: ACTIVE
 */
export function calculateWarrantyStatus(
  endDate: Date | string | null | undefined,
  warrantyType?: string | null,
  referenceDate: Date = new Date()
): WarrantyStatus {
  if (warrantyType === "LIFETIME" || !endDate) {
    return "ACTIVE";
  }

  const daysLeft = calculateRemainingDays(endDate, referenceDate);
  if (daysLeft < 0) {
    return "EXPIRED";
  }
  if (daysLeft <= 30) {
    return "EXPIRING_SOON";
  }
  return "ACTIVE";
}

/**
 * Evaluates return policy status:
 * - RETURNED stays RETURNED
 * - null deadline: OPEN
 * - remainingDays < 0: EXPIRED
 * - 0 <= remainingDays <= 7: EXPIRING_SOON
 * - remainingDays > 7: OPEN
 */
export function calculateReturnStatus(
  deadline: Date | string | null | undefined,
  currentStatus?: string | null,
  referenceDate: Date = new Date()
): ReturnPolicyStatus {
  if (currentStatus === "RETURNED") {
    return "RETURNED";
  }

  if (!deadline) {
    return "OPEN";
  }

  const daysLeft = calculateRemainingDays(deadline, referenceDate);
  if (daysLeft < 0) {
    return "EXPIRED";
  }
  if (daysLeft <= 7) {
    return "EXPIRING_SOON";
  }
  return "OPEN";
}

/**
 * Decorator to attach calculated warranty metrics to warranty records
 */
export function enhanceWarranty<
  T extends {
    endDate?: Date | string | null;
    startDate?: Date | string | null;
    warrantyType?: string | null;
    status?: string | null;
  }
>(warranty: T, referenceDate: Date = new Date()): T & CalculatedWarrantyFields {
  const remainingDays = calculateRemainingDays(warranty.endDate, referenceDate);
  const percentageElapsed = calculatePercentageElapsed(
    warranty.startDate,
    warranty.endDate,
    warranty.warrantyType,
    referenceDate
  );
  const calculatedStatus = calculateWarrantyStatus(
    warranty.endDate,
    warranty.warrantyType,
    referenceDate
  );

  return {
    ...warranty,
    remainingDays,
    percentageElapsed,
    calculatedStatus,
    isExpiringSoon: calculatedStatus === "EXPIRING_SOON",
    isExpired: calculatedStatus === "EXPIRED",
  };
}

/**
 * Decorator to attach calculated return metrics to return policy records
 */
export function enhanceReturnPolicy<
  T extends {
    returnDeadline?: Date | string | null;
    returnStatus?: string | null;
  }
>(policy: T, referenceDate: Date = new Date()): T & CalculatedReturnPolicyFields {
  const remainingDays = calculateRemainingDays(policy.returnDeadline, referenceDate);
  const calculatedStatus = calculateReturnStatus(
    policy.returnDeadline,
    policy.returnStatus,
    referenceDate
  );

  return {
    ...policy,
    remainingDays,
    calculatedStatus,
    isExpiringSoon: calculatedStatus === "EXPIRING_SOON",
    isExpired: calculatedStatus === "EXPIRED",
    isOpen: calculatedStatus === "OPEN",
  };
}

/**
 * Database synchronization service to bring persisted status values
 * in line with physical calendar calculations.
 */
export async function syncAllDeadlineStatuses(
  referenceDate: Date = new Date()
): Promise<DeadlineSyncResult> {
  const [warranties, returnPolicies] = await Promise.all([
    prisma.warranty.findMany({
      select: {
        id: true,
        endDate: true,
        warrantyType: true,
        status: true,
      },
    }),
    prisma.returnPolicy.findMany({
      select: {
        id: true,
        returnDeadline: true,
        returnStatus: true,
      },
    }),
  ]);

  let warrantiesUpdated = 0;
  let returnsUpdated = 0;

  const warrantyUpdates: Promise<unknown>[] = [];
  for (const w of warranties) {
    const calculated = calculateWarrantyStatus(w.endDate, w.warrantyType, referenceDate);
    if (w.status !== calculated) {
      warrantiesUpdated++;
      warrantyUpdates.push(
        prisma.warranty.update({
          where: { id: w.id },
          data: { status: calculated },
        })
      );
    }
  }

  const returnUpdates: Promise<unknown>[] = [];
  for (const p of returnPolicies) {
    if (p.returnStatus === "RETURNED") continue;
    const calculated = calculateReturnStatus(p.returnDeadline, p.returnStatus, referenceDate);
    if (p.returnStatus !== calculated) {
      returnsUpdated++;
      returnUpdates.push(
        prisma.returnPolicy.update({
          where: { id: p.id },
          data: { returnStatus: calculated },
        })
      );
    }
  }

  if (warrantyUpdates.length > 0 || returnUpdates.length > 0) {
    await prisma.$transaction([...warrantyUpdates, ...returnUpdates]);
  }

  return {
    warrantiesChecked: warranties.length,
    warrantiesUpdated,
    returnsChecked: returnPolicies.length,
    returnsUpdated,
  };
}
