# Phase 4: Tech Stack Validation

**Shipping Management SaaS Platform**
**Date: February 2026 | Status: COMPLETED**

-----

## Overview

This phase validates every tool and library in the stack before a single line of production code is written. The goal is to confirm version compatibility, identify potential conflicts, and justify each choice so the developer never hits a blocker caused by a wrong version or an unstable dependency.

**Validation Criteria for every tool:**

1. Is it stable and production-ready?
1. Is it compatible with the other tools in the stack?
1. Is it well-maintained and documented?
1. Does it fit a solo developer workflow?

-----

## Section 1: Frontend Stack Validation

### 1.1 Next.js 14.2.x

|Property           |Value                                                                                                                     |
|-------------------|--------------------------------------------------------------------------------------------------------------------------|
|Version            |14.2.x (App Router)                                                                                                       |
|Status             |✅ Stable — LTS-equivalent for Next.js                                                                                     |
|Node.js requirement|18.17+ or 20 LTS ✅                                                                                                        |
|Why not Next.js 15?|Next.js 15 introduced breaking changes in caching behavior and is too new for a production MVP — 14.2.x is the safe choice|
|Key features used  |App Router, Server Components, API Routes (for BFF if needed), `next-pwa` support                                         |

**Decision:** Use `14.2.x`. Pin to a specific patch version in `package.json` to prevent unexpected upgrades.

```json
"next": "14.2.29"
```

-----

### 1.2 React 18.2

|Property         |Value                                                                                        |
|-----------------|---------------------------------------------------------------------------------------------|
|Version          |18.2.0                                                                                       |
|Status           |✅ Stable — paired with Next.js 14                                                            |
|Why not React 19?|React 19 is too new, has breaking changes in Server Components API, not yet production-proven|
|Key features used|Concurrent rendering, Suspense, `useTransition` for optimistic UI                            |

**Decision:** React 18.2 is locked by Next.js 14 — no action required.

-----

### 1.3 TypeScript 5.3

|Property         |Value                                                                                     |
|-----------------|------------------------------------------------------------------------------------------|
|Version          |5.3.x                                                                                     |
|Status           |✅ Stable                                                                                  |
|Why this version?|Introduced `import attributes`, improved type narrowing — fully compatible with Next.js 14|
|Strict mode      |**Enabled** — `"strict": true` in `tsconfig.json` is mandatory                            |

