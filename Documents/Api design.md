# Phase 6: API Design

## Shipping Management SaaS Platform

**Date:** February 2026 | **Status:** COMPLETED

-----

## Overview

This document defines the complete RESTful API contract for the Shipping Management SaaS Platform. Every endpoint is justified by a use case from Phase 2, constrained by the architecture defined in Phase 3, and operates on the data model designed in Phase 5.

**Guiding principle:** The API is the single source of truth for all business operations. No client-side business logic. No client-side financial calculations.

-----

## Section 1: API Conventions

### Base URL

```
https://api.shipping-platform.com/v1
```

### Naming Rules

```
/resources              → Always plural nouns
/resources/:id          → Single resource by ID
/resources/:id/sub      → Sub-resources
/resources/:id/action   → State-changing actions (assign, cancel, pay)
```

### HTTP Methods

|Method  |Usage                                       |
|--------|--------------------------------------------|
|`GET`   |Retrieve resources (never changes state)    |
|`POST`  |Create new resource                         |
|`PATCH` |Partial update (only provided fields change)|
|`DELETE`|Soft-delete or cancel                       |

### Pagination (all list endpoints)

```
Query: ?page=1&limit=20
Response meta: { "page": 1, "limit": 20, "total": 150, "totalPages": 8 }
```

-----

## Section 2: Standard Response Structure

**Every** API response — success or failure — follows this envelope.

### Success Response

```json
{
  "success": true,
  "data": { },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

`meta` is only present on paginated list responses.

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "SHIPMENT_NOT_FOUND",
    "message": "Shipment with id 'abc-123' does not exist",
    "details": []
  }
}
```

### Validation Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "field": "recipientPhone", "message": "Invalid phone number format" },
      { "field": "weight", "message": "Must be greater than 0" }
    ]
  }
}
```

-----

## Section 3: Standard Error Codes

|Code                          |HTTP Status|When Used                                                  |
|------------------------------|-----------|-----------------------------------------------------------|
|`VALIDATION_ERROR`            |400        |Request body or query param fails Zod schema               |
|`UNAUTHORIZED`                |401        |Missing, expired, or invalid JWT                           |
|`FORBIDDEN`                   |403        |Role does not have permission for this action              |
|`NOT_FOUND`                   |404        |Resource does not exist or is not accessible to this tenant|
|`CONFLICT`                    |409        |Duplicate resource (e.g., duplicate email)                 |
|`SHIPMENT_CANNOT_BE_CANCELLED`|422        |Business rule violation                                    |
|`SHIPMENT_ALREADY_ASSIGNED`   |422        |Business rule violation                                    |
|`MAX_ATTEMPTS_REACHED`        |422        |Business rule violation                                    |
|`COD_ALREADY_SETTLED`         |422        |Business rule violation                                    |
|`INVALID_STATUS_TRANSITION`   |422        |Shipment state machine violation                           |
|`INTERNAL_ERROR`              |500        |Unexpected server error                                    |

**Rule:** `404 NOT_FOUND` is returned for both “resource does not exist” AND “resource exists but belongs to another tenant.” This prevents tenant enumeration attacks.

-----

## Section 4: Authentication Headers

Every protected endpoint requires:

```
Authorization: Bearer <access_token>
```

Refresh token is stored in an HTTP-only cookie and sent automatically by the browser.

-----

## Section 5: API Modules

-----

### Module 1: Authentication

```
POST   /auth/login         Login with email + password
POST   /auth/refresh       Refresh access token using cookie
POST   /auth/logout        Invalidate refresh token
GET    /auth/me            Get current authenticated user
```

-----

#### POST /auth/login

**Auth required:** No

**Request:**

```json
{
  "email": "admin@company.com",
  "password": "string (min 8 chars)"
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "name": "Ahmed Ali",
      "email": "admin@company.com",
      "role": "COMPANY_ADMIN",
      "tenantId": "uuid",
      "branchId": null
    }
  }
}
```

**Errors:** `VALIDATION_ERROR`, `UNAUTHORIZED` (wrong credentials)

**Note:** Refresh token is set as HTTP-only cookie `refresh_token`, not in response body.

-----

#### POST /auth/refresh

**Auth required:** No (uses HTTP-only cookie)

**Response 200:**

```json
{
  "success": true,
  "data": {
    "accessToken": "new_jwt_token"
  }
}
```

**Errors:** `UNAUTHORIZED` (cookie missing or expired)

-----

#### POST /auth/logout

**Auth required:** Yes

**Response 200:**

```json
{
  "success": true,
  "data": { "message": "Logged out successfully" }
}
```

**Side effect:** Clears the `refresh_token` cookie.

-----

#### GET /auth/me

**Auth required:** Yes

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Ahmed Ali",
    "email": "admin@company.com",
    "role": "COMPANY_ADMIN",
    "tenantId": "uuid",
    "branchId": null,
    "status": "ACTIVE"
  }
}
```

