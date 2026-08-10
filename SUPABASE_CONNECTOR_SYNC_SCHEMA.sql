-- ============================================================================
-- JOY CORPORATE SOLUTIONS PVT. LTD. — JRM HRMS v2.0
-- CONNECTOR SYNC & DEVICE COMMAND QUEUE SCHEMA
-- ============================================================================

-- ── 1. DEVICE COMMANDS QUEUE ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.device_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE,
  device_ip VARCHAR(50),
  command_type VARCHAR(50) NOT NULL, -- CREATE_USER, ENROLL_USER, DELETE_USER, PULL_ATTENDANCE, SYNC_TIME, CLEAR_LOGS
  payload JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(30) DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, FAILED
  result JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.device_commands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "device_commands_all" ON public.device_commands FOR ALL USING (TRUE);
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND tablename='device_commands'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.device_commands;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_device_commands_status
  ON public.device_commands(status, created_at ASC);

-- ── 2. DEVICE HEARTBEAT ───────────────────────────────────────────────────────
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
CREATE INDEX IF NOT EXISTS idx_heartbeat_device
  ON public.device_heartbeat(device_ip, timestamp DESC);

-- ── 3. DEVICE USERS MAP ───────────────────────────────────────────────────────
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

-- ── 4. FINGERPRINT TEMPLATES ──────────────────────────────────────────────────
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
CREATE INDEX IF NOT EXISTS idx_fp_templates_emp
  ON public.fingerprint_templates(employee_code);

-- ── 5. DEVICE SYNC LOGS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.device_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_ip VARCHAR(50) NOT NULL,
  sync_type VARCHAR(50) NOT NULL, -- USERS, ATTENDANCE, TEMPLATES, COMMAND
  status VARCHAR(20) NOT NULL, -- SUCCESS, FAILED, PARTIAL
  records_processed INT DEFAULT 0,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.device_sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "device_sync_logs_all" ON public.device_sync_logs FOR ALL USING (TRUE);

-- ── 6. DEVICE STATUS ──────────────────────────────────────────────────────────
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

-- ── 7. ENSURE REALTIME ON ATTENDANCE_EVENTS ───────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND tablename='attendance_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_events;
  END IF;
END $$;

-- ============================================================================
-- Migration complete. All sync & command queue tables ready.
-- ============================================================================
