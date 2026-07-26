-- Phase 6A-M2C-1: Employee Salary History
-- Scope: salary timeline schema only.
-- No backfill, no cutover, no payroll calculation, no company payroll profile data.

CREATE EXTENSION IF NOT EXISTS btree_gist;

BEGIN;

CREATE TABLE public.employee_salary_history (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    salary_amount numeric(14,2),
    salary_basis character varying(20),
    currency_code character varying(3),
    effective_from date,
    effective_to date,
    record_status character varying(20) NOT NULL DEFAULT 'DRAFT',
    reason text,
    approved_by_user_id integer,
    approved_at timestamp without time zone,
    source_type character varying(30),
    source_reference text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT employee_salary_history_pkey PRIMARY KEY (id),
    CONSTRAINT employee_salary_history_employee_id_fkey
        FOREIGN KEY (employee_id)
        REFERENCES public.employees(id)
        ON DELETE RESTRICT,
    CONSTRAINT employee_salary_history_approved_by_user_id_fkey
        FOREIGN KEY (approved_by_user_id)
        REFERENCES public.users(id)
        ON DELETE RESTRICT,
    CONSTRAINT employee_salary_history_record_status_check
        CHECK (record_status IN ('DRAFT', 'PUBLISHED', 'RETIRED')),
    CONSTRAINT employee_salary_history_salary_amount_check
        CHECK (salary_amount IS NULL OR salary_amount >= 0),
    CONSTRAINT employee_salary_history_salary_basis_check
        CHECK (
            salary_basis IS NULL
            OR salary_basis IN ('MONTHLY', 'WEEKLY', 'DAILY', 'HOURLY')
        ),
    CONSTRAINT employee_salary_history_currency_code_check
        CHECK (
            currency_code IS NULL
            OR currency_code ~ '^[A-Z]{3}$'
        ),
    CONSTRAINT employee_salary_history_effective_range_check
        CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from),
    CONSTRAINT employee_salary_history_source_type_check
        CHECK (
            source_type IS NULL
            OR source_type IN ('LEGACY_MIGRATION', 'MANUAL', 'IMPORT', 'SYSTEM_ADJUSTMENT')
        ),
    CONSTRAINT employee_salary_history_published_retires_complete_check
        CHECK (
            record_status = 'DRAFT'
            OR (
                record_status IN ('PUBLISHED', 'RETIRED')
                AND salary_amount IS NOT NULL
                AND salary_amount >= 0
                AND salary_basis IS NOT NULL
                AND currency_code IS NOT NULL
                AND effective_from IS NOT NULL
                AND source_type IS NOT NULL
                AND (
                    source_type = 'LEGACY_MIGRATION'
                    OR (
                        approved_by_user_id IS NOT NULL
                        AND approved_at IS NOT NULL
                    )
                )
            )
        )
);

CREATE SEQUENCE public.employee_salary_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.employee_salary_history_id_seq OWNER TO midadmin;

ALTER SEQUENCE public.employee_salary_history_id_seq
    OWNED BY public.employee_salary_history.id;

ALTER TABLE ONLY public.employee_salary_history
    ALTER COLUMN id SET DEFAULT nextval('public.employee_salary_history_id_seq'::regclass);

CREATE INDEX idx_employee_salary_history_employee_id
    ON public.employee_salary_history(employee_id);

CREATE INDEX idx_employee_salary_history_status
    ON public.employee_salary_history(record_status);

CREATE INDEX idx_employee_salary_history_effective
    ON public.employee_salary_history(employee_id, effective_from, effective_to);

CREATE INDEX idx_employee_salary_history_published_lookup
    ON public.employee_salary_history(employee_id, effective_from, effective_to)
    WHERE record_status = 'PUBLISHED';

ALTER TABLE public.employee_salary_history
    ADD CONSTRAINT employee_salary_history_no_published_overlap
    EXCLUDE USING gist (
        employee_id WITH =,
        daterange(
            effective_from,
            COALESCE(effective_to, 'infinity'::date),
            '[]'
        ) WITH &&
    )
    WHERE (record_status = 'PUBLISHED');

COMMIT;
