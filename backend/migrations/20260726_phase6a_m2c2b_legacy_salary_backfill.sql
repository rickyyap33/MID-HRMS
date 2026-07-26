-- Phase 6A-M2C-2B: Legacy Salary Backfill
-- Scope: one-time backfill of the single legacy salary row only.
-- No payroll cutover, no backend/UI changes, no employee payroll profiles.

BEGIN;

DO $$
DECLARE
    target_employee_id integer := 3;
    target_salary numeric(14,2) := 6000.00;
    target_effective_from date := '2026-07-26';
    legacy_salary numeric(14,2);
    company_ok integer;
    john_salary_count integer;
    existing_published_count integer;
    existing_legacy_count integer;
BEGIN
    SELECT count(*) INTO company_ok
    FROM public.company_payroll_profile
    WHERE company_code = 'MIDSTUDIO'
      AND default_currency = 'MYR'
      AND payroll_enabled = false;

    IF company_ok <> 1 THEN
        RAISE EXCEPTION
            'MIDSTUDIO payroll company context is missing, changed, or ambiguous';
    END IF;

    SELECT count(*) INTO john_salary_count
    FROM public.employee_salary_history
    WHERE employee_id = target_employee_id;

    IF john_salary_count <> 0 THEN
        RAISE EXCEPTION
            'John Updated already has salary history rows; manual review required';
    END IF;

    SELECT ed.salary_amount
      INTO legacy_salary
    FROM public.employees e
    JOIN public.employment_details ed
      ON ed.employee_id = e.id
    WHERE e.id = target_employee_id
      AND e.name = 'John Updated';

    IF legacy_salary IS NULL THEN
        RAISE EXCEPTION
            'John Updated employment_details row missing or salary_amount is NULL';
    END IF;

    IF legacy_salary <> target_salary THEN
        RAISE EXCEPTION
            'Legacy salary changed from approved value; expected 6000.00, found %',
            legacy_salary;
    END IF;

    SELECT count(*) INTO existing_published_count
    FROM public.employee_salary_history h
    WHERE h.employee_id = target_employee_id
      AND h.record_status = 'PUBLISHED'
      AND daterange(
            h.effective_from,
            COALESCE(h.effective_to, 'infinity'::date),
            '[]'
          ) && daterange(target_effective_from, target_effective_from, '[]');

    IF existing_published_count > 0 THEN
        RAISE EXCEPTION
            'Published salary history already overlaps approved cutover date for John Updated';
    END IF;

    SELECT count(*) INTO existing_legacy_count
    FROM public.employee_salary_history h
    WHERE h.employee_id = target_employee_id
      AND h.source_type = 'LEGACY_MIGRATION'
      AND h.source_reference = 'employment_details.salary_amount';

    IF existing_legacy_count > 0 THEN
        RAISE EXCEPTION
            'Legacy migration salary row already exists for John Updated';
    END IF;
END $$;

INSERT INTO public.employee_salary_history (
    employee_id,
    salary_amount,
    salary_basis,
    currency_code,
    effective_from,
    effective_to,
    record_status,
    reason,
    approved_by_user_id,
    approved_at,
    source_type,
    source_reference
) VALUES (
    3,
    6000.00,
    'MONTHLY',
    'MYR',
    '2026-07-26',
    NULL,
    'PUBLISHED',
    'Initial payroll legacy salary migration cutover record for John Updated.',
    NULL,
    NULL,
    'LEGACY_MIGRATION',
    'employment_details.salary_amount'
);

COMMIT;
