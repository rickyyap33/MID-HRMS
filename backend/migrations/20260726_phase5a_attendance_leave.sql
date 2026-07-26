-- Phase 5A: Attendance and Leave Management tables
-- Note: This migration does not modify existing tables.

BEGIN;

CREATE TABLE public.attendance_records (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    attendance_date date NOT NULL,
    check_in_time timestamp without time zone,
    check_out_time timestamp without time zone,
    status character varying(30) NOT NULL,
    remarks text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT attendance_records_pkey PRIMARY KEY (id),
    CONSTRAINT attendance_records_employee_id_fkey
        FOREIGN KEY (employee_id)
        REFERENCES public.employees(id)
        ON DELETE CASCADE,
    CONSTRAINT attendance_records_employee_date_key UNIQUE (employee_id, attendance_date),
    CONSTRAINT attendance_records_check_time_check
        CHECK (check_out_time IS NULL OR check_in_time IS NULL OR check_out_time >= check_in_time),
    CONSTRAINT attendance_records_status_check
        CHECK (status IN ('Present', 'Absent', 'Late', 'Half Day', 'On Leave', 'Holiday'))
);

CREATE SEQUENCE public.attendance_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.attendance_records_id_seq OWNER TO midadmin;

ALTER SEQUENCE public.attendance_records_id_seq OWNED BY public.attendance_records.id;

ALTER TABLE ONLY public.attendance_records
    ALTER COLUMN id SET DEFAULT nextval('public.attendance_records_id_seq'::regclass);

CREATE TABLE public.leave_types (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    days_allowed integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT leave_types_pkey PRIMARY KEY (id),
    CONSTRAINT leave_types_name_key UNIQUE (name),
    CONSTRAINT leave_types_days_allowed_check CHECK (days_allowed >= 0)
);

CREATE SEQUENCE public.leave_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.leave_types_id_seq OWNER TO midadmin;

ALTER SEQUENCE public.leave_types_id_seq OWNED BY public.leave_types.id;

ALTER TABLE ONLY public.leave_types
    ALTER COLUMN id SET DEFAULT nextval('public.leave_types_id_seq'::regclass);

CREATE TABLE public.leave_requests (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    leave_type_id integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    reason text,
    status character varying(30) NOT NULL,
    approved_by integer,
    approved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT leave_requests_pkey PRIMARY KEY (id),
    CONSTRAINT leave_requests_employee_id_fkey
        FOREIGN KEY (employee_id)
        REFERENCES public.employees(id)
        ON DELETE CASCADE,
    CONSTRAINT leave_requests_leave_type_id_fkey
        FOREIGN KEY (leave_type_id)
        REFERENCES public.leave_types(id)
        ON DELETE RESTRICT,
    CONSTRAINT leave_requests_approved_by_fkey
        FOREIGN KEY (approved_by)
        REFERENCES public.employees(id)
        ON DELETE SET NULL,
    CONSTRAINT leave_requests_date_range_check CHECK (end_date >= start_date),
    CONSTRAINT leave_requests_status_check
        CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Cancelled'))
);

CREATE SEQUENCE public.leave_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.leave_requests_id_seq OWNER TO midadmin;

ALTER SEQUENCE public.leave_requests_id_seq OWNED BY public.leave_requests.id;

ALTER TABLE ONLY public.leave_requests
    ALTER COLUMN id SET DEFAULT nextval('public.leave_requests_id_seq'::regclass);

CREATE INDEX idx_attendance_records_employee_id
    ON public.attendance_records(employee_id);

CREATE INDEX idx_attendance_records_attendance_date
    ON public.attendance_records(attendance_date);

CREATE INDEX idx_attendance_records_status
    ON public.attendance_records(status);

CREATE INDEX idx_leave_requests_employee_id
    ON public.leave_requests(employee_id);

CREATE INDEX idx_leave_requests_leave_type_id
    ON public.leave_requests(leave_type_id);

CREATE INDEX idx_leave_requests_status
    ON public.leave_requests(status);

CREATE INDEX idx_leave_requests_start_date
    ON public.leave_requests(start_date);

CREATE INDEX idx_leave_requests_end_date
    ON public.leave_requests(end_date);

CREATE INDEX idx_leave_requests_approved_by
    ON public.leave_requests(approved_by);

INSERT INTO public.leave_types (name, days_allowed)
VALUES
    ('Annual Leave', 14),
    ('Sick Leave', 14),
    ('Emergency Leave', 5),
    ('Unpaid Leave', 0);

COMMIT;
