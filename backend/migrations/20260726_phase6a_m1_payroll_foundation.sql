-- Phase 6A-M1: Payroll Foundation
-- Scope: payroll-owned company profile + payroll component masters + versioned component behavior
-- Existing HR tables remain untouched.
-- Note: btree_gist is required for overlap exclusion constraints and is intentionally not dropped in normal rollback.

CREATE EXTENSION IF NOT EXISTS btree_gist;

BEGIN;

CREATE TABLE public.company_payroll_profile (
    id integer NOT NULL,
    company_code character varying(50) NOT NULL,
    legal_name character varying(255) NOT NULL,
    payroll_display_name character varying(255) NOT NULL,
    registration_no character varying(100) NOT NULL,
    default_currency character varying(3) NOT NULL,
    country_code character varying(2) NOT NULL DEFAULT 'MY',
    timezone character varying(100) NOT NULL,
    payroll_enabled boolean NOT NULL DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT company_payroll_profile_pkey PRIMARY KEY (id),
    CONSTRAINT company_payroll_profile_company_code_key UNIQUE (company_code),
    CONSTRAINT company_payroll_profile_registration_no_key UNIQUE (registration_no),
    CONSTRAINT company_payroll_profile_default_currency_check
        CHECK (default_currency ~ '^[A-Z]{3}$'),
    CONSTRAINT company_payroll_profile_country_code_check
        CHECK (country_code ~ '^[A-Z]{2}$')
);

CREATE SEQUENCE public.company_payroll_profile_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.company_payroll_profile_id_seq OWNER TO midadmin;

ALTER SEQUENCE public.company_payroll_profile_id_seq
    OWNED BY public.company_payroll_profile.id;

ALTER TABLE ONLY public.company_payroll_profile
    ALTER COLUMN id SET DEFAULT nextval('public.company_payroll_profile_id_seq'::regclass);

CREATE INDEX idx_company_payroll_profile_payroll_enabled
    ON public.company_payroll_profile(payroll_enabled);

CREATE INDEX idx_company_payroll_profile_country_code
    ON public.company_payroll_profile(country_code);


CREATE TABLE public.payroll_component_type (
    id integer NOT NULL,
    type_code character varying(30) NOT NULL,
    type_name character varying(100) NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT payroll_component_type_pkey PRIMARY KEY (id),
    CONSTRAINT payroll_component_type_type_code_key UNIQUE (type_code),
    CONSTRAINT payroll_component_type_type_name_key UNIQUE (type_name)
);

CREATE SEQUENCE public.payroll_component_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.payroll_component_type_id_seq OWNER TO midadmin;

ALTER SEQUENCE public.payroll_component_type_id_seq
    OWNED BY public.payroll_component_type.id;

ALTER TABLE ONLY public.payroll_component_type
    ALTER COLUMN id SET DEFAULT nextval('public.payroll_component_type_id_seq'::regclass);

CREATE INDEX idx_payroll_component_type_is_active
    ON public.payroll_component_type(is_active);


CREATE TABLE public.payroll_component (
    id integer NOT NULL,
    component_code character varying(60) NOT NULL,
    component_name character varying(150) NOT NULL,
    component_type_id integer NOT NULL,
    description text,
    display_order integer,
    system_defined boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT payroll_component_pkey PRIMARY KEY (id),
    CONSTRAINT payroll_component_component_code_key UNIQUE (component_code),
    CONSTRAINT payroll_component_component_type_id_fkey
        FOREIGN KEY (component_type_id)
        REFERENCES public.payroll_component_type(id)
        ON DELETE RESTRICT
);

CREATE SEQUENCE public.payroll_component_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.payroll_component_id_seq OWNER TO midadmin;

ALTER SEQUENCE public.payroll_component_id_seq
    OWNED BY public.payroll_component.id;

ALTER TABLE ONLY public.payroll_component
    ALTER COLUMN id SET DEFAULT nextval('public.payroll_component_id_seq'::regclass);

CREATE INDEX idx_payroll_component_component_type_id
    ON public.payroll_component(component_type_id);

CREATE INDEX idx_payroll_component_is_active
    ON public.payroll_component(is_active);

CREATE INDEX idx_payroll_component_display_order
    ON public.payroll_component(display_order);


