-- Phase 4D-2A: Employee document management table
-- Note: This migration does not modify any existing tables.

BEGIN;

CREATE TABLE public.employee_documents (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    document_type character varying(50) NOT NULL,
    document_name character varying(255) NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path text NOT NULL,
    file_mime_type character varying(100),
    file_size_bytes bigint,
    uploaded_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT employee_documents_pkey PRIMARY KEY (id),
    CONSTRAINT employee_documents_employee_id_fkey
        FOREIGN KEY (employee_id)
        REFERENCES public.employees(id)
        ON DELETE CASCADE
);

CREATE SEQUENCE public.employee_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.employee_documents_id_seq OWNER TO midadmin;

ALTER SEQUENCE public.employee_documents_id_seq OWNED BY public.employee_documents.id;

ALTER TABLE ONLY public.employee_documents
    ALTER COLUMN id SET DEFAULT nextval('public.employee_documents_id_seq'::regclass);

CREATE INDEX idx_employee_documents_employee_id
    ON public.employee_documents(employee_id);

CREATE INDEX idx_employee_documents_document_type
    ON public.employee_documents(document_type);

CREATE INDEX idx_employee_documents_employee_id_document_type
    ON public.employee_documents(employee_id, document_type);

COMMIT;
