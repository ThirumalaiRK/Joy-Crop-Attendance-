-- ============================================================================
-- JOY CORPORATE SOLUTIONS PVT. LTD. — JRM HRMS
-- NOTIFICATION ENGINE SCHEMA
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  recipient_id VARCHAR(100) NOT NULL,
  recipient_name VARCHAR(150),
  recipient_role VARCHAR(50),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'SYSTEM', -- ATTENDANCE, WORKFLOW, LEAVE, SUPPORT, SYSTEM, DEVICE
  priority VARCHAR(20) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, URGENT
  channel VARCHAR(30) DEFAULT 'IN_APP',  -- IN_APP, EMAIL, BROWSER_PUSH
  is_read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on notifications" ON public.notifications FOR ALL USING (TRUE);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Index for fast per-employee lookup
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, created_at DESC);

-- ============================================================================
-- ATTENDANCE SESSIONS TABLE (One record per employee per day)
-- Source of truth for net working hours, breaks, payroll
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id VARCHAR(100) NOT NULL,
  employee_name VARCHAR(150) NOT NULL,
  department VARCHAR(100),
  session_date DATE NOT NULL,
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  total_time_mins INTEGER DEFAULT 0,
  break_time_mins INTEGER DEFAULT 0,
  lunch_time_mins INTEGER DEFAULT 0,
  net_work_mins INTEGER DEFAULT 0,
  overtime_mins INTEGER DEFAULT 0,
  late_mins INTEGER DEFAULT 0,
  status VARCHAR(30) DEFAULT 'PENDING', -- PENDING, PRESENT, LATE, ABSENT, HALF_DAY, WFH, ON_LEAVE
  payable_hours NUMERIC(5,2) DEFAULT 0,
  is_finalized BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(employee_id, session_date)
);

ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on attendance_sessions" ON public.attendance_sessions FOR ALL USING (TRUE);
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_sessions;

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_emp ON public.attendance_sessions(employee_id, session_date DESC);
