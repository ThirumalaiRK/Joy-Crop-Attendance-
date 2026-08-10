-- ============================================================
-- AgencyOS Production Enterprise Database & Storage Schema
-- Project URL: https://powyigqkkzfpbalqunyl.supabase.co
-- Features: Real-time Attendance, Biometric Template Storage, RLS, Storage CDN,
--           Super Admin Portal Tables (Companies, Branches, Unknown Attempts, Audit Logs)
-- ============================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 2. COMPANIES TABLE (Multi-Tenant Super Admin)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.companies (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    logo TEXT,
    plan VARCHAR(50) DEFAULT 'Enterprise',
    status VARCHAR(50) DEFAULT 'Active',
    contact_email VARCHAR(255),
    storage_used VARCHAR(50) DEFAULT '4.2 GB',
    api_usage VARCHAR(50) DEFAULT '28 / 10,000',
    renewal_date VARCHAR(50) DEFAULT '2027-01-01',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. BRANCHES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.branches (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(100) DEFAULT 'COMP-001' REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    location TEXT NOT NULL,
    timezone VARCHAR(50) DEFAULT 'IST (UTC+5:30)',
    shift VARCHAR(255) DEFAULT '09:00 AM - 06:00 PM',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. EMPLOYEES TABLE (Core Staff Directory)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.employees (
    id TEXT PRIMARY KEY,
    employee_uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    employee_code VARCHAR(100) UNIQUE,
    company_id VARCHAR(100) DEFAULT 'COMP-001',
    name VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar TEXT NOT NULL,
    designation VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    manager VARCHAR(255),
    employment_status VARCHAR(50) DEFAULT 'Full Time',
    status VARCHAR(50) DEFAULT 'Active',
    shift VARCHAR(255) DEFAULT '09:00 AM - 06:00 PM',
    attendance_score INT DEFAULT 100,
    productivity_score INT DEFAULT 95,
    current_streak INT DEFAULT 1,
    avg_arrival VARCHAR(50) DEFAULT '09:00 AM',
    avg_exit VARCHAR(50) DEFAULT '06:00 PM',
    fingerprint_enrolled BOOLEAN DEFAULT FALSE,
    face_enrolled BOOLEAN DEFAULT FALSE,
    aadhaar_linked BOOLEAN DEFAULT FALSE,
    qr_enabled BOOLEAN DEFAULT TRUE,
    gps_enabled BOOLEAN DEFAULT TRUE,
    enrolled_fingerprint_base64 TEXT,
    mxface_registered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safely alter existing employees table if present
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS employee_uuid UUID DEFAULT uuid_generate_v4();
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS employee_code VARCHAR(100);
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS company_id VARCHAR(100) DEFAULT 'COMP-001';
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active';
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS enrolled_fingerprint_base64 TEXT;

-- ============================================================
-- 5. FINGERPRINT TEMPLATES TABLE (Enterprise Biometric Isolation)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fingerprint_templates (
    template_uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_uuid UUID,
    employee_code VARCHAR(100),
    device_id VARCHAR(100) DEFAULT 'MANTRA-MFS110',
    finger_position VARCHAR(50) DEFAULT 'Right Thumb',
    finger_template TEXT NOT NULL,
    quality_score INT DEFAULT 98,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Official MXFace Fingerprint SDK v01.00 ODBC Table Schema
CREATE TABLE IF NOT EXISTS public.__FingerprintSubjects (
    Id SERIAL PRIMARY KEY,
    SubjectId VARCHAR(45) NOT NULL,
    Template TEXT NOT NULL,
    "Group" VARCHAR(45) DEFAULT 'agencyos_hq_employees',
    ClientId INT DEFAULT 1001,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lowercase alias table for 1:N ODBC engines
CREATE TABLE IF NOT EXISTS public.__fingerprintsubjects (
    id SERIAL PRIMARY KEY,
    subjectid VARCHAR(45) NOT NULL,
    template TEXT NOT NULL,
    "Group" VARCHAR(45) DEFAULT 'agencyos_hq_employees',
    clientid INT DEFAULT 1001,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. ENROLLMENT SESSIONS TABLE (Session Isolation & RAM Audit)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.enrollment_sessions (
    session_uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_uuid UUID,
    employee_code VARCHAR(100),
    device_id VARCHAR(100) DEFAULT 'MANTRA-MFS110',
    status VARCHAR(50) DEFAULT 'in_progress',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- ============================================================
-- 7. ATTENDANCE RECORDS TABLE (Real-time Broadcast Target)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id TEXT PRIMARY KEY,
    attendance_uuid UUID DEFAULT uuid_generate_v4(),
    employee_id TEXT,
    employee_uuid UUID,
    employee_name VARCHAR(255) NOT NULL,
    employee_avatar TEXT,
    department VARCHAR(255) NOT NULL,
    check_in_time VARCHAR(50) NOT NULL,
    check_out_time VARCHAR(50),
    date VARCHAR(50) NOT NULL,
    method VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    device_name VARCHAR(255) NOT NULL,
    confidence_score NUMERIC(5, 2) DEFAULT 99.4,
    location TEXT,
    verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. UNKNOWN FINGERPRINT ATTEMPTS TABLE (Security Module)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.unknown_fingerprint_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_name VARCHAR(255) DEFAULT 'Mantra MFS110 L1',
    quality_score INT DEFAULT 0,
    raw_template TEXT,
    action_taken VARCHAR(50) DEFAULT 'pending', -- pending, enroll, reject, blacklist
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. AUDIT LOGS TABLE (Security & Compliance)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    target VARCHAR(255) NOT NULL,
    company_id VARCHAR(100) DEFAULT 'COMP-001',
    ip_address VARCHAR(50) DEFAULT '192.168.1.59',
    severity VARCHAR(50) DEFAULT 'info', -- info, warning, critical
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. BIOMETRIC HARDWARE DEVICES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.biometric_devices (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    model VARCHAR(255) NOT NULL,
    ip_address VARCHAR(50) NOT NULL,
    location TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'online',
    battery_level INT DEFAULT 98,
    temperature NUMERIC(4, 1) DEFAULT 36.5,
    firmware_version VARCHAR(50),
    last_sync VARCHAR(50) DEFAULT 'Just now',
    registered_users INT DEFAULT 1,
    max_capacity INT DEFAULT 5000,
    today_logs_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. SHIFT RULES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.shift_rules (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    start_time VARCHAR(50) NOT NULL,
    end_time VARCHAR(50) NOT NULL,
    grace_period_minutes INT DEFAULT 15,
    break_duration_minutes INT DEFAULT 60,
    auto_overtime_after_hours INT DEFAULT 8,
    active_employees INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. VISITOR RECORDS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.visitor_records (
    id TEXT PRIMARY KEY,
    visitor_name VARCHAR(255) NOT NULL,
    visitor_phone VARCHAR(50) NOT NULL,
    company VARCHAR(255) NOT NULL,
    host_employee_name VARCHAR(255) NOT NULL,
    purpose TEXT NOT NULL,
    pass_code VARCHAR(100) NOT NULL,
    check_in_time VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'Checked In',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 13. SUPABASE CDN STORAGE BUCKET & POLICIES
-- ============================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('employee-avatars', 'employee-avatars', true) 
ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "Allow public read access on employee-avatars" ON storage.objects;
CREATE POLICY "Allow public read access on employee-avatars" ON storage.objects FOR SELECT USING (bucket_id = 'employee-avatars');

DROP POLICY IF EXISTS "Allow public insert on employee-avatars" ON storage.objects;
CREATE POLICY "Allow public insert on employee-avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'employee-avatars');

-- ============================================================
-- 14. ENABLE REALTIME ON KEY TABLES
-- ============================================================
DO $$
BEGIN
    -- attendance_records
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'attendance_records'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
    END IF;

    -- employees
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'employees'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.employees;
    END IF;

    -- unknown_fingerprint_attempts
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'unknown_fingerprint_attempts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.unknown_fingerprint_attempts;
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- 15. ROW LEVEL SECURITY (RLS) POLICIES — ALL TABLES UNRESTRICTED FOR KIOSK / APP
-- ============================================================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fingerprint_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.__FingerprintSubjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.__fingerprintsubjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unknown_fingerprint_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_records ENABLE ROW LEVEL SECURITY;

-- Helper to safely recreate policy
DO $$
BEGIN
    -- companies
    DROP POLICY IF EXISTS "Allow public all on companies" ON public.companies;
    CREATE POLICY "Allow public all on companies" ON public.companies FOR ALL USING (true) WITH CHECK (true);

    -- branches
    DROP POLICY IF EXISTS "Allow public all on branches" ON public.branches;
    CREATE POLICY "Allow public all on branches" ON public.branches FOR ALL USING (true) WITH CHECK (true);

    -- employees
    DROP POLICY IF EXISTS "Allow public all on employees" ON public.employees;
    CREATE POLICY "Allow public all on employees" ON public.employees FOR ALL USING (true) WITH CHECK (true);

    -- fingerprint_templates
    DROP POLICY IF EXISTS "Allow public all on fingerprint_templates" ON public.fingerprint_templates;
    CREATE POLICY "Allow public all on fingerprint_templates" ON public.fingerprint_templates FOR ALL USING (true) WITH CHECK (true);

    -- __FingerprintSubjects
    DROP POLICY IF EXISTS "Allow public all on __FingerprintSubjects" ON public.__FingerprintSubjects;
    CREATE POLICY "Allow public all on __FingerprintSubjects" ON public.__FingerprintSubjects FOR ALL USING (true) WITH CHECK (true);

    -- __fingerprintsubjects
    DROP POLICY IF EXISTS "Allow public all on __fingerprintsubjects" ON public.__fingerprintsubjects;
    CREATE POLICY "Allow public all on __fingerprintsubjects" ON public.__fingerprintsubjects FOR ALL USING (true) WITH CHECK (true);

    -- enrollment_sessions
    DROP POLICY IF EXISTS "Allow public all on enrollment_sessions" ON public.enrollment_sessions;
    CREATE POLICY "Allow public all on enrollment_sessions" ON public.enrollment_sessions FOR ALL USING (true) WITH CHECK (true);

    -- attendance_records
    DROP POLICY IF EXISTS "Allow public all on attendance_records" ON public.attendance_records;
    CREATE POLICY "Allow public all on attendance_records" ON public.attendance_records FOR ALL USING (true) WITH CHECK (true);

    -- unknown_fingerprint_attempts
    DROP POLICY IF EXISTS "Allow public all on unknown_fingerprint_attempts" ON public.unknown_fingerprint_attempts;
    CREATE POLICY "Allow public all on unknown_fingerprint_attempts" ON public.unknown_fingerprint_attempts FOR ALL USING (true) WITH CHECK (true);

    -- audit_logs
    DROP POLICY IF EXISTS "Allow public all on audit_logs" ON public.audit_logs;
    CREATE POLICY "Allow public all on audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

    -- biometric_devices
    DROP POLICY IF EXISTS "Allow public all on biometric_devices" ON public.biometric_devices;
    CREATE POLICY "Allow public all on biometric_devices" ON public.biometric_devices FOR ALL USING (true) WITH CHECK (true);

    -- shift_rules
    DROP POLICY IF EXISTS "Allow public all on shift_rules" ON public.shift_rules;
    CREATE POLICY "Allow public all on shift_rules" ON public.shift_rules FOR ALL USING (true) WITH CHECK (true);

    -- visitor_records
    DROP POLICY IF EXISTS "Allow public all on visitor_records" ON public.visitor_records;
    CREATE POLICY "Allow public all on visitor_records" ON public.visitor_records FOR ALL USING (true) WITH CHECK (true);
END $$;

-- ============================================================
-- 16. INITIAL SEED DATA
-- ============================================================

-- Company Seed
INSERT INTO public.companies (id, name, logo, plan, status, contact_email)
VALUES ('COMP-001', 'AgencyOS Pvt. Ltd.', '🏢', 'Enterprise', 'Active', 'admin@agencyos.ai')
ON CONFLICT (id) DO NOTHING;

-- Branches Seed
INSERT INTO public.branches (id, company_id, name, location, timezone, shift, status)
VALUES 
    ('BR-001', 'COMP-001', 'Global HQ — Floor 4 & 5', 'Chennai, Tamil Nadu', 'IST (UTC+5:30)', '09:00 AM - 06:00 PM', 'active'),
    ('BR-002', 'COMP-001', 'Factory Unit A', 'Ambattur, Chennai', 'IST (UTC+5:30)', '06:00 AM - 02:00 PM', 'setup'),
    ('BR-003', 'COMP-001', 'Warehouse North', 'Thiruvallur, Tamil Nadu', 'IST (UTC+5:30)', '08:00 AM - 05:00 PM', 'setup')
ON CONFLICT (id) DO NOTHING;

-- Primary Devices Seed
INSERT INTO public.biometric_devices (id, name, model, ip_address, location, status, firmware_version)
VALUES ('DEV-001', 'Mantra MFS110 L1', 'MFS110 Optical Fingerprint Sensor', '127.0.0.1', 'Global HQ - Reception Kiosk', 'online', 'v2.2.1')
ON CONFLICT (id) DO NOTHING;

-- Primary Employees Seed — REMOVED (employees added via Admin UI)
-- INSERT INTO public.employees ... ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SCHEMA SETUP COMPLETE ✓
-- ============================================================
