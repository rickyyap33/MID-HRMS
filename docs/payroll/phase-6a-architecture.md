# Payroll Phase 6A Architecture

## 1. Document Control

- Document title: Payroll Phase 6A Architecture
- Phase: 6A-1A through 6A-1D
- Version: Version 1.0
- Status: Approved and frozen
- Purpose: Define the canonical architecture boundaries, salary source-of-truth rule, effective-date convention, and salary lifecycle convention for Payroll Phase 6A.
- Owner: Ricky Yap
- Draft evidence verification date: 2026-07-27
- Owner approval date: 2026-07-27
- Implementation baseline: 1a23503bc43e4778e82cee6e79769630672cf001
- Freeze status: FROZEN

### Related implementation files

- [backend/server.js](../../backend/server.js#L107) - `getBusinessDateMalaysia`, `formatDateOnly`, `resolveEmployeeSalary`, JWT/RBAC middleware, employment salary resolver endpoint, salary-history workflow routes.
- [frontend/src/App.jsx](../../frontend/src/App.jsx#L17) - top-level route shell and active frontend module routes.
- [frontend/src/components/Sidebar.jsx](../../frontend/src/components/Sidebar.jsx#L24) - current navigation boundaries and placeholder modules.
- [frontend/src/services/api.js](../../frontend/src/services/api.js#L1) - frontend bearer-token handling for authenticated API calls.

### Related migrations

- [backend/migrations/20260726_phase6a_m1_payroll_foundation.sql](../../backend/migrations/20260726_phase6a_m1_payroll_foundation.sql#L1) - payroll-owned company and payroll-component foundation tables.
- [backend/migrations/20260726_phase6a_m2b_employee_payroll_profile.sql](../../backend/migrations/20260726_phase6a_m2b_employee_payroll_profile.sql#L1) - `employee_payroll_profile` foundation.
- [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql#L1) - `employee_salary_history` table, effective-range constraint, and published-overlap protection.
- [backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql](../../backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql#L1) - lifecycle hardening, creator/cancellation audit fields, and one-active-draft protection.

## 2. Payroll Domain Boundaries - 6A-1A

### 2.1 Scope classification

Implemented now:
- Payroll-owned company profile foundation via `company_payroll_profile`: [backend/migrations/20260726_phase6a_m1_payroll_foundation.sql](../../backend/migrations/20260726_phase6a_m1_payroll_foundation.sql#L10)
- Payroll component foundation via `payroll_component_type`, `payroll_component`, `payroll_component_rule_version`, and `payroll_component_tax_flags_version`: [backend/migrations/20260726_phase6a_m1_payroll_foundation.sql](../../backend/migrations/20260726_phase6a_m1_payroll_foundation.sql#L54), [backend/migrations/20260726_phase6a_m1_payroll_foundation.sql](../../backend/migrations/20260726_phase6a_m1_payroll_foundation.sql#L86), [backend/migrations/20260726_phase6a_m1_payroll_foundation.sql](../../backend/migrations/20260726_phase6a_m1_payroll_foundation.sql#L131), [backend/migrations/20260726_phase6a_m1_payroll_foundation.sql](../../backend/migrations/20260726_phase6a_m1_payroll_foundation.sql#L253)
- Employee payroll profile foundation via `employee_payroll_profile`: [backend/migrations/20260726_phase6a_m2b_employee_payroll_profile.sql](../../backend/migrations/20260726_phase6a_m2b_employee_payroll_profile.sql#L7)
- Salary history source-of-truth foundation via `employee_salary_history`: [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql#L9)
- Salary current-state read resolver and salary-history workflow APIs: [backend/server.js](../../backend/server.js#L223), [backend/server.js](../../backend/server.js#L675), [backend/server.js](../../backend/server.js#L731), [backend/server.js](../../backend/server.js#L805), [backend/server.js](../../backend/server.js#L1054), [backend/server.js](../../backend/server.js#L1320), [backend/server.js](../../backend/server.js#L1562)
- Frontend salary management UI in Employee Profile: [frontend/src/App.jsx](../../frontend/src/App.jsx#L66), [frontend/src/components/Sidebar.jsx](../../frontend/src/components/Sidebar.jsx#L49)

Documented convention:
- Payroll is the owner of salary history, payroll profile foundations, and payroll component foundations.
- Employee Profile may display payroll-derived salary output, but it does not own salary mutation logic.

Reserved design:
- `RETIRED` salary status is valid in schema but reserved in Phase 6A, not actively produced by APIs: [backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql](../../backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql#L27)

Deferred to Phase 6B or later:
- Payroll run processing
- Payroll result generation
- FAQ or AI retrieval features
- Any AI-assisted payroll knowledge retrieval
- Employee-facing approved FAQ access

### 2.2 Payroll responsibilities

Payroll Phase 6A owns:
- Company payroll identity and payroll feature bootstrap
- Payroll component definition and versioning
- Employee payroll profile foundation
- Employee salary history as payroll truth
- Salary workflow lifecycle and approval rules
- Salary timeline integrity and current-salary resolution

Payroll Phase 6A does not own:
- Employee master identity CRUD
- Employee personal-profile CRUD
- Attendance tracking
- Leave request processing
- Claims processing
- Projects or project accounting
- AI Assistant knowledge management
- RAG, embeddings, vector search, fine-tuning, or autonomous learning

### 2.3 Module boundaries

Employee module boundary:
- Employee master and employee profile remain in the Employees domain: [backend/server.js](../../backend/server.js#L397), [backend/server.js](../../backend/server.js#L525)
- Employment details remain compatibility-facing HR records, but salary values inside `employment_details` are not payroll truth: [backend/server.js](../../backend/server.js#L675), [backend/server.js](../../backend/server.js#L2015), [backend/server.js](../../backend/server.js#L2074)

Attendance boundary:
- Attendance records remain outside Payroll Phase 6A: [backend/server.js](../../backend/server.js#L2401), [backend/server.js](../../backend/server.js#L2470)

Leave boundary:
- Leave requests and leave balances remain outside Payroll Phase 6A: [backend/server.js](../../backend/server.js#L2634), [backend/server.js](../../backend/server.js#L2662)

Claims boundary:
- No Claims module implementation was found in the current repository. Claims remain out of scope for Phase 6A.

Projects and other module boundaries:
- No Projects module implementation was found in the current repository. Projects remain out of scope for Phase 6A.

### 2.4 Frontend, backend, and database responsibilities

Frontend responsibilities:
- Render salary data returned by payroll-backed APIs.
- Collect salary draft payloads and submit them through authenticated API calls.
- Display workflow states, validation errors, and conflict responses.
- Frontend does not determine current salary independently.

Backend responsibilities:
- Authenticate requests and resolve server-side identity.
- Enforce Admin-only access to salary-sensitive routes.
- Validate request payloads.
- Resolve current salary from salary history.
- Enforce lifecycle transitions and concurrency rules.

Database responsibilities:
- Enforce salary-history shape and lifecycle constraints.
- Prevent overlapping published salary periods.
- Prevent multiple active drafts.
- Preserve audit-field and lifecycle consistency through constraints.
- Current schema does not include an immutable hard-deletion prevention control for salary-history rows.

### 2.5 Payroll-owned table ownership

Payroll-owned tables implemented in Phase 6A:
- `company_payroll_profile`: [backend/migrations/20260726_phase6a_m1_payroll_foundation.sql](../../backend/migrations/20260726_phase6a_m1_payroll_foundation.sql#L10)
- `payroll_component_type`: [backend/migrations/20260726_phase6a_m1_payroll_foundation.sql](../../backend/migrations/20260726_phase6a_m1_payroll_foundation.sql#L54)
- `payroll_component`: [backend/migrations/20260726_phase6a_m1_payroll_foundation.sql](../../backend/migrations/20260726_phase6a_m1_payroll_foundation.sql#L86)
- `payroll_component_rule_version`: [backend/migrations/20260726_phase6a_m1_payroll_foundation.sql](../../backend/migrations/20260726_phase6a_m1_payroll_foundation.sql#L131)
- `payroll_component_tax_flags_version`: [backend/migrations/20260726_phase6a_m1_payroll_foundation.sql](../../backend/migrations/20260726_phase6a_m1_payroll_foundation.sql#L253)
- `employee_payroll_profile`: [backend/migrations/20260726_phase6a_m2b_employee_payroll_profile.sql](../../backend/migrations/20260726_phase6a_m2b_employee_payroll_profile.sql#L7)
- `employee_salary_history`: [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql#L9)

Cross-module dependency tables used but not payroll-owned:
- `employees`
- `employment_details`
- `employee_profiles`
- `users`

### 2.6 Cross-module dependencies and API boundaries

Allowed dependencies:
- Payroll salary logic may read `employees` for identity/existence validation.
- Payroll salary compatibility output may augment `employment_details` read responses.
- Payroll salary workflow may reference `users` for creator, approver, and canceller foreign keys.

Disallowed scope expansion in Phase 6A:
- Reusing `employment_details.salary_amount` as active payroll truth
- Moving salary mutation logic into Employees CRUD
- Deriving current salary client-side from arbitrary history rows
- Activating `RETIRED` lifecycle behavior without separately approved change
- Adding non-payroll module behavior into Payroll docs or APIs without explicit approval

## 3. Salary Source of Truth - 6A-1B

### 3.1 Canonical rule

Current Salary comes only from the applicable `PUBLISHED` row in `employee_salary_history`.

Canonical resolver evidence:
- Resolver function: [backend/server.js](../../backend/server.js#L223)
- Published-only filter: [backend/server.js](../../backend/server.js#L243)
- Effective-date applicability filter: [backend/server.js](../../backend/server.js#L244), [backend/server.js](../../backend/server.js#L247)
- Integrity-failure guard on multiple matches: [backend/server.js](../../backend/server.js#L255)

### 3.2 Excluded statuses

The following statuses cannot become Current Salary in Phase 6A:
- `DRAFT` - excluded because resolver filters `record_status='PUBLISHED'`: [backend/server.js](../../backend/server.js#L243)
- `CANCELLED` - excluded because resolver filters `record_status='PUBLISHED'`: [backend/server.js](../../backend/server.js#L243)
- `RETIRED` - excluded because resolver filters `record_status='PUBLISHED'`: [backend/server.js](../../backend/server.js#L243)

### 3.3 Legacy salary field rule

Legacy salary fields are not the active source of truth.

Evidence:
- Employment response gets salary fields from resolved salary-history output: [backend/server.js](../../backend/server.js#L694), [backend/server.js](../../backend/server.js#L699)
- Employment create route omits `salary_amount` from insert SQL: [backend/server.js](../../backend/server.js#L2017), [backend/server.js](../../backend/server.js#L2029)
- Employment update route omits `salary_amount` from update SQL: [backend/server.js](../../backend/server.js#L2075), [backend/server.js](../../backend/server.js#L2087)

### 3.4 Canonical backend path

Canonical salary-resolution path in Phase 6A:
1. `resolveEmployeeSalary` resolves current salary: [backend/server.js](../../backend/server.js#L223)
2. `GET /employees/:id/employment` exposes resolved salary compatibility fields: [backend/server.js](../../backend/server.js#L675)
3. `GET /employees/:id/salary-history` exposes workflow history rows: [backend/server.js](../../backend/server.js#L731)

No second resolver was found in the current repository.

### 3.5 Future-dated and historical behavior

- Future-dated `PUBLISHED` rows do not become current until `effective_from <= businessDate`: [backend/server.js](../../backend/server.js#L244)
- Historical `PUBLISHED` rows remain part of salary history and may have closed `effective_to` values: [backend/server.js](../../backend/server.js#L731), [backend/server.js](../../backend/server.js#L775)

### 3.6 Integrity failure rule

The resolver must not silently choose between overlapping applicable records.

Evidence:
- If more than one applicable `PUBLISHED` row matches, `resolveEmployeeSalary` throws `Salary history integrity error`: [backend/server.js](../../backend/server.js#L255), [backend/server.js](../../backend/server.js#L259)
- Employment endpoint returns `500` for this integrity failure instead of picking a winner: [backend/server.js](../../backend/server.js#L709), [backend/server.js](../../backend/server.js#L715)

## 4. Effective-Date Convention - 6A-1C

### 4.1 Calendar dates versus timestamps

Calendar dates:
- `employee_salary_history.effective_from`: [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql#L13)
- `employee_salary_history.effective_to`: [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql#L14)

Timestamps:
- `approved_at` is `timestamp without time zone`: [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql#L20)
- `created_at` is `timestamp without time zone DEFAULT now()`: [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql#L22)
- `updated_at` is `timestamp without time zone DEFAULT now()`: [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql#L23)
- `cancelled_at` is `timestamp without time zone`: [backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql](../../backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql#L10)

Timestamp generation in current implementation:
- PostgreSQL generates `created_at` and initial `updated_at` with `DEFAULT now()` at insert time: [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql#L22)
- Backend update routes set `updated_at` in SQL using `CURRENT_TIMESTAMP` or `now()`: [backend/server.js](../../backend/server.js#L1238), [backend/server.js](../../backend/server.js#L1481)
- Backend approve flow sets `approved_at` and `updated_at` from backend-generated `Date` values bound as query parameters: [backend/server.js](../../backend/server.js#L1839), [backend/server.js](../../backend/server.js#L1920)

### 4.2 Meaning of fields

- `effective_from`: the first calendar date on which the salary row becomes applicable.
- `effective_to`: the last calendar date on which the salary row remains applicable.
- `effective_to IS NULL`: open-ended salary row with no scheduled end date.

### 4.3 Inclusive boundary behavior

Resolver logic is inclusive on both sides:
- `effective_from <= targetDate`: [backend/server.js](../../backend/server.js#L244)
- `effective_to IS NULL OR effective_to >= targetDate`: [backend/server.js](../../backend/server.js#L246)

Database published-overlap protection also uses inclusive date ranges:
- `daterange(..., '[]')`: [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql#L110)

### 4.4 Malaysia business-date handling

Current-salary resolution uses the Malaysia business date in `Asia/Kuala_Lumpur`.

Evidence:
- `getBusinessDateMalaysia`: [backend/server.js](../../backend/server.js#L107)
- Employment resolver endpoint calls `getBusinessDateMalaysia()` before resolving current salary: [backend/server.js](../../backend/server.js#L694)

### 4.5 Open-ended records and current salary

Current salary is represented by an applicable `PUBLISHED` row whose effective period includes the Malaysia business date. An open-ended current row typically has `effective_to IS NULL`.

### 4.6 Future-dated salary behavior

A `PUBLISHED` row with a future `effective_from` remains in salary history but does not become Current Salary until its effective date arrives.

Evidence:
- Resolver requires `effective_from <= targetDate`: [backend/server.js](../../backend/server.js#L244)

### 4.7 Historical salary behavior

Historical published rows remain queryable through salary history and typically have a closed `effective_to` after supersession.

Evidence:
- Salary history endpoint returns `effective_from`, `effective_to`, and `record_status`: [backend/server.js](../../backend/server.js#L755), [backend/server.js](../../backend/server.js#L762), [backend/server.js](../../backend/server.js#L764)

### 4.8 Same-day and boundary cases

Current Phase 6A behavior is:
- Publishing a salary effective today is allowed when `effective_from` is strictly greater than the previous published row's `effective_from`; previous row is then closed to one calendar day before the new row: [backend/server.js](../../backend/server.js#L1852), [backend/server.js](../../backend/server.js#L1860), [backend/server.js](../../backend/server.js#L1881), [backend/server.js](../../backend/server.js#L1892)
- Publishing a future-dated salary follows the same rule and closes the previous open-ended published row to `new effective_from - 1 day`: [backend/server.js](../../backend/server.js#L1881), [backend/server.js](../../backend/server.js#L1892)
- Publishing a second salary with the same `effective_from` as the current published row is rejected as historical rewrite (`409`): [backend/server.js](../../backend/server.js#L1860), [backend/server.js](../../backend/server.js#L1869)
- If closing the previous row would push `effective_to` before that row's own `effective_from`, approve is rejected as historical rewrite (`409`): [backend/server.js](../../backend/server.js#L1881), [backend/server.js](../../backend/server.js#L1886)
- Inclusive-boundary overlap conflicts are rejected by both application checks and the database exclusion constraint; conflicts map to `409 Salary timeline conflict`: [backend/server.js](../../backend/server.js#L1790), [backend/server.js](../../backend/server.js#L1796), [backend/server.js](../../backend/server.js#L1997), [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql#L107), [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql#L114)

This keeps the existing convention unchanged: supersession closes the prior row and does not rewrite older historical periods.

### 4.9 Timestamp timezone, storage, and serialization convention

Confirmed from current implementation and schema:
- Audit/concurrency timestamps are stored as `timestamp without time zone`, not `timestamp with time zone`: [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql#L20), [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql#L22), [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql#L23), [backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql](../../backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql#L10)
- API payload validation for concurrency tokens requires UTC-`Z` ISO text (`expected_updated_at`): [backend/server.js](../../backend/server.js#L223), [backend/server.js](../../backend/server.js#L1159), [backend/server.js](../../backend/server.js#L1388), [backend/server.js](../../backend/server.js#L1630)
- API responses serialize date-only salary effective fields as `YYYY-MM-DD` via `formatDateOnly` with Malaysia timezone handling for those date fields: [backend/server.js](../../backend/server.js#L126), [backend/server.js](../../backend/server.js#L270), [backend/server.js](../../backend/server.js#L1972)
- Current-salary applicability uses Malaysia business date (`Asia/Kuala_Lumpur`) through `getBusinessDateMalaysia`: [backend/server.js](../../backend/server.js#L107), [backend/server.js](../../backend/server.js#L694)

Known limitation for owner review:
- Because audit fields use `timestamp without time zone`, the schema does not itself guarantee UTC storage semantics.
- The code compares optimistic-concurrency instants using JavaScript `Date` parsing and DB-rendered microsecond signatures, but no explicit system-wide UTC normalization contract is declared for stored audit timestamps: [backend/server.js](../../backend/server.js#L1172), [backend/server.js](../../backend/server.js#L1187), [backend/server.js](../../backend/server.js#L1240)
- Therefore, UTC behavior is enforced for client token format (`...Z`) but not guaranteed as an immutable database timezone storage rule.

### 4.10 Frontend, backend, and database validation responsibilities

Frontend responsibilities:
- Validate date input format before submit.
- Evidence: `frontend/src/components/SalaryDraftModal.jsx` validates `effective_from` as a real `YYYY-MM-DD` date and requires `expectedUpdatedAt` in edit mode: [frontend/src/components/SalaryDraftModal.jsx](../../frontend/src/components/SalaryDraftModal.jsx#L113), [frontend/src/components/SalaryDraftModal.jsx](../../frontend/src/components/SalaryDraftModal.jsx#L120)

Backend responsibilities:
- Validate `effective_from` format and reject invalid values: [backend/server.js](../../backend/server.js#L888), [backend/server.js](../../backend/server.js#L1147)

Database responsibilities:
- Reject invalid `effective_to < effective_from`: [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql#L40)
- Reject overlapping published periods: [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql#L107)

## 5. Salary Lifecycle Convention - 6A-1D

### 5.1 Supported statuses in Phase 6A

Implemented now:
- `DRAFT`
- `PUBLISHED`
- `CANCELLED`

Reserved only in Phase 6A:
- `RETIRED`

Evidence:
- Lifecycle status set: [backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql](../../backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql#L27)

### 5.2 Owner-directed reserved-status interpretation

Phase 6A owner direction:
- Superseded historical salary rows remain `PUBLISHED`.
- Their period is closed via `effective_to`.
- Phase 6A APIs do not actively produce `RETIRED`.
- `RETIRED` must remain reserved until a separately approved lifecycle change.

This interpretation is consistent with current implementation:
- Prior published row close: [backend/server.js](../../backend/server.js#L1891)
- New published row activation: [backend/server.js](../../backend/server.js#L1917)

### 5.3 Allowed transitions implemented in Phase 6A

- Create draft: no prior record required, produces `DRAFT`: [backend/server.js](../../backend/server.js#L805), [backend/server.js](../../backend/server.js#L959)
- Edit draft: `DRAFT -> DRAFT`: [backend/server.js](../../backend/server.js#L1054), [backend/server.js](../../backend/server.js#L1229)
- Cancel draft: `DRAFT -> CANCELLED`: [backend/server.js](../../backend/server.js#L1320), [backend/server.js](../../backend/server.js#L1477)
- Approve draft: `DRAFT -> PUBLISHED`: [backend/server.js](../../backend/server.js#L1562), [backend/server.js](../../backend/server.js#L1917)

### 5.4 Prohibited or unsupported transitions in Phase 6A

Not produced by current APIs:
- Any transition to `RETIRED`
- Reopening a `CANCELLED` row
- Editing a non-`DRAFT` row
- Cancelling a non-`DRAFT` row
- Approving a non-`DRAFT` row

Evidence:
- Edit requires `record_status === "DRAFT"`: [backend/server.js](../../backend/server.js#L1203)
- Cancel requires `record_status === "DRAFT"`: [backend/server.js](../../backend/server.js#L1442)
- Approve requires `record_status === "DRAFT"`: [backend/server.js](../../backend/server.js#L1684)

### 5.5 Authentication and role requirements

All salary-sensitive routes in Phase 6A require:
- JWT authentication via `authenticateToken`: [backend/server.js](../../backend/server.js#L285)
- Admin role via `requireRoles("Admin")`: [backend/server.js](../../backend/server.js#L370), [backend/server.js](../../backend/server.js#L675), [backend/server.js](../../backend/server.js#L731), [backend/server.js](../../backend/server.js#L805), [backend/server.js](../../backend/server.js#L1054), [backend/server.js](../../backend/server.js#L1320), [backend/server.js](../../backend/server.js#L1562)

### 5.6 Audit metadata in current implementation

Implemented now:
- creator audit: `created_by_user_id`: [backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql](../../backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql#L7)
- approver audit: `approved_by_user_id`, `approved_at`: [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql#L16)
- cancellation audit: `cancelled_by_user_id`, `cancelled_at`: [backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql](../../backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql#L8)

Known implementation gap:
- `updated_by_user_id` for draft edits is not implemented in Phase 6A and is reserved for separately approved Batch 2B.

### 5.7 Transaction, locking, and optimistic concurrency

Create draft:
- transaction-protected: [backend/server.js](../../backend/server.js#L919), [backend/server.js](../../backend/server.js#L1001)

Edit draft:
- transaction-protected: [backend/server.js](../../backend/server.js#L1178), [backend/server.js](../../backend/server.js#L1279)
- optimistic concurrency token: `expected_updated_at`: [backend/server.js](../../backend/server.js#L1159)

Cancel draft:
- transaction-protected: [backend/server.js](../../backend/server.js#L1402), [backend/server.js](../../backend/server.js#L1521)
- row lock via `FOR UPDATE`: [backend/server.js](../../backend/server.js#L1406)
- optimistic concurrency token: [backend/server.js](../../backend/server.js#L1388)

Approve draft:
- transaction-protected: [backend/server.js](../../backend/server.js#L1644), [backend/server.js](../../backend/server.js#L1962)
- row locks on draft and published rows via `FOR UPDATE`: [backend/server.js](../../backend/server.js#L1648), [backend/server.js](../../backend/server.js#L1757)
- optimistic concurrency token: [backend/server.js](../../backend/server.js#L1630)

### 5.8 Cancelled-record retention

Cancelled salary records are retained for audit and are not hard-deleted.

Evidence:
- Cancel route updates status to `CANCELLED` instead of deleting: [backend/server.js](../../backend/server.js#L1477)
- No salary-history delete route was found in `backend/server.js`.

### 5.9 Expected error classes

Expected route-level classes in Phase 6A:
- `400` invalid request body, invalid fields, invalid date/token, invalid lifecycle payload
- `401` missing or invalid authentication
- `403` forbidden role
- `404` employee or draft not found
- `409` stale update, illegal transition, duplicate active draft, or salary timeline conflict
- `500` server error or salary integrity failure

### 5.10 Known implementation gaps

- `RETIRED` is reserved in schema but not actively produced by Phase 6A APIs.
- `updated_by_user_id` is not implemented yet for draft edits.
- These are known gaps, not contradictions to the current owner-directed Phase 6A convention.
