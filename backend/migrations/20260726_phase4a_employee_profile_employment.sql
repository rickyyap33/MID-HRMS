-- Phase 4A: Employee profile and employment detail tables
-- Note: This migration does not modify the existing employees table.

BEGIN;

CREATE TABLE public.employee_profiles (
    employee_id integer NOT NULL,
    phone character varying(30),
    address text,
    date_of_birth date,
    emergency_contact_name character varying(120),
    emergency_contact_phone character varying(30),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT employee_profiles_pkey PRIMARY KEY (employee_id),
    CONSTRAINT employee_profiles_employee_id_fkey
        FOREIGN KEY (employee_id)
        REFERENCES public.employees(id)
        ON DELETE CASCADE
);

CREATE TABLE public.employment_details (
    employee_id integer NOT NULL,
    join_date date,
    employment_type character varying(50),
    manager_id integer,
    salary_amount numeric(12,2),
    employment_status character varying(50),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT employment_details_pkey PRIMARY KEY (employee_id),
    CONSTRAINT employment_details_employee_id_fkey
        FOREIGN KEY (employee_id)
        REFERENCES public.employees(id)
        ON DELETE CASCADE,
    CONSTRAINT employment_details_manager_id_fkey
        FOREIGN KEY (manager_id)
        REFERENCES public.employees(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_employee_profiles_phone
    ON public.employee_profiles(phone);

CREATE INDEX idx_employee_profiles_emergency_contact_phone
    ON public.employee_profiles(emergency_contact_phone);

CREATE INDEX idx_employment_details_manager_id
    ON public.employment_details(manager_id);

CREATE INDEX idx_employment_details_employment_type
    ON public.employment_details(employment_type);

CREATE INDEX idx_employment_details_employment_status
    ON public.employment_details(employment_status);

CREATE INDEX idx_employment_details_join_date
    ON public.employment_details(join_date);

COMMIT;
