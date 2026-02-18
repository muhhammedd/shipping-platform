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
// AUTH USER — Core authenticated user type
// ─────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
  branchId: string | null;
  status?: UserStatus;
}

// ─────────────────────────────────────────
// API RESPONSE TYPES
// ─────────────────────────────────────────

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
// ENTITY TYPES
// ─────────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  settings: {
    maxDeliveryAttempts?: number;
  };
  createdAt: string;
  updatedAt: string;
  _count?: {
    users: number;
    branches: number;
    shipments: number;
  };
}

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  city: string;
  address: string;
  status: BranchStatus;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users: number;
    shipments: number;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  tenantId?: string;
  branchId?: string;
  createdAt: string;
  updatedAt: string;
  branch?: Branch;
}

export interface Shipment {
  id: string;
  trackingNumber: string;
  tenantId: string;
  branchId: string;
  merchantId: string;
  courierId?: string;
  status: ShipmentStatus;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  city: string;
  weight: number;
  price: number;
  codAmount: number;
  notes?: string;
  maxAttempts: number;
  attemptCount: number;
  createdAt: string;
  updatedAt: string;
  merchant?: User;
  courier?: User;
  branch?: Branch;
  codRecord?: CODRecord;
}

export interface ShipmentStatusHistory {
  id: string;
  shipmentId: string;
  status: ShipmentStatus;
  changedBy: string;
  note?: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    role: UserRole;
  };
}

export interface CODRecord {
  id: string;
  shipmentId: string;
  tenantId: string;
  merchantId: string;
  courierId: string;
  amount: number;
  collectedAt: string;
  status: CODRecordStatus;
  settlementId?: string;
  shipment?: Shipment;
  merchant?: User;
  courier?: User;
  settlement?: CODSettlement;
}

export interface CODSettlement {
  id: string;
  tenantId: string;
  merchantId: string;
  totalAmount: number;
  status: CODSettlementStatus;
  confirmedBy?: string;
  confirmedAt?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  merchant?: User;
  confirmer?: User;
  _count?: {
    codRecords: number;
  };
  codRecords?: CODRecord[];
}

export interface PricingRule {
  id: string;
  tenantId: string;
  merchantId?: string;
  zone: string;
  weightFrom: number;
  weightTo: number;
  basePrice: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  merchant?: User;
}

// ─────────────────────────────────────────
// STATS TYPES
// ─────────────────────────────────────────

export interface CompanyStats {
  totalShipments: number;
  pendingShipments: number;
  readyForPickup: number;
  assignedToCourier: number;
  outForDelivery: number;
  deliveredToday: number;
  failedAttempts: number;
  returnedShipments: number;
  deliverySuccessRate: number;
  totalCODCollected: number;
  pendingCODSettlements: number;
  totalCODSettled: number;
  totalMerchants: number;
  activeCouriers: number;
}

export interface BranchStats {
  branchId: string;
  totalShipments: number;
  pendingShipments: number;
  outForDelivery: number;
  delivered: number;
  failed: number;
  activeCouriers: number;
}

export interface MerchantStats {
  merchantId: string;
  totalShipments: number;
  pending: number;
  delivered: number;
  cancelled: number;
  pendingCODBalance: number;
  totalCODSettled: number;
}

export interface CourierStats {
  courierId: string;
  totalAssigned: number;
  delivered: number;
  failed: number;
  successRate: number;
  totalCODCollected: number;
  codRecordCount: number;
}

// ─────────────────────────────────────────
// FILTER TYPES
// ─────────────────────────────────────────

export interface ShipmentFilters {
  status?: ShipmentStatus;
  merchantId?: string;
  courierId?: string;
  branchId?: string;
  city?: string;
  trackingNumber?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface UserFilters {
  role?: UserRole;
  branchId?: string;
  status?: UserStatus;
  page?: number;
  limit?: number;
}

export interface CODRecordFilters {
  merchantId?: string;
  status?: CODRecordStatus;
  page?: number;
  limit?: number;
}

export interface CODSettlementFilters {
  merchantId?: string;
  status?: CODSettlementStatus;
  page?: number;
  limit?: number;
}

// ─────────────────────────────────────────
// FORM DTOs
// ─────────────────────────────────────────

export interface LoginDto {
  email: string;
  password: string;
}

export interface CreateBranchDto {
  name: string;
  city: string;
  address: string;
}

export interface CreateUserDto {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: UserRole;
  branchId?: string;
}

export interface CreateShipmentDto {
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  city: string;
  weight: number;
  codAmount: number;
  notes?: string;
}

export interface AssignCourierDto {
  courierId: string;
}

export interface UpdateShipmentStatusDto {
  status: ShipmentStatus;
  note?: string;
  codCollected?: number;
}

export interface CreateSettlementDto {
  merchantId: string;
  note?: string;
}

export interface ConfirmPayoutDto {
  note?: string;
}

export interface CreatePricingRuleDto {
  merchantId?: string;
  zone: string;
  weightFrom: number;
  weightTo: number;
  basePrice: number;
}

export interface CalculatePriceDto {
  merchantId: string;
  city: string;
  weight: number;
}

// ─────────────────────────────────────────
// ERROR CODES
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

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];