-----

### Module 2: Tenants

**Access:** `SUPER_ADMIN` only for all endpoints in this module.

```
GET    /tenants            List all tenants (paginated)
POST   /tenants            Create new tenant
GET    /tenants/:id        Get tenant details
PATCH  /tenants/:id        Update tenant info
PATCH  /tenants/:id/status Activate or suspend tenant
```

-----

#### POST /tenants

**Request:**

```json
{
  "name": "Fast Shipping Co.",
  "slug": "fast-shipping",
  "adminName": "Omar Hassan",
  "adminEmail": "omar@fast-shipping.com",
  "adminPassword": "string (min 8 chars)",
  "settings": {
    "maxDeliveryAttempts": 3
  }
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Fast Shipping Co.",
    "slug": "fast-shipping",
    "status": "ACTIVE",
    "createdAt": "ISO8601"
  }
}
```

**Side effects:** Creates the tenant AND its first COMPANY_ADMIN user in one transaction.

**Errors:** `VALIDATION_ERROR`, `CONFLICT` (slug already taken)

-----

#### PATCH /tenants/:id/status

**Request:**

```json
{
  "status": "ACTIVE | SUSPENDED"
}
```

-----

### Module 3: Branches

```
GET    /branches              List branches (scoped to tenant)
POST   /branches              Create branch
GET    /branches/:id          Get branch details
PATCH  /branches/:id          Update branch
PATCH  /branches/:id/status   Activate or deactivate
```

**Access:**

- `COMPANY_ADMIN` → Full access within their tenant
- `BRANCH_MANAGER` → `GET /branches/:id` for their own branch only

-----

#### POST /branches

**Request:**

```json
{
  "name": "Cairo Branch",
  "city": "Cairo",
  "address": "123 Tahrir Street, Cairo"
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Cairo Branch",
    "city": "Cairo",
    "address": "123 Tahrir Street, Cairo",
    "status": "ACTIVE",
    "createdAt": "ISO8601"
  }
}
```

-----

### Module 4: Users

```
GET    /users                 List users (filterable by role)
POST   /users                 Create user
GET    /users/:id             Get user details
PATCH  /users/:id             Update user info
PATCH  /users/:id/status      Activate or suspend user
PATCH  /users/:id/branch      Reassign courier to different branch
```

**Access:**

- `COMPANY_ADMIN` → Full access for all roles within their tenant
- `BRANCH_MANAGER` → GET and status management for couriers in their branch only

-----

#### GET /users

**Query Params:**

```
?role=MERCHANT|COURIER|BRANCH_MANAGER|COMPANY_ADMIN
?branchId=uuid
?status=ACTIVE|SUSPENDED|PENDING
?page=1&limit=20
```

-----

#### POST /users

**Request:**

```json
{
  "name": "Sara Ahmed",
  "email": "sara@merchant.com",
  "phone": "+201234567890",
  "password": "string (min 8 chars)",
  "role": "MERCHANT | COURIER | BRANCH_MANAGER | COMPANY_ADMIN",
  "branchId": "uuid | null"
}
```

