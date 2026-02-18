# Phase 5: Domain & Data Design
## Shipping Management SaaS Platform
**Date:** February 2026 | **Status:** COMPLETED

---

## Overview

This document defines the complete domain model, data relationships, shipment lifecycle state machine, domain events, and the full Prisma schema for the Shipping Management SaaS Platform.

Every decision in this phase flows directly from Phase 1 (business requirements), Phase 2 (use cases and workflows), and Phase 3 (architecture constraints).

---

## Section 1: Core Domain Entities

### 1.1 Tenant (ShippingCompany)

The root entity of the entire system. Every piece of data is scoped to a Tenant.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| name | String | Company display name |
| slug | String | Unique URL-safe identifier (e.g., `fast-shipping`) |
| status | Enum | `ACTIVE` \| `SUSPENDED` \| `PENDING` |
| settings | JSON | Max delivery attempts, notification preferences |
| createdAt | DateTime | |
| updatedAt | DateTime | |

**Why `slug`?** Used for multi-tenant routing in later versions. More readable than UUID in URLs.

---

### 1.2 User (Unified User Table)

All five roles share a single `users` table. The `role` field drives all authorization logic.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| tenantId | UUID \| null | FK → Tenant. `null` for SUPER_ADMIN only |
| branchId | UUID \| null | FK → Branch. Set only for BRANCH_MANAGER and COURIER |
| role | Enum | `SUPER_ADMIN` \| `COMPANY_ADMIN` \| `BRANCH_MANAGER` \| `MERCHANT` \| `COURIER` |
| email | String | Unique |
| phone | String | |
| passwordHash | String | Never expose in API responses |
| status | Enum | `ACTIVE` \| `SUSPENDED` \| `PENDING` |
| name | String | |
| createdAt | DateTime | |
| updatedAt | DateTime | |

**Design decision:** One unified table instead of separate tables per role. This simplifies authentication, guards, and queries. Role differentiation is handled purely by the `role` field.

**Soft delete rule:** Users are never hard-deleted. They are `SUSPENDED` with a timestamp. This preserves referential integrity across shipments and financial records.

---

### 1.3 Branch

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| tenantId | UUID | FK → Tenant |
| name | String | |
| city | String | |
| address | String | |
| status | Enum | `ACTIVE` \| `INACTIVE` |
| createdAt | DateTime | |
| updatedAt | DateTime | |

---

### 1.4 Shipment (Most Critical Entity)

The central entity around which the entire business logic revolves.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| trackingNumber | String | Unique. System-generated (e.g., `SHP-20260201-XXXX`) |
| tenantId | UUID | FK → Tenant |
| branchId | UUID | FK → Branch |
| merchantId | UUID | FK → User (role: MERCHANT) |
| courierId | UUID \| null | FK → User (role: COURIER). Assigned later |
| status | Enum | Full lifecycle (see Section 3) |
| recipientName | String | |
| recipientPhone | String | |
| recipientAddress | String | |
| city | String | Destination city |
| weight | Decimal | In kilograms |
| price | Decimal | **Calculated once at creation. Never recalculated.** |
| codAmount | Decimal | Cash on delivery amount. 0 if prepaid |
| notes | String \| null | Optional delivery instructions |
| maxAttempts | Int | From company settings. Default: 3 |
| attemptCount | Int | Auto-incremented on each failed attempt |
| createdAt | DateTime | |
| updatedAt | DateTime | |

**Critical business rule:** `price` is locked at creation time. Changing pricing rules afterward does NOT affect existing shipments.

---

### 1.5 ShipmentStatusHistory (Immutable Audit Log)

Every status change creates a new record. The status in the `Shipment` table is the current state; this table is the full history.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| shipmentId | UUID | FK → Shipment |
| status | Enum | The new status after this transition |
| changedBy | UUID | FK → User (who triggered the change) |
| note | String \| null | Optional reason or note |
| createdAt | DateTime | Immutable timestamp |

**Why immutable?** Financial and operational auditing requires a tamper-proof history. Updating statuses in place destroys the audit trail.

---

### 1.6 CODRecord (Cash on Delivery Record)

