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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EnhancedWarranty<T = any> = T & CalculatedWarrantyFields;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EnhancedReturnPolicy<T = any> = T & CalculatedReturnPolicyFields;
