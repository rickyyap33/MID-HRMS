-- Phase 6A-M2C-2A: Company Payroll Bootstrap
-- Scope: insert the first payroll-owned company identity only.
-- No employee payroll onboarding, no salary backfill, no payroll settings.

BEGIN;

DO $$
DECLARE
    existing_count integer;
    conflict_count integer;
BEGIN
    SELECT count(*) INTO existing_count
    FROM public.company_payroll_profile;

    SELECT count(*) INTO conflict_count
    FROM public.company_payroll_profile
    WHERE company_code = 'MIDSTUDIO'
       OR registration_no = '202403181878(003622732-K)';

    IF existing_count > 0 AND conflict_count = 0 THEN
        RAISE EXCEPTION
            'company_payroll_profile already contains unexpected rows; manual review required';
    END IF;

    IF conflict_count > 0 THEN
        RAISE EXCEPTION
            'bootstrap identity already exists for company_code MIDSTUDIO or registration_no 202403181878(003622732-K)';
    END IF;
END $$;

INSERT INTO public.company_payroll_profile (
    company_code,
    legal_name,
    payroll_display_name,
    registration_no,
    default_currency,
    country_code,
    timezone,
    payroll_enabled
) VALUES (
    'MIDSTUDIO',
    'Meta In Design',
    'MID Studio',
    '202403181878(003622732-K)',
    'MYR',
    'MY',
    'Asia/Kuala_Lumpur',
    false
);

COMMIT;