Created exactly once per shipment when the courier confirms delivery.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| shipmentId | UUID | FK → Shipment. One-to-one relationship |
| tenantId | UUID | FK → Tenant |
| merchantId | UUID | FK → User (role: MERCHANT) |
| courierId | UUID | FK → User (role: COURIER) |
| amount | Decimal | Amount collected. Immutable after creation |
| collectedAt | DateTime | Timestamp of cash collection |
| status | Enum | `COLLECTED` \| `SETTLED` |
| settlementId | UUID \| null | FK → CODSettlement. Set when settled |

**Immutability rule:** `amount` cannot be changed after creation. Any override requires an Admin-level action that is itself logged.

---

### 1.7 CODSettlement (Financial Settlement)

Represents a completed payout from a shipping company to a merchant.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| tenantId | UUID | FK → Tenant |
| merchantId | UUID | FK → User (role: MERCHANT) |
| totalAmount | Decimal | Sum of all included COD records |
| status | Enum | `PENDING` \| `PAID` |
| confirmedBy | UUID \| null | FK → User (role: COMPANY_ADMIN). Set when paid |
| confirmedAt | DateTime \| null | |
| note | String \| null | |
| createdAt | DateTime | |
| updatedAt | DateTime | |

---

### 1.8 PricingRule

Defines how shipment prices are calculated per zone and weight range.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| tenantId | UUID | FK → Tenant |
| merchantId | UUID \| null | FK → User. `null` = applies to all merchants of this tenant |
| zone | String | Geographic zone identifier |
| weightFrom | Decimal | Minimum weight (inclusive) in kg |
| weightTo | Decimal | Maximum weight (inclusive) in kg |
| basePrice | Decimal | Price for this zone + weight combination |
| isActive | Boolean | |
| createdAt | DateTime | |
| updatedAt | DateTime | |

**Pricing resolution logic (applied at shipment creation):**
1. Look for a merchant-specific rule (where `merchantId = current merchant`)
2. If none found, fall back to the tenant-level rule (where `merchantId = null`)
3. Apply the matched price, lock it in `Shipment.price`

---

## Section 2: Entity Relationships

```
Tenant (1) ─────────────── (∞) User
Tenant (1) ─────────────── (∞) Branch
Tenant (1) ─────────────── (∞) Shipment
Tenant (1) ─────────────── (∞) PricingRule
Tenant (1) ─────────────── (∞) CODSettlement

Branch (1) ─────────────── (∞) Shipment
Branch (1) ─────────────── (∞) User [BranchManager, Courier]

User[Merchant] (1) ─────── (∞) Shipment [as merchantId]
User[Courier]  (1) ─────── (∞) Shipment [as courierId]

Shipment (1) ───────────── (∞) ShipmentStatusHistory
Shipment (1) ───────────── (0..1) CODRecord [created on delivery only]

CODRecord (∞) ──────────── (1) CODSettlement [via merchantId]
```

### Ownership Rules

| Entity | Owner | Scope |
|--------|-------|-------|
| Tenant | Super Admin | Platform-wide |
| Branch | Tenant | Scoped to tenant |
| User | Tenant | Scoped to tenant |
| Shipment | Tenant | Scoped to tenant + branch |
| CODRecord | Tenant | Scoped to merchant |
| CODSettlement | Tenant | Scoped to merchant |
| PricingRule | Tenant | Can be scoped to merchant |

---

## Section 3: Shipment Status Lifecycle (State Machine)

### Status Definitions

| Status | Description | Who Triggers |
|--------|-------------|--------------|
| `PENDING` | Shipment created, awaiting branch review | System (on creation) |
| `READY_FOR_PICKUP` | Branch confirmed, ready for courier | Branch Manager |
| `ASSIGNED_TO_COURIER` | Assigned to a specific courier | Branch Manager |
| `PICKED_UP` | Courier has the package | Courier |
| `OUT_FOR_DELIVERY` | Courier is attempting delivery | Courier |
| `DELIVERED` | Successfully delivered, COD collected | Courier |
| `FAILED_ATTEMPT` | Delivery attempted but failed | Courier |
| `RETURN_IN_PROGRESS` | Max attempts reached, returning to branch | System (auto) |
| `RETURNED` | Package returned to branch | Branch Manager |
| `CANCELLED` | Shipment cancelled before pickup | Merchant or Admin |

