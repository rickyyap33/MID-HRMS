# MID-HRMS Project Memory

## 1. Current Project Architecture
- Monorepo-style workspace with `backend/`, `frontend/`, `database/`, `ai-service/`, and `docker-compose.yml` at the root.
- Backend is an Express + PostgreSQL API in `backend/server.js`.
- Frontend is a React + Vite app in `frontend/src/`.
- Database is PostgreSQL, with the live schema and data stored in the connected database and backup SQL files in both `backend/` and `frontend/`.
- The project is currently in a payroll cutover sequence where salary history is becoming the source of truth.

## 2. Frontend Structure
- `frontend/src/main.jsx` boots the app.
- `frontend/src/App.jsx` contains the top-level routing and app shell.
- `frontend/src/pages/` contains page-level screens such as `Dashboard.jsx`, `Employees.jsx`, and `Login.jsx`.
- `frontend/src/components/Sidebar.jsx` provides shared navigation.
- `frontend/src/services/api.js` is the shared API client.
- `frontend/src/App.css` and `frontend/src/index.css` define app styling.
- The current Employee Profile UI still reads and submits employment salary fields, even though salary read logic has been cut over in the backend.

## 3. Backend Structure
- `backend/server.js` contains the main Express server, routes, and current payroll logic.
- `backend/package.json` defines the Node scripts and dependencies.
- `backend/migrations/` contains the phase-specific SQL migrations.
- `backend/uploads/` stores uploaded employee documents.
- `backend/midhrms_backup.sql` is the backend-side database backup file.
- The backend now resolves current salary from `employee_salary_history` for `GET /employees/:id/employment`.
- The legacy employment write routes still exist, but salary writes have been frozen so they no longer write salary values.

## 4. Database Structure
- PostgreSQL is the active database.
- Legacy employment data lives in `employment_details`.
- Authoritative salary history lives in `employee_salary_history`.
- Employee profile data lives in `employee_profiles`.
- Employee master records live in `employees`.
- Documents are stored through employee document tables and the uploads filesystem.
- Payroll bootstrap created the company payroll identity and salary history records are being treated as the financial source of truth.

## 5. Existing Modules
- Employee master management.
- Employee profile management.
- Employment details management.
- Salary history foundation and cutover logic.
- Company payroll bootstrap.
- Legacy salary backfill for John Updated.
- Document upload/download/view handling.
- Authentication via login and JWT issuance.

## 6. Completed Development Phases
- Phase 6A-M2A: payroll foundation inspection and design completed.
- Phase 6A-M2B: employee payroll profile design and schema completed.
- Phase 6A-M2C-1: employee salary history schema completed.
- Phase 6A-M2C-2A: company payroll bootstrap completed.
- Phase 6A-M2C-2B: legacy salary backfill completed.
- Phase 6A-M2C-3A: backend current salary read cutover completed.
- Phase 6A-M2C-3B: legacy salary write freeze completed.
- Phase 6A-M2C-3C: frontend salary display/edit cleanup completed.

## 7. Current Development Phase
- Backend/frontend salary cutover cleanup is complete through M2C-3C.
- The project is now ready for the next salary phase (salary-history workflow and authorization hardening).

## 8. Important Technical Decisions Already Made
- Salary history is the authoritative source of truth.
- `employment_details.salary_amount` is legacy compatibility data only.
- `GET /employees/:id/employment` must continue to return a compatible employment payload for the current frontend.
- Current salary resolution uses the Malaysia business date in `Asia/Kuala_Lumpur`.
- The backend must not fall back to `employment_details.salary_amount` when resolving current salary.
- Legacy employment write routes continue to accept salary payloads for compatibility, but salary values are ignored.
- The salary resolver must detect corrupted overlapping published salary rows and fail loudly.

## 9. Files Modified So Far
- `backend/server.js` was modified for salary read cutover and legacy write freeze.
- `backend/migrations/` contains completed payroll-related migration files created during earlier phases.
- `backend/package.json` and `frontend/package.json` show project work and dependency churn from the ongoing implementation.
- `frontend/src/pages/EmployeeProfile.jsx` was modified in M2C-3C to remove editable salary writes and present read-only salary from backend salary-history fields.
- `frontend/src/App.jsx`, `frontend/src/App.css`, `frontend/src/index.css`, and related frontend files are part of the active workspace changes that predate this documentation task.
- `backend/node_modules/` and `frontend/node_modules/` have noisy dependency-tree changes in the current working tree; these should be treated as environment noise unless the user asks otherwise.

