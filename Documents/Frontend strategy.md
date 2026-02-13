# Phase 7: Frontend Strategy

## Shipping Management SaaS Platform

**Date:** February 2026 | **Status:** COMPLETED

-----

## Overview

This document defines the complete frontend strategy for the Shipping Management SaaS Platform. It covers application structure, routing, layout, state management, real-time communication, key UX flows, and Arabic RTL implementation.

Every decision here builds directly on Phase 3 (architecture), Phase 4 (tech stack), and Phase 6 (API design).

**Guiding principle:** No business logic on the frontend. No financial calculations. No role enforcement beyond UI rendering. The backend is the single source of truth for everything.

-----

## Section 1: Application Structure

Three separate Next.js 14 applications — one per user group.

```
apps/
├── admin/       Admin Dashboard   (Super Admin, Company Admin, Branch Manager)
├── merchant/    Merchant Web App  (Merchant)
└── courier/     Courier PWA       (Courier)
```

### Why Three Separate Apps?

|Concern              |Admin                 |Merchant               |Courier            |
|---------------------|----------------------|-----------------------|-------------------|
|Primary device       |Desktop               |Desktop / Mobile       |Mobile only        |
|Bundle size priority |Rich, full-featured   |Moderate               |Minimal            |
|PWA required         |No                    |No                     |Yes                |
|Navigation complexity|High (sidebar)        |Medium                 |Simple (bottom nav)|
|UI density           |Dense (tables, charts)|Clean (forms, tracking)|Task-focused       |

Combining all roles into one app would force a large bundle on the courier (mobile-first) and complicate the routing/auth logic unnecessarily. Three apps share a common `packages/ui` component library and `packages/shared` for Zod schemas and types.

-----

## Section 2: URL Structure & Routing

### Admin App

```
/login                        Login page
/dashboard                    Overview stats + recent activity
/shipments                    Shipment list with filters
/shipments/:id                Shipment details + history + assign courier
/merchants                    Merchant list
/merchants/:id                Merchant details + shipments + COD balance
/couriers                     Courier list
/couriers/:id                 Courier details + daily performance
/branches                     Branch list (COMPANY_ADMIN only)
/branches/:id                 Branch details + assigned couriers
/pricing                      Pricing rules management (COMPANY_ADMIN only)
/cod/records                  COD collection records
/cod/settlements              Settlement list
/cod/settlements/:id          Settlement details + confirm payout
/settings                     Company settings
/403                          Forbidden page
```

### Merchant App

```
/login                        Login page
/dashboard                    Stats + recent shipments + COD balance
/shipments                    My shipments list with filters
/shipments/new                Create new shipment form
/shipments/:id                Shipment tracking + full status history
/cod/balance                  Pending COD balance
/cod/history                  Full COD transaction history
```

### Courier PWA

```
/login                        Login page
/tasks                        Today's task list (home screen)
/tasks/:shipmentId            Task details + status update actions + COD input
/cod/summary                  Today's collected COD summary
```

-----

## Section 3: Route Protection Strategy

### Three Layers of Protection

```
Layer 1 — Authentication Guard   Is there a valid access token?
Layer 2 — Role Guard             Is this role allowed on this page?
Layer 3 — Tenant Guard (backend) Does this data belong to this tenant?
```

Layers 1 and 2 are enforced on the frontend via `middleware.ts`. Layer 3 is always enforced by the backend — the frontend cannot bypass it.

### Middleware Flow

```
Incoming request
       │
Is it a public route? (/login, /tracking/*)
       │ Yes → Allow
       │ No
Is there a valid access token in memory (or cookie)?
       │ No → Redirect to /login
       │ Yes
Does the decoded role match the allowed roles for this route?
       │ No → Redirect to /403
       │ Yes → Allow
```

### Route Permission Map (Admin App)

|Route             |SUPER_ADMIN|COMPANY_ADMIN|BRANCH_MANAGER|
|------------------|:---------:|:-----------:|:------------:|
|`/dashboard`      |✅          |✅            |✅             |
|`/shipments`      |✅          |✅            |✅             |
|`/merchants`      |✅          |✅            |❌             |
|`/couriers`       |✅          |✅            |✅             |
|`/branches`       |✅          |✅            |❌             |
|`/pricing`        |✅          |✅            |❌             |
|`/cod/settlements`|✅          |✅            |❌             |
|`/settings`       |✅          |✅            |❌             |

### Implementation Pattern

```typescript
// middleware.ts (Next.js App Router)

const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  '/branches': ['SUPER_ADMIN', 'COMPANY_ADMIN'],
  '/pricing': ['SUPER_ADMIN', 'COMPANY_ADMIN'],
  '/merchants': ['SUPER_ADMIN', 'COMPANY_ADMIN'],
  '/cod/settlements': ['SUPER_ADMIN', 'COMPANY_ADMIN'],
  '/settings': ['SUPER_ADMIN', 'COMPANY_ADMIN'],
  '/couriers': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'BRANCH_MANAGER'],
  '/shipments': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'BRANCH_MANAGER'],
};
```

