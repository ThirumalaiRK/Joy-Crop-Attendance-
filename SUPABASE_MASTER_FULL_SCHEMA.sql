-- ============================================================================
-- JOY CORPORATE SOLUTIONS PVT. LTD. — JRM HRMS v2.0
-- COMPLETE ENTERPRISE & CONNECTOR SYNC MASTER SCHEMA
-- Copy and paste ALL of this into your Supabase SQL Editor and click "Run"
-- ============================================================================

-- ── 1. EMPLOYEES ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employees (
  id VARCHAR(100) PRIMARY KEY,
  employee_code VARCHAR(100) UNIQUE NOT NULL,
  employee_uuid UUID DEFAULT gen_random_uuid(),
  company_id VARCHAR(50) DEFAULT 'COMP-001',
  name VARCHAR(150) NOT NULL,
  email VARCHAR(200),
  phone VARCHAR(50),
  department VARCHAR(100),
  designation VARCHAR(100),
  avatar TEXT,
  manager VARCHAR(150),
  shift VARCHAR(100) DEFAULT '09:00 AM - 06:00 PM',
  employment_status VARCHAR(50) DEFAULT 'Full Time',
  status VARCHAR(30) DEFAULT 'Active',
  portal_status VARCHAR(30) DEFAULT 'Active',
  device_uid INT,
  attendance_score INT DEFAULT 100,
  productivity_score INT DEFAULT 98,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employees_all" ON public.employees FOR ALL USING (TRUE);

-- ── 2. DEVICES ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address VARCHAR(50) UNIQUE NOT NULL,
  port INT DEFAULT 4370,
  name VARCHAR(150) DEFAULT 'Identix K90 Pro',
  serial_number VARCHAR(100),
  status VARCHAR(20) DEFAULT 'online',
  model VARCHAR(100) DEFAULT 'K90 Pro',
  mac_address VARCHAR(50),
  firmware_version VARCHAR(50),
  user_count INT DEFAULT 0,
  template_count INT DEFAULT 0,
  memory_usage VARCHAR(50),
  latency_ms INT DEFAULT 0,
  last_sync TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "devices_all" ON public.devices FOR ALL USING (TRUE);

-- ── 3. DEVICE COMMANDS QUEUE ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.device_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE,
  device_ip VARCHAR(50),
  command_type VARCHAR(50) NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(30) DEFAULT 'PENDING',
  result JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.device_commands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "device_commands_all" ON public.device_commands FOR ALL USING (TRUE);
CREATE INDEX IF NOT EXISTS idx_device_commands_status ON public.device_commands(status, created_at ASC);

-- ── 4. ATTENDANCE EVENTS ─────────────────────────────────────────────────────
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
CREATE INDEX IF NOT EXISTS idx_att_events_emp ON public.attendance_events(employee_id, event_time DESC);

-- ── 5. ATTENDANCE RECORDS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id TEXT PRIMARY KEY,
  employee_id VARCHAR(100) NOT NULL,
  employee_name VARCHAR(150),
  employee_avatar TEXT,
  department VARCHAR(100),
  check_in_time VARCHAR(50),
  check_out_time VARCHAR(50),
  date VARCHAR(50) DEFAULT 'Today',
  method VARCHAR(50) DEFAULT 'fingerprint',
  status VARCHAR(30) DEFAULT 'present',
  device_name VARCHAR(100),
  confidence_score NUMERIC(5,2) DEFAULT 99.4,
  location VARCHAR(100),
  verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attendance_records_all" ON public.attendance_records FOR ALL USING (TRUE);

-- ── 6. ATTENDANCE SESSIONS ───────────────────────────────────────────────────
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

-- ── 7. FINGERPRINT TEMPLATES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fingerprint_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_uuid UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  employee_code VARCHAR(100) NOT NULL,
  finger_position VARCHAR(50) DEFAULT 'Right Thumb',
  finger_template TEXT NOT NULL,
  quality_score INT DEFAULT 98,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.fingerprint_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fingerprint_templates_all" ON public.fingerprint_templates FOR ALL USING (TRUE);

-- ── 8. DEVICE USERS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.device_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE,
  device_ip VARCHAR(50),
  device_user_id VARCHAR(100) NOT NULL,
  uid INT,
  name VARCHAR(150),
  role INT DEFAULT 0,
  card_no VARCHAR(50),
  password VARCHAR(50),
  synced BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(device_ip, device_user_id)
);
ALTER TABLE public.device_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "device_users_all" ON public.device_users FOR ALL USING (TRUE);

-- ── 9. DEVICE STATUS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.device_status (
  device_ip VARCHAR(50) PRIMARY KEY,
  device_name VARCHAR(150),
  status VARCHAR(20) DEFAULT 'offline',
  latency_ms INT DEFAULT 0,
  firmware VARCHAR(50),
  user_count INT DEFAULT 0,
  template_count INT DEFAULT 0,
  log_count INT DEFAULT 0,
  memory_usage VARCHAR(50),
  last_ping TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.device_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "device_status_all" ON public.device_status FOR ALL USING (TRUE);

-- ── 10. DEVICE HEARTBEAT ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.device_heartbeat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE,
  device_ip VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'online',
  latency_ms INT DEFAULT 0,
  memory_usage TEXT,
  user_count INT DEFAULT 0,
  template_count INT DEFAULT 0,
  log_count INT DEFAULT 0,
  firmware VARCHAR(50),
  timestamp TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.device_heartbeat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "device_heartbeat_all" ON public.device_heartbeat FOR ALL USING (TRUE);

-- ── 11. NOTIFICATIONS ─────────────────────────────────────────────────────────
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

-- ── 12. ENABLE REALTIME PUBLICATIONS ──────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='attendance_events') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_events;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='attendance_records') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='attendance_sessions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_sessions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='device_commands') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.device_commands;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- ============================================================================
-- SUCCESS: MASTER SCHEMA CREATED
-- ============================================================================