## 10. Known Issues / Warnings
- The frontend no longer submits salary in normal employment saves; salary is read-only in Employee Profile.
- Salary-specific authorization has not yet been added around the salary history workflow.
- The legacy employment salary column still exists and must not be repurposed as authoritative payroll truth.
- The workspace has a noisy git status due to `node_modules` churn; do not treat those changes as intentional product changes.
- Any future salary workflow must avoid reintroducing dual source-of-truth behavior.

## 11. Features That Are Working
- Backend salary reads now come from `employee_salary_history`.
- Current salary for John Updated resolves to RM6000.
- Pre-cutover date behavior correctly returns no configured salary instead of falling back to legacy employment salary.
- Employment updates still work for non-salary fields.
- Legacy salary writes through employment routes are frozen.
- Employee Profile no longer exposes salary as editable through normal employment edit/save.
- Employee Profile now displays salary read-only using `salary_amount`, `salary_basis`, `salary_currency_code`, `salary_effective_from`, and `salary_configured`.
- Frontend build currently succeeds.
- Backend syntax check currently succeeds.
- Live employment endpoint remains compatible with the current Employee Profile contract.

## 12. Features That Are Incomplete
- Salary-change workflow is not implemented yet.
- Salary-specific authorization is not implemented yet.
- Salary-history UI is not implemented yet.
- Legacy employment salary field deprecation is not complete.

## 13. Rules the AI Agent Must Follow
- Inspect current implementation before changing behavior.
- Prefer the smallest safe backend-first change.
- Preserve existing frontend contracts unless the user explicitly requests a UI change.
- Keep salary history authoritative.
- Use `employee_salary_history` for salary reads and future payroll logic.
- Never reintroduce fallback reads from `employment_details.salary_amount`.
- Do not modify unrelated code, schema, or migrations without permission.
- Validate changes with syntax checks, builds, and live checks when practical.
- Treat financial/payroll changes as high-risk and fail loudly on integrity issues.
- Maintain rollback safety for temporary verification changes.

## 14. What Must NOT Be Modified Without Permission
- Database schema.
- Database migrations.
- Frontend UI and behavior outside the approved phase.
- Auth model or role model.
- Salary history rows.
- Legacy salary values in `employment_details` unless the user explicitly requests it.
- Unrelated modules or dependency churn in `node_modules`.

## 15. Exact Next Development Step
- Phase 6A-M2C-3D: salary-change workflow design and implementation using `employee_salary_history` (DRAFT/PUBLISHED flow), followed by salary-specific authorization hardening.

## 16. Manual Save / Load Project Memory
- `AGENTS.md` is a manually controlled project save state.
- Do NOT automatically read `AGENTS.md` at the start of a new session.
- Do NOT automatically update `AGENTS.md` after completing a phase.
- Only read `AGENTS.md` when the user explicitly says: `LOAD PROJECT STATE`.
- Only update `AGENTS.md` when the user explicitly says: `SAVE PROJECT STATE`.
- `SAVE PROJECT STATE` means:
	- Inspect and verify the current codebase.
	- Update `AGENTS.md` with the latest completed work, system state, important changes, technical decisions, known issues, current phase, and exact next step.
- `LOAD PROJECT STATE` means:
	- Read `AGENTS.md`.
	- Inspect the relevant current code to verify the saved state.
	- Do not modify application code until the next user instruction.

## 17. Latest Phase Save State (2026-07-26)
- PHASE 6A-M2C-3D-2B PASS.
- Implemented schema-only hardening in `employee_salary_history` using migration `backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql`.
- Added nullable audit columns:
	- `created_by_user_id integer NULL`
	- `cancelled_by_user_id integer NULL`
	- `cancelled_at timestamp without time zone NULL`
- Added FKs with `ON DELETE RESTRICT`:
	- `created_by_user_id -> users(id)`
	- `cancelled_by_user_id -> users(id)`
