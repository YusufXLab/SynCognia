import prisma from "@/lib/prisma";
import { calculateRemainingDays } from "@/lib/services/deadlines";

export type AlertUrgency = "CRITICAL" | "WARNING" | "INFO";

export type AlertType =
  | "WARRANTY_EXPIRING"
  | "WARRANTY_EXPIRED"
  | "RETURN_WINDOW_CLOSING"
  | "RETURN_WINDOW_EXPIRED";

export interface NotificationAlert {
  id: string;
  type: AlertType;
  urgency: AlertUrgency;
  title: string;
  message: string;
  deadlineDate: Date;
  remainingDays: number;
  assetId: string;
  assetName: string;
  actionUrl: string;
  actionLabel: string;
  createdAt: Date;
}

export interface AlertSummary {
  total: number;
  critical: number;
  warning: number;
  info: number;
}

export interface GetActiveAlertsOptions {
  userId?: string;
  referenceDate?: Date;
}

const URGENCY_PRIORITY: Record<AlertUrgency, number> = {
  CRITICAL: 1,
  WARNING: 2,
  INFO: 3,
};

/**
 * Computes proactive notification alerts across all active assets, warranties,
 * and return windows. Prioritizes alerts by urgency (CRITICAL -> WARNING -> INFO)
 * and remaining days.
 */
