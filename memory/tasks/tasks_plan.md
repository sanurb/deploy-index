# Project Status & Task Plan

**Project:** Deploy Index - Deployed Software Inventory Platform  
**Last Updated:** 2026-01-04  
**Status:** Foundation Phase - Authentication Complete, Database Migration Pending

---

## Current Project Status

### ✅ Completed

1. **Authentication Infrastructure**
   - Better Auth configured with InstantDB adapter (`lib/auth.ts`)
   - Better Auth UI Provider integrated (`app/providers.tsx`)
   - InstantAuth hook configured for auth state synchronization
   - API route handler created (`app/api/auth/[...all]/route.ts`)
   - Auth client configured with proper baseURL handling (`lib/auth-client.ts`)

2. **Schema Foundation**
   - Auth entities defined: `$users`, `sessions`, `accounts`, `verifications`
   - Organization entities defined: `organizations`, `members`, `invitations`
   - All required links configured for auth and organization management
   - Schema pushed to InstantDB

3. **Permissions Foundation**
   - Basic permissions for auth entities (`users`, `accounts`, `sessions`, `verifications`)
   - Permissions structure in place but **service permissions not yet defined**

4. **UI Infrastructure**
   - Next.js 16 App Router setup
   - Tailwind CSS + Radix UI components
   - Theme provider configured
   - Existing service table component (YAML-based)

### 🚧 In Progress

1. **Database Migration Planning**
   - Requirements document created (deleted, but context captured)
   - Architecture and technical specs documented
   - Migration strategy defined

### ❌ Not Started (Critical Path)

1. **Service Schema Entities**
   - `services` entity not yet in schema
   - `serviceInterfaces` entity not yet in schema
   - `serviceDependencies` entity not yet in schema
   - Required links not yet defined

2. **Service Permissions**
   - Organization-scoped view permissions
   - Role-based CRUD permissions (viewer/editor/admin/owner)
   - Service interface and dependency permissions

3. **UI Components**
   - Shared header component (for public + authenticated states)
   - Protected route wrapper
   - Dashboard layout with sidebar
   - Service CRUD forms
   - Organization management UI
   - Member/invitation management UI

4. **Data Layer**
   - Service query hooks (`useServices`, `useService`, `useServicesFiltered`)
   - Service mutation hooks (`useCreateService`, `useUpdateService`, `useDeleteService`)
   - Migration from YAML parsing to database queries

5. **Route Protection**
   - Public routes (landing, sign-in, sign-up)
   - Protected dashboard routes
   - Organization membership gating

---

## Task Breakdown

### Phase 1: Foundation (Priority: CRITICAL)

#### Task 1.1: Add Service Entities to Schema
- **Status:** ❌ Not Started
- **Priority:** CRITICAL
- **Dependencies:** None
- **Description:**
  - Add `services` entity with: name, owner, repository, organizationId, createdAt, updatedAt, createdById, updatedById
  - Add `serviceInterfaces` entity with: serviceId, domain, env, branch, runtimeType, runtimeId, createdAt, updatedAt
  - Add `serviceDependencies` entity with: serviceId, dependencyName, createdAt
  - All fields must be properly indexed for filtering/sorting
- **Acceptance Criteria:**
  - Schema compiles without errors
  - All required fields indexed
  - Schema pushed to InstantDB successfully

#### Task 1.2: Define Service Links
- **Status:** ❌ Not Started
- **Priority:** CRITICAL
- **Dependencies:** Task 1.1
- **Description:**
  - Link `services -> organizations` (many-to-one, cascade)
  - Link `services -> creator` (many-to-one, setNull)
  - Link `services -> updater` (many-to-one, setNull)
  - Link `serviceInterfaces -> services` (many-to-one, cascade)
  - Link `serviceDependencies -> services` (many-to-one, cascade)
- **Acceptance Criteria:**
  - All links defined correctly
  - Cascade behavior validated (cascade only on has-one forward links)
  - Schema pushed successfully