### State Transition Diagram

```
                    ┌─────────────┐
                    │   PENDING   │◄──── Merchant Creates Shipment
                    └──────┬──────┘
                           │ Branch Manager reviews
                           ▼
               ┌─────────────────────┐
               │  READY_FOR_PICKUP   │
               └──────────┬──────────┘
                          │ Branch Manager assigns courier
                          ▼
              ┌──────────────────────┐
              │  ASSIGNED_TO_COURIER │
              └──────────┬───────────┘
                         │ Courier confirms pickup
                         ▼
                  ┌─────────────┐
                  │  PICKED_UP  │
                  └──────┬──────┘
                         │ Courier starts delivery
                         ▼
              ┌──────────────────────┐
              │   OUT_FOR_DELIVERY   │◄─────────────────┐
              └──────┬───────────────┘                  │
                     │                                   │
         ┌───────────┴───────────┐                      │
         │                       │                      │
         ▼                       ▼                      │
  ┌─────────────┐     ┌───────────────────┐             │
  │  DELIVERED  │     │   FAILED_ATTEMPT  │─────────────┘
  └─────────────┘     └─────────┬─────────┘   (if attemptCount < maxAttempts)
                                │
                                │ (if attemptCount >= maxAttempts)
                                ▼
                   ┌────────────────────────┐
                   │   RETURN_IN_PROGRESS   │
                   └────────────┬───────────┘
                                │ Courier returns to branch
                                ▼
                          ┌──────────┐
                          │ RETURNED │
                          └──────────┘

CANCELLED ◄── From PENDING or READY_FOR_PICKUP only
```

### Transition Rules

1. **No backward transitions.** A shipment cannot move to a previous state.
2. **`CANCELLED`** is only allowed from `PENDING` or `READY_FOR_PICKUP`.
3. **`FAILED_ATTEMPT`** automatically increments `attemptCount`.
4. **When `attemptCount >= maxAttempts`**, the system automatically transitions to `RETURN_IN_PROGRESS`.
5. **Every transition** creates an immutable record in `ShipmentStatusHistory`.
6. **`CODRecord`** is only created when status transitions to `DELIVERED`.

---

## Section 4: Domain Events & Side Effects

These are the events emitted by the system on significant state changes.

| Event | Trigger | Side Effects |
|-------|---------|--------------|
| `shipment.created` | Merchant creates shipment | Generate tracking number, calculate and lock price |
| `shipment.assigned` | Branch Manager assigns courier | WebSocket notification to courier, Push notification |
| `shipment.picked_up` | Courier confirms pickup | WebSocket notification to merchant |
| `shipment.out_for_delivery` | Courier starts delivery run | WebSocket notification to merchant |
| `shipment.delivered` | Courier confirms delivery | Create `CODRecord`, WebSocket + Push to merchant |
| `shipment.failed_attempt` | Courier marks failed delivery | Increment `attemptCount`, notify merchant, check max attempts |
| `shipment.return_started` | Max attempts reached | Notify merchant and branch manager |
| `shipment.returned` | Package back at branch | Notify merchant |
| `shipment.cancelled` | Merchant or Admin cancels | Notify relevant parties |
| `cod.settlement_confirmed` | Admin confirms payout | Update all related `CODRecord.status` to `SETTLED`, notify merchant |

**Implementation note:** Domain events are processed asynchronously via BullMQ queues. This ensures that the primary write operation (e.g., updating shipment status) is not blocked by notification side effects.

---

## Section 5: Tracking Number Generation Strategy

Format: `{TENANT_PREFIX}-{YYYYMMDD}-{RANDOM_6_CHARS}`

Example: `SHP-20260201-A4X9KZ`

**Generation rules:**
- Prefix is derived from tenant slug (first 3 uppercase letters)
- Date portion uses UTC creation date
- Random suffix is alphanumeric (uppercase), collision-checked against DB
- The full tracking number must be unique across the entire platform (not just per tenant)

