# Frontend Enhancement & Completion Tasks
## Shipping Management SaaS Platform
**Date:** February 2026

---

## Audit Result Per Page

### Admin App

| Page | Status | Issues Found |
|------|--------|--------------|
| `/login` | ✅ Complete | — |
| `/dashboard` | ⚠️ Partial | No chart, no recent shipments list, no quick links |
| `/shipments` | ⚠️ Partial | No search by tracking number working (client-only filter, not API), no bulk action |
| `/shipments/[id]` | ✅ Complete | Approve + assign + status update all work |
| `/merchants` | ✅ Complete | — |
| `/merchants/[id]` | ✅ Complete | — |
| `/couriers` | ⚠️ Partial | No courier `[id]` detail page, no inline status toggle |
| `/branches` | ✅ Complete | — |
| `/cod` | ⚠️ Partial | No COD records tab (only settlements shown), no pending balance summary per merchant |
| `/pricing` | ✅ Complete | — |
| `/settings` | ❌ Placeholder | Shows static read-only info, no editable company settings, no maxAttempts config |
| `/403` | ✅ Complete | — |

### Merchant App

| Page | Status | Issues Found |
|------|--------|--------------|
| `/login` | ✅ Complete | — |
| `/dashboard` | ✅ Complete | — |
| `/shipments` | ✅ Complete | — |
| `/shipments/new` | ⚠️ Partial | Price debounce is fragile (setTimeout), no validation feedback on price calc failure |
| `/shipments/[id]` | ✅ Complete | — |
| `/cod/balance` | ✅ Complete | — |
| `/cod/history` | ✅ Complete | — |

### Courier App

| Page | Status | Issues Found |
|------|--------|--------------|
| `/login` | ✅ Complete | — |
| `/tasks` | ⚠️ Partial | No pull-to-refresh, no completed tasks section (only shows active), filter by status missing |
| `/tasks/[id]` | ✅ Complete | All delivery actions, fail reasons, COD input work |
| `/cod/summary` | ⚠️ Partial | COD records not filtered by courier (fetches all records), stats from API may be wrong |

### Missing Pages Entirely

| Page | App | Priority |
|------|-----|----------|
| `/couriers/[id]` | Admin | HIGH |
| `not-found.tsx` | All 3 | LOW |

---

## Tasks — Ordered by Priority

---

### TASK-F01 — Admin: Courier detail page `/couriers/[id]`
**Priority:** HIGH | **Complexity:** Medium | **Time:** ~3h

**What to build:**
`apps/admin/src/app/(dashboard)/couriers/[id]/page.tsx`

Page sections:
1. **Header** — courier name, branch badge, status badge, Activate/Suspend button
2. **Info cards** — email, phone, branch name, registration date
3. **Performance stats** — call `GET /stats/courier?courierId=:id` — show: total deliveries, success rate, COD collected, failed attempts
4. **Today's shipments** — call `GET /shipments?courierId=:id` filtered to active statuses — show tracking number, recipient, status, COD
5. **Suspend/Activate confirm dialog** using `useUpdateUserStatus` hook

**Hooks to use:** `useUser(id)`, `useCourierStats(id)`, `useShipments({ courierId: id })`, `useUpdateUserStatus()`

**Link from:** Update couriers list page — wrap each row's "عرض" button with `<Link href={'/couriers/' + courier.id}>`

---

### TASK-F02 — Admin: Dashboard — add recent shipments + quick action links
**Priority:** HIGH | **Complexity:** Low | **Time:** ~1.5h

**Current state:** Shows stat cards only. No activity, no navigation shortcuts.

**What to add:**

1. **Recent Shipments table** (last 5) — call `useShipments({ page: 1, limit: 5 })` — show tracking number, status badge, merchant name, city, date — each row links to `/shipments/[id]`

2. **Quick Action cards** (2-column grid below stats):
‎   - "الشحنات المعلقة" → links to `/shipments?status=PENDING`
‎   - "تسويات COD" → links to `/cod`
‎   - "إضافة تاجر" → opens the create merchant dialog (or links to `/merchants`)
‎   - "إضافة مندوب" → links to `/couriers`

3. **Role-based greeting** — "مرحباً [name]، [role_ar]" above the stats cards

---

### TASK-F03 — Admin: COD page — add COD Records tab
**Priority:** HIGH | **Complexity:** Medium | **Time:** ~2h