#### Task 1.3: Implement Service Permissions
- **Status:** ❌ Not Started
- **Priority:** CRITICAL
- **Dependencies:** Task 1.1, Task 1.2
- **Description:**
  - Implement organization-scoped view permissions
  - Implement role-based create/update permissions (editor/admin/owner)
  - Implement role-based delete permissions (admin/owner only)
  - Permissions for `serviceInterfaces` and `serviceDependencies`
- **Acceptance Criteria:**
  - Permissions enforce organization membership requirement
  - Permissions enforce role-based access correctly
  - Permissions pushed to InstantDB successfully
  - Test queries verify permission enforcement

### Phase 2: Authentication Flow (Priority: HIGH)

#### Task 2.1: Create Shared Header Component
- **Status:** ❌ Not Started
- **Priority:** HIGH
- **Dependencies:** None
- **Description:**
  - Create `components/shared/app-header.tsx`
  - Public state: Logo, Sign In/Sign Up buttons, mode toggle
  - Authenticated state: Logo, organization switcher, user menu, command palette trigger, mode toggle
  - Responsive design (mobile hamburger menu)
- **Acceptance Criteria:**
  - Header renders correctly on public pages
  - Header renders correctly when authenticated
  - User menu shows profile, settings, sign out
  - Responsive behavior works on mobile/desktop

#### Task 2.2: Update Public Pages with Header
- **Status:** ❌ Not Started
- **Priority:** HIGH
- **Dependencies:** Task 2.1
- **Description:**
  - Add header to landing page (`/`)
  - Add header to sign-in page (`/auth/sign-in`)
  - Add header to sign-up page (`/auth/sign-up`)
- **Acceptance Criteria:**
  - All public pages display header
  - Header navigation works correctly
  - No layout shifts or visual issues

#### Task 2.3: Create Protected Route Wrapper
- **Status:** ❌ Not Started
- **Priority:** HIGH
- **Dependencies:** None
- **Description:**
  - Create `components/auth/protected-route.tsx` or middleware
  - Redirect unauthenticated users to `/auth/sign-in`
  - Handle organization membership check
  - Show "Awaiting Invitation" state for users without org membership
- **Acceptance Criteria:**
  - Unauthenticated users redirected to sign-in
  - Authenticated users without org membership see appropriate empty state
  - Authenticated users with membership can access dashboard

#### Task 2.4: Create Dashboard Layout
- **Status:** ❌ Not Started
- **Priority:** HIGH
- **Dependencies:** Task 2.1, Task 2.3
- **Description:**
  - Create `components/dashboard/dashboard-layout.tsx`
  - Sidebar navigation with: Home, Services, Organization, Members, Invitations, Settings
  - Main content area
  - Breadcrumbs component
  - Responsive sidebar (collapsible on mobile)
- **Acceptance Criteria:**
  - Layout renders correctly
  - Sidebar navigation works
  - Active route highlighting works
  - Responsive behavior works

### Phase 3: Service CRUD (Priority: CRITICAL)

#### Task 3.1: Create Service Query Hooks
- **Status:** ❌ Not Started
- **Priority:** CRITICAL
- **Dependencies:** Phase 1 complete
- **Description:**
  - Create `hooks/use-services.ts`
  - Implement `useServices(organizationId)` - list all services for org
  - Implement `useService(serviceId)` - single service with relations
  - Implement `useServicesFiltered(organizationId, filters)` - search/filter
  - All hooks must use proper InstantDB query patterns
- **Acceptance Criteria:**
  - Hooks return typed data
  - Queries are organization-scoped
  - Real-time updates work
  - Error handling implemented

#### Task 3.2: Create Service Mutation Hooks
- **Status:** ❌ Not Started
- **Priority:** CRITICAL
- **Dependencies:** Phase 1 complete
- **Description:**
  - Create `hooks/use-service-mutations.ts`
  - Implement `useCreateService()` - atomic transaction for service + interfaces + dependencies
  - Implement `useUpdateService()` - update service and related entities
  - Implement `useDeleteService()` - delete service (cascades to interfaces/dependencies)
- **Acceptance Criteria:**
  - Mutations use atomic transactions
  - Optimistic updates work
  - Error handling and rollback on failure
  - Validation before transaction

