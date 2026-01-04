# Technical Specifications Document — Deploy Index (InstantDB + Next.js)

## 1. Introduction

* **Project Name:** Deploy Index — Deployed Software Inventory Platform
* **Document Version:** 1.0
* **Date:** 2026-01-04
* **Purpose:**
  This document specifies the **technical architecture, data model, permissions, query patterns, and implementation constraints** for migrating Deploy Index from a YAML-based MVP to an **InstantDB-backed**, organization-scoped, **invitation-gated** inventory platform built with **Next.js 16 / React 19**.
  It incorporates InstantDB “AGENTS.md” guidance, including **schema indexing rules**, **query operator limitations**, and **permissions best practices**.

## 2. Goals

### Technical Goals

* **Correctness and Safety:** enforce org scoping and invitation gating at the permissions layer; guarantee atomic writes for composite entities (software + interfaces + dependencies).
* **InstantDB-native architecture:** rely on InstantDB for queries, transactions, auth state, permissions, and real-time sync; avoid ad-hoc backend endpoints unless justified.
* **Performance:** virtualized inventory table; indexed filtering; predictable query latency for 1k+ software entries.
* **Maintainability:** typed schema-first development (`instant.schema.ts`), centralized validation (Zod), reusable hooks, consistent query patterns.
* **UX excellence:** crisp, consistent UI patterns; minimal friction for editors; clear empty states for non-invited users; export designed for analysis.

### Business Goals Supported

* Centralize previously fragmented Excel/YAML inventory into SSOT.
* Enable multi-role contribution (DevOps + Developers) via forms rather than YAML.
* Secure access: self-signup allowed, but org data visible only via invitation.
* Make inventory consumable: search/filter/sort and Excel export.

---

## 3. Development Environment

### Operating Systems

* macOS, Linux, Windows

### Programming Languages

* TypeScript (primary)

### Frameworks

* Next.js 16 (App Router)
* React 19

### Libraries (Key)

* InstantDB: `@instantdb/react`, `@instantdb/admin`
* Auth: `better-auth`, `better-auth-instantdb`, `@daveyplate/better-auth-instantdb`, `@daveyplate/better-auth-ui`
* Forms/Validation: `@tanstack/react-form`, `zod`
* Table: `@tanstack/react-table`, `@tanstack/react-virtual`
* UI: Shadcn/ui, Radix UI suite, Tailwind CSS, lucide-react, framer-motion

### Development Tools

* Package manager: **npm** (based on scripts; no pnpm/bun indicators)
* TypeScript 5.x
* Node.js (compatible with Next 16)
* Instant CLI (schema/perms push/pull)
* IDE: VS Code / JetBrains

---

## 4. Technologies Used

### Technology Stack

* **Client:** Next.js + React + Tailwind + Radix UI
* **Data layer:** InstantDB (InstaQL queries + transactions)
* **Auth:** Better Auth (UI + session handling) integrated with InstantDB
* **Admin/ops scripts:** `@instantdb/admin` for seed/maintenance scripts
* **Export:** XLSX generation (server-side recommended) or client-side fallback

### Technology Selection Rationale

* InstantDB provides Firebase-like ergonomics with **built-in permissions**, real-time sync, and a schema model that supports indexed querying.
* Next.js App Router enables cohesive full-stack UX and route protection patterns.
* TanStack + virtualization is best-in-class for large, highly interactive tables.
* Better Auth gives proven auth flows and UI primitives, minimizing custom auth surface.

---

## 5. Key Technical Decisions

1. **Schema-first InstantDB integration**

   * Maintain `instant.schema.ts` and `instant.perms.ts` in-repo.
   * Always initialize Instant with `schema` for type-safe queries/transactions.

2. **Repository is mandatory**

   * Update the `services.repository` field from optional to required to align with product requirements.

3. **Invitation-gated org visibility (critical)**

   * Self-registered users have accounts but **cannot view any org inventory** until added as a member through invitations.

4. **Role model (least destructive by default)**

   * Roles: `viewer`, `editor`, `admin`, `owner`.
   * Only `admin` and `owner` can delete and manage membership/invitations.
   * `editor` can create/update software records; cannot delete.

5. **InstantDB query constraints adhered to by design**

   * Index any field used in filtering/sorting.
   * Use only supported `where` operators (`$ilike`, `$like`, `$in`, comparisons, `and/or`).
   * No conditional hooks (Rules of Hooks).
   * Pagination only on top-level namespaces (not nested relations).

6. **Export format: normalized for analysis**

   * One row per interface; software without interfaces exports as a single row.
   * Dependencies serialized as a semicolon-separated string.
   * This format is deliberately chosen for pivot tables and auditing workflows.

---

## 6. Design Patterns

* **Schema-driven domain modeling**

  * Instant schema defines the authoritative data model; TypeScript types derived from `AppSchema`.