**Validation rules:**

- `branchId` is **required** if `role` is `COURIER` or `BRANCH_MANAGER`
- `branchId` is **forbidden** if `role` is `MERCHANT` or `COMPANY_ADMIN`

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Sara Ahmed",
    "email": "sara@merchant.com",
    "role": "MERCHANT",
    "status": "ACTIVE"
  }
}
```

**Errors:** `CONFLICT` (email already exists)

-----

### Module 5: Shipments

This is the most critical module in the system.

```
GET    /shipments                          List shipments (filterable)
POST   /shipments                          Create shipment
GET    /shipments/:id                      Get shipment details
GET    /shipments/:id/history              Get status history
PATCH  /shipments/:id/assign               Assign courier to shipment
PATCH  /shipments/:id/status               Update shipment status
DELETE /shipments/:id                      Cancel shipment
GET    /shipments/tracking/:trackingNumber Public tracking (no auth)
```

-----

#### POST /shipments

**Auth required:** Yes
**Allowed roles:** `MERCHANT`

**Request:**

```json
{
  "recipientName": "Khaled Youssef",
  "recipientPhone": "+201098765432",
  "recipientAddress": "45 Corniche St, Alexandria",
  "city": "Alexandria",
  "weight": 2.5,
  "codAmount": 250.00,
  "notes": "Fragile - handle with care"
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "trackingNumber": "SHP-20260201-A4X9KZ",
    "status": "PENDING",
    "price": 35.00,
    "codAmount": 250.00,
    "recipientName": "Khaled Youssef",
    "recipientPhone": "+201098765432",
    "recipientAddress": "45 Corniche St, Alexandria",
    "city": "Alexandria",
    "weight": 2.5,
    "notes": "Fragile - handle with care",
    "createdAt": "2026-02-01T10:00:00Z"
  }
}
```

**Backend side effects:**

1. Look up matching `PricingRule` (merchant-specific → tenant default)
1. Calculate and lock `price`
1. Generate unique `trackingNumber`
1. Create `ShipmentStatusHistory` record with `PENDING`
1. Emit `shipment.created` domain event

-----

#### GET /shipments

**Auth required:** Yes

**Query Params:**

```
?status=PENDING|READY_FOR_PICKUP|ASSIGNED_TO_COURIER|...
?merchantId=uuid           (COMPANY_ADMIN, BRANCH_MANAGER only)
?courierId=uuid            (COMPANY_ADMIN, BRANCH_MANAGER only)
?branchId=uuid             (COMPANY_ADMIN only)
?city=string
?dateFrom=2026-01-01
?dateTo=2026-01-31
?page=1&limit=20
```

**Access filtering (enforced on backend):**

- `COMPANY_ADMIN` → all shipments in their tenant
- `BRANCH_MANAGER` → only shipments in their branch
- `MERCHANT` → only their own shipments
- `COURIER` → only shipments assigned to them

-----

#### GET /shipments/:id/history

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "status": "PENDING",
      "changedBy": { "id": "uuid", "name": "Sara Ahmed", "role": "MERCHANT" },
      "note": null,
      "createdAt": "2026-02-01T10:00:00Z"
    },
    {
      "status": "READY_FOR_PICKUP",
      "changedBy": { "id": "uuid", "name": "Branch Manager", "role": "BRANCH_MANAGER" },
      "note": "Reviewed and approved",
      "createdAt": "2026-02-01T11:30:00Z"
    }
  ]
}
```

-----

#### PATCH /shipments/:id/assign

**Allowed roles:** `BRANCH_MANAGER`
**Constraint:** Shipment must belong to the manager’s branch

**Request:**

```json
{
  "courierId": "uuid"
}
```

**Validation:**

- Courier must exist, be ACTIVE, and belong to the same branch
- Shipment must be in `READY_FOR_PICKUP` status

**Backend side effects:**

1. Set `Shipment.courierId`
1. Transition status to `ASSIGNED_TO_COURIER`
1. Create `ShipmentStatusHistory` record
1. Emit `shipment.assigned` → WebSocket + Push notification to courier

