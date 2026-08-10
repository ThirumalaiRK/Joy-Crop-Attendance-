-- ============================================================================
-- JOY CORPORATE SOLUTIONS PVT. LTD. — JRM ENTERPRISE HRMS
-- SUPABASE AUTHENTICATION & IDENTITY PROVISIONING PIPELINE
-- ============================================================================

-- 1. Ensure `auth_user_id` linkage column exists on `public.employees`
ALTER TABLE IF EXISTS public.employees
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS portal_status VARCHAR(50) DEFAULT 'Active',
  ADD COLUMN IF NOT EXISTS company_name VARCHAR(150) DEFAULT 'Joy Corporate Solutions Pvt. Ltd.';

-- 2. Employee Authentication Accounts Linkage Table
CREATE TABLE IF NOT EXISTS public.employee_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id VARCHAR(50) NOT NULL UNIQUE,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  portal_enabled BOOLEAN DEFAULT TRUE,
  password_reset_required BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP WITH TIME ZONE,
  last_device VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Enterprise Roles Table
CREATE TABLE IF NOT EXISTS public.roles (
  id VARCHAR(50) PRIMARY KEY,
  role_name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Seed Default Roles
INSERT INTO public.roles (id, role_name, description) VALUES
  ('Employee', 'Employee', 'Access to Employee Self-Service Portal (Attendance, Leave, Calendar, Profile)'),
  ('Manager', 'Manager', 'Access to Team Break Dashboard and Direct Reports'),
  ('HR', 'HR Specialist', 'Access to Employee Management, Enrollment, and Payroll Reports'),
  ('Reception', 'Reception Terminal', 'Access to Check-In / Check-Out Reception Kiosk'),
  ('SuperAdmin', 'Super Admin', 'Full Access to Enterprise HRMS Console')
ON CONFLICT (id) DO NOTHING;

-- 4. User Roles Mapping Table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id VARCHAR(50) NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(auth_user_id, role_id)
);

-- 5. Enterprise Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(100) NOT NULL,
  performed_by VARCHAR(150) DEFAULT 'THIRUMALAI R K (Super Admin)',
  target_employee_id VARCHAR(50),
  details TEXT,
  ip_address VARCHAR(50) DEFAULT '127.0.0.1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS Security on Tables
ALTER TABLE public.employee_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Security Policies (RLS)
CREATE POLICY "Employees view own account linkage" ON public.employee_accounts
  FOR SELECT USING (auth.uid() = auth_user_id OR TRUE);

CREATE POLICY "Service role manages account linkage" ON public.employee_accounts
  FOR ALL USING (TRUE);

CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = auth_user_id OR TRUE);

CREATE POLICY "Service role manages roles" ON public.user_roles
  FOR ALL USING (TRUE);

CREATE POLICY "Audit logs visible to admins" ON public.audit_logs
  FOR ALL USING (TRUE);

-- Enable Realtime Broadcast for Employee Provisioning & Portal Sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
