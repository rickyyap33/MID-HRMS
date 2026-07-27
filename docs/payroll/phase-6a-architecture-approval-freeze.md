# Payroll Phase 6A Architecture Approval and Freeze Record

Status: APPROVED AND FROZEN

## 1. Record Control

- Phase name: Payroll Phase 6A-1
- Architecture document version: Version 1.0
- Implementation baseline Git commit: 1a23503bc43e4778e82cee6e79769630672cf001
- Documentation approval-record version: Version 1.0
- Document status: Approved record
- Approval decision: APPROVED
- Freeze status: FROZEN
- Approval date: 2026-07-27
- Approver: Ricky Yap - Owner
- Owner review record reference: Version 1.0 approval record

Important:
- This record completes 6A-1F architecture approval and freeze.
- This record applies only to the documented 6A-1 architecture scope and baseline.
- This record does not authorize Batch 2B, Batch 2C, Batch 2D, or runtime implementation changes.

## 2. Approval Scope

This record documents owner approval and freeze decision for the following architecture scope only:
- Payroll Phase 6A-1A - Payroll domain boundaries
- Payroll Phase 6A-1B - Salary source-of-truth rules
- Payroll Phase 6A-1C - Effective-date convention
- Payroll Phase 6A-1D - Salary lifecycle convention
- Payroll Phase 6A-1E - Security and audit conventions
- Payroll Phase 6A-1F - Architecture approval and freeze decision

## 3. Included Documents

Documents to be reviewed before approval:
- [docs/payroll/phase-6a-architecture.md](phase-6a-architecture.md)
- [docs/payroll/phase-6a-security-audit-conventions.md](phase-6a-security-audit-conventions.md)
- [docs/payroll/phase-6a-architecture-approval-freeze.md](phase-6a-architecture-approval-freeze.md)

## 4. Included Migrations

