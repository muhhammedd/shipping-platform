# Phase 3: Architecture Design

**Shipping Management SaaS Platform**
**Date: February 2026 | Status: COMPLETED**

-----

## Overview

This document defines the technical architecture for the Shipping Management SaaS Platform, based on the outcomes of Phase 1 (Discovery & Planning) and Phase 2 (System Analysis). Every decision made here is justified and traceable to a business requirement or constraint identified in prior phases.

-----

## Section 1: High-Level System Architecture

### Architecture Pattern: API-First Modular Monolith

The system follows an **API-First Monolith** pattern. All three client applications (Admin Dashboard, Merchant Web App, Courier Mobile App) communicate with a single centralized NestJS backend over HTTP and WebSocket.

```
┌────────────────────────────────────────────────────────────────┐
│                         CLIENTS LAYER                          │
├─────────────────────┬─────────────────────┬────────────────────┤
│   Admin Dashboard   │  Merchant Web App   │  Courier PWA        │
│   (Next.js)         │  (Next.js)          │  (Next.js PWA)      │
└──────────┬──────────┴──────────┬──────────┴─────────┬──────────┘
           │                     │                     │
           └─────────────────────▼─────────────────────┘
                       HTTPS REST + WebSocket
                                 │
┌────────────────────────────────▼───────────────────────────────┐
│                     BACKEND (NestJS Monolith)                  │
│                                                                │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  │
│  │   Auth    │  │ Shipments │  │   Users   │  │  Finance  │  │
│  │  Module   │  │  Module   │  │  Module   │  │  Module   │  │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘  │
│                                                                │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  │
│  │  Pricing  │  │  Branches │  │Notificatns│  │ WebSocket │  │
│  │  Module   │  │  Module   │  │  Module   │  │  Gateway  │  │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘  │
│                                                                │
└────────────────────────────────┬───────────────────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                   ▼
     ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
     │  PostgreSQL  │   │    Redis     │   │    BullMQ    │
     │  (Primary    │   │  (Sessions + │   │ (Background  │
     │   Database)  │   │   Cache +    │   │   Jobs +     │
     │              │   │   Pub/Sub)   │   │  Notificatns)│
     └──────────────┘   └──────────────┘   └──────────────┘
```

### Why Monolith and Not Microservices?

|Factor                         |Monolith                        |Microservices                     |
|-------------------------------|--------------------------------|----------------------------------|
|Developer count                |✅ Ideal for solo developer      |❌ Requires a team                 |
|Debugging complexity           |✅ Single codebase, easy to trace|❌ Distributed tracing required    |
|Deployment                     |✅ One deployment unit           |❌ Multiple services to orchestrate|
|Refactor to Microservices later|✅ Possible when scale demands   |—                                 |

**Decision:** Start with a well-structured Monolith. NestJS modules provide clean separation of concerns that makes a future migration to Microservices straightforward if the business grows.

-----

## Section 2: Frontend & Backend Responsibilities

### Frontend Responsibilities

|Application         |Responsibilities                                                                                                                                   |
|--------------------|---------------------------------------------------------------------------------------------------------------------------------------------------|
|**Admin Dashboard** |Display data, manage users, RBAC UI, shipment monitoring, COD settlement interface, pricing configuration                                          |
|**Merchant Web App**|Create shipments, real-time tracking, view COD balance, notifications                                                                              |
|**Courier PWA**     |View daily task list, update shipment statuses, confirm COD collection, receive push notifications. Built as PWA in MVP — native app planned for v2|

### Frontend Core Rules

- **No Business Logic on the frontend.** All calculations, validations, and state transitions happen exclusively on the backend.
- **No independent data validation.** Frontend validation is UX-only (form feedback). The backend is the single source of truth.
- **No pricing or COD calculations.** All financial values are computed by the backend and consumed by the frontend.
- **Role-based UI rendering** is driven by the role returned in the JWT payload — no hardcoded role checks in components.

### Backend Responsibilities

- All Business Rules enforcement (shipment lifecycle, COD rules, pricing rules)
- Authentication and authorization for every request
- Shipment price calculation and locking at creation time
- Full audit trail for all financial operations
- WebSocket event broadcasting for real-time status updates
- Background job processing via BullMQ (notifications, settlements)
- Multi-tenancy enforcement via centralized Tenant Guard

-----

## Section 3: API Communication Strategy

### When to Use HTTP vs WebSocket

|Communication Type          |Protocol    |Reason                            |
|----------------------------|------------|----------------------------------|
|Login / Logout              |HTTP POST   |One-time request-response         |
|Create / Update / Delete    |HTTP REST   |Standard CRUD operations          |
|Fetch lists, reports        |HTTP GET    |Stateless retrieval               |
|Shipment status changes     |WebSocket   |Real-time push to merchant & admin|
|New task assigned to courier|WebSocket   |Immediate notification            |
|In-app notification delivery|WebSocket   |Live update without polling       |
|Push notifications (mobile) |BullMQ + FCM|Background delivery via queue     |

### Communication Flow — Status Update Example