**Current state:** Shows settlements only. COD records (individual collected amounts) are not visible at all.

**What to build:**
- Wrap the page in `<Tabs>` with two tabs:
  - Tab 1: **التسويات** (current settlements table — already works)
  - Tab 2: **سجلات COD** — call `useCODRecords()` — show table with columns: shipment tracking number, merchant name, courier name, amount, status (COLLECTED/SETTLED), collection date
- Add a **summary bar** above tabs showing:
  - Total pending COD (sum of COLLECTED records)
  - Total settled (sum of SETTLED records)
  - Count of merchants with pending balances

**Hooks to add:** `useCODRecords` (already exists in admin hooks)

---

### TASK-F04 — Admin: Settings page — make it functional
**Priority:** MEDIUM | **Complexity:** Medium | **Time:** ~2h

**Current state:** Completely static. Shows read-only user info. "تغيير كلمة المرور" button does nothing.

**What to build:**

1. **Company Settings section** (COMPANY_ADMIN only):
   - Max delivery attempts (number input, default 3) — calls `PATCH /tenants/:id` with `settings.maxDeliveryAttempts`
   - Company display name — calls `PATCH /tenants/:id`
   - Save button with loading state

2. **Change Password section** (all roles):
   - Current password, new password, confirm new password inputs
   - Basic client-side validation (match check, min 8 chars)
   - Calls `PATCH /users/me/password` — **NOTE:** this endpoint may not exist in the backend yet (see Backend Note below)

3. **Profile section** — keep as read-only (name, email, role) but add a note: "لتغيير بياناتك الشخصية، تواصل مع مدير النظام"

**Backend Note:** You may need to add `PATCH /users/me/password` to `users.controller.ts` and `users.service.ts`. Simple implementation: verify current password, hash new one, update record.

---

### TASK-F05 — Admin: Shipments list — fix search to use API
**Priority:** MEDIUM | **Complexity:** Low | **Time:** ~1h

**Current state:** The search input filters the already-loaded page results client-side. If there are 500 shipments and you're on page 1 (showing 20), searching "SHP-2026" only searches the 20 visible rows — not all 500.

**What to fix:**
- Add a `trackingNumber` filter to the `useShipments` query params
- Use `useDebounce` (300ms) on the search input
- Pass `trackingNumber: debouncedSearch` to the API call
- Reset `page` to 1 when search changes
- The API already supports this filter — it just needs to be passed

**What to install:**
```bash
npm install use-debounce
```
Or add a simple `useDebounce` hook (10 lines) in `src/hooks/use-debounce.ts`.

---

### TASK-F06 — Admin: Couriers list — add inline status toggle + link to detail
**Priority:** MEDIUM | **Complexity:** Low | **Time:** ~45min

**Current state:** The couriers list shows data but the action buttons are not wired or are incomplete.

**What to fix:**
1. Wrap each row's name/action with `<Link href={'/couriers/' + courier.id}>` to navigate to TASK-F01 page
2. Add inline status toggle button in the actions column: show "تعليق" if ACTIVE, "تفعيل" if SUSPENDED — call `useUpdateUserStatus` directly (no need for a separate page visit)
3. Add a confirmation `AlertDialog` before toggling status

---

### TASK-F07 — Merchant: New Shipment — fix price calculation debounce
**Priority:** MEDIUM | **Complexity:** Low | **Time:** ~30min

**Current state:** Price calculation fires via `setTimeout(..., 100)` which is fragile — rapid city/weight changes fire multiple API calls, and the function only fires correctly when both city and weight are set.

**What to fix:**

Create `apps/merchant/src/hooks/use-debounce.ts`:
```typescript
import { useEffect, useState } from 'react';
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
```

Then in `shipments/new/page.tsx`:
- Use `useDebounce(watchedCity, 400)` and `useDebounce(watchedWeight, 400)`
- `useEffect` on both debounced values → call `handleCalculatePrice` only when both are valid
- Remove all the inline `setTimeout` calls and `onChange` handlers that trigger price calc
- Show a "جاري الحساب..." spinner inside the price card while calculating

---

### TASK-F08 — Courier: Tasks list — add completed tasks section + pull-to-refresh
**Priority:** MEDIUM | **Complexity:** Low | **Time:** ~1h

**Current state:** Only shows active/pending tasks. Completed and returned shipments are invisible. No way to manually refresh.

**What to add:**