- Status model now enforces: `DRAFT`, `CANCELLED`, `PUBLISHED`, `RETIRED`.
- Added lifecycle integrity check:
	- `DRAFT`: no approval/cancellation metadata; `effective_to IS NULL`.
	- `CANCELLED`: complete salary payload + reason + cancellation actor/time; no approval metadata; `effective_to IS NULL`.
	- `PUBLISHED`: published-grade completeness; cancellation metadata must be NULL; LEGACY_MIGRATION approval exception preserved.
	- `RETIRED`: published-grade completeness; cancellation metadata must be NULL; LEGACY_MIGRATION approval exception preserved.
- Added MANUAL creator rule:
	- `source_type = 'MANUAL'` requires `created_by_user_id IS NOT NULL`.
- Added one-active-draft protection:
	- partial unique index `uq_employee_salary_history_one_active_draft_per_employee` on `(employee_id)` where `record_status = 'DRAFT'`.
- Preserved existing published overlap exclusion constraint unchanged:
	- `employee_salary_history_no_published_overlap`.
- `updated_at` remains application-managed (no trigger introduced).
- John Updated legacy row (employee_id 3) remained unchanged and valid with LEGACY_MIGRATION approval exception.
- Validation completed:
	- schema checks, row-count/signature checks, payroll flag stability, employment salary stability, and transactional A-N constraint tests (all pass).

## 18. Latest Phase Save State (2026-07-26)
- PHASE 6A-M2C-3D-2C PASS.
- Implemented read-only salary history endpoint in `backend/server.js`:
	- `GET /employees/:id/salary-history`
	- Middleware: `authenticateToken` + `requireRoles("Admin")`.
- Endpoint behavior:
	- `400` for invalid employee id format.
	- `404` when employee does not exist.
	- `200` with `{ employee_id, salary_history: [] }` when employee exists with no history.
	- `200` with salary history rows for existing records.
- Salary history response contract includes workflow-relevant fields only and does not expose auth/password data.
- Deterministic ordering enforced: `ORDER BY effective_from DESC, id DESC`.
- Date-only serialization preserved for `effective_from` and `effective_to` using existing formatter strategy (no timezone drift).
- Source-of-truth rule preserved:
	- endpoint reads from `employee_salary_history` only.
	- no fallback read from `employment_details.salary_amount`.
- Validation recovery completed for Test I using temporary committed employee data with guaranteed cleanup:
	- temporary employee created, validated via real HTTP call, then deleted in cleanup sequence.
	- post-cleanup checks confirmed exact restoration of pre-test DB state.
- Regression and security checks passed:
	- Admin success, missing/invalid/expired token `401`, non-Admin `403`, invalid id `400`, missing employee `404`.
	- John Updated row remains unchanged and returns RM6000/MONTHLY/MYR with `effective_from=2026-07-26`.
	- Existing `GET /employees/3/employment` behavior unchanged.
	- `node --check server.js` passed.
	- frontend `npm run build` passed.

## 19. Latest Phase Save State (2026-07-26)
- PHASE 6A-M2C-3D-2D PASS.
- Implemented salary draft create endpoint in `backend/server.js`:
	- `POST /employees/:id/salary-history/drafts`
	- Middleware: `authenticateToken` + `requireRoles("Admin")`.
- Strict forbidden-field policy implemented (HTTP 400) for server-controlled identity/lifecycle fields:
	- `employee_id`, `record_status`, `source_type`, `created_by_user_id`, `approved_by_user_id`, `approved_at`, `cancelled_by_user_id`, `cancelled_at`, `effective_to`, `role`, `user_id`.
- Allowed body contract enforced:
	- `salary_amount`, `salary_basis`, `currency_code`, `effective_from`, `reason`, `source_reference`.
	- Unexpected fields rejected with HTTP 400.
- Validation implemented:
	- positive integer employee id.
	- employee existence check.
	- `salary_amount` required, numeric, finite, and `> 0`.
	- `salary_basis` enum: `MONTHLY`, `WEEKLY`, `DAILY`, `HOURLY`.
	- `currency_code` strict `^[A-Z]{3}$`.
	- `effective_from` real calendar date validation for `YYYY-MM-DD`.
	- `reason` required non-empty trimmed string.
	- `source_reference` optional string or null.