CREATE TABLE public.payroll_component_rule_version (
    id integer NOT NULL,
    payroll_component_id integer NOT NULL,
    version_no integer NOT NULL,
    effective_from date NOT NULL,
    effective_to date,
    calculation_method character varying(30) NOT NULL,
    fixed_amount numeric(14,2),
    rate_value numeric(12,8),
    calculation_config jsonb NOT NULL DEFAULT '{}'::jsonb,
    minimum_amount numeric(14,2),
    maximum_amount numeric(14,2),
    rounding_method character varying(20),
    rounding_scale smallint,
    status character varying(20) NOT NULL DEFAULT 'DRAFT',
    published_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT payroll_component_rule_version_pkey PRIMARY KEY (id),
    CONSTRAINT payroll_component_rule_version_component_version_key
        UNIQUE (payroll_component_id, version_no),
    CONSTRAINT payroll_component_rule_version_payroll_component_id_fkey
        FOREIGN KEY (payroll_component_id)
        REFERENCES public.payroll_component(id)
        ON DELETE RESTRICT,
    CONSTRAINT payroll_component_rule_version_calculation_method_check
        CHECK (calculation_method IN ('FIXED', 'PERCENTAGE', 'PER_UNIT', 'FORMULA', 'EXTERNAL_INPUT')),
    CONSTRAINT payroll_component_rule_version_status_check
        CHECK (status IN ('DRAFT', 'PUBLISHED', 'RETIRED')),
    CONSTRAINT payroll_component_rule_version_effective_range_check
        CHECK (effective_to IS NULL OR effective_to >= effective_from),
    CONSTRAINT payroll_component_rule_version_fixed_amount_check
        CHECK (fixed_amount IS NULL OR fixed_amount >= 0),
    CONSTRAINT payroll_component_rule_version_rate_value_check
        CHECK (rate_value IS NULL OR rate_value >= 0),
    CONSTRAINT payroll_component_rule_version_minimum_amount_check
        CHECK (minimum_amount IS NULL OR minimum_amount >= 0),
    CONSTRAINT payroll_component_rule_version_maximum_amount_check
        CHECK (maximum_amount IS NULL OR maximum_amount >= 0),
    CONSTRAINT payroll_component_rule_version_rounding_scale_check
        CHECK (rounding_scale IS NULL OR rounding_scale BETWEEN 0 AND 6),
    CONSTRAINT payroll_component_rule_version_rounding_method_check
        CHECK (
            rounding_method IS NULL
            OR rounding_method IN ('NONE', 'HALF_UP', 'HALF_DOWN', 'UP', 'DOWN', 'BANKERS')
        ),
    CONSTRAINT payroll_component_rule_version_published_at_check
        CHECK (status <> 'PUBLISHED' OR published_at IS NOT NULL),
    CONSTRAINT payroll_component_rule_version_calculation_method_integrity_check
        CHECK (
            status = 'DRAFT'
            OR (
                status IN ('PUBLISHED', 'RETIRED')
                AND (
                    (
                        calculation_method = 'FIXED'
                        AND fixed_amount IS NOT NULL
                        AND fixed_amount >= 0
                    )
                    OR
                    (
                        calculation_method = 'PERCENTAGE'
                        AND rate_value IS NOT NULL
                        AND rate_value >= 0
                    )
                    OR
                    (
                        calculation_method IN ('FORMULA', 'PER_UNIT')
                        AND calculation_config IS NOT NULL
                        AND calculation_config <> '{}'::jsonb
                    )
                    OR
                    (
                        calculation_method = 'EXTERNAL_INPUT'
                    )
                )
            )
        )
);

CREATE SEQUENCE public.payroll_component_rule_version_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.payroll_component_rule_version_id_seq OWNER TO midadmin;

ALTER SEQUENCE public.payroll_component_rule_version_id_seq
    OWNED BY public.payroll_component_rule_version.id;

ALTER TABLE ONLY public.payroll_component_rule_version
    ALTER COLUMN id SET DEFAULT nextval('public.payroll_component_rule_version_id_seq'::regclass);

CREATE INDEX idx_payroll_component_rule_version_component_id
    ON public.payroll_component_rule_version(payroll_component_id);

