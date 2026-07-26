-- Phase 6A-M2B: Employee Payroll Profile
-- Scope: employee-level payroll ownership/config only.
-- No salary history, payment accounts, or statutory profile tables yet.

BEGIN;

CREATE TABLE public.employee_payroll_profile (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    company_payroll_profile_id integer NOT NULL,
    profile_status character varying(20) NOT NULL DEFAULT 'DRAFT',
    payroll_frequency_override character varying(20),
    currency_code_override character varying(3),
    effective_from date NOT NULL,
    effective_to date,
    reason text,
    approved_by_user_id integer,
    approved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT employee_payroll_profile_pkey PRIMARY KEY (id),
    CONSTRAINT employee_payroll_profile_employee_id_fkey
        FOREIGN KEY (employee_id)
        REFERENCES public.employees(id)
        ON DELETE RESTRICT,
    CONSTRAINT employee_payroll_profile_company_payroll_profile_id_fkey
        FOREIGN KEY (company_payroll_profile_id)
        REFERENCES public.company_payroll_profile(id)
        ON DELETE RESTRICT,
    CONSTRAINT employee_payroll_profile_approved_by_user_id_fkey
        FOREIGN KEY (approved_by_user_id)
        REFERENCES public.users(id)
        ON DELETE RESTRICT,
    CONSTRAINT employee_payroll_profile_status_check
        CHECK (profile_status IN ('DRAFT', 'ACTIVE', 'RETIRED')),
    CONSTRAINT employee_payroll_profile_frequency_override_check
        CHECK (
            payroll_frequency_override IS NULL
            OR payroll_frequency_override IN ('MONTHLY', 'WEEKLY', 'BIWEEKLY', 'SEMI_MONTHLY')
        ),
    CONSTRAINT employee_payroll_profile_currency_code_override_check
        CHECK (
            currency_code_override IS NULL
            OR currency_code_override ~ '^[A-Z]{3}$'
        ),
    CONSTRAINT employee_payroll_profile_effective_range_check
        CHECK (effective_to IS NULL OR effective_to >= effective_from),
    CONSTRAINT employee_payroll_profile_active_approval_check
        CHECK (
            profile_status <> 'ACTIVE'
            OR (
                approved_by_user_id IS NOT NULL
                AND approved_at IS NOT NULL
            )
        )
);

CREATE SEQUENCE public.employee_payroll_profile_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.employee_payroll_profile_id_seq OWNER TO midadmin;

ALTER SEQUENCE public.employee_payroll_profile_id_seq
    OWNED BY public.employee_payroll_profile.id;

ALTER TABLE ONLY public.employee_payroll_profile
    ALTER COLUMN id SET DEFAULT nextval('public.employee_payroll_profile_id_seq'::regclass);

CREATE INDEX idx_employee_payroll_profile_employee_id
    ON public.employee_payroll_profile(employee_id);

CREATE INDEX idx_employee_payroll_profile_company_payroll_profile_id
    ON public.employee_payroll_profile(company_payroll_profile_id);

CREATE INDEX idx_employee_payroll_profile_status
    ON public.employee_payroll_profile(profile_status);

CREATE INDEX idx_employee_payroll_profile_effective
    ON public.employee_payroll_profile(employee_id, company_payroll_profile_id, effective_from, effective_to);

CREATE INDEX idx_employee_payroll_profile_active_lookup
    ON public.employee_payroll_profile(employee_id, company_payroll_profile_id, effective_from, effective_to)
    WHERE profile_status = 'ACTIVE';

ALTER TABLE public.employee_payroll_profile
    ADD CONSTRAINT employee_payroll_profile_no_active_overlap
    EXCLUDE USING gist (
        employee_id WITH =,
        company_payroll_profile_id WITH =,
        daterange(
            effective_from,
            COALESCE(effective_to, 'infinity'::date),
            '[]'
        ) WITH &&
    )
    WHERE (profile_status = 'ACTIVE');

COMMIT;