* **Hook-based data access façade**

  * `useServices`, `useService`, `useServicesFiltered`, `useCreateService`, etc. hide query complexity.
* **Transaction-based unit-of-work**

  * Composite writes are atomic: service + interfaces + dependencies created/updated in one transaction.
* **Policy-as-code authorization**

  * Permissions reside in `instant.perms.ts` and are enforced uniformly.

---

## 7. Technical Constraints

### InstantDB Constraints (Non-negotiable)

* **Indexing:** any field used in `where` filtering or `order` must be indexed in schema, or queries will error.
* **Ordering:** only by top-level, indexed fields. No ordering by nested attributes (e.g., `owner.name` is invalid).
* **Filtering:** only supported where operators; no `$regex`, no `$exists`, no `$nin`.
* **Pagination:** `limit/offset/first/after/last/before` only on **top-level namespaces**, not nested relations.

### Product/Scope Constraints

* No YAML ingestion; YAML tooling removed.
* No Excel import in initial release.
* Export required; must be stable and consistent.

---

## 8. API Specifications

> The primary “API” is InstantDB’s client query and transaction layer (InstaQL/InstaML).
> Minimal Next.js server endpoints may be introduced only where warranted (e.g., streaming XLSX export, invitation email dispatch).

### 8.1 Authentication & Session

* Use Better Auth UI for sign-in/sign-up.
* Use Instant auth state consumption pattern:

  * React apps should use `db.useAuth()` (no conditional hook usage).

**Auth gating rules:**

* Public pages: landing, sign-in, sign-up.
* Protected routes: all `/dashboard/**`.
* Additional gate inside dashboard:

  * If authenticated but **not a member of any organization**, show “Awaiting Invitation / Join Organization” state.

### 8.2 Inventory Query Surface (Conceptual)

* List software for active org
* Fetch single software details (interfaces + dependencies + metadata)
* Create/update/delete software
* Membership & invitations management

### 8.3 Export Endpoint (Recommended)

* `GET /dashboard/services/export.xlsx?orgId=<id>&search=<q>&env=<env>&owner=<owner>&runtimeType=<type>`
* Must enforce:

  * Authenticated user
  * Organization membership
  * Viewer+ role

If export is client-side initially, the same filter model must be applied to the dataset used to render the table.

---

## 9. Data Storage

## 9.1 InstantDB Schema (Authoritative)

**File:** `instant.schema.ts`

### Entities

#### `services` (represents any deployed software)

```ts
services: i.entity({
  name: i.string().indexed(),            // Required; indexed for search and sorting
  owner: i.string().indexed(),           // Required; team name
  repository: i.string().indexed(),      // Required; indexed for filtering/search
  organizationId: i.string().indexed(),  // Required; org boundary
  createdAt: i.date().indexed(),         // Indexed for sorting (recent first)
  updatedAt: i.date().indexed(),         // Indexed for sorting
  createdById: i.string().indexed(),     // Audit
  updatedById: i.string().indexed(),     // Audit
})
```

**Constraints (enforced at app layer):**

* Unique `(name, organizationId)`.

#### `serviceInterfaces`

```ts
serviceInterfaces: i.entity({
  serviceId: i.string().indexed(),       // FK to services
  domain: i.string().indexed(),          // For search/filter
  env: i.string().indexed(),             // production|staging|development
  branch: i.string().indexed().optional(), // indexed to allow filtering/search
  runtimeType: i.string().indexed().optional(), // indexed for filtering
  runtimeId: i.string().optional(),
  createdAt: i.date().indexed(),
  updatedAt: i.date().indexed(),
})
```

**Constraints (app layer):**

* Unique `(domain, serviceId)`.
* `env` in {production, staging, development}.
* If `runtimeType` present, it must be in allowed set.
* If `runtimeType` present, `runtimeId` must be non-empty (enforced by validation).

#### `serviceDependencies`

```ts
serviceDependencies: i.entity({
  serviceId: i.string().indexed(),
  dependencyName: i.string().indexed(),
  createdAt: i.date().indexed(),
})
```

**Constraints:**

* Unique `(serviceId, dependencyName)`.

#### `organizations`, `members`, `invitations`

* Must exist to support invitation gating. Roles live on `members.role`.

### 9.2 Links (InstantDB)

**Key constraint reminder from Instant:** `cascade` can only be used in **has-one** forward links.
Therefore:

* Use `cascade` where valid.
* Where invalid, enforce cleanup through explicit delete transactions or adjust link cardinality.

**Preferred linking strategy:**

* `serviceInterfaces -> service` (has-one forward, cascade OK)
* `serviceDependencies -> service` (has-one forward, cascade OK)
* `services -> organization` (has-one forward, cascade OK)
* `services -> creator/updater` (has-one forward, setNull OK)

---

## 10. Security Considerations

### 10.1 Permissions Implementation (InstantDB CEL)

**File:** `instant.perms.ts`

#### Membership-first gating (core invariant)

