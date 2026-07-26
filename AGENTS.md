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