- Server-assigned draft values enforced:
	- `employee_id` from route param.
	- `record_status='DRAFT'`.
	- `source_type='MANUAL'`.
	- `created_by_user_id=req.user.id`.
	- `effective_to=NULL`, approval/cancellation metadata NULL.
- Transaction + parameterized SQL implemented for create flow.
- Duplicate active draft handling implemented:
	- maps `uq_employee_salary_history_one_active_draft_per_employee` unique violation to HTTP `409` with message `Active draft already exists for this employee.`
- Response contract implemented:
	- HTTP `201` with `{ message: "Salary draft created", draft: {...} }`.
	- date-only serialization preserved for `effective_from` and `effective_to`.
- Full integration test matrix passed with temporary committed employee and guaranteed cleanup:
	- auth/rbac tests, payload validation tests, forbidden/unexpected field tests, positive create, conflict create, history readback, salary isolation checks, employment endpoint regression, and DB invariant restoration checks.
- Isolation guarantees verified:
	- `resolveEmployeeSalary` behavior unchanged (employee 3 remains RM6000/MONTHLY/MYR effective 2026-07-26).
	- `employment_details.salary_amount` unchanged.
	- existing published salary rows unchanged.
	- `payroll_enabled` unchanged and remains false.
- Final checks passed:
	- `node --check server.js` passed.
	- frontend `npm run build` passed.

## 20. Latest Phase Save State (2026-07-26)
- PHASE 6A-M2C FULL SALARY WORKFLOW AUDIT PASS.
- Audit date: 2026-07-26.
- Lifecycle tested end-to-end: create draft, read history, edit draft, cancel draft, create new draft, approve/publish, historical resolution, future-dated resolution, concurrency protection, authentication/authorization, cleanup, and invariant restoration.
- Concurrency/race results: approve-vs-cancel, double-approve, and edit-vs-approve races all resolved with exactly one winner and one `409` loser.
- Atomicity result: rollback test passed; a simulated publish failure restored the previous published row exactly and left the draft unchanged.
- DB invariant result: pre/post signatures for `employees`, `employee_salary_history`, `employment_details`, and `company_payroll_profile` matched after cleanup.
- Employee 3 permanent invariant: unchanged at RM6000.00 / MONTHLY / MYR with `effective_from=2026-07-26`, `effective_to=NULL`, `record_status=PUBLISHED`, `source_type=LEGACY_MIGRATION`.
- Current salary workflow endpoint inventory:
	- `GET /employees/:id/employment`
	- `GET /employees/:id/salary-history`
	- `POST /employees/:id/salary-history/drafts`
	- `PUT /employees/:employeeId/salary-history/drafts/:draftId`
	- `POST /employees/:employeeId/salary-history/drafts/:draftId/cancel`
	- `POST /employees/:employeeId/salary-history/drafts/:draftId/approve`
- Remaining risks:
	- Salary Management UI is not started yet.
	- Salary-specific authorization hardening and UI flows still need dedicated work.
	- Legacy compatibility data remains present and must not be repurposed as payroll truth.
- Next approved phase: Salary Management UI Design Review.

## 21. Latest Phase Save State (2026-07-27)
- PHASE 6A-M2C SALARY MANAGEMENT UI-2 PASS.
- Added create-only salary draft UI workflow in frontend:
	- `frontend/src/components/SalaryDraftModal.jsx`
	- `frontend/src/components/SalaryManagementSection.jsx`
	- `frontend/src/pages/EmployeeProfile.jsx`
	- `frontend/src/App.css`
- UI-2 behavior confirmed:
	- Change Salary / Set Initial Salary action opens create modal.
	- Client validation for amount, basis, currency, effective date, and reason.
	- Create request sends only allowed fields (`salary_amount`, `salary_basis`, `currency_code`, `effective_from`, `reason`).
	- No direct salary mutation in UI; official current salary remains employment-endpoint driven.
	- Active draft creation is blocked in UI and still enforced by backend `409`.
	- Success path closes modal and refreshes both employment and salary history from backend source of truth.
