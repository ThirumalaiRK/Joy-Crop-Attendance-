-- Migration: Employee Profile Schema Expansion, Realtime & CRUD Functions
-- Author: HRMS Engineering Team
-- Date: 2026-08-07

-- 1. Ensure employees table has all profile fields
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS designation TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS shift TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS manager TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS branch TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS division TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS team TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS joining_date TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS employment_status TEXT DEFAULT 'Full Time';
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS fingerprint_enrolled BOOLEAN DEFAULT false;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS face_enrolled BOOLEAN DEFAULT false;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS card_enrolled BOOLEAN DEFAULT false;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS qr_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS gps_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS is_enrolled BOOLEAN DEFAULT false;

-- 2. Create index on employee_code and device_user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_employees_code ON public.employees(employee_code);
CREATE INDEX IF NOT EXISTS idx_employees_device_user_id ON public.employees(device_user_id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees(email);

-- 3. Auto-update updated_at timestamp trigger
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_employees_updated_at ON public.employees;
CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

-- 4. Enable RLS and permissive policies for employee management
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to employees" ON public.employees;
CREATE POLICY "Allow public read access to employees"
ON public.employees FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert access to employees" ON public.employees;
CREATE POLICY "Allow public insert access to employees"
ON public.employees FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access to employees" ON public.employees;
CREATE POLICY "Allow public update access to employees"
ON public.employees FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete access to employees" ON public.employees;
CREATE POLICY "Allow public delete access to employees"
ON public.employees FOR DELETE USING (true);

-- 5. Enable Supabase Realtime Replication for Employees & Device Users
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.employees;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.device_users;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
