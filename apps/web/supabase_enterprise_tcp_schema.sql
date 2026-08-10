-- ==============================================================================
-- 🚀 ENTERPRISE TCP-FIRST BIOMETRIC & ATTENDANCE SCHEMA (Identix K90 Pro)
-- ==============================================================================
-- Target Hardware: Identix K90 Pro / ZKTeco Biometric Terminal (TCP 4370)
-- Architecture: Device is Master for Fingerprints -> Node Connector Gateway -> Supabase -> Next.js HRMS

-- 1. COMPANIES & HIERARCHY
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT companies_pkey PRIMARY KEY (id)
);

-- 2. EMPLOYEES (Source of Truth for Staff)
CREATE TABLE IF NOT EXISTS public.employees (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  employee_code text NOT NULL UNIQUE,
  name text NOT NULL,
  department text DEFAULT 'Engineering',
  branch text DEFAULT 'HQ Main Office',
  device_user_id text,
  device_uid integer,
  status text DEFAULT 'Active'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT employees_pkey PRIMARY KEY (id)
);

-- Ensure missing columns exist on existing employees table
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS device_uid integer;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS device_user_id text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS department text DEFAULT 'Engineering';
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS branch text DEFAULT 'HQ Main Office';

-- 3. DEVICES (TCP Gateway Inventory for K90 Pro Terminals)
CREATE TABLE IF NOT EXISTS public.devices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Identix K90 Pro'::text,
  ip_address text UNIQUE NOT NULL,
  port integer DEFAULT 4370,
  mac_address text,
  serial_number text,
  firmware text,
  firmware_version text,
  platform text,
  status text DEFAULT 'online'::text,
  last_sync timestamp with time zone DEFAULT now(),
  latency_ms integer DEFAULT 0,
  user_count integer DEFAULT 0,
  template_count integer DEFAULT 0,
  memory_usage text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT devices_pkey PRIMARY KEY (id)
);

-- 4. DEVICE USERS MAPPING (Hardware Memory Index)
CREATE TABLE IF NOT EXISTS public.device_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id uuid REFERENCES public.devices(id) ON DELETE CASCADE,
  device_ip text,
  device_user_id text NOT NULL,
  uid integer,
  name text,
  role integer DEFAULT 0,
  synced boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT device_users_pkey PRIMARY KEY (id)
);

-- Ensure missing columns exist on existing device_users table
ALTER TABLE public.device_users ADD COLUMN IF NOT EXISTS device_ip text;
ALTER TABLE public.device_users ADD COLUMN IF NOT EXISTS uid integer;
ALTER TABLE public.device_users ADD COLUMN IF NOT EXISTS synced boolean DEFAULT true;

-- 5. FINGERPRINT METADATA (No raw binary templates stored in DB; Device is Master)
CREATE TABLE IF NOT EXISTS public.fingerprint_metadata (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE,
  employee_code text NOT NULL,
  device_ip text DEFAULT '192.168.1.45',
  device_uid integer NOT NULL,
  finger_index integer NOT NULL DEFAULT 0,
  quality_score integer DEFAULT 95,
  status text DEFAULT 'ENROLLED'::text,
  enrolled_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT fingerprint_metadata_pkey PRIMARY KEY (id)
);

-- 6. ASYNCHRONOUS DEVICE COMMAND QUEUE (Browser -> Queue -> Connector -> Hardware)
CREATE TABLE IF NOT EXISTS public.device_commands (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id uuid REFERENCES public.devices(id) ON DELETE SET NULL,
  device_ip text NOT NULL DEFAULT '192.168.1.45',
  command_type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'PENDING'::text,
  result jsonb DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT device_commands_pkey PRIMARY KEY (id)
);

-- 7. ATTENDANCE EVENTS (Immutable Audit Trail for Realtime Scans)
CREATE TABLE IF NOT EXISTS public.attendance_events (
  id text NOT NULL,
  session_id text,
  employee_id text NOT NULL,
  employee_name text,
  event_type text NOT NULL,
  event_time timestamp with time zone NOT NULL DEFAULT now(),
  device text DEFAULT 'Identix K90 Pro',
  method text DEFAULT 'fingerprint',
  location text DEFAULT 'HQ Main Terminal',
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT attendance_events_pkey PRIMARY KEY (id)
);

-- 8. ATTENDANCE SESSIONS (Shift Calculation Engine Outputs for Payroll)
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id text NOT NULL,
  employee_name text NOT NULL,
  department text DEFAULT 'Engineering',
  session_date date NOT NULL,
  check_in_time timestamp with time zone,
  check_out_time timestamp with time zone,
  total_time_mins integer DEFAULT 0,
  break_time_mins integer DEFAULT 0,
  lunch_time_mins integer DEFAULT 0,
  net_work_mins integer DEFAULT 0,
  overtime_mins integer DEFAULT 0,
  late_mins integer DEFAULT 0,
  early_exit_mins integer DEFAULT 0,
  status text DEFAULT 'PENDING'::text,
  payable_hours numeric DEFAULT 0,
  shift_id text,
  is_finalized boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT attendance_sessions_pkey PRIMARY KEY (id)
);