**Critical rule:** The sidebar navigation is generated from the same `ROUTE_PERMISSIONS` config. A role that cannot access a route will never see the link in the sidebar. No hardcoded `if (role === 'COMPANY_ADMIN')` inside components.

-----

## Section 4: Layout Structure

### Admin App Layout

```
┌────────────────────────────────────────────────────────┐
│  TOPBAR                                                │
│  [Logo]                    [🔔 Notif]  [User ▼]        │
├─────────────────┬──────────────────────────────────────┤
│                 │                                      │
│   SIDEBAR       │          PAGE CONTENT                │
│   ─────────     │                                      │
│   Dashboard     │   ┌──────────────────────────────┐  │
│   Shipments     │   │                              │  │
│   Merchants     │   │   <PageComponent />           │  │
│   Couriers      │   │                              │  │
│   Branches      │   └──────────────────────────────┘  │
│   COD           │                                      │
│   Pricing       │                                      │
│   Settings      │                                      │
│                 │                                      │
└─────────────────┴──────────────────────────────────────┘
```

**Sidebar behavior:**

- Collapsible on smaller screens
- Active state derived from current URL
- Items rendered from `navConfig[role]` — never hardcoded per role in JSX

### Merchant App Layout

```
┌──────────────────────────────────┐
│  HEADER                          │
│  [Logo]         [🔔]  [User ▼]   │
├──────────────────────────────────┤
│                                  │
│         MAIN CONTENT             │
│                                  │
│   <PageComponent />              │
│                                  │
│                                  │
├──────────────────────────────────┤
│  BOTTOM NAVIGATION               │
│  [🏠 Home]  [📦 +New]  [📍 Track]│
└──────────────────────────────────┘
```

### Courier PWA Layout

```
┌──────────────────────────────────┐
│  HEADER                          │
│  [← Back]  [Today: Tue 11 Feb]  │
├──────────────────────────────────┤
│                                  │
│      TASK LIST / TASK DETAILS    │
│                                  │
│   Large touch targets            │
│   Clear status badges            │
│   Minimal text, maximum clarity  │
│                                  │
├──────────────────────────────────┤
│  BOTTOM NAV                      │
│  [📋 Tasks]       [💰 COD]       │
└──────────────────────────────────┘
```

**PWA-specific requirements:**

- Minimum touch target size: 44×44px (WCAG 2.5.5)
- Offline fallback page: “No connection — your last sync was at [time]”
- App installable: yes (via `@ducanh2912/next-pwa`)
- Service Worker caches: static assets + last known task list

-----

## Section 5: State Management Boundaries

### The Golden Rule

```
Server data (from API)   →   React Query (TanStack Query)
Client UI state          →   Zustand
Form state               →   React Hook Form + Zod
```

Never put API data into Zustand. Never use React Query for UI state (modals, sidebar). Never use useState for server data that needs caching or sharing.

-----

### Zustand Stores

#### AuthStore

```typescript
interface AuthStore {
  user: AuthUser | null;          // { id, name, email, role, tenantId, branchId }
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  setToken: (token: string) => void;
}
```

#### UIStore

```typescript
interface UIStore {
  sidebarOpen: boolean;
  notifications: InAppNotification[];
  toggleSidebar: () => void;
  addNotification: (n: InAppNotification) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}
```

These are the only two Zustand stores. Nothing else.

-----

### React Query — Key Hooks (Server State)

#### Queries

```typescript
// Shipments
useShipments(filters: ShipmentFilters)     → GET /shipments
useShipment(id: string)                    → GET /shipments/:id
useShipmentHistory(id: string)             → GET /shipments/:id/history

// Users
useMerchants(filters?)                     → GET /users?role=MERCHANT
useCouriers(branchId?: string)             → GET /users?role=COURIER&branchId=...
useUser(id: string)                        → GET /users/:id

// Branches
useBranches()                              → GET /branches
useBranch(id: string)                      → GET /branches/:id

// COD
useCODBalance(merchantId: string)          → GET /cod/balance/:id
useCODRecords(filters?)                    → GET /cod/records
useCODSettlements()                        → GET /cod/settlements
useCODSettlement(id: string)               → GET /cod/settlements/:id

// Stats
useCompanyStats(dateRange?)                → GET /stats/company
useBranchStats(dateRange?)                 → GET /stats/branch
useMerchantStats(dateRange?)               → GET /stats/merchant

// Pricing
usePricingRules()                          → GET /pricing-rules
useCalculatePrice(params)                  → POST /pricing-rules/calculate
```