- Real protected HTTP integration validation passed (validation recovery):
	- Explicit env-based DB connection succeeded using `Pool({ host, port, database, user, password })` from `.env`.
	- Admin identity resolved from live DB (`users.role='Admin'`) and JWT generated from local `JWT_SECRET`.
	- Real `POST /employees/:id/salary-history/drafts` returned `201` for temporary employee id `72`.
	- Persisted draft row verified in DB:
		- `salary_amount=6500.00`
		- `salary_basis=MONTHLY`
		- `currency_code=MYR`
		- `effective_from=2026-08-01`
		- `record_status=DRAFT`
		- `created_by_user_id=1`
	- Verified no `PUBLISHED` row created for the temporary employee.
- Current salary isolation and invariants passed:
	- Employee 3 remained unchanged at `RM6000.00 / MONTHLY / MYR` with `effective_from=2026-07-26`.
	- Employee 3 salary history signature unchanged.
	- `employment_details.salary_amount` for Employee 3 unchanged.
	- `company_payroll_profile.payroll_enabled` unchanged (`false`).
- Guaranteed cleanup passed:
	- Cleanup order executed by temporary employee id: salary history rows -> employment details -> employee profile -> employee.
	- Post-cleanup verification: temporary employee count `0`, temporary salary history count `0`.
	- No temporary validation harness file remained.
- Final checks passed:
	- `node --check server.js` passed.
	- `frontend npm run build` passed.
- Next phase: UI-3 Edit Draft.

## 22. Latest Phase Save State (2026-07-27)
- PHASE 6A-M2C SALARY MANAGEMENT UI-3 PASS.
- Implemented Edit Draft UI in frontend with modal reuse:
	- `frontend/src/components/SalaryManagementSection.jsx`
	- `frontend/src/components/SalaryDraftModal.jsx`
	- `frontend/src/App.css`
- UI-3 behavior confirmed:
	- Pending Salary Change card now exposes `Edit Draft` only when an active DRAFT exists.
	- No Cancel or Approve actions added in UI-3.
	- Existing Change Salary action remains disabled while active DRAFT exists.
- Modal reuse and edit mode:
	- `SalaryDraftModal` now supports `mode="create"` and `mode="edit"` with shared validation.
	- Edit modal title: `Edit Salary Draft`.
	- Edit submit labels: `Save Draft` / `Saving Draft...`.
	- Edit form initializes from active DRAFT values (`salary_amount`, `salary_basis`, `currency_code`, `effective_from`, `reason`).
	- `expected_updated_at` token is required in edit mode and sent from the DRAFT snapshot.
- API/edit payload behavior:
	- UI sends only allowed edit fields:
		- `salary_amount`, `salary_basis`, `currency_code`, `effective_from`, `reason`, `expected_updated_at`.
	- Server-controlled fields are not sent.
- Optimistic concurrency and conflict handling:
	- `409` stale token path shows conflict messaging and refreshes employment + salary history.
	- State-transition conflict (`Salary draft is no longer editable`) is handled separately with refresh.
	- `404` draft-not-found path refreshes latest backend state.
	- `400`/`403`/generic error paths render user-facing error messages without false success.
- Current salary isolation preserved:
	- Draft edits do not change Current Salary display.
	- Current Salary remains employment-endpoint driven until future publish/approve flow.
- Real protected HTTP integration validation passed (temporary employee flow):
	- Used explicit env-based DB connection (`Pool({ host, port, database, user, password })`) from backend `.env`.
	- Because localhost `5000` had stale runtime behavior, validation used controlled current backend on port `5001`.
	- Temporary employee id `73` created.
	- Draft created and then updated through real HTTP `PUT /employees/:employeeId/salary-history/drafts/:draftId`.
	- Stale update retry with old `expected_updated_at` correctly returned `409`.
	- Same draft row id preserved; no second DRAFT created; no PUBLISHED row created for temporary employee.
	- Post-edit temporary employee employment endpoint remained non-configured (`404` path), confirming no current salary publication.
- Audit-field immutability verified:
	- `created_by_user_id` unchanged.
	- `created_at` unchanged.
	- `updated_at` changed after successful edit.
	- `record_status` remained `DRAFT`.
