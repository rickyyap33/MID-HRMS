# Payroll FAQ

## Payroll Phase 6A-1 - Resolved Architecture FAQ

> Scope: Phase 6A-1A through 6A-1F  
> Status: APPROVED AND FROZEN  
> Owner: Ricky Yap  
> Approval date: 2026-07-27  
> Implementation baseline: 1a23503bc43e4778e82cee6e79769630672cf001  
> Freeze commit: 372bbd46e3b6a30315b701bd062076da082ddfc5  
> Overall project status: PHASE 6A-1 COMPLETE - PHASE 6A STILL IN PROGRESS

### 6A-1A - Payroll domain boundaries

Question:
What belongs to Payroll in Phase 6A-1, and what is only foundation versus fully workflow-complete?

| Correct | Incorrect |
|---|---|
| Payroll owns Company Payroll Profile, Payroll Components, Employee Payroll Profile, Employee Salary History, Salary workflow, and Current Salary resolution conventions. | Treating every payroll-owned table as proof of complete API and UI workflow. |
| Distinguish schema foundation from operational workflow completion. | Assuming migration existence alone means full feature completion. |

Why:
Payroll ownership was frozen at architecture level, but implementation depth differs by area. Salary workflow routes and UI are present; other payroll foundations are currently schema-first.

Source or evidence:
- [docs/payroll/phase-6a-architecture.md](phase-6a-architecture.md)
- [backend/migrations/20260726_phase6a_m1_payroll_foundation.sql](../../backend/migrations/20260726_phase6a_m1_payroll_foundation.sql)
- [backend/migrations/20260726_phase6a_m2b_employee_payroll_profile.sql](../../backend/migrations/20260726_phase6a_m2b_employee_payroll_profile.sql)
- [backend/server.js](../../backend/server.js)
- [frontend/src/components/SalaryManagementSection.jsx](../../frontend/src/components/SalaryManagementSection.jsx)

Future AI instruction:
Always separate "foundation implemented" from "workflow implemented and test-executed."

### 6A-1B - Salary source of truth

Question:
What is the only valid Current Salary source?

| Correct | Incorrect |
|---|---|
| Current Salary comes only from the applicable PUBLISHED row in employee_salary_history. | Reading Current Salary from DRAFT rows. |
| DRAFT, CANCELLED, and RETIRED cannot become Current Salary. | Treating CANCELLED proposals as active salary. |
| Legacy salary fields are not active source of truth. | Silent fallback to legacy salary fields as active truth. |
| Not every salary-history row is "current." | Assuming newest row is always current without status/date checks. |

Why:
Resolver logic applies status and effective-date filtering and fails loudly on integrity ambiguity.

