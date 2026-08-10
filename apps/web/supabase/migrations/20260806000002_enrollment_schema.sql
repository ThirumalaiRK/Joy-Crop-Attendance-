-- Migration 20260806000002_enrollment_schema.sql

-- Drop existing overlapping tables if any (from 20260806000000_biometrics.sql) to cleanly establish new schema structure
DROP TABLE IF EXISTS public.sync_queue CASCADE;
DROP TABLE IF EXISTS public.attendance_logs CASCADE;
DROP TABLE IF EXISTS public.device_users CASCADE;
DROP TABLE IF EXISTS public.device_health CASCADE;
DROP TABLE IF EXISTS public.devices CASCADE;

-- Biometric Devices
CREATE TABLE IF NOT EXISTS public.biometric_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    device_name TEXT NOT NULL,
    model TEXT,
    serial TEXT,
    ip TEXT,
    status TEXT DEFAULT 'offline',
    firmware TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employees (Master Record)
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_code TEXT NOT NULL,
    name TEXT NOT NULL,
    department TEXT,
    branch TEXT,
    device_user_id TEXT, -- Nullable initially
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, employee_code)
);

-- Fingerprint Templates
CREATE TABLE IF NOT EXISTS public.fingerprint_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.biometric_devices(id) ON DELETE CASCADE,
    finger_index INTEGER NOT NULL,
    template_data TEXT NOT NULL,
    quality INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, finger_index)
);

-- Attendance Logs
CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.biometric_devices(id) ON DELETE CASCADE,
    device_log_id TEXT,
    timestamp TIMESTAMPTZ NOT NULL,
    verify_mode TEXT,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync Queue
CREATE TABLE IF NOT EXISTS public.sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    device_id UUID REFERENCES public.biometric_devices(id) ON DELETE CASCADE,
    payload JSONB,
    status TEXT DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.biometric_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fingerprint_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;

-- Insert a default company and some mock devices/employees to test with
INSERT INTO public.companies (id, name)
VALUES ('00000000-0000-0000-0000-000000000000', 'Default Company')
ON CONFLICT DO NOTHING;

INSERT INTO public.biometric_devices (id, company_id, device_name, model, serial, ip, status, firmware)
VALUES 
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'Reception K90', 'K90 Pro', 'K90-12345', '192.168.1.45', 'online', 'Ver 6.60')
ON CONFLICT DO NOTHING;

INSERT INTO public.employees (id, company_id, employee_code, name, department, branch, device_user_id, status)
VALUES
('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'EMP001', 'John Doe', 'Engineering', 'Head Office', NULL, 'Active')
ON CONFLICT DO NOTHING;
