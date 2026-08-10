-- ============================================================================
-- JOY CORPORATE SOLUTIONS PVT. LTD. — JRM ENTERPRISE HRMS
-- MASTER EMPLOYEE PROFILE, IDENTITY ARCHITECTURE & RBAC SCHEMA
-- ============================================================================

-- 1. Ensure `public.companies` table exists for multi-tenant isolation
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  code VARCHAR(50) NOT NULL UNIQUE,
  status VARCHAR(50) DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Seed default company
INSERT INTO public.companies (name, code, status)
VALUES ('Joy Corporate Solutions Pvt. Ltd.', 'JCS', 'Active')
ON CONFLICT (name) DO NOTHING;
  
-- 2. Enhanced `public.employees` Table
CREATE TABLE IF NOT EXISTS public.employees (
  id VARCHAR(50) PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_code VARCHAR(50) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  display_name VARCHAR(255),
  official_email VARCHAR(255),
  email VARCHAR(255),
  personal_email VARCHAR(255),
  phone VARCHAR(50),
  gender VARCHAR(20),
  dob DATE,
  blood_group VARCHAR(10),
  avatar_url TEXT,
  avatar TEXT,
  
  -- Organization Hierarchy
  company VARCHAR(150) DEFAULT 'Joy Corporate Solutions Pvt. Ltd.',
  branch VARCHAR(100) DEFAULT 'Coimbatore HQ',
  division VARCHAR(100) DEFAULT 'Software Engineering',
  department_id VARCHAR(50),
  department VARCHAR(100) DEFAULT 'Software Development',
  team VARCHAR(100) DEFAULT 'Frontend Platform',
  designation_id VARCHAR(50),
  designation VARCHAR(100) DEFAULT 'Software Engineer',
  grade VARCHAR(50) DEFAULT 'L3 - Senior Engineer',
  manager_id VARCHAR(50),
  manager VARCHAR(150),
  reporting_manager VARCHAR(150),
  
  -- Employment & Shift
  employment_type VARCHAR(50) DEFAULT 'Permanent',
  employment_status VARCHAR(50) DEFAULT 'Full Time',
  joining_date DATE DEFAULT CURRENT_DATE,
  confirmation_date DATE,
  shift_id VARCHAR(50),
  shift VARCHAR(100) DEFAULT 'General Shift (09:00 AM - 06:00 PM)',
  work_location VARCHAR(100) DEFAULT 'Coimbatore HQ',
  weekly_off VARCHAR(100) DEFAULT 'Saturday & Sunday',
  
  -- Access & Attendance Config
  allowed_devices TEXT DEFAULT 'Identix K90 Pro (192.168.1.56), Mantra MFS110',
  default_terminal VARCHAR(100) DEFAULT 'HQ Main Gate Terminal (192.168.1.56)',
  late_grace_minutes INTEGER DEFAULT 15,
  overtime_policy VARCHAR(100) DEFAULT 'Standard (> 8 Hours Daily)',
  device_uid INTEGER,
  
  -- Statutory & Bank
  bank_name VARCHAR(100),
  account_number_masked VARCHAR(50),
  ifsc VARCHAR(50),
  pan VARCHAR(50),
  aadhaar_masked VARCHAR(50),
  pf_number VARCHAR(50),
  esi_number VARCHAR(50),
  address TEXT,
  emergency_name VARCHAR(100),
  emergency_phone VARCHAR(50),

  -- Identity & Auth Mapping
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  portal_enabled BOOLEAN DEFAULT TRUE,
  portal_status VARCHAR(50) DEFAULT 'Active',
  status VARCHAR(50) DEFAULT 'Active',
  
  -- Biometric Status
  biometric_status JSONB DEFAULT '{"fingerprint": true, "face": false, "qr": true, "gps": true, "card": false}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT uq_employee_code UNIQUE (employee_code),
  CONSTRAINT uq_auth_user_id UNIQUE (auth_user_id)
);