1. **Completed tasks section** — filter `allTasks` for `status === 'DELIVERED' || status === 'RETURNED' || status === 'CANCELLED'` — show collapsed by default with a toggle button "المهام المكتملة (N)"

2. **Refresh button** in the header — a `<RefreshCw>` icon button that calls `refetch()` — with a spinning animation while loading

3. **Last updated timestamp** — show "آخر تحديث: 10:32 ص" below the stats cards, updated on every successful fetch

---

### TASK-F09 — Courier: COD Summary — filter records by courier only
**Priority:** MEDIUM | **Complexity:** Low | **Time:** ~30min

**Current state:** `useCODRecords()` is called without `courierId` filter, so it fetches ALL records for the tenant. A courier should only see their own COD records.

**What to fix:**
In `apps/courier/src/app/cod/summary/page.tsx`:
```typescript
// Change this:
const { data: recordsData } = useCODRecords({ page: 1, limit: 100 });

// To this:
const { data: recordsData } = useCODRecords({
  courierId: user?.id,
  page: 1,
  limit: 100,
});
```

Verify that `useCODRecords` in the courier app's hooks passes `courierId` to the API query. Check `apps/courier/src/hooks/queries/index.ts` around line 337.

---

### TASK-F10 — All Apps: Add 404 not-found pages
**Priority:** LOW | **Complexity:** Trivial | **Time:** ~30min

Create these 3 files with a branded, Arabic "الصفحة غير موجودة" message:

- `apps/admin/src/app/not-found.tsx`
- `apps/merchant/src/app/not-found.tsx`
- `apps/courier/src/app/not-found.tsx`

Each should show:
- App logo/icon
- Arabic "404 — الصفحة غير موجودة"
- A back button linking to the home/dashboard route
- Matching the app's color scheme (blue for admin, emerald for merchant, orange for courier)

---

### TASK-F11 — Admin: Dashboard — add date range filter to stats
**Priority:** LOW | **Complexity:** Low | **Time:** ~1h

**Current state:** Stats always show all-time figures. No way to see "this week" or "this month."

**What to add:**
- A date range selector (two date inputs or a preset dropdown: اليوم / هذا الأسبوع / هذا الشهر) at the top of the dashboard
- Pass `dateFrom` and `dateTo` to `useCompanyStats(dateFrom, dateTo)`
- The API already supports these query params

---

### TASK-F12 — Admin: API tsconfig — exclude seed.ts from compilation
**Priority:** CRITICAL (build error) | **Complexity:** Trivial | **Time:** 2 min

**Current state:** `npx tsc --noEmit` in the API fails with:
`error TS6059: File 'seed.ts' is not under 'rootDir' 'src'`

**Fix:** In `apps/api/tsconfig.json`, add:
```json
{
  "exclude": ["node_modules", "dist", "prisma/seed.ts"]
}
```

---

## Summary Table

| Task | App | Priority | Complexity | Time Estimate |
|------|-----|----------|------------|---------------|
| F01 — Courier `[id]` detail page | Admin | HIGH | Medium | 3h |
| F02 — Dashboard recent shipments + quick links | Admin | HIGH | Low | 1.5h |
| F03 — COD Records tab | Admin | HIGH | Medium | 2h |
| F04 — Settings page (editable) | Admin | MEDIUM | Medium | 2h |
| F05 — Shipments search via API | Admin | MEDIUM | Low | 1h |
| F06 — Couriers inline status + detail link | Admin | MEDIUM | Low | 45min |
| F07 — New Shipment price debounce | Merchant | MEDIUM | Low | 30min |
| F08 — Tasks completed section + refresh | Courier | MEDIUM | Low | 1h |
| F09 — COD records filter by courier | Courier | MEDIUM | Trivial | 30min |
| F10 — 404 not-found pages | All | LOW | Trivial | 30min |
| F11 — Dashboard date range filter | Admin | LOW | Low | 1h |
| F12 — tsconfig seed exclude (build fix) | API | CRITICAL | Trivial | 2min |

**Total estimated time: ~14 hours**

---

## Recommended Build Order

```
Day 1 (quick wins first):
  F12 (2 min) → F09 (30 min) → F07 (30 min) → F06 (45 min) → F05 (1h)

Day 2 (admin completeness):
  F02 (1.5h) → F03 (2h) → F01 (3h)

Day 3 (polish):
  F08 (1h) → F04 (2h) → F11 (1h) → F10 (30 min)
```