CREATE INDEX idx_payroll_component_rule_version_effective
    ON public.payroll_component_rule_version(payroll_component_id, effective_from, effective_to);

CREATE INDEX idx_payroll_component_rule_version_status
    ON public.payroll_component_rule_version(status);

CREATE UNIQUE INDEX uq_payroll_component_rule_version_current_published
    ON public.payroll_component_rule_version(payroll_component_id)
    WHERE status = 'PUBLISHED' AND effective_to IS NULL;

ALTER TABLE public.payroll_component_rule_version
    ADD CONSTRAINT payroll_component_rule_version_no_published_overlap
    EXCLUDE USING gist (
        payroll_component_id WITH =,
        daterange(
            effective_from,
            COALESCE(effective_to + 1, 'infinity'::date),
            '[)'
        ) WITH &&
    )
    WHERE (status = 'PUBLISHED');


CREATE TABLE public.payroll_component_tax_flags_version (
    id integer NOT NULL,
    payroll_component_id integer NOT NULL,
    version_no integer NOT NULL,
    effective_from date NOT NULL,
    effective_to date,
    taxable_for_pcb boolean NOT NULL DEFAULT false,
    epf_applicable boolean NOT NULL DEFAULT false,
    socso_applicable boolean NOT NULL DEFAULT false,
    eis_applicable boolean NOT NULL DEFAULT false,
    hrd_levy_applicable boolean NOT NULL DEFAULT false,
    status character varying(20) NOT NULL DEFAULT 'DRAFT',
    published_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT payroll_component_tax_flags_version_pkey PRIMARY KEY (id),
    CONSTRAINT payroll_component_tax_flags_version_component_version_key
        UNIQUE (payroll_component_id, version_no),
    CONSTRAINT payroll_component_tax_flags_version_payroll_component_id_fkey
        FOREIGN KEY (payroll_component_id)
        REFERENCES public.payroll_component(id)
        ON DELETE RESTRICT,
    CONSTRAINT payroll_component_tax_flags_version_status_check
        CHECK (status IN ('DRAFT', 'PUBLISHED', 'RETIRED')),
    CONSTRAINT payroll_component_tax_flags_version_effective_range_check
        CHECK (effective_to IS NULL OR effective_to >= effective_from),
    CONSTRAINT payroll_component_tax_flags_version_published_at_check
        CHECK (status <> 'PUBLISHED' OR published_at IS NOT NULL)
);

CREATE SEQUENCE public.payroll_component_tax_flags_version_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.payroll_component_tax_flags_version_id_seq OWNER TO midadmin;

ALTER SEQUENCE public.payroll_component_tax_flags_version_id_seq
    OWNED BY public.payroll_component_tax_flags_version.id;

ALTER TABLE ONLY public.payroll_component_tax_flags_version
    ALTER COLUMN id SET DEFAULT nextval('public.payroll_component_tax_flags_version_id_seq'::regclass);

CREATE INDEX idx_payroll_component_tax_flags_version_component_id
    ON public.payroll_component_tax_flags_version(payroll_component_id);

CREATE INDEX idx_payroll_component_tax_flags_version_effective
    ON public.payroll_component_tax_flags_version(payroll_component_id, effective_from, effective_to);

CREATE INDEX idx_payroll_component_tax_flags_version_status
    ON public.payroll_component_tax_flags_version(status);

CREATE UNIQUE INDEX uq_payroll_component_tax_flags_version_current_published
    ON public.payroll_component_tax_flags_version(payroll_component_id)
    WHERE status = 'PUBLISHED' AND effective_to IS NULL;

ALTER TABLE public.payroll_component_tax_flags_version
    ADD CONSTRAINT payroll_component_tax_flags_version_no_published_overlap
    EXCLUDE USING gist (
        payroll_component_id WITH =,
        daterange(
            effective_from,
            COALESCE(effective_to + 1, 'infinity'::date),
            '[)'
        ) WITH &&
    )
    WHERE (status = 'PUBLISHED');


    INSERT INTO public.payroll_component_type (type_code, type_name, is_active)
    VALUES
        ('EARNING', 'Earning', true),
        ('DEDUCTION', 'Deduction', true),
        ('REIMBURSEMENT', 'Reimbursement', true);


COMMIT;