export async function getActiveAlerts(
  options?: GetActiveAlertsOptions
): Promise<{ alerts: NotificationAlert[]; summary: AlertSummary }> {
  const referenceDate = options?.referenceDate ?? new Date();
  const whereAssetUser = options?.userId ? { userId: options.userId } : undefined;

  const [warranties, returnPolicies] = await Promise.all([
    prisma.warranty.findMany({
      where: whereAssetUser ? { asset: whereAssetUser } : undefined,
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            brand: true,
            modelNumber: true,
          },
        },
      },
    }),
    prisma.returnPolicy.findMany({
      where: whereAssetUser ? { asset: whereAssetUser } : undefined,
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            brand: true,
            modelNumber: true,
          },
        },
      },
    }),
  ]);

  const alerts: NotificationAlert[] = [];

  // Evaluate Warranty Alerts
  for (const w of warranties) {
    if (!w.endDate || w.warrantyType === "LIFETIME") {
      continue;
    }

    const remainingDays = calculateRemainingDays(w.endDate, referenceDate);
    const assetName = w.asset?.name || "Asset";
    const deadlineDate = new Date(w.endDate);

    if (remainingDays < 0) {
      // Recently expired (within last 14 days)
      if (remainingDays >= -14) {
        const daysAgo = Math.abs(remainingDays);
        alerts.push({
          id: `alert-warranty-expired-${w.id}`,
          type: "WARRANTY_EXPIRED",
          urgency: "INFO",
          title: `Warranty expired for ${assetName}`,
          message: `The warranty for ${assetName} expired ${daysAgo} day${daysAgo === 1 ? "" : "s"} ago.`,
          deadlineDate,
          remainingDays,
          assetId: w.assetId,
          assetName,
          actionUrl: `/assets/${w.assetId}`,
          actionLabel: "View Asset",
          createdAt: referenceDate,
        });
      }
    } else if (remainingDays <= 1) {
      // Critical: 0 or 1 day left
      const isToday = remainingDays === 0;
      alerts.push({
        id: `alert-warranty-expiring-${w.id}`,
        type: "WARRANTY_EXPIRING",
        urgency: "CRITICAL",
        title: isToday
          ? `Warranty expires today for ${assetName}`
          : `Warranty expires tomorrow for ${assetName}`,
        message: `Warranty coverage for ${assetName} expires ${
          isToday ? "today" : "tomorrow"
        }. Review your coverage or submit any claims now.`,
        deadlineDate,
        remainingDays,
        assetId: w.assetId,
        assetName,
        actionUrl: w.claimUrl || `/assets/${w.assetId}`,
        actionLabel: w.claimUrl ? "File Claim" : "View Warranty",
        createdAt: referenceDate,
      });
    } else if (remainingDays <= 7) {
      // Warning: 2 to 7 days
      alerts.push({
        id: `alert-warranty-expiring-${w.id}`,
        type: "WARRANTY_EXPIRING",
        urgency: "WARNING",
        title: `Warranty expires in ${remainingDays} days for ${assetName}`,
        message: `The warranty coverage for ${assetName} ends soon (${deadlineDate.toLocaleDateString()}).`,
        deadlineDate,
        remainingDays,
        assetId: w.assetId,
        assetName,
        actionUrl: `/assets/${w.assetId}`,
        actionLabel: "View Coverage",
        createdAt: referenceDate,
      });
    } else if (remainingDays <= 30) {
      // Info: 8 to 30 days
      alerts.push({
        id: `alert-warranty-expiring-${w.id}`,
        type: "WARRANTY_EXPIRING",
        urgency: "INFO",
        title: `Warranty expiring this month for ${assetName}`,
        message: `The warranty for ${assetName} has ${remainingDays} days remaining before expiration.`,
        deadlineDate,
        remainingDays,
        assetId: w.assetId,
        assetName,
        actionUrl: `/assets/${w.assetId}`,
        actionLabel: "Review Details",
        createdAt: referenceDate,
      });
    }
  }

  // Evaluate Return Policy Alerts
  for (const p of returnPolicies) {
    if (p.returnStatus === "RETURNED" || !p.returnDeadline) {
      continue;
    }

    const remainingDays = calculateRemainingDays(p.returnDeadline, referenceDate);
    const assetName = p.asset?.name || "Asset";
    const deadlineDate = new Date(p.returnDeadline);

    if (remainingDays < 0) {
      // Recently expired return window (within last 7 days)
      if (remainingDays >= -7) {
        const daysAgo = Math.abs(remainingDays);
        alerts.push({
          id: `alert-return-expired-${p.id}`,
          type: "RETURN_WINDOW_EXPIRED",
          urgency: "INFO",
          title: `Return window expired for ${assetName}`,
          message: `The return deadline for ${assetName} passed ${daysAgo} day${daysAgo === 1 ? "" : "s"} ago.`,
          deadlineDate,
          remainingDays,
          assetId: p.assetId,
          assetName,
          actionUrl: `/assets/${p.assetId}`,
          actionLabel: "View Asset",
          createdAt: referenceDate,
        });
      }
    } else if (remainingDays <= 1) {
      // Critical: 0 or 1 day left
      const isToday = remainingDays === 0;
      alerts.push({
        id: `alert-return-closing-${p.id}`,
        type: "RETURN_WINDOW_CLOSING",
        urgency: "CRITICAL",
        title: isToday
          ? `Last day to return ${assetName}!`
          : `Return window closes tomorrow for ${assetName}`,
        message: `The return window for ${assetName} closes ${
          isToday ? "today" : "tomorrow"
        }. Make your final return or exchange decision.`,
        deadlineDate,
        remainingDays,
        assetId: p.assetId,
        assetName,
        actionUrl: `/assets/${p.assetId}`,
        actionLabel: "View Policy",
        createdAt: referenceDate,
      });
    } else if (remainingDays <= 7) {
      // Warning: 2 to 7 days
      alerts.push({
        id: `alert-return-closing-${p.id}`,
        type: "RETURN_WINDOW_CLOSING",
        urgency: "WARNING",
        title: `Return window closes in ${remainingDays} days for ${assetName}`,
        message: `You have ${remainingDays} days left to initiate a return for ${assetName}.`,
        deadlineDate,
        remainingDays,
        assetId: p.assetId,
        assetName,
        actionUrl: `/assets/${p.assetId}`,
        actionLabel: "View Policy",
        createdAt: referenceDate,
      });
    }
  }

  // Sort alerts: CRITICAL first, then WARNING, then INFO; within tier, by remainingDays ascending
  alerts.sort((a, b) => {
    const rankDiff = URGENCY_PRIORITY[a.urgency] - URGENCY_PRIORITY[b.urgency];
    if (rankDiff !== 0) return rankDiff;
    return a.remainingDays - b.remainingDays;
  });

  const summary: AlertSummary = {
    total: alerts.length,
    critical: alerts.filter((a) => a.urgency === "CRITICAL").length,
    warning: alerts.filter((a) => a.urgency === "WARNING").length,
    info: alerts.filter((a) => a.urgency === "INFO").length,
  };

  return { alerts, summary };
}