```
Courier App         Backend              Merchant App
    │                   │                     │
    │──── HTTP PATCH ──▶│ Update status in DB │
    │                   │──── Emit WS event ──▶│ Receive live update
    │                   │──── Queue Job ──────▶│ BullMQ → FCM push
    │◀── 200 OK ────────│                     │
```

### Why Socket.io and Not SSE or Long Polling?

- **Server-Sent Events (SSE):** One-directional only (server → client). Cannot handle courier sending updates to the server over the same channel.
- **Long Polling:** High server load, unnecessary complexity.
- **Socket.io:** Bidirectional, mature Node.js ecosystem integration, built-in reconnection and fallback to long-polling when WebSocket is unavailable.

**Decision:** Socket.io for all real-time communication. HTTP REST for all standard operations.

-----

## Section 4: Authentication & Authorization Model

### Authentication Flow

```
[Client] ──── POST /auth/login (email + password)
                     │
              [Backend validates credentials]
                     │
              [Issues two tokens]
              ├── Access Token  (JWT, 15 minutes TTL)
              └── Refresh Token (JWT, 7 days TTL)
                     │
              [Tokens returned to client]
              ├── Access Token  → Stored in memory (frontend state)
              └── Refresh Token → Stored in HTTP-only Cookie (XSS-safe)
                     │
[Every API Request] ──── Authorization: Bearer <access_token>
                     │
              [Backend JWT Guard]
              ├── Validates signature
              ├── Checks token expiry
              ├── Extracts role + tenantId
              └── Attaches user context to request
```

### Token Strategy Justification

|Choice                                               |Reason                                                       |
|-----------------------------------------------------|-------------------------------------------------------------|
|Short-lived Access Token (15 min)                    |Limits damage if token is leaked                             |
|Long-lived Refresh Token (7 days) in HTTP-only Cookie|Cannot be accessed by JavaScript → XSS-safe                  |
|Stateless JWT                                        |No server-side session storage required → scales horizontally|

### Authorization Model (RBAC)

Every user has exactly one role and belongs to exactly one tenant:

```
User {
  id
  role: SUPER_ADMIN | COMPANY_ADMIN | BRANCH_MANAGER | MERCHANT | COURIER
  tenantId: UUID | null   ← null for SUPER_ADMIN only
  branchId: UUID | null   ← set only for BRANCH_MANAGER and COURIER
}
```

### Role Permission Matrix

|Permission            |Super Admin|Company Admin |Branch Manager|Merchant    |Courier          |
|----------------------|:---------:|:------------:|:------------:|:----------:|:---------------:|
|Manage tenants        |✅          |❌             |❌             |❌           |❌                |
|Manage branches       |❌          |✅             |❌             |❌           |❌                |
|Manage merchants      |❌          |✅             |❌             |❌           |❌                |
|Manage couriers       |❌          |✅             |✅ (own branch)|❌           |❌                |
|View all shipments    |✅          |✅ (own tenant)|✅ (own branch)|✅ (own only)|✅ (assigned only)|
|Create shipment       |❌          |❌             |❌             |✅           |❌                |
|Update shipment status|❌          |❌             |✅             |❌           |✅                |
|COD settlement        |❌          |✅             |❌             |❌           |❌                |
|View platform stats   |✅          |❌             |❌             |❌           |❌                |

### Tenant Isolation Rule

Every database query must be scoped to the current `tenantId`. This is enforced via a **NestJS Global Interceptor** that automatically appends `WHERE tenantId = :currentTenantId` to all queries. No query may bypass this rule except those executed in the Super Admin context.

-----

## Section 5: Database Modeling Approach

### Multi-Tenancy Strategy: Shared Database, Shared Schema

Three common strategies exist:

|Strategy                      |Description                                    |Pros              |Cons                             |
|------------------------------|-----------------------------------------------|------------------|---------------------------------|
|Separate Database             |One DB per tenant                              |Maximum isolation |High ops overhead                |
|Shared DB, Separate Schema    |One schema per tenant                          |Good isolation    |Complex migrations               |
|**Shared DB, Shared Schema** ✅|Single schema, `tenantId` column on every table|Simplest to manage|Requires strict query enforcement|

**Decision:** Shared Database, Shared Schema with `tenantId` on every multi-tenant table. This is the correct choice for MVP stage with a solo developer. Migration to a stronger isolation model is possible later if compliance or scale demands it.

### ORM Strategy with Prisma

- All schema changes are managed via **Prisma Migrations** — no raw SQL schema edits.
- Prisma Client provides full TypeScript type safety across the entire backend.
- All relationships are defined in `schema.prisma` as the single source of truth.

### Core Entity Map (High-Level)

The full entity design is covered in **Phase 5: Domain & Data Design**. The entities are listed here for architecture context:

```
Tenant (ShippingCompany)
 ├── Users
 │    ├── CompanyAdmin
 │    ├── BranchManager
 │    ├── Merchant
 │    └── Courier
 ├── Branches
 │    └── Couriers (assigned to branch)
 ├── Shipments
 │    ├── StatusHistory (immutable log)
 │    └── CODRecord
 ├── PricingRules (per tenant or per merchant)
 └── CODSettlements (merchant-level)
```

