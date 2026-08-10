-- Create Admin Dashboard Tables

-- Shifts
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT,
    start_time TEXT,
    end_time TEXT,
    grace_period_minutes INTEGER,
    break_duration_minutes INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security Logs
CREATE TABLE IF NOT EXISTS public.security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    timestamp TEXT,
    event TEXT,
    actor TEXT,
    ip_address TEXT,
    status TEXT,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Floor Zones
CREATE TABLE IF NOT EXISTS public.floor_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    capacity INTEGER,
    present_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Floor Zone Employees (mock mapping)
CREATE TABLE IF NOT EXISTS public.floor_zone_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID REFERENCES public.floor_zones(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    desk_no TEXT,
    status TEXT,
    avatar TEXT,
    x INTEGER,
    y INTEGER
);

-- AI Insights
CREATE TABLE IF NOT EXISTS public.ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    type TEXT,
    title TEXT,
    description TEXT,
    priority TEXT,
    action_label TEXT,
    action_href TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies (simplified for mockup)
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floor_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floor_zone_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- Creating a default company for the seed data if one doesn't exist
INSERT INTO public.companies (id, name)
VALUES ('00000000-0000-0000-0000-000000000000', 'Default Company')
ON CONFLICT DO NOTHING;

-- Seed Data: Shifts
INSERT INTO public.shifts (id, company_id, name, type, start_time, end_time, grace_period_minutes, break_duration_minutes)
VALUES
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'General Day Shift', 'Fixed', '09:00 AM', '06:00 PM', 15, 60),
('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'Night Operations', 'Overnight', '10:00 PM', '06:00 AM', 10, 45)
ON CONFLICT DO NOTHING;

-- Seed Data: Security Logs
INSERT INTO public.security_logs (id, company_id, timestamp, event, actor, ip_address, status, details)
VALUES
('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', '10:45 AM', 'Admin Login', 'admin@pulsehr.io', '192.168.1.55', 'Success', 'Successful login via Web UI with MFA'),
('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', '12:05 PM', 'Failed Auth', 'Unknown', '192.168.4.32', 'Failed', 'Invalid password attempt on Plant Gate B')
ON CONFLICT DO NOTHING;

-- Seed Data: Floor Zones
INSERT INTO public.floor_zones (id, company_id, name, capacity, present_count)
VALUES
('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'Engineering Wing', 40, 32),
('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 'Design Studio', 25, 15)
ON CONFLICT DO NOTHING;

-- Seed Data: Floor Zone Employees
INSERT INTO public.floor_zone_employees (zone_id, name, desk_no, status, avatar, x, y)
VALUES
('55555555-5555-5555-5555-555555555555', 'Alice Smith', 'ENG-401', 'present', '', 25, 25),
('55555555-5555-5555-5555-555555555555', 'Bob Jones', 'ENG-402', 'away', '', 35, 30),
('66666666-6666-6666-6666-666666666666', 'Charlie Davis', 'DES-101', 'present', '', 75, 20);

-- Seed Data: AI Insights
INSERT INTO public.ai_insights (id, company_id, type, title, description, priority, action_label, action_href)
VALUES
('77777777-7777-7777-7777-777777777777', '00000000-0000-0000-0000-000000000000', 'warning', 'High Late Incidence', '12 employees arrived late to the Engineering Wing today.', 'High', 'View Report', '/admin/reports/late'),
('88888888-8888-8888-8888-888888888888', '00000000-0000-0000-0000-000000000000', 'success', 'All Devices Online', 'All 15 biometric devices are currently online and syncing.', 'Low', 'Manage Devices', '/admin/devices')
ON CONFLICT DO NOTHING;