- Cleanup and invariants passed:
	- Cleanup order by temp employee id: salary history -> employment details -> employee profile -> employee.
	- Post-cleanup verification: temp employee count `0`, temp salary history count `0`.
	- No temporary validation script remained.
	- Employee 3 invariant unchanged (`RM6000.00 / MONTHLY / MYR`, `effective_from=2026-07-26`).
	- `employment_details.salary_amount` for Employee 3 unchanged.
	- `company_payroll_profile.payroll_enabled` unchanged (`false`).
- Final checks passed:
	- `frontend npm run build` passed.
	- `node --check server.js` passed.
- Next phase: UI-4 Cancel Draft.

## 23. Latest Phase Save State (2026-07-27)
- PHASE 6A-M2C SALARY MANAGEMENT UI-4 PASS.
- Implemented Cancel Draft UI in frontend with confirmation flow:
	- `frontend/src/components/SalaryManagementSection.jsx`
	- `frontend/src/components/SalaryDraftModal.jsx`
	- `frontend/src/App.css`
- UI-4 behavior confirmed:
	- Pending Salary Change card now exposes `Edit Draft` and `Cancel Draft` only when an active DRAFT exists.
	- No Approve action added in UI-4.
	- Cancel Draft opens a confirmation dialog instead of calling API immediately.
- Confirmation modal behavior:
	- Modal title: `Cancel Salary Change?`
	- Body explains the proposal is cancelled and preserved in Salary History for audit.
	- Buttons: `Keep Draft` and `Cancel Salary Change`.
	- Destructive action styled consistently with existing MID-HRMS button system.
- API/cancel payload behavior:
	- UI sends only `expected_updated_at`.
	- Concurrency token comes from active DRAFT `updated_at`.
	- No server-controlled fields are sent.
- Cancellation error handling:
	- `400` shows backend validation error.
	- `403` shows permission message without logout.
	- `404` refreshes latest salary information.
	- `409` stale token and no-longer-cancellable state both refresh latest salary information.
	- `500` shows generic failure message.
- Current salary isolation preserved:
	- Cancelling a DRAFT does not change Current Salary.
	- Cancelled row remains in Salary History with `Cancelled` status.
	- Change Salary becomes available again after refresh.
- Real protected HTTP integration validation passed (temporary employee flow):
	- Used explicit env-based DB connection (`Pool({ host, port, database, user, password })`) from backend `.env`.
	- Because localhost `5000` had stale runtime behavior, validation used controlled current backend on port `5001`.
	- Temporary employee ids `74` and `75` were created for validation and cleaned up.
	- Valid DRAFT cancellation returned `200`.
	- `record_status` changed to `CANCELLED`.
	- `cancelled_by_user_id` matched authenticated Admin id `1`.
	- `cancelled_at` populated.
	- Approval fields remained NULL.
	- Same row id preserved; no second salary row created.
	- Cancelled row remained visible through `GET /employees/:id/salary-history`.
	- Stale expected_updated_at retry returned `409`.
	- Double cancellation returned `409`.
	- PUBLISHED-row cancellation attempt returned `409`.
- Current salary and Employee 3 invariants passed:
	- Employee 3 remained `RM6000.00 / MONTHLY / MYR` with `effective_from=2026-07-26`.
	- Employee 3 salary history signature unchanged.
	- `employment_details.salary_amount` for Employee 3 unchanged.
	- `company_payroll_profile.payroll_enabled` unchanged (`false`).
- Guaranteed cleanup passed:
	- Cleanup order executed by temporary employee id: salary history rows -> employment details -> employee profile -> employee.
	- Post-cleanup verification: temporary employee counts `0`, temporary salary history counts `0`.
	- No temporary validation harness file remained.
- Final checks passed:
	- `frontend npm run build` passed.
	- `node --check server.js` passed.
- Next phase: UI-5 Approve Draft.

## 24. Latest Phase Save State (2026-07-27)
- PHASE 6A-M2C SALARY MANAGEMENT UI-5 PASS.
- Implemented approve-draft UI validation only; no product code changes were required in this phase after inspection.
- Live approval workflow validated against controlled backend instance on port `5001` using explicit backend `.env` PostgreSQL settings and a real Admin JWT signed with `JWT_SECRET`.
- Temporary validation employees created and fully cleaned up: `86` through `93`.
- First approval path passed:
	- `POST /employees/:employeeId/salary-history/drafts/:draftId/approve` returned `200` with body containing only `expected_updated_at`.
	- Same row id preserved.
	- `record_status` changed from `DRAFT` to `PUBLISHED`.
	- `salary_amount=6000.00`, `salary_basis=MONTHLY`, `currency_code=MYR`, `effective_from=2026-07-26`.
	- `effective_to IS NULL`.
	- `approved_by_user_id` matched the authenticated Admin id.
	- `approved_at` populated.
	- `cancelled_by_user_id` and `cancelled_at` remained NULL.
	- `created_by_user_id` and `created_at` were preserved.
	- No `DRAFT` row remained.