#### Mutations

```typescript
useCreateShipment()                        → POST /shipments
useAssignCourier()                         → PATCH /shipments/:id/assign
useUpdateShipmentStatus()                  → PATCH /shipments/:id/status
useCancelShipment()                        → DELETE /shipments/:id

useCreateUser()                            → POST /users
useUpdateUserStatus()                      → PATCH /users/:id/status

useCreateSettlement()                      → POST /cod/settlements
useConfirmPayout()                         → PATCH /cod/settlements/:id/pay

useCreatePricingRule()                     → POST /pricing-rules
useUpdatePricingRule()                     → PATCH /pricing-rules/:id
useDeletePricingRule()                     → DELETE /pricing-rules/:id
```

#### Cache Invalidation Strategy

After every mutation, invalidate the relevant query keys:

```typescript
// After useCreateShipment succeeds:
queryClient.invalidateQueries({ queryKey: ['shipments'] })

// After useUpdateShipmentStatus succeeds:
queryClient.invalidateQueries({ queryKey: ['shipments'] })
queryClient.invalidateQueries({ queryKey: ['shipment', shipmentId] })

// After useConfirmPayout succeeds:
queryClient.invalidateQueries({ queryKey: ['cod-settlements'] })
queryClient.invalidateQueries({ queryKey: ['cod-records'] })
queryClient.invalidateQueries({ queryKey: ['cod-balance'] })
```

-----

## Section 6: Real-Time (WebSocket) Strategy

### Connection Lifecycle

```
User logs in  →  socket.connect() with JWT in auth header
User logs out →  socket.disconnect()
Token expires →  socket.disconnect(), re-login triggers reconnect
```

One Socket.io connection per authenticated session. Managed in a `SocketProvider` context that wraps the app layout.

### Events Per Application

#### Admin App — Listens For:

|Event                     |Action                                              |
|--------------------------|----------------------------------------------------|
|`shipment:status_updated` |Invalidate shipment queries, show toast notification|
|`shipment:assigned`       |Update shipment card in list                        |
|`cod:settlement_confirmed`|Invalidate COD queries                              |

#### Merchant App — Listens For:

|Event                    |Action                                           |
|-------------------------|-------------------------------------------------|
|`shipment:status_updated`|Show notification, update shipment detail if open|
|`cod:balance_updated`    |Refresh COD balance widget                       |

#### Courier PWA — Listens For:

|Event          |Action                                     |
|---------------|-------------------------------------------|
|`task:assigned`|Show browser notification, add task to list|

### Connecting WebSocket to React Query

```typescript
// In SocketProvider
socket.on('shipment:status_updated', (data) => {
  queryClient.invalidateQueries({ queryKey: ['shipments'] });
  queryClient.invalidateQueries({ queryKey: ['shipment', data.id] });
  uiStore.addNotification({
    id: data.id,
    message: `Shipment ${data.trackingNumber} is now ${data.status}`,
    type: 'info'
  });
});
```

This pattern means: WebSocket triggers React Query to re-fetch. We never manually update the React Query cache from a WebSocket event — we always re-fetch to ensure data consistency.

-----

## Section 7: Key UX Flows

### Flow 1 — Create Shipment (Merchant)

```
1.  Click "New Shipment"
2.  Fill form: recipient name, phone, address, city, weight, COD amount
3.  On city + weight input → debounced call to POST /pricing-rules/calculate
4.  Price preview appears below the form: "Estimated price: 35.00 EGP"
5.  Submit → button shows loading spinner
6.  On success → toast "Shipment created!" + redirect to /shipments/:id
7.  On validation error → field-level error messages appear inline
8.  On server error → banner at top of form with error message
```

### Flow 2 — Assign Courier (Branch Manager)

```
1.  Open shipment in READY_FOR_PICKUP status
2.  Click "Assign Courier"
3.  Modal opens with list of active couriers in this branch
4.  Select courier → click Confirm
5.  On success: modal closes, shipment status badge updates to ASSIGNED_TO_COURIER
6.  Courier receives WebSocket push notification on their device
7.  React Query cache is invalidated → list reflects change
```

### Flow 3 — Deliver Shipment (Courier)

```
1.  Courier opens task from their list
2.  Sees: recipient name, address, COD amount due
3.  Taps "Mark as Delivered"
4.  If codAmount > 0 → input field appears: "Enter amount collected"
5.  Courier enters amount → taps Confirm
6.  On success → task disappears from active list, appears in completed
7.  Merchant receives real-time status update notification
```

### Flow 4 — Failed Delivery (Courier)