#### Task 3.3: Migrate Service Table to Database
- **Status:** ❌ Not Started
- **Priority:** CRITICAL
- **Dependencies:** Task 3.1
- **Description:**
  - Update `components/service-table/index.tsx` to use `useServices` hook
  - Remove YAML parsing dependency
  - Update `use-service-data.ts` to query database instead of parsing YAML
  - Maintain existing table features (search, filter, sort, export)
- **Acceptance Criteria:**
  - Table displays services from database
  - Search/filter/sort work correctly
  - Export to CSV works
  - No YAML dependencies remain

#### Task 3.4: Create Service Form Component
- **Status:** ❌ Not Started
- **Priority:** CRITICAL
- **Dependencies:** Task 3.2
- **Description:**
  - Create `components/services/service-form.tsx`
  - Fields: name, owner, repository, interfaces (dynamic list), dependencies (dynamic list)
  - Validation using Zod schema
  - Support create and edit modes
  - Handle interface and dependency management
- **Acceptance Criteria:**
  - Form validates all inputs
  - Can create new service
  - Can edit existing service
  - Interface and dependency management works
  - Form submission uses mutation hooks

#### Task 3.5: Create Service Detail Page
- **Status:** ❌ Not Started
- **Priority:** MEDIUM
- **Dependencies:** Task 3.1
- **Description:**
  - Create `app/dashboard/services/[id]/page.tsx`
  - Display service details
  - Show interfaces table
  - Show dependencies list
  - Edit/Delete actions (role-based)
- **Acceptance Criteria:**
  - Page displays service information
  - Interfaces and dependencies shown correctly
  - Edit/Delete buttons respect role permissions
  - Navigation works

### Phase 4: Organization Features (Priority: HIGH)

#### Task 4.1: Organization Management Page
- **Status:** ❌ Not Started
- **Priority:** HIGH
- **Dependencies:** Task 2.4
- **Description:**
  - Create `app/dashboard/organization/page.tsx`
  - Organization details form (name, slug, logo)
  - Access restricted to owner/admin
- **Acceptance Criteria:**
  - Page accessible only to owner/admin
  - Can update organization details
  - Validation works

#### Task 4.2: Members Management Page
- **Status:** ❌ Not Started
- **Priority:** HIGH
- **Dependencies:** Task 2.4
- **Description:**
  - Create `app/dashboard/members/page.tsx`
  - List all organization members with roles
  - Change role functionality
  - Remove member functionality
  - Access restricted to owner/admin
- **Acceptance Criteria:**
  - Can view all members
  - Can change member roles
  - Can remove members (except self)
  - Role changes persist

#### Task 4.3: Invitations Management Page
- **Status:** ❌ Not Started
- **Priority:** HIGH
- **Dependencies:** Task 2.4
- **Description:**
  - Create `app/dashboard/invitations/page.tsx`
  - Send invitation form (email, role)
  - List pending/accepted invitations
  - Resend/revoke invitation actions
  - Access restricted to owner/admin
- **Acceptance Criteria:**
  - Can send invitations
  - Can view invitation status
  - Can resend/revoke invitations
  - Invitation flow works end-to-end

### Phase 5: Polish & Cleanup (Priority: MEDIUM)

#### Task 5.1: Remove YAML Dependencies
- **Status:** ❌ Not Started
- **Priority:** MEDIUM
- **Dependencies:** Phase 3 complete
- **Description:**
  - Remove YAML editor component usage
  - Remove YAML parser utilities (or mark as deprecated)
  - Remove YAML-related state management
  - Clean up unused imports
- **Acceptance Criteria:**
  - No YAML parsing in production code
  - All YAML references removed or deprecated
  - Code compiles without errors

#### Task 5.2: Data Migration Script (Optional)
- **Status:** ❌ Not Started
- **Priority:** LOW
- **Dependencies:** Phase 1, Phase 3 complete
- **Description:**
  - Create admin script to import existing YAML data
  - Map YAML services to database entities
  - Assign to default organization
  - One-time execution script