- Future approval path passed:
	- Initial `RM6000` salary approved, then future `RM6500` draft effective `2026-08-01` approved.
	- Timeline became exactly contiguous: `2026-07-26 -> 2026-07-31` and `2026-08-01 -> NULL`.
	- Both rows remained `PUBLISHED`.
	- Old row was not retired.
	- No overlap was introduced.
- Salary resolution boundary verified using the resolver query shape, not `employment_details.salary_amount` fallback:
	- `2026-07-31 -> RM6000`
	- `2026-08-01 -> RM6500`
- Concurrency and state validation passed:
	- stale `expected_updated_at` -> `409`
	- double approval -> exactly one `200`, one `409`
	- approve after cancel -> `409`
	- edit draft then approve with pre-edit token -> `409`
	- same-day replacement unsafe case -> `409`
	- backdated publication -> `409`
- UI contract inspection confirmed:
	- Approve action is only exposed for active `DRAFT` rows.
	- Confirmation modal shows Current Salary, New Salary, Effective From, and Reason.
	- Approve submit payload sends only `expected_updated_at`.
	- Double submit is prevented while the request is in flight.
	- `409` closes the modal and refreshes latest salary state.
	- `403` remains a handled permission error and does not rely on logout behavior.
	- `401` interceptor behavior in `frontend/src/services/api.js` remains unchanged.
- Current-vs-Upcoming UI boundary verified:
	- Current Salary remains sourced from the employment endpoint.
	- Future `PUBLISHED` salary appears in salary history as the upcoming row.
	- Frontend does not replace Current Salary through local date-only calculation.
- Employee 3 invariant preserved:
	- `RM6000.00 / MONTHLY / MYR`
	- `effective_from=2026-07-26`, `effective_to=NULL`, `record_status=PUBLISHED`
	- salary-history signature unchanged
	- `employment_details.salary_amount` unchanged
	- `company_payroll_profile.payroll_enabled=false`
- Cleanup and final checks passed:
	- Temporary salary-history rows deleted first, then `employment_details`, `employee_profiles`, and `employees` for temporary IDs only.
	- Post-cleanup counts: temporary employees `0`, temporary salary history `0`.
	- No validation harness file remained.
	- `node --check server.js` passed.
	- `frontend npm run build` passed.
- Next phase: UI-6 FULL BROWSER E2E AUDIT.

## 25. Latest Phase Save State (2026-07-27)
- PHASE 6A-M2C SALARY MANAGEMENT UI-6 PASS.
- Full browser audit completed against the live browser app using the seeded Admin login and the current backend contract.
- Temporary employee used for browser audit: `94` (`UI6 Browser Test <timestamp>`).
- Browser validation covered:
	- Login and redirect to Dashboard.
	- Employee Profile load and Salary Management rendering.
	- Empty salary state.
	- Create Draft flow.
	- Edit Draft flow with optimistic concurrency.
	- Cancel Draft flow.
	- Approve Draft flow.
	- Refresh and navigation durability.
	- Current vs Upcoming salary rendering.
	- Stale edit conflict and stale approve conflict handling.
	- Responsive desktop, tablet, and mobile-width checks.
	- Employment edit regression for non-salary fields.
- Salary workflow invariants preserved during audit:
	- Employee 3 remained `RM6000.00 / MONTHLY / MYR`, `effective_from=2026-07-26`, `effective_to=NULL`, `record_status=PUBLISHED`.
	- `employment_details.salary_amount` for Employee 3 stayed unchanged.
	- `company_payroll_profile.payroll_enabled` stayed `false`.
	- Current Salary continued to come from the employment/salary-resolver contract, not client-side date selection.
	- Browser approval payloads continued to send only `expected_updated_at`.