**Decision:** Enable `strict` mode from day one. It prevents an entire class of runtime bugs.

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true
  }
}
```

-----

### 1.4 Tailwind CSS 3.4

|Property            |Value                                                                   |
|--------------------|------------------------------------------------------------------------|
|Version             |3.4.x                                                                   |
|Status              |✅ Stable                                                                |
|Why not Tailwind v4?|Tailwind v4 (alpha/beta) has breaking changes — not ready for production|
|RTL Support         |Requires `tailwindcss-rtl` plugin or manual `dir="rtl"` strategy        |

**RTL Strategy for Arabic Support:**
Tailwind 3.4 does not have built-in RTL utilities in the core. The correct approach is:

1. Set `dir="rtl"` on the `<html>` tag
1. Use `rtl:` variant prefix for RTL-specific overrides (available via plugin)
1. Install `tailwindcss-rtl` plugin

```bash
npm install tailwindcss-rtl
```

```js
// tailwind.config.js
plugins: [require('tailwindcss-rtl')]
```

**Decision:** Tailwind 3.4 with `tailwindcss-rtl` plugin. This fully covers the mandatory Arabic RTL requirement.

-----

### 1.5 Zustand (State Management)

|Property               |Value                                                                                         |
|-----------------------|----------------------------------------------------------------------------------------------|
|Version                |latest (5.x)                                                                                  |
|Status                 |✅ Stable                                                                                      |
|Why Zustand over Redux?|Zero boilerplate, minimal API surface, no Provider wrapper needed, perfect for solo developers|
|Usage scope            |Auth state, notification state, UI state (sidebar, modals)                                    |

**Rule:** Zustand is for **client-side global UI state only**. Server data (shipments, users) lives in API responses and is managed by React Query / SWR — not Zustand.

**Decision:** Use Zustand for auth context + UI state. Do not put server data into Zustand.

-----

### 1.6 React Hook Form + Zod

|Property       |Value                                                        |
|---------------|-------------------------------------------------------------|
|React Hook Form|latest (7.x) — ✅ Stable                                      |
|Zod            |latest (3.x) — ✅ Stable                                      |
|Integration    |`@hookform/resolvers` connects Zod schemas to React Hook Form|

**Why this combination?**

- React Hook Form uses uncontrolled inputs → zero re-renders per keystroke
- Zod provides schema-first validation that is **shared between frontend and backend**
- The same Zod schema validates form input on the frontend AND validates the DTO on the NestJS backend

```bash
npm install react-hook-form zod @hookform/resolvers
```

**Decision:** React Hook Form + Zod is the validation stack. Zod schemas will be placed in a `packages/shared` directory (monorepo-friendly) for reuse across frontend and backend.

-----

### 1.7 Axios

|Property             |Value                                                                                                    |
|---------------------|---------------------------------------------------------------------------------------------------------|
|Version              |latest (1.x)                                                                                             |
|Status               |✅ Stable                                                                                                 |
|Why Axios over fetch?|Interceptor support for automatic JWT refresh, consistent error handling, request/response transformation|

**Key usage:** A single Axios instance with:

- Base URL configured per environment
- Request interceptor: attaches `Authorization: Bearer <token>`
- Response interceptor: handles `401` → triggers refresh token flow

**Decision:** One shared Axios instance. Never create ad-hoc `fetch()` calls.

-----

### 1.8 Socket.io Client

|Property     |Value                                             |
|-------------|--------------------------------------------------|
|Version      |latest (4.x)                                      |
|Status       |✅ Stable                                          |
|Compatibility|Must match backend Socket.io version (4.x) exactly|

**Decision:** Lock frontend and backend to `socket.io` and `socket.io-client` at the same major version (4.x).

-----

### 1.9 Recharts

|Property   |Value                                                   |
|-----------|--------------------------------------------------------|
|Version    |latest (2.x)                                            |
|Status     |✅ Stable                                                |
|Usage scope|Admin dashboard statistics — shipment counts, COD totals|
|MVP scope  |Basic charts only — bar chart, line chart               |

**Decision:** Recharts for MVP charts. Scoped to Admin Dashboard only.

-----

### 1.10 next-pwa (PWA Support for Courier)

|Property      |Value                                                                              |
|--------------|-----------------------------------------------------------------------------------|
|Package       |`@ducanh2912/next-pwa`                                                             |
|Status        |✅ Actively maintained fork of the original `next-pwa`                              |
|Why this fork?|The original `next-pwa` is unmaintained and incompatible with Next.js 14 App Router|
|Compatibility |✅ Next.js 14 App Router supported                                                  |

```bash
npm install @ducanh2912/next-pwa
```

**PWA Features enabled in MVP:**

- App installable on Android and iOS home screen
- Offline fallback page (basic — shows “no connection” screen)
- Service Worker auto-generated

**PWA Limitation acknowledged (from Phase 3 decision):**

- Push Notifications on iOS are limited to iOS 16.4+ via Safari
- This is accepted for MVP — native app is the v2 plan

**Decision:** Use `@ducanh2912/next-pwa` with Next.js 14. Do not use the unmaintained original `next-pwa`.

-----

## Section 2: Backend Stack Validation

### 2.1 NestJS 10.4.x

|Property           |Value                                                                      |
|-------------------|---------------------------------------------------------------------------|
|Version            |10.4.x                                                                     |
|Status             |✅ Stable                                                                   |
|Node.js requirement|16+ (using Node 20 LTS ✅)                                                  |
|Why not NestJS 11? |NestJS 11 is very new — 10.4.x is battle-tested for production             |
|Key features used  |Modules, Guards, Interceptors, Pipes, WebSocket Gateway, BullMQ integration|

**Decision:** NestJS 10.4.x. Pin to this version.

-----

### 2.2 Node.js 20 LTS

|Property|Value                                                                               |
|--------|------------------------------------------------------------------------------------|
|Version |20 LTS (Active LTS until April 2026, Maintenance until April 2028)                  |
|Status  |✅ Production-ready                                                                  |
|Why LTS?|LTS versions receive security patches — never use Current/Odd versions in production|

**Decision:** Node.js 20 LTS in all environments (development, staging, production). Use `.nvmrc` to lock the version:

```
20
```

-----

### 2.3 Prisma 5.x

|Property         |Value                                                                                         |
|-----------------|----------------------------------------------------------------------------------------------|
|Version          |5.x (latest stable)                                                                           |
|Status           |✅ Stable                                                                                      |
|Compatibility    |✅ PostgreSQL 15, Node.js 20                                                                   |
|Key features used|Prisma Client, Prisma Migrate, Prisma Studio (dev only)                                       |
|Why not TypeORM? |Prisma has superior type safety, cleaner migration workflow, and better DX for solo developers|

**Critical Prisma rule:** Always use `prisma migrate dev` in development and `prisma migrate deploy` in production — never sync schemas manually.

**Decision:** Prisma 5.x as the sole ORM.

-----

### 2.4 PostgreSQL 15

|Property       |Value                                                                                       |
|---------------|--------------------------------------------------------------------------------------------|
|Version        |15                                                                                          |
|Status         |✅ Stable — released Oct 2022, mainstream support until Nov 2027                             |
|Why PostgreSQL?|ACID compliance, JSON support, row-level security (future use), excellent Prisma integration|
|Deployment     |Docker container in all environments                                                        |

**Decision:** PostgreSQL 15 via Docker. No direct host installation.

-----

### 2.5 Passport + JWT (Authentication)

|Property|Value                                                           |
|--------|----------------------------------------------------------------|
|Packages|`@nestjs/passport`, `passport-jwt`, `@nestjs/jwt`               |
|Version |latest (all stable)                                             |
|Strategy|JWT Strategy for Access Token, Refresh Token in HTTP-only Cookie|

**Decision:** Standard NestJS Passport JWT setup. Two guards: `JwtAuthGuard` (access token) and `JwtRefreshGuard` (refresh token).

-----

### 2.6 Redis 7

|Property  |Value                                                                           |
|----------|--------------------------------------------------------------------------------|
|Version   |7                                                                               |
|Status    |✅ Stable                                                                        |
|Usage     |Session cache, BullMQ queue store, Socket.io adapter for multi-instance (future)|
|Deployment|Docker container                                                                |

**Decision:** Redis 7 via Docker. Used by both BullMQ and as a Socket.io adapter store.

-----

### 2.7 BullMQ

|Property             |Value                                                        |
|---------------------|-------------------------------------------------------------|
|Version              |latest (5.x)                                                 |
|Status               |✅ Stable                                                     |
|NestJS integration   |`@nestjs/bullmq`                                             |
|Why BullMQ over Bull?|BullMQ is the modern successor to Bull — Bull is deprecated  |
|Usage                |Push notification jobs, COD settlement processing, email jobs|

```bash
npm install @nestjs/bullmq bullmq
```

**Decision:** BullMQ with `@nestjs/bullmq`. Never use the deprecated `bull` package.

-----

### 2.8 Swagger (API Documentation)

|Property|Value                                                                                |
|--------|-------------------------------------------------------------------------------------|
|Package |`@nestjs/swagger`                                                                    |
|Version |latest                                                                               |
|Status  |✅ Stable                                                                             |
|Usage   |Auto-generated API docs at `/api/docs` (dev and staging only, disabled in production)|

**Decision:** Swagger enabled in `development` and `staging` environments only. Disabled in `production` via environment config.

-----

## Section 3: Version Compatibility Matrix

This matrix confirms that all tools are compatible with each other.

|Tool     |Version|Compatible With                                   |
|---------|-------|--------------------------------------------------|
|Node.js  |20 LTS |NestJS 10 ✅, Next.js 14 ✅, Prisma 5 ✅             |
|Next.js  |14.2.x |React 18.2 ✅, TypeScript 5.3 ✅, Tailwind 3.4 ✅    |
|NestJS   |10.4.x |Node 20 ✅, Prisma 5 ✅, BullMQ 5 ✅, Socket.io 4 ✅  |
|Prisma   |5.x    |PostgreSQL 15 ✅, Node 20 ✅                        |
|Socket.io|4.x    |Socket.io-client 4.x ✅, NestJS WebSocket Gateway ✅|
|BullMQ   |5.x    |Redis 7 ✅, @nestjs/bullmq ✅                       |
|Zod      |3.x    |React Hook Form 7 ✅, NestJS Pipes ✅               |

**No known conflicts detected across the full stack.**

-----

## Section 4: Package.json Version Pinning Strategy

**Rule:** Pin major versions, allow minor/patch updates.

```json
{
  "dependencies": {
    "next": "14.2.29",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "@nestjs/core": "^10.4.0",
    "prisma": "^5.0.0",
    "@prisma/client": "^5.0.0",
    "bullmq": "^5.0.0",
    "socket.io": "^4.0.0",
    "socket.io-client": "^4.0.0",
    "zod": "^3.0.0"
  }
}
```

**Never use `*` or `latest` in production `package.json`.**

-----

## Section 5: Development Environment Setup

### Required Tools

|Tool          |Version                         |Purpose                       |
|--------------|--------------------------------|------------------------------|
|Node.js       |20 LTS                          |Runtime                       |
|npm           |10.x (comes with Node 20)       |Package manager               |
|Docker Desktop|Latest stable                   |Run PostgreSQL + Redis locally|
|Docker Compose|v2 (bundled with Docker Desktop)|Local service orchestration   |
|VS Code       |Latest                          |Recommended IDE               |

### Recommended VS Code Extensions

- `Prisma` — syntax highlighting for `.prisma` files
- `ESLint` — real-time linting
- `Tailwind CSS IntelliSense` — autocomplete for Tailwind classes
- `REST Client` — test API endpoints without Postman

### `.nvmrc` (lock Node version per project)

```
20
```

-----

## Section 6: Tech Stack Decision Log

|ID   |Tool                          |Decision   |Reason                                           |
|-----|------------------------------|-----------|-------------------------------------------------|
|TS-01|Next.js 14.2.x                |✅ Confirmed|Stable, App Router mature, PWA support           |
|TS-02|React 18.2                    |✅ Confirmed|Locked by Next.js 14, no action needed           |
|TS-03|TypeScript 5.3 strict         |✅ Confirmed|Prevents runtime bugs, enforced from day one     |
|TS-04|Tailwind 3.4 + tailwindcss-rtl|✅ Confirmed|RTL requirement covered                          |
|TS-05|Zustand (UI state only)       |✅ Confirmed|Zero boilerplate, no server state in store       |
|TS-06|React Hook Form + Zod         |✅ Confirmed|Shared schemas between frontend and backend      |
|TS-07|Axios (single instance)       |✅ Confirmed|Interceptors for auth + error handling           |
|TS-08|@ducanh2912/next-pwa          |✅ Confirmed|Only maintained Next.js 14 compatible PWA package|
|TS-09|NestJS 10.4.x                 |✅ Confirmed|Stable, not using untested v11                   |
|TS-10|Node.js 20 LTS                |✅ Confirmed|LTS = security patches guaranteed                |
|TS-11|Prisma 5.x                    |✅ Confirmed|Best-in-class DX over TypeORM                    |
|TS-12|PostgreSQL 15                 |✅ Confirmed|ACID, Prisma-native, stable LTS                  |
|TS-13|BullMQ (not Bull)             |✅ Confirmed|Bull is deprecated                               |
|TS-14|Redis 7                       |✅ Confirmed|Required by BullMQ, doubles as cache             |
|TS-15|Swagger (dev/staging only)    |✅ Confirmed|Disabled in production for security              |

-----

## Phase 4 Summary

|Category                       |Status                                  |
|-------------------------------|----------------------------------------|
|Frontend stack validated       |✅                                       |
|Backend stack validated        |✅                                       |
|Version compatibility confirmed|✅                                       |
|No conflicts detected          |✅                                       |
|RTL (Arabic) solution confirmed|✅ Tailwind + tailwindcss-rtl            |
|PWA solution confirmed         |✅ @ducanh2912/next-pwa                  |
|Deprecated packages avoided    |✅ (BullMQ over Bull, fork over next-pwa)|

-----

## Next Phase

**Phase 5: Domain & Data Design**

- Define all core domain entities in detail
- Define relationships and data ownership
- Design the full shipment status lifecycle state machine
- Identify all domain events and their side effects
- Produce the complete Prisma schema

-----

*Phase 4 Completed | February 2026*
*Shipping Management SaaS Platform*