### Data Integrity Principles

- **Immutable status history:** Shipment status changes are never updated in place — each change creates a new `StatusHistory` record.
- **Price lock at creation:** Shipment price is calculated once at creation and stored. It never recalculates even if pricing rules change.
- **COD immutability:** COD amounts cannot be modified after recording without an explicit Admin-level override action that is also logged.
- **Soft deletes:** Users and merchants are never hard-deleted. They are suspended/deactivated with a status flag and timestamp.

-----

## Section 6: Infrastructure & Deployment (MVP)

### Infrastructure Stack

```
┌──────────────────────────────────────────────────┐
│                 Single VPS Server                 │
│              (e.g., DigitalOcean, Hetzner)        │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │              Nginx (Reverse Proxy)          │  │
│  │  SSL Termination + Static File Serving      │  │
│  └───┬────────────────────┬───────────────────┘  │
│      │                    │                       │
│  Port 3000             Port 3001                  │
│  ┌───▼──────────┐   ┌─────▼───────────┐          │
│  │  Next.js     │   │  NestJS API     │          │
│  │  (Admin +    │   │  (Backend)      │          │
│  │   Merchant)  │   └─────────────────┘          │
│  └──────────────┘                                │
│                                                  │
│  ┌─────────────────┐   ┌──────────────────┐      │
│  │   PostgreSQL 15 │   │   Redis 7        │      │
│  │   (Main DB)     │   │   (Cache + Queue)│      │
│  └─────────────────┘   └──────────────────┘      │
└──────────────────────────────────────────────────┘
```

### Why Docker Compose on a Single VPS?

|Option                 |Justification                                                    |
|-----------------------|-----------------------------------------------------------------|
|Docker Compose (chosen)|Simple setup, easy to reproduce, all services defined in one file|
|Kubernetes             |Massive operational overhead — unjustified for MVP               |
|Bare metal             |No reproducibility, difficult to migrate                         |

All services (NestJS, Next.js, PostgreSQL, Redis) are containerized via Docker Compose. A single `docker-compose.yml` file is the deployment manifest.

### Environment Separation

|Environment  |Purpose                                             |
|-------------|----------------------------------------------------|
|`development`|Local dev with hot reload, debug logging enabled    |
|`staging`    |Pre-production validation, mirrors production config|
|`production` |Live system, logging to file, error alerting enabled|

-----

## Section 7: Architecture Decision Log (ADL)

Every major architectural decision is documented here for traceability.

|ID    |Decision             |Option Chosen            |Alternatives Considered     |Justification                                                               |
|------|---------------------|-------------------------|----------------------------|----------------------------------------------------------------------------|
|ADL-01|Backend Architecture |Modular Monolith         |Microservices               |Solo developer, MVP scope, easier debugging                                 |
|ADL-02|Multi-Tenancy Model  |Shared DB / Shared Schema|Separate DB, Separate Schema|Simplest for MVP, lowest ops overhead                                       |
|ADL-03|Real-Time Protocol   |Socket.io                |SSE, Long Polling           |Bidirectional support, mature ecosystem                                     |
|ADL-04|Auth Strategy        |JWT (Access + Refresh)   |Session-based, OAuth only   |Stateless, scales without sticky sessions                                   |
|ADL-05|Refresh Token Storage|HTTP-only Cookie         |localStorage                |Immune to XSS attacks                                                       |
|ADL-06|ORM                  |Prisma                   |TypeORM, Sequelize          |Type-safe, excellent migration tooling                                      |
|ADL-07|Background Jobs      |BullMQ + Redis           |Cron only, SQS              |Reliable, retry support, Redis already in stack                             |
|ADL-08|Deployment           |Docker Compose on VPS    |Kubernetes, serverless      |Minimal ops complexity for solo developer                                   |
|ADL-09|Courier App (MVP)    |PWA via Next.js          |React Native (Expo)         |Faster MVP delivery, same codebase, upgrade path to native app in v2 planned|

-----

## Phase 3 Summary

|Item                       |Decision                                    |
|---------------------------|--------------------------------------------|
|Architecture Pattern       |API-First Modular Monolith                  |
|Backend Framework          |NestJS 10.x                                 |
|Frontend (Admin + Merchant)|Next.js 14.x                                |
|Mobile (Courier)           |PWA via Next.js (MVP) → Native App in v2    |
|Database                   |PostgreSQL 15 + Prisma ORM                  |
|Cache & Queue              |Redis 7 + BullMQ                            |
|Real-time                  |Socket.io                                   |
|Authentication             |JWT (Access Token + Refresh Token in Cookie)|
|Authorization              |RBAC with Tenant Guard                      |
|Multi-Tenancy              |Shared Schema + tenantId                    |
|Deployment                 |Docker Compose on Single VPS                |

-----

## Next Phase

**Phase 4: Tech Stack Validation**

- Validate all framework and library versions
- Confirm compatibility across the stack
- Justify every major technology choice
- Define PWA setup requirements for Next.js (next-pwa configuration)

-----

*Phase 3 Completed | February 2026*
*Shipping Management SaaS Platform*