Source or evidence:
- [docs/payroll/phase-6a-architecture.md](phase-6a-architecture.md)
- [backend/server.js](../../backend/server.js#L232)
- [backend/server.js](../../backend/server.js#L243)
- [backend/server.js](../../backend/server.js#L675)

Future AI instruction:
Never reintroduce active-truth fallback to legacy salary fields.

### 6A-1C - Effective-date convention

Question:
How must salary effective dates be interpreted?

| Correct | Incorrect |
|---|---|
| Salary business dates follow Malaysia business-date rules. | Applying browser-local timezone conversion as payroll business date. |
| effective_from and effective_to are inclusive boundaries. | Treating effective_to as exclusive. |
| Resolve Current Salary from applicable Published record by status and date. | Selecting only the newest row without applicability checks. |

Why:
Business-date and inclusive-boundary semantics are frozen conventions and mirrored by resolver and constraints.

Source or evidence:
- [docs/payroll/phase-6a-architecture.md](phase-6a-architecture.md)
- [backend/server.js](../../backend/server.js#L107)
- [backend/server.js](../../backend/server.js#L244)
- [backend/server.js](../../backend/server.js#L246)
- [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql#L107)

Future AI instruction:
Preserve Malaysia business-date and inclusive-boundary semantics unless owner approves a change.

### 6A-1D - Salary lifecycle convention

Question:
What lifecycle transitions are valid in Phase 6A-1?

| Correct | Incorrect |
|---|---|
| Controlled status transitions only. | Ad-hoc status rewrites outside workflow. |
| Draft cancellation is DRAFT -> CANCELLED. | Treating cancellation as deletion. |
| Cancellation retains row for audit history. | Deleting cancelled salary rows. |
| Superseded rows remain PUBLISHED and are closed with effective_to. | Converting superseded PUBLISHED rows to RETIRED automatically. |
| RETIRED remains reserved unless separately approved. | Activating RETIRED without explicit approval. |
| Original proposal reason remains unchanged during cancellation. | Reusing proposal reason as cancellation note. |

Why:
Lifecycle integrity is enforced by both route checks and database lifecycle constraints.

Source or evidence:
- [docs/payroll/phase-6a-architecture.md](phase-6a-architecture.md)
- [backend/server.js](../../backend/server.js#L1320)
- [backend/server.js](../../backend/server.js#L1478)
- [backend/server.js](../../backend/server.js#L1562)
- [backend/server.js](../../backend/server.js#L1896)
- [backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql](../../backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql#L34)

Future AI instruction:
Do not reinterpret cancellation as deletion or as a reason-overwrite event.

### 6A-1E - Security and audit convention

Question:
What security and audit behavior is mandatory for salary mutation routes?

| Correct | Incorrect |
|---|---|
| Salary mutations are Admin-only. | Allowing non-Admin mutation behavior. |
| Actor identity is server-side authenticated (for example req.user.id). | Trusting client actor identity fields. |
| Use strict request allowlists/protected-field checks. | Accepting cancelled_by_user_id, updated_by_user_id, role, or user id from request body. |
| Optimistic concurrency uses expected_updated_at convention. | Mutating drafts without stale-token checks. |
| Cancelled records remain visible in Salary History. | Hiding/removing cancelled records from history by deletion. |
| No DELETE API is application-level protection only. | Assuming no DELETE endpoint equals immutable DB-level retention. |
| updated_by_user_id remains deferred. | Claiming salary-audit implementation is fully complete. |

Why:
Security policy is frozen; accepted temporary risks explicitly clarify current boundaries.

Source or evidence:
- [docs/payroll/phase-6a-security-audit-conventions.md](phase-6a-security-audit-conventions.md)
- [backend/server.js](../../backend/server.js#L285)
- [backend/server.js](../../backend/server.js#L370)
- [backend/server.js](../../backend/server.js#L1159)
- [backend/server.js](../../backend/server.js#L1388)
- [backend/server.js](../../backend/server.js#L1630)
- [backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql](../../backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql)

Future AI instruction:
Never mark audit as complete while updated_by_user_id remains deferred.

### 6A-1F - Architecture approval and freeze

Question:
What does the 6A-1 freeze allow, and what does it not allow?

| Correct | Incorrect |
|---|---|
| Version 1.0 is approved and frozen. | Quietly changing frozen salary conventions. |
| Freeze locks architecture direction, not defect-free proof. | Claiming freeze proves implementation is defect-free. |
| Freeze is not production-readiness proof. | Claiming freeze proves production readiness. |
| 6A-1 complete does not mean full 6A complete. | Declaring PHASE 6A COMPLETE because 6A-1 is complete. |
| Full 6A completion requires full roadmap and accepted testing/review. | Treating temporary batch names as formal roadmap numbering without evidence. |

Why:
Freeze record is architecture governance control, not runtime-quality certification.

Source or evidence:
- [docs/payroll/phase-6a-architecture-approval-freeze.md](phase-6a-architecture-approval-freeze.md)
- [docs/payroll/phase-6a-architecture.md](phase-6a-architecture.md)
- [docs/payroll/phase-6a-security-audit-conventions.md](phase-6a-security-audit-conventions.md)

Future AI instruction:
Do not treat frozen architecture approval as proof of executed test completion.

### 6A-2 - Company payroll foundation

Question:
Do payroll component tables require a company-scoping migration or backfill in the current live workspace?

| Correct | Incorrect |
|---|---|
| Check the live schema and data first. In the current workspace, `company_payroll_profile` is present, `employee_payroll_profile` is still empty, payroll component tables are still empty, and no company-scoped component columns exist, so no company-ownership migration was required. | Adding company-scoping columns or a backfill just because the table names sound payroll-owned. |
| Treat 6A-2C as a verified no-op when the live database already matches the approved foundation state. | Claiming a migration was needed without live schema evidence. |

Why:
The repeatable 6A-2E audit confirmed the company payroll foundation is present and stable without any component ownership rewrite.

Source or evidence:
- [docs/payroll/phase-6a-2-company-payroll-foundation-report.md](phase-6a-2-company-payroll-foundation-report.md)
- [backend/migrations/20260726_phase6a_m1_payroll_foundation.sql](../../backend/migrations/20260726_phase6a_m1_payroll_foundation.sql)
- [backend/migrations/20260726_phase6a_m2b_employee_payroll_profile.sql](../../backend/migrations/20260726_phase6a_m2b_employee_payroll_profile.sql)
- [backend/migrations/20260726_phase6a_m2c2a_company_payroll_bootstrap.sql](../../backend/migrations/20260726_phase6a_m2c2a_company_payroll_bootstrap.sql)

Future AI instruction:
Use live counts and schema columns before recommending any payroll-component ownership backfill.

### 6A-3 - Payroll component foundation

Question:
What must future assistants understand about payroll component foundation and ownership in Phase 6A-3?

| Correct | Incorrect |
|---|---|
| The restored roadmap is the formal Phase 6A numbering source, and `6A-3` means Payroll Component Foundation. | Treating `M1`, `M2`, `M2C`, or other temporary labels as formal roadmap sections. |
| `6A-3A` is Payroll Component Master. | Treating Salary Draft Cancel as Phase 6A-3. |
| `6A-3B` is Payroll Component Rule Versioning. | Creating unnecessary migrations, APIs, UI, or seed data just to make a batch look active. |
| `6A-3C` is Payroll Component Tax/Statutory Flags Versioning. | Allowing ownerless or cross-company component records. |
| `6A-3D` is Effective-Date Overlap Protection. | Claiming inspection alone is a passed live audit. |
| `6A-3E` is Calculation-Method Integrity. | Starting employee assignment, Salary History, UI, or Payroll Run work in this batch. |
| `6A-3F` is Component Lifecycle. |  |
| `6A-3G` is Foundation QA. |  |
| Child rule and tax versions inherit valid ownership through their component parent when no direct ownership column is stored. |  |
| Verification can legitimately result in a no-op when the live schema already satisfies the requirement. |  |
| Phase completion requires executed evidence, not inspection alone. |  |
| Payroll Component Foundation must preserve history and reject orphan or cross-company records. |  |
| Sensitive employee-data routes must not be public in normal runtime configuration. | Treating development mode as permission to expose employee or salary data without authentication. |

Why:
The live schema already contained the payroll component foundation tables, and the corrected 6A-3 audit proved they were safe without a migration.

Source or evidence:
- [docs/payroll/phase-6a-master-roadmap.md](phase-6a-master-roadmap.md)
- [docs/payroll/phase-6a-3-payroll-component-foundation-report.md](phase-6a-3-payroll-component-foundation-report.md)
- [backend/scripts/phase-6a-3-audit.js](../../backend/scripts/phase-6a-3-audit.js)
- [backend/migrations/20260726_phase6a_m1_payroll_foundation.sql](../../backend/migrations/20260726_phase6a_m1_payroll_foundation.sql)
- [backend/migrations/20260726_phase6a_m2c2a_company_payroll_bootstrap.sql](../../backend/migrations/20260726_phase6a_m2c2a_company_payroll_bootstrap.sql)

Future AI instruction:
Use live PostgreSQL catalogue evidence and repeatable rollback audits before proposing any payroll-component ownership rewrite.

### 6A-3A through 6A-3G - Formal mapping

Question:
How should the formal 6A-3 roadmap items be interpreted?

| Correct | Incorrect |
|---|---|
| `6A-3A` = Payroll Component Master | Using the compressed `6A-3A → 6A-3E` recovery labels as formal roadmap IDs |
| `6A-3B` = Payroll Component Rule Versioning | Treating `M1`, `M2`, or `M2C` as roadmap sections |
| `6A-3C` = Payroll Component Tax/Statutory Flags Versioning | Reopening Salary Draft Cancel in this batch |
| `6A-3D` = Effective-Date Overlap Protection | Adding unneeded seed data or UI just to show activity |
| `6A-3E` = Calculation-Method Integrity | Claiming the audit passed without running it |
| `6A-3F` = Component Lifecycle | Starting 6A-4 work |
| `6A-3G` = Foundation QA |  |

Why:
The owner-restored roadmap is the formal numbering source, and the corrected report maps the executed evidence to these seven sub-items.

Source or evidence:
- [docs/payroll/phase-6a-master-roadmap.md](phase-6a-master-roadmap.md)
- [docs/payroll/phase-6a-3-payroll-component-foundation-report.md](phase-6a-3-payroll-component-foundation-report.md)

Future AI instruction:
Always use the formal 6A-3A through 6A-3G numbering when summarizing Payroll Component Foundation.

## Accepted Temporary Risks - Not Current Blockers

Accepted temporary risk does not mean already fixed.

1. Salary History audit timestamps use timestamp without time zone; the database does not independently guarantee UTC storage semantics.
2. Client concurrency tokens require UTC Z formatting, but immutable database-level UTC normalization is not currently enforced.
3. Salary History hard-deletion prevention currently depends on application/API convention rather than immutable database retention control.
4. Privileged database users are not technically blocked from deleting Salary History rows directly.
5. updated_by_user_id is not yet implemented for Salary Draft edits and remains deferred to a separately approved Batch 2B.

Source or evidence:
- [docs/payroll/phase-6a-architecture-approval-freeze.md](phase-6a-architecture-approval-freeze.md)
- [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql)
- [backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql](../../backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql)

## Verification lesson

- Existing code is not the same as executed test evidence.
- A route, migration, UI component, design report, or A-Z test plan does not prove automated tests were executed.
- Current Salary workflow implementation is present based on static inspection.
- Executed automated integration-test evidence is still missing.
- Salary workflow automated integration tests must be completed and accepted before starting Batch 2B.

Status:
PHASE 6A-1 ARCHITECTURE FROZEN - IMPLEMENTATION PRESENT - EXECUTED TEST EVIDENCE MISSING

## Instructions for Future AI Assistants

- Read the frozen Phase 6A-1 documents before proposing Payroll architecture changes.
- Do not reinterpret frozen rules from assumptions or old reports.
- Do not mark a feature verified without executed test evidence.
- Do not declare the full Phase 6A complete before 6A-1 through 6A-9H are completed and accepted.
- Do not start Batch 2B until Salary workflow automated integration tests are completed and accepted.
- Ask for Owner approval before changing frozen architecture or implementing a separately controlled Batch.
- Documentation clarification that does not change the frozen architecture may be maintained without a new architecture approval.

## Sources used for this FAQ update

- [docs/payroll/phase-6a-architecture.md](phase-6a-architecture.md)
- [docs/payroll/phase-6a-security-audit-conventions.md](phase-6a-security-audit-conventions.md)
- [docs/payroll/phase-6a-architecture-approval-freeze.md](phase-6a-architecture-approval-freeze.md)
- [backend/migrations/20260726_phase6a_m1_payroll_foundation.sql](../../backend/migrations/20260726_phase6a_m1_payroll_foundation.sql)
- [backend/migrations/20260726_phase6a_m2b_employee_payroll_profile.sql](../../backend/migrations/20260726_phase6a_m2b_employee_payroll_profile.sql)
- [backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql](../../backend/migrations/20260726_phase6a_m2c1_employee_salary_history.sql)
- [backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql](../../backend/migrations/20260726_phase6a_m2c3d2b_salary_workflow_hardening.sql)
- [backend/server.js](../../backend/server.js)
- [frontend/src/pages/EmployeeProfile.jsx](../../frontend/src/pages/EmployeeProfile.jsx)
- [frontend/src/components/SalaryManagementSection.jsx](../../frontend/src/components/SalaryManagementSection.jsx)
- [frontend/src/components/SalaryDraftModal.jsx](../../frontend/src/components/SalaryDraftModal.jsx)
- Implementation baseline commit: 1a23503bc43e4778e82cee6e79769630672cf001
- Freeze commit: 372bbd46e3b6a30315b701bd062076da082ddfc5
