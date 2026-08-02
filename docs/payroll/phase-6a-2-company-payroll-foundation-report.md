# Payroll Phase 6A-2 Company Payroll Foundation Report

## 1. Document Control

- Document title: Payroll Phase 6A-2 Company Payroll Foundation Report
- Phase: 6A-2C and 6A-2E
- Status: Complete for current approved scope
- Purpose: Record the live ownership assessment, database/backfill decision, repeatable audit results, and regression validation for Company Payroll Foundation.
- Owner: Ricky Yap
- Report date: 2026-08-02
- Backend startup evidence: Port 5001 healthy during validation session

## 2. Scope Covered

This report covers the approved 6A-2 batch items that were available in the current workspace:
- Determine whether any company-ownership implementation was actually required.
- Run a safe database migration/backfill only if the live schema demanded it.
- Execute the repeatable 6A-2E audit twice.
- Run relevant regression checks and record the results.
- Update Payroll documentation and the FAQ/training record.

Out of scope for this report:
- Phase 6A-1 frozen architecture changes.
- Phase 6A-3 work.
- Any unapproved schema redesign beyond the ownership assessment performed here.

## 3. Ownership Decision

The live database did not show any company-scoped component migration requirement.

Observed live state:
- `company_payroll_profile` contains the approved MIDSTUDIO bootstrap row.
- `employee_payroll_profile` contains no rows yet.
- `payroll_component_type` contains the 3 expected component types.
- `payroll_component` contains no rows yet.
- `payroll_component_rule_version` contains no rows yet.
- `payroll_component_tax_flags_version` contains no rows yet.
- No `company_*` ownership columns exist on the payroll component tables.

Conclusion:
- No ownership migration or backfill was required for the current live state.
- The approved 6A-2C work therefore resolved as a verified no-op rather than a schema change.

## 4. Database Verification

The live database was queried directly after starting the local database container.

Results:
- `company_payroll_profile`: 1 row
- `employee_payroll_profile`: 0 rows
- `payroll_component_type`: 3 rows
- `payroll_component`: 0 rows
- `payroll_component_rule_version`: 0 rows
- `payroll_component_tax_flags_version`: 0 rows
- `employee_salary_history`: 1 row

The single salary-history row remains the approved John Updated legacy migration row, and no new payroll component data was introduced during this batch.

## 5. Repeatable 6A-2E Audit

The 6A-2E audit was run twice against the live backend and database.

Audit result summary for both passes:
- Company payroll profile matched the expected MIDSTUDIO bootstrap data.
- No employee payroll profile rows were present.
- No payroll component rows were present.
- No payroll component rule-version rows were present.
- No payroll component tax-flag-version rows were present.
- No company-scoped component columns were found.
- `GET /employees/3/employment` returned `200` with the expected current salary snapshot.
- `GET /employees/3/salary-history` returned `200` with 1 history row.

Current salary snapshot observed in both passes:
- `salary_amount`: `6000.00`
- `salary_basis`: `MONTHLY`
- `salary_currency_code`: `MYR`
- `salary_effective_from`: `2026-07-26`
- `salary_configured`: `true`

## 6. Regression Validation

Validation commands executed:
- `node --check server.js`
- `npm run build` in `frontend/`
- `npm run lint` in `frontend/`

Results:
- Backend syntax check passed.
- Frontend production build passed.
- Frontend lint failed with pre-existing issues in unrelated frontend files.

Lint failure summary:
- `frontend/src/App.jsx`: `react-hooks/set-state-in-effect`
- `frontend/src/components/SalaryDraftModal.jsx`: `react-hooks/set-state-in-effect`
- `frontend/src/components/SalaryManagementSection.jsx`: `no-unused-vars` and `react-hooks/preserve-manual-memoization`
- `frontend/src/pages/Attendance.jsx`: `react-hooks/set-state-in-effect`
- `frontend/src/pages/EmployeeProfile.jsx`: `react-hooks/set-state-in-effect`
- `frontend/src/pages/Employees.jsx`: `react-hooks/set-state-in-effect`
- `frontend/src/pages/Leave.jsx`: `react-hooks/immutability`, `react-hooks/set-state-in-effect`, `react-hooks/exhaustive-deps`
- `frontend/src/services/api.js`: `no-unused-vars`

Interpretation:
- The lint failure is not caused by the 6A-2 company payroll foundation work in this batch.
- It remains an unrelated frontend cleanup item outside the approved ownership change scope.

## 7. Command Log

Exact commands run during this batch:

1. `Get-NetTCPConnection -LocalPort 5001 -State Listen`
2. `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5001/`
3. `docker compose up -d database`
4. `node --check server.js`
5. `npm run build`
6. `npm run lint`
7. Authenticated live audit against `/employees/3/employment` and `/employees/3/salary-history` using a locally signed Admin JWT.

Key command outcomes:
- Port 5001 was initially not listening.
- Backend was started in a persistent terminal and became healthy.
- Database container started successfully.
- Live authenticated database audit passed twice.
- Regression build and backend syntax validation passed.
- Frontend lint remained red because of pre-existing unrelated errors.

## 8. Final Conclusion

The approved 6A-2 company payroll foundation work did not require a schema migration/backfill in the live workspace.

The repeatable audit confirms the payroll foundation is present and stable, the live backend returns the expected current salary snapshot, and the batch can be considered complete for the approved 6A-2C and 6A-2E scope with the lint backlog documented as an unrelated follow-up item.