---

## Section 6: Complete Prisma Schema

```prisma
// schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────

enum TenantStatus {
  PENDING
  ACTIVE
  SUSPENDED
}

enum UserRole {
  SUPER_ADMIN
  COMPANY_ADMIN
  BRANCH_MANAGER
  MERCHANT
  COURIER
}

enum UserStatus {
  PENDING
  ACTIVE
  SUSPENDED
}

enum BranchStatus {
  ACTIVE
  INACTIVE
}

enum ShipmentStatus {
  PENDING
  READY_FOR_PICKUP
  ASSIGNED_TO_COURIER
  PICKED_UP
  OUT_FOR_DELIVERY
  DELIVERED
  FAILED_ATTEMPT
  RETURN_IN_PROGRESS
  RETURNED
  CANCELLED
}

enum CODRecordStatus {
  COLLECTED
  SETTLED
}

enum CODSettlementStatus {
  PENDING
  PAID
}

// ─────────────────────────────────────────
// TENANT
// ─────────────────────────────────────────

model Tenant {
  id        String       @id @default(uuid())
  name      String
  slug      String       @unique
  status    TenantStatus @default(PENDING)
  settings  Json         @default("{}")
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt

  // Relations
  users          User[]
  branches       Branch[]
  shipments      Shipment[]
  pricingRules   PricingRule[]
  codSettlements CODSettlement[]

  @@map("tenants")
}

// ─────────────────────────────────────────
// USER
// ─────────────────────────────────────────

model User {
  id           String     @id @default(uuid())
  tenantId     String?
  branchId     String?
  role         UserRole
  email        String     @unique
  phone        String?
  passwordHash String
  name         String
  status       UserStatus @default(PENDING)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  // Relations
  tenant   Tenant?  @relation(fields: [tenantId], references: [id])
  branch   Branch?  @relation(fields: [branchId], references: [id])

  shipmentsAsMerchant Shipment[]             @relation("MerchantShipments")
  shipmentsAsCourier  Shipment[]             @relation("CourierShipments")
  statusChanges       ShipmentStatusHistory[]
  codRecordsAsCourier CODRecord[]            @relation("CourierCODRecords")
  codRecordsAsMerchant CODRecord[]           @relation("MerchantCODRecords")
  settlementsConfirmed CODSettlement[]       @relation("ConfirmedSettlements")
  merchantSettlements  CODSettlement[]       @relation("MerchantSettlements")

  @@map("users")
}

// ─────────────────────────────────────────
// BRANCH
// ─────────────────────────────────────────

model Branch {
  id        String       @id @default(uuid())
  tenantId  String
  name      String
  city      String
  address   String
  status    BranchStatus @default(ACTIVE)
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt

  // Relations
  tenant    Tenant     @relation(fields: [tenantId], references: [id])
  users     User[]
  shipments Shipment[]

  @@map("branches")
}

// ─────────────────────────────────────────
// SHIPMENT
// ─────────────────────────────────────────

model Shipment {
  id             String         @id @default(uuid())
  trackingNumber String         @unique
  tenantId       String
  branchId       String
  merchantId     String
  courierId      String?
  status         ShipmentStatus @default(PENDING)

  // Recipient
  recipientName    String
  recipientPhone   String
  recipientAddress String
  city             String

  // Financials
  weight    Decimal @db.Decimal(8, 2)
  price     Decimal @db.Decimal(10, 2)
  codAmount Decimal @default(0) @db.Decimal(10, 2)

  // Delivery control
  notes        String?
  maxAttempts  Int     @default(3)
  attemptCount Int     @default(0)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  tenant    Tenant  @relation(fields: [tenantId], references: [id])
  branch    Branch  @relation(fields: [branchId], references: [id])
  merchant  User    @relation("MerchantShipments", fields: [merchantId], references: [id])
  courier   User?   @relation("CourierShipments", fields: [courierId], references: [id])

  statusHistory ShipmentStatusHistory[]
  codRecord     CODRecord?

  @@map("shipments")
}

// ─────────────────────────────────────────
// SHIPMENT STATUS HISTORY (Immutable)
// ─────────────────────────────────────────

model ShipmentStatusHistory {
  id         String         @id @default(uuid())
  shipmentId String
  status     ShipmentStatus
  changedBy  String
  note       String?
  createdAt  DateTime       @default(now())

  // Relations
  shipment Shipment @relation(fields: [shipmentId], references: [id])
  user     User     @relation(fields: [changedBy], references: [id])

  // No updatedAt — this record is immutable
  @@map("shipment_status_history")
}

// ─────────────────────────────────────────
// COD RECORD
// ─────────────────────────────────────────

model CODRecord {
  id           String          @id @default(uuid())
  shipmentId   String          @unique
  tenantId     String
  merchantId   String
  courierId    String
  amount       Decimal         @db.Decimal(10, 2)
  collectedAt  DateTime
  status       CODRecordStatus @default(COLLECTED)
  settlementId String?

  // Relations
  shipment   Shipment        @relation(fields: [shipmentId], references: [id])
  merchant   User            @relation("MerchantCODRecords", fields: [merchantId], references: [id])
  courier    User            @relation("CourierCODRecords", fields: [courierId], references: [id])
  settlement CODSettlement?  @relation(fields: [settlementId], references: [id])

  @@map("cod_records")
}

// ─────────────────────────────────────────
// COD SETTLEMENT
// ─────────────────────────────────────────

model CODSettlement {
  id          String              @id @default(uuid())
  tenantId    String
  merchantId  String
  totalAmount Decimal             @db.Decimal(10, 2)
  status      CODSettlementStatus @default(PENDING)
  confirmedBy String?
  confirmedAt DateTime?
  note        String?
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt

  // Relations
  tenant    Tenant     @relation(fields: [tenantId], references: [id])
  merchant  User       @relation("MerchantSettlements", fields: [merchantId], references: [id])
  confirmer User?      @relation("ConfirmedSettlements", fields: [confirmedBy], references: [id])
  codRecords CODRecord[]

  @@map("cod_settlements")
}

// ─────────────────────────────────────────
// PRICING RULE
// ─────────────────────────────────────────

model PricingRule {
  id         String   @id @default(uuid())
  tenantId   String
  merchantId String?
  zone       String
  weightFrom Decimal  @db.Decimal(8, 2)
  weightTo   Decimal  @db.Decimal(8, 2)
  basePrice  Decimal  @db.Decimal(10, 2)
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  // Relations
  tenant   Tenant  @relation(fields: [tenantId], references: [id])
  merchant User?   @relation(fields: [merchantId], references: [id])

  @@map("pricing_rules")
}
```

