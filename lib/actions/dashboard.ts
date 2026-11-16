"use server";

import prisma from "@/lib/prisma";
import { ActionResult } from "@/lib/actions/assets";
import { enhanceWarranty, enhanceReturnPolicy } from "@/lib/services/deadlines";
import { enhanceMaintenanceSchedule } from "@/lib/services/maintenanceEngine";

export interface DashboardMetrics {
  totalAssets: number;
  physicalCount: number;
  digitalCount: number;
  activeWarranties: number;
  expiringSoonCount: number;
  activeReturnWindows: number;
  coveragePercentage: number;
  pendingMaintenanceCount: number;
  totalMaintenanceSpent: number;
}

export interface UpcomingDeadlineItem {
  id: string;
  name: string;
  category: string;
  type: string;
  daysLeft: number;
  date: string;
  status: "urgent" | "expiring" | "normal";
  link: string;
}

export interface RecentAssetItem {
  id: string;
  name: string;
  category: string;
  merchant: string;
  purchaseDate: string;
  price: string;
  warranty: string;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  upcomingDeadlines: UpcomingDeadlineItem[];
  recentAssets: RecentAssetItem[];
}

export async function getDashboardData(): Promise<ActionResult<DashboardData>> {
  try {
    // 1. Fetch all assets with related records
    const assets = await prisma.asset.findMany({
      include: {
        warranties: {
          orderBy: { endDate: "asc" },
        },
        returnPolicies: {
          orderBy: { returnDeadline: "asc" },
        },
        receipts: {
          take: 1,
          orderBy: { purchaseDate: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalAssets = assets.length;

    // Physical vs Digital category breakdown
    const digitalCategories = ["Software", "Subscription", "License", "Digital", "Account"];
    let digitalCount = 0;
    let physicalCount = 0;

    for (const a of assets) {
      if (digitalCategories.includes(a.category)) {
        digitalCount++;
      } else {
        physicalCount++;
      }
    }

    // 2. Fetch and enhance all warranties
    const rawWarranties = await prisma.warranty.findMany({
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            category: true,
            brand: true,
          },
        },
      },
      orderBy: { endDate: "asc" },
    });
    const enhancedWarranties = rawWarranties.map((w) => enhanceWarranty(w));

    // 3. Fetch and enhance all return policies
    const rawReturnPolicies = await prisma.returnPolicy.findMany({
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            category: true,
            brand: true,
          },
        },
      },
      orderBy: { returnDeadline: "asc" },
    });
    const enhancedReturns = rawReturnPolicies.map((r) => enhanceReturnPolicy(r));

    // 4. Fetch and enhance all maintenance schedules
    const rawMaintenance = await prisma.maintenanceSchedule.findMany({
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            category: true,
            brand: true,
          },
        },
      },
      orderBy: { nextServiceDate: "asc" },
    });
    const enhancedMaintenance = rawMaintenance.map((m) => enhanceMaintenanceSchedule(m));

    // Fetch total maintenance spent
    const maintenanceLogs = await prisma.maintenanceLog.findMany({
      select: { cost: true },
    });
    const totalMaintenanceSpent = maintenanceLogs.reduce((sum, log) => sum + (log.cost ?? 0), 0);

    const pendingMaintenanceCount = enhancedMaintenance.filter(
      (m) => m.calculatedStatus === "DUE" || m.calculatedStatus === "OVERDUE"
    ).length;

    // 5. Compute core metrics
    const activeWarranties = enhancedWarranties.filter(
      (w) => w.calculatedStatus === "ACTIVE"
    ).length;

    const expiringWarrantiesCount = enhancedWarranties.filter(
      (w) => w.remainingDays >= 0 && w.remainingDays <= 30
    ).length;

    const expiringReturnsCount = enhancedReturns.filter(
      (r) => r.remainingDays >= 0 && r.remainingDays <= 7 && r.calculatedStatus !== "RETURNED"
    ).length;

    const expiringSoonCount = expiringWarrantiesCount + expiringReturnsCount;

    const activeReturnWindows = enhancedReturns.filter(
      (r) => r.remainingDays > 0 && r.calculatedStatus !== "RETURNED"
    ).length;

    const coveragePercentage = totalAssets > 0
      ? Math.min(100, Math.round((activeWarranties / totalAssets) * 100))
      : 0;

    const metrics: DashboardMetrics = {
      totalAssets,
      physicalCount,
      digitalCount,
      activeWarranties,
      expiringSoonCount,
      activeReturnWindows,
      coveragePercentage,
      pendingMaintenanceCount,
      totalMaintenanceSpent,
    };

    // 5. Construct sorted Upcoming Deadlines
    const deadlineCandidates: UpcomingDeadlineItem[] = [];

    // Warranties expiring within 60 days
    for (const w of enhancedWarranties) {
      if (w.remainingDays >= 0 && w.remainingDays <= 60 && w.endDate) {
        deadlineCandidates.push({
          id: `w-${w.id}`,
          name: w.asset?.name || "Asset",
          category: w.asset?.category || "Electronics",
          type: w.warrantyType === "EXTENDED" ? "Extended Warranty" : "Warranty",
          daysLeft: w.remainingDays,
          date: new Date(w.endDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          status: w.remainingDays <= 7 ? "urgent" : w.remainingDays <= 30 ? "expiring" : "normal",
          link: "/warranties",
        });
      }
    }

    // Return windows that are still open or expiring
    for (const r of enhancedReturns) {
      if (r.remainingDays >= 0 && r.calculatedStatus !== "RETURNED" && r.returnDeadline) {
        deadlineCandidates.push({
          id: `r-${r.id}`,
          name: r.asset?.name || "Asset",
          category: r.asset?.category || "Purchase",
          type: "Return Window",
          daysLeft: r.remainingDays,
          date: new Date(r.returnDeadline).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          status: r.remainingDays <= 7 ? "urgent" : "expiring",
          link: "/warranties",
        });
      }
    }

    // Maintenance schedules that are OVERDUE, DUE, or upcoming within 30 days
    for (const m of enhancedMaintenance) {
      if (m.calculatedStatus === "COMPLETED") continue;
      const isUrgentOrDue = m.calculatedStatus === "OVERDUE" || m.calculatedStatus === "DUE";
      const isUpcomingSoon = m.remainingDays !== null && m.remainingDays !== undefined && m.remainingDays <= 30;

      if (isUrgentOrDue || isUpcomingSoon) {
        deadlineCandidates.push({
          id: `m-${m.id}`,
          name: `${m.asset?.name || "Asset"} — ${m.title}`,
          category: m.asset?.category || "Maintenance",
          type: "Service Schedule",
          daysLeft: m.remainingDays ?? 0,
          date: m.nextServiceDate
            ? new Date(m.nextServiceDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : m.remainingMileage !== null && m.remainingMileage !== undefined
            ? `${m.remainingMileage} mi left`
            : "Pending",
          status: m.calculatedStatus === "OVERDUE" ? "urgent" : m.calculatedStatus === "DUE" ? "expiring" : "normal",
          link: "/maintenance",
        });
      }
    }

    deadlineCandidates.sort((a, b) => a.daysLeft - b.daysLeft);
    const upcomingDeadlines = deadlineCandidates.slice(0, 6);

    // 6. Construct 5 Recent Assets with status
    const recentAssets: RecentAssetItem[] = assets.slice(0, 5).map((a) => {
      const receipt = a.receipts[0];
      const primaryWarranty = a.warranties[0];
      let warrantyText = "No Warranty";

      if (primaryWarranty) {
        const enhW = enhanceWarranty(primaryWarranty);
        if (enhW.calculatedStatus === "ACTIVE") {
          warrantyText = primaryWarranty.durationMonths
            ? `${Math.round(primaryWarranty.durationMonths / 12)} Year Active`
            : "Active Coverage";
        } else if (enhW.calculatedStatus === "EXPIRING_SOON") {
          warrantyText = `Expires in ${enhW.remainingDays}d`;
        } else {
          warrantyText = "Expired";
        }
      }

      return {
        id: a.id,
        name: a.name,
        category: a.category,
        merchant: receipt?.merchant || a.brand || "Retailer",
        purchaseDate: a.purchaseDate
          ? new Date(a.purchaseDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "N/A",
        price: a.purchasePrice !== null && a.purchasePrice !== undefined
          ? `$${a.purchasePrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : "N/A",
        warranty: warrantyText,
      };
    });

    return {
      success: true,
      data: {
        metrics,
        upcomingDeadlines,
        recentAssets,
      },
    };
  } catch (error) {
    console.error("Failed to get dashboard data:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to load dashboard data",
    };
  }
}