- **Acceptance Criteria:**
  - Script can parse YAML and create database records
  - All services imported correctly
  - Interfaces and dependencies preserved

#### Task 5.3: Performance Optimization
- **Status:** ❌ Not Started
- **Priority:** MEDIUM
- **Dependencies:** Phase 3 complete
- **Description:**
  - Optimize query performance
  - Ensure virtualization works for large lists
  - Debounce search inputs
  - Optimize export performance
- **Acceptance Criteria:**
  - Query performance meets targets (< 200ms for 1000 services)
  - Table virtualization works smoothly
  - Export completes in reasonable time

---

## Known Issues

1. **Type Assertions in Providers**
   - Location: `app/providers.tsx` lines 17, 24
   - Issue: Using `as any` type assertions for `db` parameter
   - Impact: Type safety compromised
   - Resolution: Investigate proper typing for InstantDB with Better Auth integration
   - Priority: MEDIUM

2. **Missing Service Entities in Schema**
   - Location: `instant.schema.ts`
   - Issue: Service entities not yet defined
   - Impact: Cannot store services in database
   - Resolution: Complete Phase 1 tasks
   - Priority: CRITICAL

3. **Incomplete Permissions**
   - Location: `instant.perms.ts`
   - Issue: Service permissions not defined
   - Impact: Cannot enforce access control for services
   - Resolution: Complete Task 1.3
   - Priority: CRITICAL

4. **YAML Still in Use**
   - Location: `app/page.tsx`, `components/service-table/`
   - Issue: Application still uses YAML as data source
   - Impact: Not aligned with product requirements
   - Resolution: Complete Phase 3 migration
   - Priority: CRITICAL

5. **No Protected Routes**
   - Location: Route structure
   - Issue: Dashboard routes not protected
   - Impact: Security risk
   - Resolution: Complete Task 2.3
   - Priority: HIGH

6. **Missing Header Component**
   - Location: Public pages
   - Issue: No shared header on public pages
   - Impact: Inconsistent UX
   - Resolution: Complete Task 2.1, 2.2
   - Priority: HIGH

---

## Dependencies

### Critical Path
```
Phase 1 (Schema) → Phase 3 (Service CRUD) → Phase 5 (Cleanup)
     ↓
Phase 2 (Auth Flow) → Phase 4 (Org Features)
```

### Blocking Dependencies
- **Phase 3 blocked by Phase 1:** Cannot implement service CRUD without schema
- **Phase 4 blocked by Phase 2:** Cannot implement org features without dashboard layout
- **Task 3.3 blocked by Task 3.1:** Cannot migrate table without query hooks

---

## Priority Ranking

### Must Have (P0 - Critical Path)
1. Phase 1: Foundation (Schema + Permissions)
2. Phase 3: Service CRUD (Core functionality)
3. Task 2.3: Protected Routes (Security)

### Should Have (P1 - High Priority)
4. Phase 2: Authentication Flow (UX)
5. Phase 4: Organization Features (Governance)

### Nice to Have (P2 - Medium/Low)
6. Phase 5: Polish & Cleanup
7. Task 5.2: Data Migration Script

---

## Next Steps

**Immediate Actions:**
1. Start Phase 1: Add service entities to schema (Task 1.1)
2. Define service links (Task 1.2)
3. Implement service permissions (Task 1.3)

**After Phase 1:**
4. Create shared header component (Task 2.1)
5. Implement protected routes (Task 2.3)
6. Create dashboard layout (Task 2.4)

**Then:**
7. Build service query hooks (Task 3.1)
8. Build service mutation hooks (Task 3.2)
9. Migrate service table (Task 3.3)

---

## Notes

- All schema changes must be pushed via Instant CLI: `npx instant-cli push schema --app <APP_ID> --token <ADMIN_TOKEN> --yes`
- All permission changes must be pushed via Instant CLI: `npx instant-cli push perms --app <APP_ID> --token <ADMIN_TOKEN> --yes`
- Repository field is **required** per product requirements (not optional)
- All queries must be organization-scoped for security
- Index all fields used in filtering/sorting (InstantDB requirement)