```
1.  Courier taps "Failed Delivery"
2.  Reason selector appears:
    [ No one home ] [ Refused delivery ] [ Wrong address ] [ Other ]
3.  Courier selects reason → taps Confirm
4.  On success:
    - If attemptCount < maxAttempts → task returns to "retry" state
    - If attemptCount >= maxAttempts → task marked "Return In Progress"
5.  System sends notification to merchant
```

### Flow 5 — COD Settlement (Company Admin)

```
1.  Admin opens /cod/settlements
2.  Sees table of merchants with their pending COD balances
3.  Clicks "Create Settlement" for a merchant
4.  Review panel shows: list of all COLLECTED COD records, total amount
5.  Admin confirms → settlement created with PENDING status
6.  Admin transfers funds externally (bank / payment method)
7.  Admin returns, clicks "Confirm Payout", adds reference note
8.  Settlement marked PAID → all linked COD records marked SETTLED
9.  Merchant receives notification: "Your COD settlement of X has been processed"
```

-----

## Section 8: Form Validation Strategy

All forms use **React Hook Form + Zod**. The Zod schema is defined once in `packages/shared` and imported by both the frontend (form validation) and the backend (DTO validation pipe).

### Pattern

```typescript
// packages/shared/schemas/shipment.schema.ts
export const CreateShipmentSchema = z.object({
  recipientName: z.string().min(2).max(100),
  recipientPhone: z.string().regex(/^\+\d{10,15}$/),
  recipientAddress: z.string().min(5),
  city: z.string().min(2),
  weight: z.number().positive().multipleOf(0.01),
  codAmount: z.number().min(0).multipleOf(0.01),
  notes: z.string().max(500).optional(),
});

// Frontend usage
const form = useForm({
  resolver: zodResolver(CreateShipmentSchema),
});

// Backend usage (NestJS pipe)
// Same schema → same validation rules, single source of truth
```

### Error Display Rules

- Field-level errors appear below the field immediately after blur
- Submit-level errors appear as a banner at the top of the form
- API validation errors (`VALIDATION_ERROR`) are mapped to their fields
- API business rule errors (`SHIPMENT_CANNOT_BE_CANCELLED`) appear as toast notifications

-----

## Section 9: Arabic RTL Implementation

### Setup (from Phase 4)

```html
<!-- apps/admin/app/layout.tsx -->
<html lang="ar" dir="rtl">
```

```javascript
// tailwind.config.js
plugins: [require('tailwindcss-rtl')]
```

### RTL-Safe Spacing Rules

```
❌ Never use:   ml-   mr-   pl-   pr-
✅ Always use:  ms-   me-   ps-   pe-
```

`ms-` (margin-start) = `mr-` in RTL, `ml-` in LTR. This single rule handles 90% of RTL layout automatically without any extra code.

### RTL Exceptions (use `rtl:` prefix only when needed)

```html
<!-- Icons that are directional (arrows, chevrons) -->
<ChevronRight className="rtl:rotate-180" />

<!-- Absolute positioned elements -->
<div className="left-4 rtl:left-auto rtl:right-4" />
```

### Typography

```typescript
// Fonts: Inter for Latin, Cairo for Arabic
// Load both, browser selects automatically based on character set
```

-----

## Section 10: Loading & Error States

Every page that fetches data must handle three states. No exceptions.

```typescript
// Standard pattern for every page component

if (isLoading) return <PageSkeleton />;        // Skeleton UI, not spinner
if (isError) return <ErrorState retry={refetch} />;  // With retry button
return <PageContent data={data} />;
```

### Skeleton UI vs Spinner

Use Skeleton (placeholder shapes) for initial page loads. Use Spinner only for actions (button loading state). This reduces perceived load time.

-----

## Phase 7 Summary

|Item             |Decision                                                      |
|-----------------|--------------------------------------------------------------|
|App structure    |3 separate Next.js 14 apps (Admin, Merchant, Courier)         |
|Route protection |`middleware.ts` + role config map                             |
|Layout           |Role-aware sidebar (Admin), Bottom nav (Merchant + Courier)   |
|Server state     |React Query — all API data                                    |
|Client state     |Zustand — auth + UI state only                                |
|Form state       |React Hook Form + Zod (shared schemas)                        |
|Real-time        |Socket.io → invalidates React Query on events                 |
|RTL              |`dir="rtl"` + `ms-/me-` logical properties + `tailwindcss-rtl`|
|Error handling   |Field-level (forms) + toast (actions) + banner (page errors)  |
|Offline (Courier)|PWA with service worker + offline fallback page               |

-----

## Next Phase

**Phase 8: Incremental Implementation**

- Project scaffold and monorepo setup
- Backend first: NestJS project structure, Prisma schema, Auth module
- Implement one feature at a time, validate before moving on
- Starting point: Auth → Users → Shipments → COD

-----

*Phase 7 Completed | February 2026 | Shipping Management SaaS Platform*