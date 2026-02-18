import { z } from 'zod';
import { UserRole, ShipmentStatus } from '../types';

// ─────────────────────────────────────────
// REUSABLE FIELD VALIDATORS
// ─────────────────────────────────────────

const uuidSchema = z.string().uuid('Must be a valid UUID');

const emailSchema = z
  .string()
  .email('Must be a valid email address')
  .toLowerCase()
  .trim();

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters');

const phoneSchema = z
  .string()
  .regex(/^\+\d{10,15}$/, 'Phone must be in international format: +[country][number]');

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─────────────────────────────────────────
// AUTH SCHEMAS
// ─────────────────────────────────────────

export const LoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type LoginDto = z.infer<typeof LoginSchema>;

// ─────────────────────────────────────────
// TENANT SCHEMAS
// ─────────────────────────────────────────

export const CreateTenantSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens only')
    .trim(),
  adminName: z.string().min(2).max(100).trim(),
  adminEmail: emailSchema,
  adminPassword: passwordSchema,
  settings: z
    .object({
      maxDeliveryAttempts: z.number().int().min(1).max(10).default(3),
    })
    .optional()
    .default({ maxDeliveryAttempts: 3 }),
});

export type CreateTenantDto = z.infer<typeof CreateTenantSchema>;

export const UpdateTenantStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']),
});

export type UpdateTenantStatusDto = z.infer<typeof UpdateTenantStatusSchema>;

// ─────────────────────────────────────────
// BRANCH SCHEMAS
// ─────────────────────────────────────────

export const CreateBranchSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  city: z.string().min(2).max(100).trim(),
  address: z.string().min(5).max(500).trim(),
});

export type CreateBranchDto = z.infer<typeof CreateBranchSchema>;

export const UpdateBranchSchema = CreateBranchSchema.partial();
export type UpdateBranchDto = z.infer<typeof UpdateBranchSchema>;

// ─────────────────────────────────────────
// USER SCHEMAS
// ─────────────────────────────────────────

export const CreateUserSchema = z
  .object({
    name: z.string().min(2).max(100).trim(),
    email: emailSchema,
    phone: phoneSchema.optional(),
    password: passwordSchema,
    role: z.nativeEnum(UserRole),
    branchId: uuidSchema.optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const rolesRequiringBranch = [UserRole.COURIER, UserRole.BRANCH_MANAGER];
    const rolesForbiddenBranch = [UserRole.MERCHANT, UserRole.COMPANY_ADMIN];

    if (rolesRequiringBranch.includes(data.role) && !data.branchId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['branchId'],
        message: `branchId is required for role ${data.role}`,
      });
    }

    if (rolesForbiddenBranch.includes(data.role) && data.branchId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['branchId'],
        message: `branchId must not be set for role ${data.role}`,
      });
    }
  });

export type CreateUserDto = z.infer<typeof CreateUserSchema>;

export const UpdateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']),
});

export type UpdateUserStatusDto = z.infer<typeof UpdateUserStatusSchema>;

export const UpdateUserBranchSchema = z.object({
  branchId: uuidSchema,
});

export type UpdateUserBranchDto = z.infer<typeof UpdateUserBranchSchema>;

export const GetUsersQuerySchema = paginationSchema.extend({
  role: z.nativeEnum(UserRole).optional(),
  branchId: uuidSchema.optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING']).optional(),
});

export type GetUsersQueryDto = z.infer<typeof GetUsersQuerySchema>;

// ─────────────────────────────────────────
// SHIPMENT SCHEMAS
// ─────────────────────────────────────────

export const CreateShipmentSchema = z.object({
  recipientName: z.string().min(2).max(100).trim(),
  recipientPhone: phoneSchema,
  recipientAddress: z.string().min(5).max(500).trim(),
  city: z.string().min(2).max(100).trim(),
  weight: z
    .number({ invalid_type_error: 'Weight must be a number' })
    .positive('Weight must be greater than 0')
    .multipleOf(0.01, 'Weight can have at most 2 decimal places'),
  codAmount: z
    .number({ invalid_type_error: 'COD amount must be a number' })
    .min(0, 'COD amount cannot be negative')
    .multipleOf(0.01, 'COD amount can have at most 2 decimal places'),
  notes: z.string().max(500).trim().optional(),
});

export type CreateShipmentDto = z.infer<typeof CreateShipmentSchema>;

export const AssignCourierSchema = z.object({
  courierId: uuidSchema,
});

export type AssignCourierDto = z.infer<typeof AssignCourierSchema>;

export const UpdateShipmentStatusSchema = z
  .object({
    status: z.nativeEnum(ShipmentStatus),
    note: z.string().max(500).trim().optional(),
    codCollected: z
      .number()
      .min(0)
      .multipleOf(0.01)
      .optional(),
  });

export type UpdateShipmentStatusDto = z.infer<typeof UpdateShipmentStatusSchema>;

export const GetShipmentsQuerySchema = paginationSchema.extend({
  status: z.nativeEnum(ShipmentStatus).optional(),
  merchantId: uuidSchema.optional(),
  courierId: uuidSchema.optional(),
  branchId: uuidSchema.optional(),
  city: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

export type GetShipmentsQueryDto = z.infer<typeof GetShipmentsQuerySchema>;

// ─────────────────────────────────────────
// COD SCHEMAS
// ─────────────────────────────────────────

export const CreateSettlementSchema = z.object({
  merchantId: uuidSchema,
  note: z.string().max(500).trim().optional(),
});

export type CreateSettlementDto = z.infer<typeof CreateSettlementSchema>;

export const ConfirmPayoutSchema = z.object({
  note: z.string().max(500).trim().optional(),
});

export type ConfirmPayoutDto = z.infer<typeof ConfirmPayoutSchema>;

// ─────────────────────────────────────────
// PRICING SCHEMAS
// ─────────────────────────────────────────

export const CreatePricingRuleSchema = z.object({
  merchantId: uuidSchema.optional().nullable(),
  zone: z.string().min(2).max(100).trim(),
  weightFrom: z.number().min(0).multipleOf(0.01),
  weightTo: z.number().positive().multipleOf(0.01),
  basePrice: z.number().positive().multipleOf(0.01),
}).refine(
  (data) => data.weightTo > data.weightFrom,
  { message: 'weightTo must be greater than weightFrom', path: ['weightTo'] }
);

export type CreatePricingRuleDto = z.infer<typeof CreatePricingRuleSchema>;

export const CalculatePriceSchema = z.object({
  merchantId: uuidSchema,
  city: z.string().min(2).max(100).trim(),
  weight: z.number().positive().multipleOf(0.01),
});

export type CalculatePriceDto = z.infer<typeof CalculatePriceSchema>;
