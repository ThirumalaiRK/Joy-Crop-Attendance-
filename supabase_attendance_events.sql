-- =============================================================================
-- AgencyOS Enterprise Workforce System — Supabase DDL Migration Script
-- Run this in your Supabase SQL Editor to enable dedicated realtime attendance_events
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.attendance_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    employee_name TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    device TEXT,
    method TEXT,
    location TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.attendance_events ENABLE ROW LEVEL SECURITY;

-- Allow public access for high-speed biometrics stream & employee portal actions
CREATE POLICY "Allow public select on attendance_events"
    ON public.attendance_events FOR SELECT USING (true);

CREATE POLICY "Allow public insert on attendance_events"
    ON public.attendance_events FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on attendance_events"
    ON public.attendance_events FOR UPDATE USING (true);

-- Enable Realtime replication for attendance_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_events;