* Viewing any `services`, `serviceInterfaces`, `serviceDependencies` requires:

  * `auth.id != null`
  * `auth.id` is a member of the service’s organization

**Important InstantDB rule usage:**

* Use `data.ref('<path.to.attr>')` for linked attrs; returns a list.
* Use `auth.ref('$user.<path>')` for user-linked data; returns a list.

#### Example: `services` permissions

```cel
bind:
  isOrgMember = auth.id != null && auth.id in data.ref('organization.members.user.id')

allow:
  view   = isOrgMember
  create = isOrgMember && ('editor' in auth.ref('$user.members.role') || 'admin' in auth.ref('$user.members.role') || 'owner' in auth.ref('$user.members.role'))
  update = isOrgMember && ('editor' in auth.ref('$user.members.role') || 'admin' in auth.ref('$user.members.role') || 'owner' in auth.ref('$user.members.role'))
  delete = isOrgMember && ('admin' in auth.ref('$user.members.role') || 'owner' in auth.ref('$user.members.role'))
```

**Note:** The exact `$user.members.role` path depends on how member roles are modeled. The invariant is: role checks must be list-based and use `auth.ref('$user...')` correctly.

#### Invitations visibility control

* Only `admin/owner` members can create, view, revoke invitations for the org.
* Accepting invitations binds membership to the invited identity.

### 10.2 Additional Security Controls

* URL validation for repository fields (Zod).
* Output encoding (React default) and avoid rendering raw HTML from user data.
* Rate limiting on invitation creation (to prevent abuse).

---

## 11. Performance Considerations

### 11.1 Query Performance

* Service list query target: **< 200ms for 1000 services** (excluding network)
* Service detail query: **< 100ms**
* Real-time update propagation: **< 500ms**

### 11.2 UI Performance

* Use `@tanstack/react-virtual` for lists > 100 rows.
* Debounce search using a throttle/debounce (already have `lodash.throttle`) to avoid excessive re-queries.
* Avoid expensive nested queries in list view; fetch counts efficiently (or compute from related arrays returned).

### 11.3 Export Performance

* Prefer server-streamed XLSX for large orgs.
* If client-side export: build rows from the already loaded dataset and cap export size with user messaging if necessary.

---

## 12. Scalability Considerations

* Enforce org boundary in all queries (`where: { organizationId: { $eq: currentOrgId } }`).
* Index fields used for filtering and ordering (explicitly ensured in schema).
* Avoid nested pagination; if interfaces can become huge per service, load interfaces lazily on detail view or via dedicated interface list query.

---

## 13. Open Issues

1. **Exact membership role data model path** in `auth.ref()`
   Must align schema/links so permission rules can reliably check role membership without unsupported expressions.
2. **Invitation acceptance UX**
   Whether acceptance happens automatically upon login (email match) or via explicit “Accept Invitation” action.
3. **Cascade semantics validation**
   Confirm link cardinalities to ensure cascade is used only where Instant supports it.
4. **Export implementation choice**
   Server-streamed XLSX vs. client-side XLSX generation for MVP.

---

## 14. Future Considerations

* Import from Excel with conflict resolution (out of scope)
* Dependency graph (service-to-service relationships rather than free-text)
* Integration with SCM to auto-populate repo and owners
* Infrastructure discovery to auto-populate runtime locator fields
* Full audit history (append-only change log)

---

## 15. Glossary

* **Service / Software:** Any deployed application/component (not limited to APIs).
* **Interface:** A deployment access point (domain) optionally tied to env/branch/runtime.
* **Runtime Locator:** Identifies where the software runs (type + id).
* **Org Membership:** Required to view org inventory; granted only via invitations.
* **InstaQL:** InstantDB query language used via `db.useQuery`.
* **InstaML:** InstantDB write/transaction model used via `db.tx` and `db.transact`.

---

## Implementation Notes (InstantDB-specific, operationally critical)

### A) Required repo structure

* `instant.schema.ts` — schema (source of truth)
* `instant.perms.ts` — permissions (source of truth)
* `.env` — contains `INSTANT_APP_ID` and `INSTANT_ADMIN_TOKEN`

### B) Instant CLI workflow

* Create app (if needed):
  `npx instant-cli init-without-files --title deploy-index`
* Push schema:
  `npx instant-cli push schema --app <APP_ID> --token <ADMIN_TOKEN> --yes`
* Push perms:
  `npx instant-cli push perms --app <APP_ID> --token <ADMIN_TOKEN> --yes`

### C) Initialization (type safety mandate)

* Client DB: `init({ appId, schema })` from `@instantdb/react`
* Admin DB (scripts): `init({ appId, adminToken, schema })` from `@instantdb/admin`

### D) Hooks rule (must enforce in code review)

* `db.useAuth()` and `db.useQuery()` cannot be conditional.
* Authentication gating must be done by **render branches after hook evaluation**, not by conditional hook calls.