- Final cleanup completed:
	- Temporary employee `94` and all associated salary-history rows were deleted in dependency-safe order.
	- Post-cleanup counts were `employees=0` and `employee_salary_history=0` for the temporary employee.
- Final checks passed:
	- `frontend npm run build` passed.
	- `node --check server.js` passed.
- Next phase: not started.

## 26. Latest Phase Save State (2026-08-02)
- PHASE 6A-3 COMPLETE.
- Owner-restored master roadmap persisted in `docs/payroll/phase-6a-master-roadmap.md`.
- Added repeatable audit utility `backend/scripts/phase-6a-3-audit.js`.
- Added final report `docs/payroll/phase-6a-3-payroll-component-foundation-report.md`.
- Added Phase 6A-3 training section to `docs/payroll/payroll-faq.md`.
- Live verification completed against the running backend on port 5001, the frontend on port 5173, and the local PostgreSQL database.
- Live catalogue and rollback checks passed twice with temporary transaction-scoped payroll component records.
- Live counts remained stable before and after each audit:
	- `company_payroll_profile=1`
	- `payroll_component_type=3`
	- `payroll_component=0`
	- `payroll_component_rule_version=0`
	- `payroll_component_tax_flags_version=0`
- Frontend build passed.
- Backend syntax check passed.
- Frontend lint still fails on the same unrelated pre-existing files:
	- `App.jsx`
	- `SalaryDraftModal.jsx`
	- `SalaryManagementSection.jsx`
	- `Attendance.jsx`
	- `EmployeeProfile.jsx`
	- `Employees.jsx`
	- `Leave.jsx`
	- `api.js`
- No migration was required.
- No product frontend change was required for Phase 6A-3.
- Next formal section: 6A-4, not started.

## 27. Latest Phase Save State (2026-08-02)
- PHASE 6A-3 COMPLETE — ACCEPTANCE CORRECTION.
- Corrected the formal roadmap in `docs/payroll/phase-6a-master-roadmap.md` to the owner-restored numbering source.
- Corrected `docs/payroll/phase-6a-3-payroll-component-foundation-report.md` to the formal `6A-3A → 6A-3G` structure.
- Corrected the Phase 6A-3 training section in `docs/payroll/payroll-faq.md` to map the executed evidence to the formal sub-item numbering.
- Preserved the existing repeatable audit utility `backend/scripts/phase-6a-3-audit.js` and its executed evidence.
- Live verification remained unchanged:
	- backend on `5000` reused
	- frontend on `5173` reused
	- live PostgreSQL catalogue verified
	- phase-6a-3 audit passed twice
- Corrected verification baseline recorded:
	- standalone 6A-2 audit command is not available in the repository
	- `npm run lint` still fails on the same unrelated pre-existing files
	- `npm run build` passed
	- `node --check server.js` passed
- No new migration was created.
- No Phase 6A-4 work was started.

## 28. Latest Phase Save State (2026-08-02)
- PHASE 6A-3 COMPLETE — P0 SECURITY HOTFIX PASS.
- Closed verified public employee-data exposure in `backend/server.js` by applying existing `authenticateToken` and `requireRoles("Admin")` protections across sensitive employee-data routes.
- Added focused security regression utility `backend/scripts/employee-route-security-regression.js`.
- Extended `backend/scripts/phase-6a-3-audit.js` to:
	- target the normal backend port `5000`
	- verify two-company structural isolation where row-level company links are not expressible in the current component foundation schema
- Re-executed evidence:
	- phase-6a-3 audit pass 1: PASS
	- phase-6a-3 audit pass 2: PASS
	- employee-route security regression: PASS
	- backend syntax check: PASS
	- frontend build: PASS
	- frontend lint: FAIL on the same unrelated pre-existing files
- Browser verification passed:
	- logged-out `localhost:5173/employees` redirected to `/login`
	- authenticated `127.0.0.1:5173/employees` loaded successfully with a short-lived local Admin token for verification only
- Standalone 6A-2 audit command remains unavailable in the repository; regression evidence is preserved in the 6A-2 report and rechecked in the 6A-3 audit utility.
- No migration was required.
- No Phase 6A-4 work was started.
