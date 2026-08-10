-- ============================================================================
-- JOY CORPORATE SOLUTIONS PVT. LTD. — JRM HRMS v2.0
-- COMPLETE ENTERPRISE SCHEMA — Run this in Supabase SQL Editor
-- ============================================================================

-- ── 1. NOTIFICATIONS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  recipient_id VARCHAR(100) NOT NULL,
  recipient_name VARCHAR(150),
  recipient_role VARCHAR(50),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'SYSTEM',
  priority VARCHAR(20) DEFAULT 'MEDIUM',
  channel VARCHAR(30) DEFAULT 'IN_APP',
  is_read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_all" ON public.notifications FOR ALL USING (TRUE);
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND tablename='notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_notifications_recipient
  ON public.notifications(recipient_id, created_at DESC);

-- ── 2. ATTENDANCE SESSIONS (Payroll-ready daily summary) ─────────────────────
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id VARCHAR(100) NOT NULL,
  employee_name VARCHAR(150) NOT NULL,
  department VARCHAR(100),
  session_date DATE NOT NULL,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  total_time_mins INT DEFAULT 0,
  break_time_mins INT DEFAULT 0,
  lunch_time_mins INT DEFAULT 0,
  net_work_mins INT DEFAULT 0,
  overtime_mins INT DEFAULT 0,
  late_mins INT DEFAULT 0,
  early_exit_mins INT DEFAULT 0,
  status VARCHAR(30) DEFAULT 'PENDING',
  payable_hours NUMERIC(6,2) DEFAULT 0,
  shift_id VARCHAR(50),
  is_finalized BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, session_date)
);
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_all" ON public.attendance_sessions FOR ALL USING (TRUE);
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND tablename='attendance_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_sessions;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_sessions_emp
  ON public.attendance_sessions(employee_id, session_date DESC);

-- ── 3. WORKFLOW REQUESTS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workflow_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number VARCHAR(30) UNIQUE,
  employee_id VARCHAR(100) NOT NULL,
  employee_name VARCHAR(150),
  department VARCHAR(100),
  reporting_manager VARCHAR(150),
  request_type VARCHAR(50) NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  current_step VARCHAR(30) DEFAULT 'MANAGER_REVIEW',
  approval_status VARCHAR(30) DEFAULT 'SUBMITTED',
  assigned_role VARCHAR(50) DEFAULT 'ReportingManager',
  sla_deadline TIMESTAMPTZ,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.workflow_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workflow_requests_all" ON public.workflow_requests FOR ALL USING (TRUE);
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND tablename='workflow_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_requests;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_workflow_emp
  ON public.workflow_requests(employee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_role
  ON public.workflow_requests(assigned_role, approval_status);

-- ── 4. WORKFLOW APPROVAL HISTORY ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workflow_approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.workflow_requests(id) ON DELETE CASCADE,
  step_name VARCHAR(30),
  action VARCHAR(30) NOT NULL,
  actor_id VARCHAR(100),
  actor_name VARCHAR(150),
  actor_role VARCHAR(50),
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.workflow_approval_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workflow_history_all" ON public.workflow_approval_history FOR ALL USING (TRUE);
CREATE INDEX IF NOT EXISTS idx_workflow_history_req
  ON public.workflow_approval_history(request_id, created_at ASC);

-- ── 5. ATTENDANCE EVENTS (Immutable biometric event log) ─────────────────────
CREATE TABLE IF NOT EXISTS public.attendance_events (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  employee_id VARCHAR(100) NOT NULL,
  employee_name VARCHAR(150),
  event_type VARCHAR(30) NOT NULL,
  event_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  device VARCHAR(100),
  method VARCHAR(50),
  location VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.attendance_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attendance_events_all" ON public.attendance_events FOR ALL USING (TRUE);
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND tablename='attendance_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_events;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_att_events_emp
  ON public.attendance_events(employee_id, event_time DESC);

-- ── 6. ATTENDANCE CORRECTIONS (Legacy) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attendance_corrections (
  id TEXT PRIMARY KEY,
  employee_id VARCHAR(100) NOT NULL,
  employee_name VARCHAR(150),
  department VARCHAR(100),
  request_type VARCHAR(50),
  requested_time VARCHAR(50),
  reason TEXT,
  status VARCHAR(20) DEFAULT 'PENDING',
  manager_notes TEXT,
  hr_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.attendance_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "corrections_all" ON public.attendance_corrections FOR ALL USING (TRUE);
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND tablename='attendance_corrections'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_corrections;
  END IF;
END $$;

-- ── 7. AUDIT LOGS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  target_employee_id VARCHAR(100),
  details TEXT,
  performed_by VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_all" ON public.audit_logs FOR ALL USING (TRUE);
CREATE INDEX IF NOT EXISTS idx_audit_logs_time
  ON public.audit_logs(created_at DESC);

-- ── 8. SUPPORT TICKETS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number VARCHAR(30) UNIQUE,
  employee_id VARCHAR(100),
  employee_name VARCHAR(150),
  department VARCHAR(100),
  category VARCHAR(50),
  subject TEXT NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'MEDIUM',
  status VARCHAR(30) DEFAULT 'OPEN',
  assigned_to VARCHAR(150),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "support_tickets_all" ON public.support_tickets FOR ALL USING (TRUE);
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND tablename='support_tickets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
  END IF;
END $$;

-- ── 9. BREAK SESSIONS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.break_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id VARCHAR(100) NOT NULL,
  employee_name VARCHAR(150),
  department VARCHAR(100),
  break_type VARCHAR(20) NOT NULL,
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ,
  duration_mins INT,
  session_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.break_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "break_sessions_all" ON public.break_sessions FOR ALL USING (TRUE);
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND tablename='break_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.break_sessions;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_break_sessions_emp
  ON public.break_sessions(employee_id, session_date DESC);

-- ── 10. EMPLOYEE ACCOUNT STATUS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employee_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(200) UNIQUE NOT NULL,
  password_hash TEXT,
  password_reset_required BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.employee_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounts_all" ON public.employee_accounts FOR ALL USING (TRUE);

-- ============================================================================
-- SUCCESS
-- All JRM HRMS enterprise tables are ready.
-- Realtime enabled on: attendance_events, attendance_records, attendance_sessions,
--   workflow_requests, notifications, break_sessions, support_tickets,
--   attendance_corrections, employees
-- ============================================================================