Architecture evidence included in review scope:
- [backend/migrations/20260726_phase6a_m1_payroll_foundation.sql](../../backend/migrations/20260726_phase6a_m1_payroll_foundation.sql#L10) - payroll-owned company and payroll-component foundation
- [backend/migrations/20260726_phase6a_m2b_employee_payroll_profile.sql](../../backend/migrations/20260726_phase6a_m2b_employee_payroll_profile.sql#L7) - employee payroll profile foundation
- [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql#L9) - salary history truth foundation
- [backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql](../../backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql#L27) - lifecycle and audit hardening

## 5. Implementation Boundaries

Confirmed implementation boundaries to review:
- Payroll owns salary history, payroll company identity, payroll component foundations, and employee payroll profile foundations.
- Employee, Attendance, Leave, Claims, Projects, AI Assistant, and other modules remain outside this approval scope except where they are dependencies or display payroll output.
- No FAQ, AI retrieval, RAG, embeddings, vector search, fine-tuning, or autonomous learning capability is included in this architecture approval scope.

Owner review notes:
- CONFIRMED

## 6. Source-of-Truth Confirmation Section

Review checkpoint:
- Current Salary must come only from the applicable `PUBLISHED` record in `employee_salary_history`.
- `DRAFT`, `CANCELLED`, and `RETIRED` must not become Current Salary in Phase 6A.
- Legacy salary fields must not be the active payroll source of truth.

Implementation evidence:
- resolver function: [backend/server.js](../../backend/server.js#L223)
- published-only filter: [backend/server.js](../../backend/server.js#L243)
- employment resolver endpoint: [backend/server.js](../../backend/server.js#L675)
- legacy salary write freeze on employment routes: [backend/server.js](../../backend/server.js#L2017), [backend/server.js](../../backend/server.js#L2075)

Owner confirmation:
- CONFIRMED

## 7. Effective-Date Confirmation Section

Review checkpoint:
- Salary effective periods use calendar dates.
- Current resolution uses Malaysia business date.
- `effective_from` and `effective_to` follow inclusive boundary behavior.
- `effective_to IS NULL` means open-ended applicability.
- Published overlap protection must remain enforced.

Implementation evidence:
- Malaysia business date helper: [backend/server.js](../../backend/server.js#L107)
- resolver applicability bounds: [backend/server.js](../../backend/server.js#L244), [backend/server.js](../../backend/server.js#L247)
- effective-range constraint: [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql#L40)
- published-overlap constraint: [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql#L107)

Owner confirmation:
- CONFIRMED

## 8. Lifecycle Confirmation Section

Review checkpoint:
- `DRAFT`, `PUBLISHED`, and `CANCELLED` are active Phase 6A statuses.
- `RETIRED` is reserved only in Phase 6A.
- Superseded historical rows remain `PUBLISHED` and close their period with `effective_to`.
- Phase 6A publish workflow does not actively produce `RETIRED`.

Implementation evidence:
- status set: [backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql](../../backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql#L27)
- previous row close behavior: [backend/server.js](../../backend/server.js#L1891)
- publish update behavior: [backend/server.js](../../backend/server.js#L1917)

Owner confirmation:
- CONFIRMED

## 9. Security and Audit Confirmation Section

Review checkpoint:
- Salary-sensitive routes require JWT authentication and Admin RBAC.
- Actor ids and roles must not be trusted from request bodies.
- Creator, approver, and canceller metadata are implemented.
- Salary draft edit actor remains a known gap proposed for future Batch 2B.
- No hard deletion of salary history evidence is permitted through the application workflow.

Implementation evidence:
- JWT middleware: [backend/server.js](../../backend/server.js#L285)
- RBAC middleware: [backend/server.js](../../backend/server.js#L370)
- actor-field protection on create/edit/cancel/approve: [backend/server.js](../../backend/server.js#L825), [backend/server.js](../../backend/server.js#L1083), [backend/server.js](../../backend/server.js#L1346), [backend/server.js](../../backend/server.js#L1588)
- creator/cancellation audit fields in migration: [backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql](../../backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql#L7)

Owner confirmation:
- CONFIRMED

## 10. Known Limitations

Documented known limitations for owner review:
- `RETIRED` exists in schema but is reserved and not actively produced in Phase 6A APIs.
- `updated_by_user_id` is not implemented for salary draft edits.
- Salary History audit timestamps use `timestamp without time zone`; the database schema does not independently guarantee UTC storage semantics.
- UTC `Z` formatting is required for client concurrency tokens, but immutable database-level UTC normalization is not currently enforced.
- Salary History hard-deletion prevention is enforced by application convention and the absence of a DELETE API, not by an immutable database trigger or database-level retention control.
- Privileged database users are not technically prevented from directly deleting Salary History records.

Owner decision on limitations:
- ACCEPTED AS TEMPORARY KNOWN LIMITATIONS

## 11. Accepted Risks

- 1. Salary History audit timestamps use `timestamp without time zone`, so the database schema does not independently guarantee UTC storage semantics.
- 2. UTC `Z` formatting is required for client concurrency tokens, but immutable database-level UTC normalization is not currently enforced.
- 3. Salary History hard-deletion prevention is enforced through application convention and the absence of a DELETE API, not through an immutable database retention control.
- 4. Privileged database users are not technically prevented from directly deleting Salary History rows.
- 5. `updated_by_user_id` is not yet implemented for Salary Draft edits and remains deferred to separately approved Batch 2B.

## 12. Deferred Work

Deferred out of this Batch 2A approval scope:
- Salary draft edit actor enhancement (`updated_by_user_id`)
- FAQ data model, APIs, routes, frontend, and AI Assistant navigation
- Any AI retrieval feature
- Any activation of `RETIRED` lifecycle behavior
- Any broader authentication-module changes

Owner review note:
- CONFIRMED

## 13. Out-of-Scope Work

Out of this architecture approval scope:
- Employee module redesign
- Attendance module redesign
- Leave module redesign
- Claims or Projects implementation
- FAQ implementation
- `ai-service` changes
- Login enumeration remediation
- RAG, embeddings, vector search, fine-tuning, or autonomous learning

Owner review note:
- CONFIRMED

## 14. Change-Control Process

Proposed change-control process after approval:
1. Any change to source-of-truth, lifecycle, effective-date convention, or audit/security convention requires explicit re-review.
2. Any change that activates `RETIRED` requires a separately approved lifecycle change.
3. Any change that reintroduces legacy salary fallback is prohibited without explicit re-approval.
4. Any payroll API that mutates salary-sensitive records must follow the documented JWT, RBAC, audit, concurrency, and retention conventions.

Owner confirmation:
- CONFIRMED

## 15. Re-review Conditions

Architecture must be re-reviewed if any of the following occurs:
- source-of-truth rule changes
- salary resolver changes
- lifecycle transitions change
- `RETIRED` becomes active
- audit-field model changes
- FAQ or AI knowledge features are linked into payroll behavior
- salary-sensitive authorization model changes
- effective-date semantics change

## 16. Freeze Invalidation Conditions

Any future freeze would be invalidated if:
- approved architectural boundaries are changed without review
- the resolver falls back to legacy salary fields
- salary history deletion is introduced
- non-Admin salary mutation is introduced without approved redesign
- lifecycle semantics are changed without owner review

## 17. Approval History

| Version | Review Date | Reviewer | Decision | Notes |
|---|---|---|---|---|
| Version 1.0 | 2026-07-27 | Ricky Yap - Owner | APPROVED AND FROZEN | 6A-1A to 6A-1F approved with temporary known limitations accepted; baseline fixed to 1a23503bc43e4778e82cee6e79769630672cf001 |
