# Phase 2: System Analysis

**Shipping Management SaaS Platform**

> Date: February 2026 | Status: COMPLETED

-----

## Section 1: Use Cases Per Role

### 🔴 Super Admin

|#    |Use Case                                          |
|-----|--------------------------------------------------|
|SA-01|Create / manage shipping companies on the platform|
|SA-02|Activate or suspend a shipping company            |
|SA-03|View platform-wide statistics                     |
|SA-04|Manage Super Admin accounts                       |

-----

### 🟠 Company Admin

|#    |Use Case                                       |
|-----|-----------------------------------------------|
|CA-01|Manage branches (create, edit, activate)       |
|CA-02|Manage merchants (invite, activate, suspend)   |
|CA-03|Manage couriers (add, assign to branch)        |
|CA-04|Configure pricing per merchant or zone         |
|CA-05|View all shipments across branches             |
|CA-06|Manage COD settlements with merchants          |
|CA-07|View financial reports                         |
|CA-08|Manage company admin sub-accounts & permissions|

-----

### 🟡 Branch Manager

|#    |Use Case                             |
|-----|-------------------------------------|
|BM-01|View shipments assigned to the branch|
|BM-02|Assign shipments to couriers         |
|BM-03|Manage couriers within the branch    |
|BM-04|Update shipment statuses manually    |
|BM-05|View COD collected by couriers       |
|BM-06|Print shipment labels                |

-----

### 🟢 Merchant

|#   |Use Case                                |
|----|----------------------------------------|
|M-01|Register and complete profile           |
|M-02|Create a new shipment (single)          |
|M-03|Create shipments in bulk (CSV upload)   |
|M-04|Track shipment status in real-time      |
|M-05|Cancel a shipment (before pickup only)  |
|M-06|View COD balance and transaction history|
|M-07|Request COD payout                      |
|M-08|View and download invoices              |
|M-09|Receive notifications on status changes |

-----

### 🔵 Courier

|#   |Use Case                                                          |
|----|------------------------------------------------------------------|
|C-01|Login to mobile app                                               |
|C-02|View assigned tasks for today                                     |
|C-03|Update shipment status (picked up / delivered / failed / returned)|
|C-04|Confirm COD amount collected                                      |
|C-05|Add delivery notes or attach photo proof                          |
|C-06|Receive new task notifications                                    |

-----

## Section 2: User Flows

### Flow 1 — Shipment Lifecycle *(Most Critical)*

```
Merchant creates shipment
        ↓
System generates tracking number
        ↓
Branch Manager sees new shipment
        ↓
Branch Manager assigns to Courier
        ↓
Courier picks up shipment → status: "picked_up"
        ↓
Courier attempts delivery
        ↓
    [Delivered?]
    YES → Courier confirms + collects COD → status: "delivered"
    NO  → Courier selects reason → status: "failed_attempt"
        ↓ (after max attempts reached)
    Returned to branch → status: "returned"
```

-----

### Flow 2 — COD Settlement

```
Courier collects cash on delivery
        ↓
System records COD amount against shipment
        ↓
Branch Manager reviews courier's collected COD
        ↓
Company Admin reviews all pending COD per merchant
        ↓
Admin marks settlement as "paid" → transfers to merchant
        ↓
Merchant sees updated COD balance
```

-----

### Flow 3 — Merchant Onboarding

```
Company Admin invites merchant (via email)
        ↓
Merchant receives invite link
        ↓
Merchant completes registration
        ↓
Admin activates merchant account
        ↓
Merchant can now create shipments
```

-----

## Section 3: Critical Workflows

> These are the workflows that, if broken, the entire system fails.

|#    |Workflow                                         |Why Critical                      |
|-----|-------------------------------------------------|----------------------------------|
|CW-01|Shipment creation + tracking number generation   |Foundation of all operations      |
|CW-02|Status update chain (courier → system → merchant)|Real-time visibility              |
|CW-03|COD collection and recording                     |Direct financial impact           |
|CW-04|Task assignment (branch → courier)               |Couriers cannot operate without it|
|CW-05|Authentication & role enforcement                |Platform security                 |
|CW-06|COD settlement (admin → merchant)                |Merchant trust in the platform    |

-----

## Section 4: Business Rules & Constraints

### Shipment Rules

- Every shipment has a **unique tracking number** generated automatically by the system
- A shipment **cannot be edited** once it has been assigned to a courier
- A shipment can only be **cancelled** when in `pending` or `ready_for_pickup` status
- Maximum failed delivery attempts is **configured by the Company Admin** (default: 3)
- After exhausting all attempts → shipment automatically transitions to `return_in_progress`

-----

### COD Rules

- COD is recorded **only** upon delivery confirmation by the courier
- COD amount **cannot be modified** after recording without Admin-level permission
- Settlement is calculated at the **merchant level**, not per individual shipment
- Collected COD remains **on hold** until the Admin confirms the transfer to the merchant

-----

### Pricing Rules

- Base pricing is defined at the **company level** (by zone / weight)
- Base price can be **overridden per merchant** individually
- Shipment price is **calculated and locked at creation time** — it never changes afterward

-----

### Role & Access Rules

- Every user belongs to **exactly one tenant** (one shipping company)
- Branch Manager can only view shipments **within their own branch**
- Courier can only view tasks **assigned to them**
- Super Admin is the **only role** that can operate across tenant boundaries

-----

## Summary

|Item                    |Count|
|------------------------|-----|
|Total Roles             |5    |
|Total Use Cases         |23   |
|User Flows Defined      |3    |
|Critical Workflows      |6    |
|Business Rule Categories|4    |

-----

## Next Phase

**Phase 3: Architecture Design**

- High-level system architecture
- Frontend / Backend responsibilities
- API communication strategy (HTTP vs Real-time)
- Authentication & authorization model
- Database modeling approach