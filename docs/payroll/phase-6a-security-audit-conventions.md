# Payroll Phase 6A Security and Audit Conventions

## 1. Document Control

- Document title: Payroll Phase 6A Security and Audit Conventions
- Phase: 6A-1E
- Version: Version 1.0
- Status: Approved and frozen
- Purpose: Define the canonical authentication, authorization, audit, concurrency, validation, retention, and error-handling conventions for Payroll Phase 6A salary workflows.
- Owner: Ricky Yap
- Draft evidence verification date: 2026-07-27
- Owner approval date: 2026-07-27
- Implementation baseline: 1a23503bc43e4778e82cee6e79769630672cf001
- Freeze status: FROZEN

### Related implementation files

- [backend/server.js](../../backend/server.js#L285) - `authenticateToken`, `requireRoles`, salary-sensitive routes, concurrency handling, and error responses.
- [frontend/src/services/api.js](../../frontend/src/services/api.js#L1) - bearer-token injection and `401` redirect handling.

### Related migrations

- [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql#L9) - salary-history audit base fields and core constraints.
- [backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql](../../backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql#L7) - creator and cancellation audit fields, lifecycle constraint, and one-active-draft protection.

## 2. Authentication Convention

### 2.1 JWT authentication

All salary-sensitive Payroll Phase 6A routes require JWT authentication.

Evidence:
- `authenticateToken`: [backend/server.js](../../backend/server.js#L285)
- Salary-sensitive routes using `authenticateToken`:
  - `GET /employees/:id/employment`: [backend/server.js](../../backend/server.js#L675)
  - `GET /employees/:id/salary-history`: [backend/server.js](../../backend/server.js#L731)
  - `POST /employees/:id/salary-history/drafts`: [backend/server.js](../../backend/server.js#L805)
  - `PUT /employees/:employeeId/salary-history/drafts/:draftId`: [backend/server.js](../../backend/server.js#L1054)
  - `POST /employees/:employeeId/salary-history/drafts/:draftId/cancel`: [backend/server.js](../../backend/server.js#L1320)
  - `POST /employees/:employeeId/salary-history/drafts/:draftId/approve`: [backend/server.js](../../backend/server.js#L1562)

### 2.2 Server-side identity resolution

The server resolves the authenticated actor from JWT claims.

Evidence:
- `authenticateToken` parses bearer token and verifies JWT: [backend/server.js](../../backend/server.js#L286), [backend/server.js](../../backend/server.js#L307)
- `sub` and `id` are normalized to one positive integer user identity and mismatches are rejected: [backend/server.js](../../backend/server.js#L320), [backend/server.js](../../backend/server.js#L336)
- `req.user = { id, role }`: [backend/server.js](../../backend/server.js#L355)

Convention:
- Payroll APIs must derive acting user identity from `req.user` only.
- Payroll APIs must not trust user identity or role values from request bodies.

## 3. Authorization Convention

### 3.1 Admin-only salary mutations

Salary mutations are Admin-only in Phase 6A.

Evidence:
- `requireRoles("Admin")`: [backend/server.js](../../backend/server.js#L370)
- Salary-sensitive routes all include `requireRoles("Admin")`: [backend/server.js](../../backend/server.js#L675), [backend/server.js](../../backend/server.js#L731), [backend/server.js](../../backend/server.js#L805), [backend/server.js](../../backend/server.js#L1054), [backend/server.js](../../backend/server.js#L1320), [backend/server.js](../../backend/server.js#L1562)

### 3.2 Backend RBAC enforcement

Authorization is enforced by backend middleware, not by frontend button visibility.

Convention:
- Frontend visibility may improve UX but does not authorize access.
- Future payroll APIs must continue to enforce role restrictions on the server.

## 4. Frontend Bearer-Token Handling

Frontend bearer handling is centralized.

Evidence:
- Axios base client: [frontend/src/services/api.js](../../frontend/src/services/api.js#L3)
- Bearer header injection: [frontend/src/services/api.js](../../frontend/src/services/api.js#L23), [frontend/src/services/api.js](../../frontend/src/services/api.js#L28)
- Non-login `401` handling clears local token and redirects to `/login`: [frontend/src/services/api.js](../../frontend/src/services/api.js#L37), [frontend/src/services/api.js](../../frontend/src/services/api.js#L47), [frontend/src/services/api.js](../../frontend/src/services/api.js#L56)

Convention:
- Payroll frontend code must use the shared API client for salary-sensitive requests.
- Frontend code must not manually assemble alternative auth flows for payroll endpoints.

## 5. Actor Ownership Rules

### 5.1 Request-body actor prohibition

Payroll routes must not trust actor identifiers from request bodies.

Evidence:
- Draft create forbids `created_by_user_id`, `approved_by_user_id`, `cancelled_by_user_id`, `role`, and `user_id`: [backend/server.js](../../backend/server.js#L825), [backend/server.js](../../backend/server.js#L849)
- Draft edit protects `created_by_user_id`, `approved_by_user_id`, `cancelled_by_user_id`, `role`, and `user_id`: [backend/server.js](../../backend/server.js#L1083), [backend/server.js](../../backend/server.js#L1107)
- Draft cancel protects actor fields and payload salary fields: [backend/server.js](../../backend/server.js#L1346), [backend/server.js](../../backend/server.js#L1373)
- Draft approve protects actor fields and payload salary fields: [backend/server.js](../../backend/server.js#L1588), [backend/server.js](../../backend/server.js#L1615)

### 5.2 Implemented actor fields

Implemented now:
- creator actor: `created_by_user_id`
- approval actor: `approved_by_user_id`
- cancellation actor: `cancelled_by_user_id`

Evidence:
- creator audit field in schema hardening migration: [backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql](../../backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql#L7)
- create route assigns creator from `req.user.id`: [backend/server.js](../../backend/server.js#L907)
- cancel route assigns canceller from `req.user.id`: [backend/server.js](../../backend/server.js#L1479), [backend/server.js](../../backend/server.js#L1505)
- approve route assigns approver from `req.user.id`: [backend/server.js](../../backend/server.js#L1919)

### 5.3 Known gap

Known implementation gap:
- `updated_by_user_id` is not implemented for Salary Draft edit auditing.
- This is proposed for Batch 2B only and is not authorized or implemented in Batch 2A.

## 6. Audit Timestamp Convention

Implemented audit timestamps:
- `created_at`: [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql#L16)
- `updated_at`: [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql#L17)
- `approved_at`: [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql#L16)
- `cancelled_at`: [backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql](../../backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql#L8)

Convention:
- `created_at` and `created_by_user_id` describe row creation.
- `updated_at` is the concurrency anchor for mutable draft operations.
- `approved_at` and `approved_by_user_id` describe publication approval.
- `cancelled_at` and `cancelled_by_user_id` describe cancellation.

Type and timezone evidence:
- All salary-history audit timestamps are `timestamp without time zone` in schema: [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql#L20), [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql#L22), [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql#L23), [backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql](../../backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql#L10)
- `created_at` and initial `updated_at` are generated by PostgreSQL defaults (`now()`): [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql#L22)
- edit and cancel write `updated_at` in SQL (`CURRENT_TIMESTAMP` and `now()`): [backend/server.js](../../backend/server.js#L1238), [backend/server.js](../../backend/server.js#L1481)
- approve sets `approved_at` and `updated_at` via backend-generated `Date` values bound to SQL parameters: [backend/server.js](../../backend/server.js#L1839), [backend/server.js](../../backend/server.js#L1920)

Serialization and concurrency-token convention:
- Client concurrency token input must be UTC ISO text ending in `Z`: [backend/server.js](../../backend/server.js#L223), [backend/server.js](../../backend/server.js#L1159), [backend/server.js](../../backend/server.js#L1388), [backend/server.js](../../backend/server.js#L1630)
- API responses include timestamp fields from DB driver serialization and date-only salary fields from `formatDateOnly`: [backend/server.js](../../backend/server.js#L126), [backend/server.js](../../backend/server.js#L1288), [backend/server.js](../../backend/server.js#L1972)

Known limitation for owner review:
- The schema does not enforce UTC storage semantics for audit timestamps because columns are `timestamp without time zone`.
- Hard UTC normalization for stored audit timestamps is not declared as an immutable DB-level rule in current Phase 6A implementation.

## 7. No Hard Deletion and Record Retention

Convention:
- Salary history is an audit-bearing payroll record and must not be hard-deleted through the application workflow.
- Cancelled salary records must be retained.

Evidence:
- Draft cancel updates `record_status='CANCELLED'` instead of deleting: [backend/server.js](../../backend/server.js#L1477)
- No salary-history delete route was found in `backend/server.js`.

Enforcement level clarification:
- Application/API layer: deletion is prohibited by workflow design (status transition to `CANCELLED`) and by omission of a salary-history DELETE endpoint.
- Database layer: no immutable deletion-prevention trigger or salary-history-specific delete-permission control is defined in current Phase 6A migration scope.
- Privileged database users with direct DB access are not technically blocked by an immutable salary-history retention control in current schema.

Known limitation for owner review:
- Hard-deletion prevention is enforced by application convention and API design, not by an immutable database-level retention control.

## 8. Transaction, Locking, and Concurrency Convention

### 8.1 Transaction boundaries

Create draft:
- begins transaction: [backend/server.js](../../backend/server.js#L920)
- commits transaction: [backend/server.js](../../backend/server.js#L1001)
- rollback on failure path: [backend/server.js](../../backend/server.js#L929), [backend/server.js](../../backend/server.js#L1019)
- rollback only after transaction begins, guarded by `transactionActive`: [backend/server.js](../../backend/server.js#L916), [backend/server.js](../../backend/server.js#L1018)
- client release in `finally`: [backend/server.js](../../backend/server.js#L1048)

Edit draft:
- begins transaction: [backend/server.js](../../backend/server.js#L1179)
- commits transaction: [backend/server.js](../../backend/server.js#L1279)
- rollback on failure path: [backend/server.js](../../backend/server.js#L1195), [backend/server.js](../../backend/server.js#L1220), [backend/server.js](../../backend/server.js#L1297)
- rollback only after transaction begins, guarded by `transactionActive`: [backend/server.js](../../backend/server.js#L1175), [backend/server.js](../../backend/server.js#L1296)
- client release in `finally`: [backend/server.js](../../backend/server.js#L1314)

Cancel draft:
- begins transaction: [backend/server.js](../../backend/server.js#L1403)
- commits transaction: [backend/server.js](../../backend/server.js#L1521)
- rollback on failure path: [backend/server.js](../../backend/server.js#L1434), [backend/server.js](../../backend/server.js#L1468), [backend/server.js](../../backend/server.js#L1539)
- rollback only after transaction begins, guarded by `transactionActive`: [backend/server.js](../../backend/server.js#L1399), [backend/server.js](../../backend/server.js#L1538)
- client release in `finally`: [backend/server.js](../../backend/server.js#L1556)

Approve draft:
- begins transaction: [backend/server.js](../../backend/server.js#L1645)
- commits transaction: [backend/server.js](../../backend/server.js#L1963)
- rollback on failure path: [backend/server.js](../../backend/server.js#L1676), [backend/server.js](../../backend/server.js#L1882), [backend/server.js](../../backend/server.js#L1981)
- rollback only after transaction begins, guarded by `transactionActive`: [backend/server.js](../../backend/server.js#L1641), [backend/server.js](../../backend/server.js#L1980)
- client release in `finally`: [backend/server.js](../../backend/server.js#L2010)

Convention:
- Every salary lifecycle mutation must be transaction-protected.
- On exceptions after `BEGIN`, routes attempt rollback and always release the client in `finally`, so partial persistence from exception paths is not expected.

### 8.2 Row locking

Implemented now:
- Cancel draft locks the draft row via `FOR UPDATE`: [backend/server.js](../../backend/server.js#L1406)
- Approve draft locks the draft row and relevant published rows via `FOR UPDATE`: [backend/server.js](../../backend/server.js#L1648), [backend/server.js](../../backend/server.js#L1757)

Convention:
- State-transition routes that can race must use database row locking where current state must be stabilized before mutation.

### 8.3 Optimistic concurrency

Implemented now:
- Edit draft requires `expected_updated_at`: [backend/server.js](../../backend/server.js#L1159)
- Cancel draft requires `expected_updated_at`: [backend/server.js](../../backend/server.js#L1388)
- Approve draft requires `expected_updated_at`: [backend/server.js](../../backend/server.js#L1630)

Convention:
- Client-visible mutable payroll records must use optimistic concurrency for stale-session detection.
- Concurrency tokens must be server-produced and round-tripped by the client.

### 8.4 Stale and repeated-action behavior matrix

Current route behavior:
- Editing a stale Draft: validated by `expected_updated_at` comparison and guarded update predicate (`to_char(updated_at...)`); returns `409` with conflict-safe message. Evidence: [backend/server.js](../../backend/server.js#L1213), [backend/server.js](../../backend/server.js#L1240), [backend/server.js](../../backend/server.js#L1271)
- Cancelling a stale Draft: validated by `expected_updated_at` comparison and guarded update predicate; returns `409` with conflict-safe message. Evidence: [backend/server.js](../../backend/server.js#L1452), [backend/server.js](../../backend/server.js#L1484), [backend/server.js](../../backend/server.js#L1513)
- Approving a stale Draft: validated by `expected_updated_at` comparison and guarded update predicate; returns `409` with conflict-safe message. Evidence: [backend/server.js](../../backend/server.js#L1694), [backend/server.js](../../backend/server.js#L1924), [backend/server.js](../../backend/server.js#L1955)
- Editing a non-Draft record: `record_status !== 'DRAFT'` branch returns `409` (`Salary draft is no longer editable`). Evidence: [backend/server.js](../../backend/server.js#L1205), [backend/server.js](../../backend/server.js#L1210)
- Cancelling an already Cancelled record: non-Draft check returns `409` (`Salary draft is no longer cancellable`). Evidence: [backend/server.js](../../backend/server.js#L1444), [backend/server.js](../../backend/server.js#L1449)
- Cancelling an already Published record: non-Draft check returns `409` (`Salary draft is no longer cancellable`). Evidence: [backend/server.js](../../backend/server.js#L1444), [backend/server.js](../../backend/server.js#L1449)
- Approving an already Published record: non-Draft check returns `409` (`Salary draft is no longer approvable`). Evidence: [backend/server.js](../../backend/server.js#L1686), [backend/server.js](../../backend/server.js#L1691)
- Approving an already Cancelled record: non-Draft check returns `409` (`Salary draft is no longer approvable`). Evidence: [backend/server.js](../../backend/server.js#L1686), [backend/server.js](../../backend/server.js#L1691)
- Repeating the same Approve request: not idempotent; first successful transition consumes DRAFT, subsequent retry hits non-Draft `409`. Evidence: [backend/server.js](../../backend/server.js#L1918), [backend/server.js](../../backend/server.js#L1686)
- Repeating the same Cancel request: not idempotent; first successful transition consumes DRAFT, subsequent retry hits non-Draft `409`. Evidence: [backend/server.js](../../backend/server.js#L1478), [backend/server.js](../../backend/server.js#L1444)
- Attempting action with a valid Draft belonging to another employee: scoped query requires both `id` and `employee_id`; returns `404` without disclosing other employee ownership. Evidence: [backend/server.js](../../backend/server.js#L1188), [backend/server.js](../../backend/server.js#L1410), [backend/server.js](../../backend/server.js#L1652), [backend/server.js](../../backend/server.js#L1196), [backend/server.js](../../backend/server.js#L1435), [backend/server.js](../../backend/server.js#L1677)

## 9. Validation Responsibilities

### 9.1 Frontend validation responsibility

Convention:
- Frontend may perform user-experience validation for salary amount, basis, currency, dates, and required notes, but frontend validation does not replace backend enforcement.

Current implementation evidence:
- Salary draft modal validates amount, basis, currency, date, reason, and edit-mode concurrency token before submit: [frontend/src/components/SalaryDraftModal.jsx](../../frontend/src/components/SalaryDraftModal.jsx#L100), [frontend/src/components/SalaryDraftModal.jsx](../../frontend/src/components/SalaryDraftModal.jsx#L120), [frontend/src/components/SalaryDraftModal.jsx](../../frontend/src/components/SalaryDraftModal.jsx#L132)

### 9.2 Backend validation responsibility

Implemented now:
- Employee id and draft id shape validation on salary routes: [backend/server.js](../../backend/server.js#L734), [backend/server.js](../../backend/server.js#L1058), [backend/server.js](../../backend/server.js#L1324), [backend/server.js](../../backend/server.js#L1566)
- Salary amount, basis, currency, effective date, and reason validation: [backend/server.js](../../backend/server.js#L865), [backend/server.js](../../backend/server.js#L874), [backend/server.js](../../backend/server.js#L881), [backend/server.js](../../backend/server.js#L888), [backend/server.js](../../backend/server.js#L894)
- Optimistic concurrency token validation: [backend/server.js](../../backend/server.js#L1159), [backend/server.js](../../backend/server.js#L1388), [backend/server.js](../../backend/server.js#L1630)

### 9.3 Database constraint responsibility

Implemented now:
- valid status set: [backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql](../../backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql#L27)
- manual creator requirement: [backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql](../../backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql#L29)
- lifecycle metadata rules: [backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql](../../backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql#L34)
- one active draft per employee: [backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql](../../backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql#L100)
- effective range validity: [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql#L40)
- published overlap protection: [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql#L107)

## 10. Error-Response Convention

Implemented payroll route classes:
- `400` invalid request shape, field, date, or concurrency token
- `401` unauthorized or invalid token
- `403` forbidden role
- `404` missing employee or draft
- `409` state conflict, duplicate active draft, stale request, or salary timeline conflict
- `500` generic server error or salary integrity error

Evidence examples:
- `401` from `authenticateToken`: [backend/server.js](../../backend/server.js#L288), [backend/server.js](../../backend/server.js#L362)
- `403` from `requireRoles`: [backend/server.js](../../backend/server.js#L377)
- `409` stale edit: [backend/server.js](../../backend/server.js#L1221)
- `409` non-editable draft: [backend/server.js](../../backend/server.js#L1208)
- `409` salary timeline conflict: [backend/server.js](../../backend/server.js#L1796), [backend/server.js](../../backend/server.js#L1911), [backend/server.js](../../backend/server.js#L1997)
- `500` salary history integrity error: [backend/server.js](../../backend/server.js#L709), [backend/server.js](../../backend/server.js#L715)

Convention:
- Payroll APIs should return stable, non-secret-bearing error responses.
- Payroll APIs should not leak tokens, raw SQL, or internal stack traces to clients.

## 11. Sensitive Logging Restrictions

Implemented now:
- Payroll routes log server-side errors and return generic client responses.
- Salary integrity failure logging includes employee id and target date but not secret values: [backend/server.js](../../backend/server.js#L709)

Convention for future payroll APIs:
- Do not log JWTs, passwords, raw authorization headers, or secret configuration values.
- Do not log raw request bodies for salary-sensitive routes unless explicitly redacted.
- Prefer route, employee id, and conflict classification over secret-bearing payload logs.

## 12. Cross-Employee Record Protection

Implemented now:
- Draft edit, cancel, and approve routes require both `draftId` and `employeeId` to match the same row.

Evidence:
- edit draft row scope: [backend/server.js](../../backend/server.js#L1182), [backend/server.js](../../backend/server.js#L1188)
- cancel draft row scope: [backend/server.js](../../backend/server.js#L1406), [backend/server.js](../../backend/server.js#L1426)
- approve draft row scope: [backend/server.js](../../backend/server.js#L1648), [backend/server.js](../../backend/server.js#L1668)

Convention:
- Future payroll mutation routes must always bind child-record operations to the parent employee scope where applicable.

## 13. Minimum Requirements for Future Payroll APIs

Future payroll APIs must:
- require JWT authentication
- resolve identity server-side from `req.user`
- enforce backend RBAC
- reject request-body roles and actor ids
- validate identifiers and payload shapes explicitly
- use optimistic concurrency for mutable payroll records
- use row locking for competing state transitions
- preserve audit history and avoid destructive deletion of salary evidence
- return stable `400`, `401`, `403`, `404`, `409`, and `500` semantics

## 14. Salary History Foreign-Key Delete Policies

Confirmed delete policies on `employee_salary_history` foreign keys:
- `employee_id -> employees(id)`: `ON DELETE RESTRICT`. Evidence: [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql#L26), [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql#L29)
- `approved_by_user_id -> users(id)`: `ON DELETE RESTRICT`. Evidence: [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql#L30), [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql#L33)
- `created_by_user_id -> users(id)`: `ON DELETE RESTRICT`. Evidence: [backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql](../../backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql#L13), [backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql](../../backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql#L16)
- `cancelled_by_user_id -> users(id)`: `ON DELETE RESTRICT`. Evidence: [backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql](../../backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql#L17), [backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql](../../backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql#L20)

Audit-retention impact:
- Referenced employee/user rows cannot be deleted while salary-history rows depend on them, preserving referential audit traceability.

## 15. Out-of-Scope Auth Finding

Separate Auth Module finding, not part of Payroll completion:
- Login currently returns different messages for unknown user and wrong password: [backend/server.js](../../backend/server.js#L2999), [backend/server.js](../../backend/server.js#L3016)

Scope handling:
- This finding is recorded here only as an out-of-scope auth issue.
- It is not part of Batch 2A payroll completion.
- No login-flow change is authorized in Batch 2A.