---

## Section 7: Data Integrity Principles

| Principle | Implementation |
|-----------|---------------|
| **Tenant Isolation** | Every query scoped by `tenantId` via Global NestJS Interceptor |
| **Immutable Price** | `price` set once at creation, no update path exists in the service layer |
| **Immutable COD Amount** | No `UPDATE` allowed on `CODRecord.amount` without explicit admin override action |
| **Immutable Status History** | `ShipmentStatusHistory` has no `updatedAt` field — records are insert-only |
| **Soft Deletes** | No hard DELETE on `User` or `Merchant` — use `status: SUSPENDED` |
| **No Orphaned Records** | All FKs defined in Prisma schema with explicit relation names |
| **Attempt Auto-Management** | `attemptCount` incremented server-side, not trusted from client |

---

## Phase 5 Summary

| Item | Detail |
|------|--------|
| Total Domain Entities | 8 |
| Total Enums | 7 |
| Shipment Statuses | 10 |
| Domain Events | 10 |
| Critical State Machine | Shipment lifecycle with auto-transition on max attempts |
| Pricing Strategy | Merchant-specific override → Tenant default fallback |
| COD Strategy | Immutable on collection, settled at merchant level |
| ORM | Prisma 5.x with full type safety |

---

## Next Phase

**Phase 6: API Design**
- Design all RESTful endpoints per module
- Define request/response DTOs with Zod validation
- Define error response structure
- Define security boundaries per endpoint (which role can access what)

---
*Phase 5 Completed | February 2026 | Shipping Management SaaS Platform*