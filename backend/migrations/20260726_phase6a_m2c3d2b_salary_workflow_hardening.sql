-- Phase 6A-M2C-3D-2B: Salary Workflow Schema Hardening
-- Scope: schema hardening only.
-- Do not modify salary data, payroll flags, or legacy compatibility values.

BEGIN;

ALTER TABLE public.employee_salary_history
    ADD COLUMN created_by_user_id integer,
    ADD COLUMN cancelled_by_user_id integer,
    ADD COLUMN cancelled_at timestamp without time zone;

ALTER TABLE public.employee_salary_history
    ADD CONSTRAINT employee_salary_history_created_by_user_id_fkey
        FOREIGN KEY (created_by_user_id)
        REFERENCES public.users(id)
        ON DELETE RESTRICT,
    ADD CONSTRAINT employee_salary_history_cancelled_by_user_id_fkey
        FOREIGN KEY (cancelled_by_user_id)
        REFERENCES public.users(id)
        ON DELETE RESTRICT;

ALTER TABLE public.employee_salary_history
    DROP CONSTRAINT IF EXISTS employee_salary_history_record_status_check,
    DROP CONSTRAINT IF EXISTS employee_salary_history_published_retires_complete_check;

ALTER TABLE public.employee_salary_history
    ADD CONSTRAINT employee_salary_history_record_status_check
        CHECK (record_status IN ('DRAFT', 'CANCELLED', 'PUBLISHED', 'RETIRED')),
    ADD CONSTRAINT employee_salary_history_manual_creator_check
        CHECK (
            source_type IS DISTINCT FROM 'MANUAL'
            OR created_by_user_id IS NOT NULL
        ),
    ADD CONSTRAINT employee_salary_history_lifecycle_check
        CHECK (
            (
                record_status = 'DRAFT'
                AND approved_by_user_id IS NULL
                AND approved_at IS NULL
                AND cancelled_by_user_id IS NULL
                AND cancelled_at IS NULL
                AND effective_to IS NULL
            )
            OR
            (
                record_status = 'CANCELLED'
                AND salary_amount IS NOT NULL
                AND salary_amount >= 0
                AND salary_basis IS NOT NULL
                AND currency_code IS NOT NULL
                AND effective_from IS NOT NULL
                AND effective_to IS NULL
                AND source_type IS NOT NULL
                AND reason IS NOT NULL
                AND approved_by_user_id IS NULL
                AND approved_at IS NULL
                AND cancelled_by_user_id IS NOT NULL
                AND cancelled_at IS NOT NULL
            )
            OR
            (
                record_status = 'PUBLISHED'
                AND salary_amount IS NOT NULL
                AND salary_amount >= 0
                AND salary_basis IS NOT NULL
                AND currency_code IS NOT NULL
                AND effective_from IS NOT NULL
                AND source_type IS NOT NULL
                AND cancelled_by_user_id IS NULL
                AND cancelled_at IS NULL
                AND (
                    source_type = 'LEGACY_MIGRATION'
                    OR (
                        approved_by_user_id IS NOT NULL
                        AND approved_at IS NOT NULL
                    )
                )
            )
            OR
            (
                record_status = 'RETIRED'
                AND salary_amount IS NOT NULL
                AND salary_amount >= 0
                AND salary_basis IS NOT NULL
                AND currency_code IS NOT NULL
                AND effective_from IS NOT NULL
                AND source_type IS NOT NULL
                AND cancelled_by_user_id IS NULL
                AND cancelled_at IS NULL
                AND (
                    source_type = 'LEGACY_MIGRATION'
                    OR (
                        approved_by_user_id IS NOT NULL
                        AND approved_at IS NOT NULL
                    )
                )
            )
        );

CREATE UNIQUE INDEX uq_employee_salary_history_one_active_draft_per_employee
    ON public.employee_salary_history(employee_id)
    WHERE record_status = 'DRAFT';

COMMIT;

-- -----------------------------------------------------------------------------
-- APPROVED ROLLBACK SQL (DOCUMENTATION ONLY - DO NOT AUTO-EXECUTE IN THIS PHASE)
-- -----------------------------------------------------------------------------
-- BEGIN;
--
-- DO $$
-- DECLARE
--   cancelled_count integer;
--   created_by_count integer;
--   cancelled_by_count integer;
--   cancelled_at_count integer;
-- BEGIN
--   SELECT count(*) INTO cancelled_count
--   FROM public.employee_salary_history
--   WHERE record_status = 'CANCELLED';
--
--   IF cancelled_count > 0 THEN
--     RAISE EXCEPTION
--       'Rollback blocked: % CANCELLED salary rows exist. Clean or migrate those rows first.',
--       cancelled_count;
--   END IF;
--
--   SELECT count(*) INTO created_by_count
--   FROM public.employee_salary_history
--   WHERE created_by_user_id IS NOT NULL;
--
--   IF created_by_count > 0 THEN
--     RAISE EXCEPTION
--       'Rollback blocked: created_by_user_id is populated in % rows.',
--       created_by_count;
--   END IF;
--
--   SELECT count(*) INTO cancelled_by_count
--   FROM public.employee_salary_history
--   WHERE cancelled_by_user_id IS NOT NULL;
--
--   IF cancelled_by_count > 0 THEN
--     RAISE EXCEPTION
--       'Rollback blocked: cancelled_by_user_id is populated in % rows.',
--       cancelled_by_count;
--   END IF;
--
--   SELECT count(*) INTO cancelled_at_count
--   FROM public.employee_salary_history
--   WHERE cancelled_at IS NOT NULL;
--
--   IF cancelled_at_count > 0 THEN
--     RAISE EXCEPTION
--       'Rollback blocked: cancelled_at is populated in % rows.',
--       cancelled_at_count;
--   END IF;
-- END $$;
--
-- DROP INDEX IF EXISTS public.uq_employee_salary_history_one_active_draft_per_employee;
--
-- ALTER TABLE public.employee_salary_history
--   DROP CONSTRAINT IF EXISTS employee_salary_history_lifecycle_check,
--   DROP CONSTRAINT IF EXISTS employee_salary_history_manual_creator_check,
--   DROP CONSTRAINT IF EXISTS employee_salary_history_record_status_check,
--   DROP CONSTRAINT IF EXISTS employee_salary_history_created_by_user_id_fkey,
--   DROP CONSTRAINT IF EXISTS employee_salary_history_cancelled_by_user_id_fkey;
--
-- ALTER TABLE public.employee_salary_history
--   DROP COLUMN IF EXISTS created_by_user_id,
--   DROP COLUMN IF EXISTS cancelled_by_user_id,
--   DROP COLUMN IF EXISTS cancelled_at;
--
-- ALTER TABLE public.employee_salary_history
--   ADD CONSTRAINT employee_salary_history_record_status_check
--     CHECK (record_status IN ('DRAFT', 'PUBLISHED', 'RETIRED')),
--   ADD CONSTRAINT employee_salary_history_published_retires_complete_check
--     CHECK (
--       record_status = 'DRAFT'
--       OR (
--         record_status IN ('PUBLISHED', 'RETIRED')
--         AND salary_amount IS NOT NULL
--         AND salary_amount >= 0
--         AND salary_basis IS NOT NULL
--         AND currency_code IS NOT NULL
--         AND effective_from IS NOT NULL
--         AND source_type IS NOT NULL
--         AND (
--           source_type = 'LEGACY_MIGRATION'
--           OR (
--             approved_by_user_id IS NOT NULL
--             AND approved_at IS NOT NULL
--           )
--         )
--       )
--     );
--
-- COMMIT;
