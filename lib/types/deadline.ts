export type WarrantyStatus = "ACTIVE" | "EXPIRING_SOON" | "EXPIRED";

export type ReturnPolicyStatus = "OPEN" | "EXPIRING_SOON" | "EXPIRED" | "RETURNED";

export interface CalculatedWarrantyFields {
  remainingDays: number;
  percentageElapsed: number;
  calculatedStatus: WarrantyStatus;
  isExpiringSoon: boolean;
  isExpired: boolean;
}

export interface CalculatedReturnPolicyFields {
  remainingDays: number;
  calculatedStatus: ReturnPolicyStatus;
  isExpiringSoon: boolean;
  isExpired: boolean;
  isOpen: boolean;
}

export interface DeadlineSyncResult {
  warrantiesChecked: number;
  warrantiesUpdated: number;
  returnsChecked: number;
  returnsUpdated: number;
}

export type EnhancedWarranty<T = Record<string, unknown>> = T & CalculatedWarrantyFields;

export type EnhancedReturnPolicy<T = Record<string, unknown>> = T & CalculatedReturnPolicyFields;
