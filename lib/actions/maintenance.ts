"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { ActionResult } from "@/lib/actions/assets";
import {
  EnhancedMaintenanceSchedule,
  CreateMaintenanceScheduleInput,
  UpdateMaintenanceScheduleInput,
  LogServiceInput,
  MaintenanceMetrics,
} from "@/lib/types/maintenance";
import {
  addMonthsSafely,
  calculateRemainingDays,
  calculateRemainingMileage,
  calculateMaintenanceStatus,
  enhanceMaintenanceSchedule,
  advanceRecurrenceCycle,
} from "@/lib/services/maintenanceEngine";
import { MaintenanceLog } from "@prisma/client";

function safeRevalidate(paths: string[] = ["/maintenance", "/", "/assets"]) {
  try {
    for (const p of paths) {
      revalidatePath(p);
    }
  } catch {
    // Revalidation ignored outside active Next.js request context
  }
}

/**
 * Retrieves all maintenance schedules with optional filters for status, asset, or category.
 * Dynamically computes real-time remaining days/miles and sorts by urgency.
 */
export async function getMaintenanceSchedules(filter?: {
  status?: string;
  assetId?: string;
  category?: string;
}): Promise<ActionResult<EnhancedMaintenanceSchedule[]>> {
  try {
    const where: Record<string, unknown> = {};

    if (filter?.assetId) {
      where.assetId = filter.assetId;
    }
    if (filter?.category) {
      where.asset = { category: filter.category };
    }

    const schedules = await prisma.maintenanceSchedule.findMany({
      where,
      include: {
        asset: true,
        serviceLogs: {
          orderBy: { serviceDate: "desc" },
          take: 5,
        },
      },
      orderBy: [
        { nextServiceDate: "asc" },
        { createdAt: "desc" },
      ],
    });

    let enhanced = schedules.map((schedule) => enhanceMaintenanceSchedule(schedule));

    if (filter?.status) {
      enhanced = enhanced.filter(
        (s) => s.calculatedStatus.toUpperCase() === filter.status!.toUpperCase()
      );
    }

    // Sort by status urgency: OVERDUE (0), DUE (1), UPCOMING (2), COMPLETED (3)
    const statusWeight: Record<string, number> = {
      OVERDUE: 0,
      DUE: 1,
      UPCOMING: 2,
      COMPLETED: 3,
    };

    enhanced.sort((a, b) => {
      const weightA = statusWeight[a.calculatedStatus] ?? 99;
      const weightB = statusWeight[b.calculatedStatus] ?? 99;
      if (weightA !== weightB) {
        return weightA - weightB;
      }

      // Within same status, sort by remainingDays ascending (nulls last)
      if (a.remainingDays === null && b.remainingDays === null) return 0;
      if (a.remainingDays === null) return 1;
      if (b.remainingDays === null) return -1;
      return a.remainingDays - b.remainingDays;
    });

    return { success: true, data: enhanced };
  } catch (error) {
    console.error("Failed to get maintenance schedules:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to fetch maintenance schedules",
    };
  }
}

/**
 * Retrieves a single maintenance schedule by ID with full service logs history.
 */
export async function getMaintenanceScheduleById(
  id: string
): Promise<ActionResult<EnhancedMaintenanceSchedule>> {
  try {
    const schedule = await prisma.maintenanceSchedule.findUnique({
      where: { id },
      include: {
        asset: true,
        serviceLogs: {
          orderBy: { serviceDate: "desc" },
        },
      },
    });

    if (!schedule) {
      return { success: false, error: "Maintenance schedule not found" };
    }

    const enhanced = enhanceMaintenanceSchedule(schedule);
    return { success: true, data: enhanced };
  } catch (error) {
    console.error(`Failed to get maintenance schedule ${id}:`, error);
    return {
      success: false,
      error: (error as Error).message || "Failed to fetch maintenance schedule",
    };
  }
}

/**
 * Creates a new maintenance schedule with dual-interval options (calendar and/or mileage).
 */