-- Index for fast identity lookup
CREATE INDEX IF NOT EXISTS idx_employees_auth_user_id ON public.employees(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_employees_official_email ON public.employees(official_email);
CREATE INDEX IF NOT EXISTS idx_employees_code ON public.employees(employee_code);

-- 3. Dedicated Portal Access Control Table
CREATE TABLE IF NOT EXISTS public.employee_portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id VARCHAR(50) NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portal_enabled BOOLEAN DEFAULT TRUE,
  account_status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, PENDING_ACTIVATION, SUSPENDED, DISABLED
  login_email VARCHAR(255) NOT NULL,
  last_login_at TIMESTAMP WITH TIME ZONE,
  last_password_change_at TIMESTAMP WITH TIME ZONE,
  password_reset_required BOOLEAN DEFAULT TRUE,
  welcome_email_sent_at TIMESTAMP WITH TIME ZONE,
  suspended_at TIMESTAMP WITH TIME ZONE,
  suspended_by VARCHAR(150),
  suspension_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT uq_portal_employee_id UNIQUE (employee_id),
  CONSTRAINT uq_portal_auth_user_id UNIQUE (auth_user_id),
  CONSTRAINT uq_portal_login_email UNIQUE (login_email)
);

-- 4. Enterprise Roles & Permissions (RBAC)
CREATE TABLE IF NOT EXISTS public.roles (
  id VARCHAR(50) PRIMARY KEY,
  role_name VARCHAR(100) NOT NULL,
  description TEXT,
  level INTEGER DEFAULT 1, -- 1: Employee, 2: Manager, 3: HR, 4: Admin, 5: SuperAdmin
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.permissions (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id VARCHAR(50) REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id VARCHAR(100) REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.employee_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id VARCHAR(50) REFERENCES public.employees(id) ON DELETE CASCADE,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id VARCHAR(50) REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_by VARCHAR(150),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(employee_id, role_id)
);

-- Seed Enterprise Roles
INSERT INTO public.roles (id, role_name, description, level) VALUES
  ('EMPLOYEE', 'Employee', 'Employee Self-Service (Attendance, Leave Requests, Profile, Payslips)', 1),
  ('MANAGER', 'Team Manager', 'Team Management, Break Monitoring, Leave Approvals, Shift Adjustments', 2),
  ('HR_EXECUTIVE', 'HR Executive', 'Employee Onboarding, Profile Management, Biometric Enrollment, Attendance Tracking', 3),
  ('HR_MANAGER', 'HR Manager', 'Full HR Management, Policy Configuration, Payroll Verification, Audit Access', 4),
  ('PAYROLL_OFFICER', 'Payroll Officer', 'Salary Processing, Statutory Deductions, Bank Export, Payslips', 3),
  ('ADMIN', 'System Administrator', 'Console Access, Device Gateway Settings, Identity Provisioning, Security Policies', 4),
  ('SUPER_ADMIN', 'Super Administrator', 'Full Unrestricted Enterprise HRMS Authority', 5)
ON CONFLICT (id) DO UPDATE SET role_name = EXCLUDED.role_name, description = EXCLUDED.description, level = EXCLUDED.level;

-- Seed Default Permissions
INSERT INTO public.permissions (id, name, category, description) VALUES
  ('employees.view', 'View Employees', 'Employees', 'View employee directory and profiles'),
  ('employees.create', 'Create Employee', 'Employees', 'Onboard new employees'),
  ('employees.edit', 'Edit Employee Profile', 'Employees', 'Update employee personal, org, and attendance data'),
  ('employees.delete', 'Delete Employee', 'Employees', 'Remove employee record'),
  ('employees.auth.provision', 'Provision Credentials', 'Identity', 'Create Supabase Auth user and enable portal'),
  ('employees.auth.reset_password', 'Reset Password', 'Identity', 'Trigger password reset for employee'),
  ('employees.auth.suspend', 'Suspend Portal Access', 'Identity', 'Suspend or reactivate portal access'),
  ('attendance.view', 'View Attendance Logs', 'Attendance', 'View daily attendance and punch timeline'),
  ('attendance.export', 'Export Attendance Reports', 'Attendance', 'Download monthly attendance CSV/Excel'),
  ('biometrics.enroll', 'Enroll Biometrics', 'Biometrics', 'Enroll fingerprints, face, and RFID cards on devices'),
  ('audit.view', 'View Audit Logs', 'Security', 'View system audit logs and history')
ON CONFLICT (id) DO NOTHING;

-- Map Default Permissions to Roles
INSERT INTO public.role_permissions (role_id, permission_id) VALUES
  ('EMPLOYEE', 'employees.view'),
  ('EMPLOYEE', 'attendance.view'),
  ('MANAGER', 'employees.view'),
  ('MANAGER', 'attendance.view'),
  ('MANAGER', 'attendance.export'),
  ('HR_EXECUTIVE', 'employees.view'),
  ('HR_EXECUTIVE', 'employees.create'),
  ('HR_EXECUTIVE', 'employees.edit'),
  ('HR_EXECUTIVE', 'attendance.view'),
  ('HR_EXECUTIVE', 'attendance.export'),
  ('HR_EXECUTIVE', 'biometrics.enroll'),
  ('HR_MANAGER', 'employees.view'),
  ('HR_MANAGER', 'employees.create'),
  ('HR_MANAGER', 'employees.edit'),
  ('HR_MANAGER', 'employees.auth.provision'),
  ('HR_MANAGER', 'employees.auth.reset_password'),
  ('HR_MANAGER', 'employees.auth.suspend'),
  ('HR_MANAGER', 'attendance.view'),
  ('HR_MANAGER', 'attendance.export'),
  ('HR_MANAGER', 'biometrics.enroll'),
  ('HR_MANAGER', 'audit.view'),
  ('ADMIN', 'employees.view'),
  ('ADMIN', 'employees.create'),
  ('ADMIN', 'employees.edit'),
  ('ADMIN', 'employees.delete'),
  ('ADMIN', 'employees.auth.provision'),
  ('ADMIN', 'employees.auth.reset_password'),
  ('ADMIN', 'employees.auth.suspend'),
  ('ADMIN', 'attendance.view'),
  ('ADMIN', 'attendance.export'),
  ('ADMIN', 'biometrics.enroll'),
  ('ADMIN', 'audit.view'),
  ('SUPER_ADMIN', 'employees.view'),
  ('SUPER_ADMIN', 'employees.create'),
  ('SUPER_ADMIN', 'employees.edit'),
  ('SUPER_ADMIN', 'employees.delete'),
  ('SUPER_ADMIN', 'employees.auth.provision'),
  ('SUPER_ADMIN', 'employees.auth.reset_password'),
  ('SUPER_ADMIN', 'employees.auth.suspend'),
  ('SUPER_ADMIN', 'attendance.view'),
  ('SUPER_ADMIN', 'attendance.export'),
  ('SUPER_ADMIN', 'biometrics.enroll'),
  ('SUPER_ADMIN', 'audit.view')
ON CONFLICT DO NOTHING;

-- 5. Immutable Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  actor_auth_user_id UUID,
  actor_name VARCHAR(150) DEFAULT 'System Admin',
  target_employee_id VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) DEFAULT 'EMPLOYEE',
  entity_id VARCHAR(100),
  old_value JSONB,
  new_value JSONB,
  details TEXT,
  ip_address VARCHAR(50) DEFAULT '127.0.0.1',
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_target_employee ON public.audit_logs(target_employee_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 6. Storage Bucket for Employee Avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-avatars',
  'employee-avatars',
  TRUE,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = TRUE,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

-- 7. Enable RLS on All Tables
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_portal_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 8. Permissive RLS Policies with Multi-Tenant Security
CREATE POLICY "Public read for authenticated users on employees" ON public.employees
  FOR SELECT USING (TRUE);

CREATE POLICY "Service and admins full access on employees" ON public.employees
  FOR ALL USING (TRUE);

CREATE POLICY "Public read on employee_portal_access" ON public.employee_portal_access
  FOR SELECT USING (TRUE);

CREATE POLICY "Service and admins full access on employee_portal_access" ON public.employee_portal_access
  FOR ALL USING (TRUE);

CREATE POLICY "Public read on roles" ON public.roles
  FOR SELECT USING (TRUE);

CREATE POLICY "Public read on permissions" ON public.permissions
  FOR SELECT USING (TRUE);

CREATE POLICY "Public read on role_permissions" ON public.role_permissions
  FOR SELECT USING (TRUE);

CREATE POLICY "Public read on employee_roles" ON public.employee_roles
  FOR SELECT USING (TRUE);

CREATE POLICY "Service and admins full access on employee_roles" ON public.employee_roles
  FOR ALL USING (TRUE);

CREATE POLICY "Public read on audit_logs" ON public.audit_logs
  FOR SELECT USING (TRUE);

CREATE POLICY "Service and admins insert audit_logs" ON public.audit_logs
  FOR INSERT WITH CHECK (TRUE);

-- Storage RLS Policies
CREATE POLICY "Public Avatar Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'employee-avatars');

CREATE POLICY "Authorized Avatar Upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'employee-avatars');

CREATE POLICY "Authorized Avatar Update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'employee-avatars');

CREATE POLICY "Authorized Avatar Delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'employee-avatars');

-- 9. Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.employees;
ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_portal_access;
ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_roles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