**Errors:** `SHIPMENT_ALREADY_ASSIGNED`, `INVALID_STATUS_TRANSITION`, `NOT_FOUND`

-----

#### PATCH /shipments/:id/status

**Allowed roles:** `COURIER` (primary), `BRANCH_MANAGER` (limited overrides)

**Request:**

```json
{
  "status": "PICKED_UP | OUT_FOR_DELIVERY | DELIVERED | FAILED_ATTEMPT | RETURNED",
  "note": "Customer not home",
  "codCollected": 250.00
}
```

**Validation rules:**

- `COURIER` can only update shipments assigned to them
- `codCollected` is **required** when transitioning to `DELIVERED` and `codAmount > 0`
- `codCollected` must equal `Shipment.codAmount` (tolerance: ±0.01)
- Status must follow valid transition paths (state machine enforcement)
- `FAILED_ATTEMPT` increments `attemptCount`
- If `attemptCount >= maxAttempts` after increment → system auto-transitions to `RETURN_IN_PROGRESS`

**Backend side effects for `DELIVERED`:**

1. Create `CODRecord` with collected amount
1. Emit `shipment.delivered` domain event
1. Notify merchant via WebSocket + Push

**Backend side effects for `FAILED_ATTEMPT`:**

1. Increment `attemptCount`
1. Check if `attemptCount >= maxAttempts`
1. If yes → auto-transition to `RETURN_IN_PROGRESS`, emit event, notify merchant + branch manager
1. If no → notify merchant of failed attempt

**Errors:** `INVALID_STATUS_TRANSITION`, `FORBIDDEN`, `VALIDATION_ERROR`

-----

#### DELETE /shipments/:id (Cancel)

**Allowed roles:** `MERCHANT`, `COMPANY_ADMIN`
**Constraint:** Status must be `PENDING` or `READY_FOR_PICKUP`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "CANCELLED"
  }
}
```

**Errors:** `SHIPMENT_CANNOT_BE_CANCELLED` (wrong status)

-----

#### GET /shipments/tracking/:trackingNumber

**Auth required:** No (public endpoint)
**Rate limited:** Yes (prevent enumeration)

**Response 200:**

```json
{
  "success": true,
  "data": {
    "trackingNumber": "SHP-20260201-A4X9KZ",
    "status": "OUT_FOR_DELIVERY",
    "recipientCity": "Alexandria",
    "estimatedDelivery": null,
    "history": [
      { "status": "PENDING", "timestamp": "2026-02-01T10:00:00Z" },
      { "status": "ASSIGNED_TO_COURIER", "timestamp": "2026-02-01T11:30:00Z" },
      { "status": "PICKED_UP", "timestamp": "2026-02-01T14:00:00Z" },
      { "status": "OUT_FOR_DELIVERY", "timestamp": "2026-02-02T09:00:00Z" }
    ]
  }
}
```

**Security note:** This endpoint returns only tracking-safe fields. No recipient personal data, no merchant data, no financial data.

-----

### Module 6: COD (Cash on Delivery)

```
GET    /cod/records                   List COD records (filterable)
GET    /cod/records/:id               Get single COD record
GET    /cod/balance/:merchantId       Get merchant's pending COD balance
GET    /cod/settlements               List settlements
POST   /cod/settlements               Create new settlement for a merchant
GET    /cod/settlements/:id           Get settlement details
PATCH  /cod/settlements/:id/pay       Confirm payout to merchant
```

-----

#### GET /cod/balance/:merchantId

**Allowed roles:** `COMPANY_ADMIN`, `MERCHANT` (own balance only)

**Response 200:**

```json
{
  "success": true,
  "data": {
    "merchantId": "uuid",
    "merchantName": "Sara Ahmed",
    "pendingBalance": 3750.00,
    "settledTotal": 12500.00,
    "recordCount": 15
  }
}
```

-----

#### POST /cod/settlements

**Allowed roles:** `COMPANY_ADMIN`

**Request:**

```json
{
  "merchantId": "uuid",
  "note": "February 2026 first settlement"
}
```

**Backend logic:**

1. Fetch all `CODRecord` for this merchant with `status = COLLECTED`
1. Sum the amounts → `totalAmount`
1. Create `CODSettlement` with `status = PENDING`
1. Link all fetched `CODRecord` IDs to this settlement

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "merchantId": "uuid",
    "totalAmount": 3750.00,
    "status": "PENDING",
    "recordCount": 15,
    "createdAt": "ISO8601"
  }
}
```

