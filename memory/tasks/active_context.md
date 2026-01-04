# Active Development Context

## Current Work Focus:
* **Active Step:** Step 3 — Backend Integration
* **Scope:** ElysiaJS + oRPC with **Drizzle ORM as the sole data-access layer**
* **Explicit Exclusion:** The Nile SDK (`@niledatabase/server`) is **not used for queries**. All data access goes through Drizzle ORM against Nile-integrated PostgreSQL tables.

## Tenant Isolation Enforcement (By Construction)

Tenant isolation is **correct-by-construction**. The invariant is:

1. Every request **MUST** resolve: `tenantSlug` → `tenantId` → `membership`
2. Tenant identity comes from the **URL** (`/t/:tenantSlug/*`), not headers
3. Membership is derived from Better-Auth session data (`active_organization_id` on session)
4. **No repository or query may exist without an explicit `tenantId`**

This means:
- Tenant-scoped routes fail fast if tenant cannot be resolved
- Tenant-scoped routes fail fast if user is not a member of that tenant
- All tenant-scoped repositories require `tenantId` at construction time
- There is no global DB handle for tenant-scoped operations


## Locked Architectural Decisions

The following decisions are **frozen** for this implementation step:

| Decision | Status |
|----------|--------|
| **UUIDs everywhere** | Locked — all primary keys and foreign keys use UUID |
| **Nile-integrated tables migrated** | Locked — `users`, `tenants`, `tenant_users` exist and are managed by Better-Auth + better-auth-nile |
| **No AsyncLocalStorage** | Locked — context is passed explicitly, never stored in async context |
| **No implicit tenant context** | Locked — tenant MUST come from URL params and be validated |
| **No cross-scope foreign keys** | Locked — tenant-scoped tables cannot FK to other tenants' data |
| **Roles stored as TEXT[]** | Locked — `tenant_users.roles` column is `TEXT[]` array |
| **Drizzle-only data access** | Locked — Nile SDK is not used for queries; Drizzle ORM is the sole data-access layer |


## Required Backend Deliverables (Step 3)

### 1. Tenant-Scoped Routing

Implement URL-based tenant routing in `apps/server`:

```
/t/:tenantSlug/rpc/*         → oRPC RPCHandler (tenant-scoped procedures)
/t/:tenantSlug/api-reference/* → OpenAPIHandler (tenant-scoped docs)
```

Global endpoints (outside tenant scope):
```
/api/auth/*      → Better-Auth handler
/rpc/*           → oRPC RPCHandler (global procedures only)
/api-reference/* → OpenAPIHandler (global docs)
```

### 2. Request-Scoped `createContext`

Upgrade `packages/api/src/context.ts` to return a strict, tenant-aware context:

```typescript
interface TenantContext {
  // Request metadata
  requestId: string;
  
  // Auth (nullable for public routes)
  session: Session | null;
  userId: string | null;
  
  // Tenant resolution (nullable for global routes)
  tenantSlug: string | null;
  tenantId: string | null;       // UUID, resolved from tenantSlug
  membership: Membership | null;  // includes roles[]
  
  // Tenant-scoped data access (only present for tenant-scoped routes)
  repos: TenantScopedRepos | null;
}
```

Resolution flow:
1. Extract `tenantSlug` from route params
2. Query `tenants` table by slug → get `tenantId`
3. If authenticated, query `tenant_users` by `(tenantId, userId)` → get `membership`
4. Construct tenant-scoped repositories with `tenantId` baked in

### 3. Guard Utilities

Implement centralized authorization guards in `packages/api`:

```typescript
// Throws UNAUTHORIZED if no session
function requireAuth(ctx: TenantContext): asserts ctx is { session: Session; userId: string; ... }

// Throws NOT_FOUND if tenant cannot be resolved from slug
function requireTenant(ctx: TenantContext): asserts ctx is { tenantId: string; tenantSlug: string; ... }

// Throws FORBIDDEN if user is not a member of the tenant
function requireMembership(ctx: TenantContext): asserts ctx is { membership: Membership; ... }

// Throws FORBIDDEN if user lacks required role(s)
function requireRole(ctx: TenantContext, roles: Role[]): void
```

Guards enforce at procedure boundaries. Business logic never performs inline authorization.


## Out of Scope (Step 3)

The following are **explicitly not part of this step**:

- **Frontend changes** — Web app updates are deferred to Step 4 (Client Integration)
- **AI endpoints** — `/ai` remains unchanged; tenant-scoped AI comes after tenant invariants are proven
- **Product schema** — `tickets`, `ticket_messages`, `knowledge_base_articles` are Step 5
- **Observability** — Structured logging is Step 8


## Verification Requirements

After making changes, **always verify**:

```bash
# Typecheck entire workspace
pnpm -w typecheck

# Lint and format check
npx ultracite check
```

Both must pass before considering work complete.


## Files Likely to Change

| File | Purpose |
|------|---------|
| `apps/server/src/index.ts` | Add tenant-scoped route groups |
| `packages/api/src/context.ts` | Upgrade to tenant-aware context factory |
| `packages/api/src/guards.ts` | New file for authorization guards |
| `packages/auth/src/helpers.ts` | Tenant/membership resolution via Drizzle |
| `packages/db/src/index.ts` | May need tenant-scoped repo factory exports |


## Reference: Current State

From `tasks_plan.md`, Step 3 maps to:
- Task 3.1: Implement tenant-scoped routing prefixes
- Task 3.2: Fix OpenAPI routing consistency
- Task 3.3: Upgrade `createContext` to strict tenant-aware context
- Task 3.4: Implement guard middleware
- Task 3.5: Define stable typed error contract

Dependencies satisfied:
- Nile-integrated tables exist (migration `0000_legal_aqueduct.sql` applied)
- `packages/better-auth-nile` provides schema mappings for organizations → tenants
- `packages/auth` has base Better-Auth configuration