export async function createMaintenanceSchedule(
  input: CreateMaintenanceScheduleInput
): Promise<ActionResult<EnhancedMaintenanceSchedule>> {
  try {
    if (!input.assetId?.trim()) {
      return { success: false, error: "Asset ID is required" };
    }
    if (!input.title?.trim()) {
      return { success: false, error: "Schedule title is required" };
    }

    const asset = await prisma.asset.findUnique({
      where: { id: input.assetId },
    });
    if (!asset) {
      return { success: false, error: "Associated asset not found" };
    }

    const lastServiceDate = input.lastServiceDate ? new Date(input.lastServiceDate) : null;
    let nextServiceDate = input.nextServiceDate ? new Date(input.nextServiceDate) : null;

    // If intervalMonths provided without an explicit nextServiceDate, calculate next service date
    if (!nextServiceDate && input.intervalMonths && input.intervalMonths > 0) {
      const baseDate = lastServiceDate ?? new Date();
      nextServiceDate = addMonthsSafely(baseDate, input.intervalMonths);
    }

    const remainingDays = calculateRemainingDays(nextServiceDate);
    const remainingMileage = calculateRemainingMileage(
      input.lastServiceMileage,
      input.intervalMileage,
      input.currentMileage
    );

    const initialStatus =
      input.status ||
      calculateMaintenanceStatus({
        nextServiceDate,
        remainingDays,
        remainingMileage,
      });

    const schedule = await prisma.maintenanceSchedule.create({
      data: {
        assetId: input.assetId,
        title: input.title.trim(),
        intervalMonths: input.intervalMonths ?? null,
        intervalMileage: input.intervalMileage ?? null,
        lastServiceDate,
        nextServiceDate,
        lastServiceMileage: input.lastServiceMileage ?? null,
        currentMileage: input.currentMileage ?? null,
        lastServiceCost: input.lastServiceCost ?? null,
        notes: input.notes?.trim() ?? null,
        status: initialStatus,
      },
      include: {
        asset: true,
        serviceLogs: true,
      },
    });

    safeRevalidate(["/maintenance", "/", "/assets", `/assets/${input.assetId}`]);

    return { success: true, data: enhanceMaintenanceSchedule(schedule) };
  } catch (error) {
    console.error("Failed to create maintenance schedule:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to create maintenance schedule",
    };
  }
}

/**
 * Updates an existing maintenance schedule and recalculates status.
 */
export async function updateMaintenanceSchedule(
  id: string,
  input: UpdateMaintenanceScheduleInput
): Promise<ActionResult<EnhancedMaintenanceSchedule>> {
  try {
    const existing = await prisma.maintenanceSchedule.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Maintenance schedule not found" };
    }

    const lastServiceDate =
      input.lastServiceDate !== undefined
        ? input.lastServiceDate
          ? new Date(input.lastServiceDate)
          : null
        : existing.lastServiceDate;

    let nextServiceDate =
      input.nextServiceDate !== undefined
        ? input.nextServiceDate
          ? new Date(input.nextServiceDate)
          : null
        : existing.nextServiceDate;

    const intervalMonths =
      input.intervalMonths !== undefined ? input.intervalMonths : existing.intervalMonths;
    const intervalMileage =
      input.intervalMileage !== undefined ? input.intervalMileage : existing.intervalMileage;
    const lastServiceMileage =
      input.lastServiceMileage !== undefined
        ? input.lastServiceMileage
        : existing.lastServiceMileage;
    const currentMileage =
      input.currentMileage !== undefined ? input.currentMileage : existing.currentMileage;

    if (!nextServiceDate && intervalMonths && intervalMonths > 0) {
      const baseDate = lastServiceDate ?? new Date();
      nextServiceDate = addMonthsSafely(baseDate, intervalMonths);
    }

    const remainingDays = calculateRemainingDays(nextServiceDate);
    const remainingMileage = calculateRemainingMileage(
      lastServiceMileage,
      intervalMileage,
      currentMileage
    );

    const calculatedStatus =
      input.status ||
      calculateMaintenanceStatus({
        nextServiceDate,
        remainingDays,
        remainingMileage,
        isExplicitlyCompleted: input.status === "COMPLETED",
      });

    const updated = await prisma.maintenanceSchedule.update({
      where: { id },
      data: {
        ...(input.title && { title: input.title.trim() }),
        ...(input.assetId && { assetId: input.assetId }),
        intervalMonths,
        intervalMileage,
        lastServiceDate,
        nextServiceDate,
        lastServiceMileage,
        currentMileage,
        ...(input.lastServiceCost !== undefined && { lastServiceCost: input.lastServiceCost }),
        ...(input.notes !== undefined && { notes: input.notes?.trim() ?? null }),
        status: calculatedStatus,
      },
      include: {
        asset: true,
        serviceLogs: {
          orderBy: { serviceDate: "desc" },
        },
      },
    });

    safeRevalidate(["/maintenance", "/", "/assets", `/assets/${updated.assetId}`]);

    return { success: true, data: enhanceMaintenanceSchedule(updated) };
  } catch (error) {
    console.error(`Failed to update maintenance schedule ${id}:`, error);
    return {
      success: false,
      error: (error as Error).message || "Failed to update maintenance schedule",
    };
  }
}

/**
 * Deletes a maintenance schedule.
 */
export async function deleteMaintenanceSchedule(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const existing = await prisma.maintenanceSchedule.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Maintenance schedule not found" };
    }

    await prisma.maintenanceSchedule.delete({ where: { id } });

    safeRevalidate(["/maintenance", "/", "/assets", `/assets/${existing.assetId}`]);

    return { success: true, data: { id } };
  } catch (error) {
    console.error(`Failed to delete maintenance schedule ${id}:`, error);
    return {
      success: false,
      error: (error as Error).message || "Failed to delete maintenance schedule",
    };
  }
}

/**
 * Logs a completed maintenance service event.
 * Creates an immutable MaintenanceLog and advances the linked schedule's recurrence cycle.
 */