**Errors:** `CONFLICT` (open settlement already exists for this merchant)

-----

#### PATCH /cod/settlements/:id/pay

**Allowed roles:** `COMPANY_ADMIN`

**Request:**

```json
{
  "note": "Transferred via bank - reference #12345"
}
```

**Backend logic:**

1. Set `CODSettlement.status = PAID`
1. Set `confirmedBy = currentUser.id`, `confirmedAt = now()`
1. Update all linked `CODRecord.status = SETTLED`
1. Emit `cod.settlement_confirmed` → notify merchant

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "PAID",
    "totalAmount": 3750.00,
    "confirmedAt": "ISO8601",
    "note": "Transferred via bank - reference #12345"
  }
}
```

**Errors:** `COD_ALREADY_SETTLED`

-----

### Module 7: Pricing Rules

```
GET    /pricing-rules              List pricing rules
POST   /pricing-rules              Create rule
PATCH  /pricing-rules/:id          Update rule
DELETE /pricing-rules/:id          Delete rule
POST   /pricing-rules/calculate    Dry-run price calculation
```

**Access:** `COMPANY_ADMIN` only (all operations)

-----

#### POST /pricing-rules

**Request:**

```json
{
  "merchantId": "uuid | null",
  "zone": "Cairo",
  "weightFrom": 0,
  "weightTo": 5,
  "basePrice": 25.00
}
```

`merchantId = null` → applies as the default rule for all merchants of this tenant.

-----

#### POST /pricing-rules/calculate

Used by the merchant’s “create shipment” form to show price preview before submission.

**Request:**

```json
{
  "merchantId": "uuid",
  "city": "Alexandria",
  "weight": 2.5
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "price": 35.00,
    "appliedRule": "merchant-specific",
    "ruleId": "uuid"
  }
}
```

-----

### Module 8: Dashboard Statistics

```
GET  /stats/company    Company-wide stats (COMPANY_ADMIN)
GET  /stats/branch     Branch stats (BRANCH_MANAGER)
GET  /stats/courier    Courier performance (BRANCH_MANAGER, COMPANY_ADMIN)
GET  /stats/merchant   Merchant stats (MERCHANT — own data)
```

**Query Params (all stat endpoints):**

```
?dateFrom=2026-01-01
?dateTo=2026-01-31
```

-----

#### GET /stats/company

**Response 200:**

```json
{
  "success": true,
  "data": {
    "totalShipments": 1250,
    "pendingShipments": 230,
    "deliveredToday": 45,
    "failedAttempts": 18,
    "returnedShipments": 12,
    "deliverySuccessRate": 89.5,
    "totalCODCollected": 125000.00,
    "pendingCODSettlements": 38000.00,
    "totalMerchants": 34,
    "activeCouriers": 12
  }
}
```

-----

## Section 6: Security Boundaries Matrix

|Endpoint                        |SUPER_ADMIN|COMPANY_ADMIN |BRANCH_MANAGER  |MERCHANT|COURIER     |
|--------------------------------|:---------:|:------------:|:--------------:|:------:|:----------:|
|`POST /tenants`                 |✅          |❌             |❌               |❌       |❌           |
|`GET /tenants`                  |✅          |❌             |❌               |❌       |❌           |
|`GET /branches`                 |✅          |✅ (own)       |👁 own           |❌       |❌           |
|`POST /branches`                |✅          |✅             |❌               |❌       |❌           |
|`GET /users`                    |✅          |✅ (own tenant)|✅ (own branch)  |❌       |❌           |
|`POST /users`                   |✅          |✅             |✅ (courier only)|❌       |❌           |
|`POST /shipments`               |❌          |❌             |❌               |✅       |❌           |
|`GET /shipments`                |✅          |✅ (own)       |✅ (branch)      |✅ (own) |✅ (assigned)|
|`PATCH /shipments/:id/assign`   |❌          |❌             |✅ (own branch)  |❌       |❌           |
|`PATCH /shipments/:id/status`   |❌          |❌             |✅ (limited)     |❌       |✅ (assigned)|
|`DELETE /shipments/:id`         |❌          |✅             |❌               |✅ (own) |❌           |
|`GET /shipments/tracking/:no`   |🌐 Public   |🌐 Public      |🌐 Public        |🌐 Public|🌐 Public    |
|`POST /cod/settlements`         |❌          |✅             |❌               |❌       |❌           |
|`PATCH /cod/settlements/:id/pay`|❌          |✅             |❌               |❌       |❌           |
|`GET /cod/balance/:merchantId`  |❌          |✅             |❌               |✅ (own) |❌           |
|`POST /pricing-rules`           |❌          |✅             |❌               |❌       |❌           |
|`GET /stats/company`            |✅          |✅             |❌               |❌       |❌           |
|`GET /stats/branch`             |✅          |✅             |✅ (own)         |❌       |❌           |
|`GET /stats/merchant`           |❌          |✅             |❌               |✅ (own) |❌           |

-----

## Section 7: DTO Validation Rules Summary

All DTOs are validated using Zod on the backend (NestJS pipes). The same Zod schema is shared with the frontend via `packages/shared`.

|Field            |Rule                                                         |
|-----------------|-------------------------------------------------------------|
|email            |Valid email format, lowercase normalized                     |
|password         |Min 8 characters                                             |
|phone            |International format (+CountryCode…)                         |
|uuid fields      |Must be valid UUID v4                                        |
|weight           |Decimal > 0, max 2 decimal places                            |
|codAmount        |Decimal ≥ 0, max 2 decimal places                            |
|price            |Decimal > 0, set by backend only — never accepted from client|
|status (shipment)|Must be valid enum value and valid transition                |
|page             |Integer ≥ 1, default: 1                                      |
|limit            |Integer 1–100, default: 20                                   |
|dateFrom / dateTo|Valid ISO 8601 date string                                   |

-----

## Section 8: API Architecture Decisions

|Decision                    |Choice                                       |Reason                                                      |
|----------------------------|---------------------------------------------|------------------------------------------------------------|
|Response envelope           |`{ success, data, error, meta }`             |Consistent parsing on all clients, never 200 with error body|
|Error codes                 |Machine-readable string codes + human message|Frontend handles by code, displays message to user          |
|`price` on shipment creation|Backend-calculated only, never from request  |Prevents price manipulation from client                     |
|`codCollected` validation   |Must match `codAmount` ± 0.01                |Prevents underpayment/overpayment recording                 |
|Tenant isolation            |Backend query scoping, not client filtering  |Security — client cannot request cross-tenant data          |
|Public tracking endpoint    |Rate-limited, minimal data                   |Recipient needs tracking; personal data must stay protected |
|Status transitions          |Validated state machine on backend           |Prevents illegal status jumps from any client               |

-----

## Phase 6 Summary

|Item                      |Count               |
|--------------------------|--------------------|
|Total Modules             |8                   |
|Total Endpoints           |38                  |
|Public Endpoints          |2 (login + tracking)|
|Protected Endpoints       |36                  |
|Business Rule Enforcements|12                  |
|Standard Error Codes      |11                  |

-----

## Next Phase

**Phase 7: Frontend Strategy**

- Define layout and navigation structure per role
- Role-based routing and access control
- State management boundaries (what goes in Zustand vs React Query)
- UX flows for dashboards and forms

-----

*Phase 6 Completed | February 2026 | Shipping Management SaaS Platform*