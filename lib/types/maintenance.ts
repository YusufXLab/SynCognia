import { MaintenanceSchedule, MaintenanceLog, Asset } from "@prisma/client";

export type MaintenanceStatus = "UPCOMING" | "DUE" | "OVERDUE" | "COMPLETED";

export interface CalculatedMaintenanceFields {
  remainingDays: number | null;
  remainingMileage: number | null;
  calculatedStatus: MaintenanceStatus;
  isDueSoon: boolean;
  isOverdue: boolean;
  isCompleted: boolean;
  progressPercentage: number | null;
}

export interface EnhancedMaintenanceSchedule extends MaintenanceSchedule, CalculatedMaintenanceFields {
  asset?: Asset;
  serviceLogs?: MaintenanceLog[];
}

export interface CreateMaintenanceScheduleInput {
  assetId: string;
  title: string;
  intervalMonths?: number | null;
  intervalMileage?: number | null;
  lastServiceDate?: Date | string | null;
  nextServiceDate?: Date | string | null;
  lastServiceMileage?: number | null;
  currentMileage?: number | null;
  lastServiceCost?: number | null;
  notes?: string | null;
  status?: MaintenanceStatus;
}

export interface UpdateMaintenanceScheduleInput {
  assetId?: string;
  title?: string;
  intervalMonths?: number | null;
  intervalMileage?: number | null;
  lastServiceDate?: Date | string | null;
  nextServiceDate?: Date | string | null;
  lastServiceMileage?: number | null;
  currentMileage?: number | null;
  lastServiceCost?: number | null;
  notes?: string | null;
  status?: MaintenanceStatus;
}

export interface LogServiceInput {
  scheduleId?: string | null;
  assetId: string;
  title?: string | null;
  serviceDate: Date | string;
  mileage?: number | null;
  cost?: number | null;
  serviceProvider?: string | null;
  notes?: string | null;
  receiptUrl?: string | null;
}

export interface MaintenanceMetrics {
  totalSchedules: number;
  upcomingCount: number;
  dueSoonCount: number;
  overdueCount: number;
  totalExpenditure: number;
}

export interface MaintenanceSyncResult {
  schedulesChecked: number;
  schedulesUpdated: number;
}

export interface RecurrenceAdvancementResult {
  lastServiceDate: Date;
  nextServiceDate: Date | null;
  lastServiceMileage: number | null;
  currentMileage: number | null;
  lastServiceCost: number | null;
  status: MaintenanceStatus;
}