export async function logServiceCompleted(
  input: LogServiceInput
): Promise<ActionResult<{ schedule?: EnhancedMaintenanceSchedule; log: MaintenanceLog }>> {
  try {
    let linkedSchedule = null;
    if (input.scheduleId) {
      linkedSchedule = await prisma.maintenanceSchedule.findUnique({
        where: { id: input.scheduleId },
        include: { asset: true },
      });
      if (!linkedSchedule) {
        return { success: false, error: "Maintenance schedule not found" };
      }
    }

    const resolvedAssetId = input.assetId?.trim() || linkedSchedule?.assetId;
    if (!resolvedAssetId) {
      return { success: false, error: "Asset ID is required" };
    }

    const serviceDate = input.serviceDate ? new Date(input.serviceDate) : new Date();
    if (isNaN(serviceDate.getTime())) {
      return { success: false, error: "Valid service date is required" };
    }

    const logTitle =
      input.title?.trim() || linkedSchedule?.title || "Maintenance Service Completed";

    // 1. Create immutable service log record
    const serviceLog = await prisma.maintenanceLog.create({
      data: {
        maintenanceScheduleId: linkedSchedule?.id ?? null,
        assetId: resolvedAssetId,
        title: logTitle,
        serviceDate,
        mileage: input.mileage ?? null,
        cost: input.cost ?? null,
        serviceProvider: input.serviceProvider?.trim() ?? null,
        notes: input.notes?.trim() ?? null,
        receiptUrl: input.receiptUrl?.trim() ?? null,
      },
    });

    // 2. If schedule is linked, advance cycle and update
    let updatedEnhancedSchedule: EnhancedMaintenanceSchedule | undefined;
    if (linkedSchedule) {
      const advancement = advanceRecurrenceCycle(linkedSchedule, {
        serviceDate,
        mileage: input.mileage,
        cost: input.cost,
      });

      const updatedSchedule = await prisma.maintenanceSchedule.update({
        where: { id: linkedSchedule.id },
        data: {
          lastServiceDate: advancement.lastServiceDate,
          nextServiceDate: advancement.nextServiceDate,
          lastServiceMileage: advancement.lastServiceMileage,
          currentMileage: advancement.currentMileage,
          lastServiceCost: advancement.lastServiceCost,
          status: advancement.status,
        },
        include: {
          asset: true,
          serviceLogs: {
            orderBy: { serviceDate: "desc" },
            take: 5,
          },
        },
      });

      updatedEnhancedSchedule = enhanceMaintenanceSchedule(updatedSchedule);
    }

    safeRevalidate(["/maintenance", "/", "/assets", `/assets/${input.assetId}`]);

    return {
      success: true,
      data: {
        schedule: updatedEnhancedSchedule,
        log: serviceLog,
      },
    };
  } catch (error) {
    console.error("Failed to log completed maintenance service:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to log completed maintenance service",
    };
  }
}

/**
 * Retrieves historical maintenance logs ordered by serviceDate descending.
 */
export async function getMaintenanceLogs(filter?: {
  assetId?: string;
  scheduleId?: string;
}): Promise<ActionResult<MaintenanceLog[]>> {
  try {
    const where: Record<string, unknown> = {};

    if (filter?.assetId) {
      where.assetId = filter.assetId;
    }
    if (filter?.scheduleId) {
      where.maintenanceScheduleId = filter.scheduleId;
    }

    const logs = await prisma.maintenanceLog.findMany({
      where,
      include: {
        asset: true,
        maintenanceSchedule: true,
      },
      orderBy: { serviceDate: "desc" },
    });

    return { success: true, data: logs };
  } catch (error) {
    console.error("Failed to get maintenance logs:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to fetch maintenance logs",
    };
  }
}

/**
 * Summarizes KPI metrics for preventive maintenance:
 * total schedules, upcoming, due soon, overdue, and cumulative service expenditure.
 */
export async function getMaintenanceSummaryMetrics(): Promise<ActionResult<MaintenanceMetrics>> {
  try {
    const schedules = await prisma.maintenanceSchedule.findMany({
      include: { asset: true },
    });

    let upcomingCount = 0;
    let dueSoonCount = 0;
    let overdueCount = 0;

    for (const s of schedules) {
      const enhanced = enhanceMaintenanceSchedule(s);
      if (enhanced.calculatedStatus === "OVERDUE") {
        overdueCount++;
      } else if (enhanced.calculatedStatus === "DUE") {
        dueSoonCount++;
      } else if (enhanced.calculatedStatus === "UPCOMING") {
        upcomingCount++;
      }
    }

    const expenditure = await prisma.maintenanceLog.aggregate({
      _sum: {
        cost: true,
      },
    });

    const totalExpenditure = expenditure._sum.cost ?? 0;

    return {
      success: true,
      data: {
        totalSchedules: schedules.length,
        upcomingCount,
        dueSoonCount,
        overdueCount,
        totalExpenditure,
      },
    };
  } catch (error) {
    console.error("Failed to get maintenance summary metrics:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to calculate maintenance metrics",
    };
  }
}