-- 9. ATTENDANCE RECORDS (Web Portal Dashboard View)
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id text NOT NULL,
  employee_id text NOT NULL,
  employee_name text,
  employee_avatar text,
  department text DEFAULT 'Engineering',
  check_in_time text,
  check_out_time text,
  date text DEFAULT 'Today'::text,
  method text DEFAULT 'fingerprint'::text,
  status text DEFAULT 'present'::text,
  device_name text DEFAULT 'Identix K90 Pro Terminal',
  confidence_score numeric DEFAULT 99.8,
  location text DEFAULT 'HQ Main Terminal',
  verified boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT attendance_records_pkey PRIMARY KEY (id)
);

-- 10. UNKNOWN FINGERPRINT LOGS (Unauthorized Scan Audit)
CREATE TABLE IF NOT EXISTS public.unknown_fingerprint_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_ip text NOT NULL,
  device_name text DEFAULT 'Identix K90 Pro',
  attempt_time timestamp with time zone NOT NULL DEFAULT now(),
  verify_mode integer DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unknown_fingerprint_logs_pkey PRIMARY KEY (id)
);

-- 11. DEVICE STATUS (Real-Time Hardware Heartbeat)
CREATE TABLE IF NOT EXISTS public.device_status (
  device_ip text NOT NULL,
  device_name text DEFAULT 'Identix K90 Pro',
  status text DEFAULT 'online'::text,
  latency_ms integer DEFAULT 0,
  firmware text,
  user_count integer DEFAULT 0,
  template_count integer DEFAULT 0,
  log_count integer DEFAULT 0,
  memory_usage text,
  last_ping timestamp with time zone DEFAULT now(),
  CONSTRAINT device_status_pkey PRIMARY KEY (device_ip)
);

-- ==============================================================================
-- ⚡ PERFORMANCE INDEXES FOR ZERO-LATENCY REALTIME TCP LOOKUPS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_employees_code ON public.employees(employee_code);
CREATE INDEX IF NOT EXISTS idx_employees_device_uid ON public.employees(device_uid);
CREATE INDEX IF NOT EXISTS idx_attendance_events_emp_time ON public.attendance_events(employee_id, event_time);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_date ON public.attendance_sessions(session_date, employee_id);
CREATE INDEX IF NOT EXISTS idx_device_commands_status ON public.device_commands(status, created_at);
CREATE INDEX IF NOT EXISTS idx_device_users_uid ON public.device_users(uid, device_user_id);

-- 12. TIMETABLES (ZKTime.Net Shift Timetable Engine)
CREATE TABLE IF NOT EXISTS public.timetables (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Default'::text,
  mode text DEFAULT 'Regular'::text,
  check_in_time text DEFAULT '09:00'::text,
  check_out_time text DEFAULT '16:00'::text,
  color text DEFAULT '#0066FF'::text,
  active_additional_setting boolean DEFAULT true,
  check_in_start_at text DEFAULT '07:00'::text,
  check_in_end_at text DEFAULT '11:00'::text,
  check_out_start_at text DEFAULT '16:00'::text,
  check_out_end_at text DEFAULT '18:00'::text,
  calculate_as_mins integer DEFAULT 420,
  late_in_mins integer DEFAULT 5,
  early_out_mins integer DEFAULT 5,
  use_first_checkin_last_checkout boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT timetables_pkey PRIMARY KEY (id)
);

-- 13. TIMETABLE BREAKS (ZKTime.Net Break Management)
CREATE TABLE IF NOT EXISTS public.timetable_breaks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  timetable_id uuid REFERENCES public.timetables(id) ON DELETE CASCADE,
  break_name text NOT NULL DEFAULT 'Lunch Break'::text,
  start_time text DEFAULT '12:00'::text,
  ahead_to text DEFAULT '12:30'::text,
  end_time text DEFAULT '13:00'::text,
  delay_to text DEFAULT '13:30'::text,
  break_duration_mins integer DEFAULT 60,
  deduct_type text DEFAULT 'auto_deduct'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT timetable_breaks_pkey PRIMARY KEY (id)
);

-- ==============================================================================
-- 📡 SUPABASE REALTIME PUBLICATION ENABLEMENT (Instant Dashboard Push)
-- ==============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_events;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_sessions;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.device_commands;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.device_status;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.unknown_fingerprint_logs;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
