// ─────────────────────────────────────────
// ENUMS — mirror Prisma schema exactly
// ─────────────────────────────────────────

export enum TenantStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  COMPANY_ADMIN = 'COMPANY_ADMIN',
  BRANCH_MANAGER = 'BRANCH_MANAGER',
  MERCHANT = 'MERCHANT',
  COURIER = 'COURIER',
}

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum BranchStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum ShipmentStatus {
  PENDING = 'PENDING',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  ASSIGNED_TO_COURIER = 'ASSIGNED_TO_COURIER',
  PICKED_UP = 'PICKED_UP',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  FAILED_ATTEMPT = 'FAILED_ATTEMPT',
  RETURN_IN_PROGRESS = 'RETURN_IN_PROGRESS',
  RETURNED = 'RETURNED',
  CANCELLED = 'CANCELLED',
}

export enum CODRecordStatus {
  COLLECTED = 'COLLECTED',
  SETTLED = 'SETTLED',
}

export enum CODSettlementStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
}

// ─────────────────────────────────────────
// SHIPMENT STATE MACHINE
// Defines which transitions are valid
// ─────────────────────────────────────────

export const VALID_STATUS_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  [ShipmentStatus.PENDING]: [
    ShipmentStatus.READY_FOR_PICKUP,
    ShipmentStatus.CANCELLED,
  ],
  [ShipmentStatus.READY_FOR_PICKUP]: [
    ShipmentStatus.ASSIGNED_TO_COURIER,
    ShipmentStatus.CANCELLED,
  ],
  [ShipmentStatus.ASSIGNED_TO_COURIER]: [
    ShipmentStatus.PICKED_UP,
  ],
  [ShipmentStatus.PICKED_UP]: [
    ShipmentStatus.OUT_FOR_DELIVERY,
  ],
  [ShipmentStatus.OUT_FOR_DELIVERY]: [
    ShipmentStatus.DELIVERED,
    ShipmentStatus.FAILED_ATTEMPT,
  ],
  [ShipmentStatus.FAILED_ATTEMPT]: [
    ShipmentStatus.OUT_FOR_DELIVERY,
    ShipmentStatus.RETURN_IN_PROGRESS,
  ],
  [ShipmentStatus.RETURN_IN_PROGRESS]: [
    ShipmentStatus.RETURNED,
  ],
  [ShipmentStatus.RETURNED]: [],
  [ShipmentStatus.DELIVERED]: [],
  [ShipmentStatus.CANCELLED]: [],
};

// ─────────────────────────────────────────
// CORE TYPES
// ─────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
  branchId: string | null;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details: Array<{ field: string; message: string }>;
  };
}

// ─────────────────────────────────────────
// ERROR CODES — matches Phase 6 API design
// ─────────────────────────────────────────

export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  SHIPMENT_CANNOT_BE_CANCELLED: 'SHIPMENT_CANNOT_BE_CANCELLED',
  SHIPMENT_ALREADY_ASSIGNED: 'SHIPMENT_ALREADY_ASSIGNED',
  MAX_ATTEMPTS_REACHED: 'MAX_ATTEMPTS_REACHED',
  COD_ALREADY_SETTLED: 'COD_ALREADY_SETTLED',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode];
