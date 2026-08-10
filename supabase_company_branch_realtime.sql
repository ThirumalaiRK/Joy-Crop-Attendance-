-- ============================================================================
-- JOY CORPORATE SOLUTIONS PVT. LTD. — JRM HRMS v2.0
-- COMPANY & BRANCH MANAGEMENT REALTIME DATABASE SCHEMA
-- ============================================================================
-- Copy and paste this complete SQL file into your Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New Query -> Paste & Run
-- ============================================================================

-- ── 1. COMPANIES TABLE & EXTENDED COLUMNS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100),
  logo TEXT DEFAULT '🏢',
  plan VARCHAR(50) DEFAULT 'Enterprise',
  status VARCHAR(50) DEFAULT 'Active',
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'India',
  timezone VARCHAR(100) DEFAULT 'IST (UTC+5:30)',
  storage_used VARCHAR(50) DEFAULT '4.2 GB',
  api_usage VARCHAR(50) DEFAULT '28 / 10,000',
  renewal_date VARCHAR(50) DEFAULT '2027-01-01',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure all required columns exist if the table was previously created
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS code VARCHAR(100);
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS logo TEXT DEFAULT '🏢';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'Enterprise';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'IST (UTC+5:30)';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS storage_used VARCHAR(50) DEFAULT '4.2 GB';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS api_usage VARCHAR(50) DEFAULT '28 / 10,000';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS renewal_date VARCHAR(50) DEFAULT '2027-01-01';

-- Enable RLS & Allow Access
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to companies" ON public.companies;
CREATE POLICY "Allow all access to companies" ON public.companies FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Enable Realtime Publication on Companies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'companies'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.companies;
  END IF;
END $$;

-- ── 2. BRANCHES TABLE ─────────────────────────────────────────────────────────
-- Uses UUID company_id matching companies.id type
CREATE TABLE IF NOT EXISTS public.branches (
  id TEXT PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  location TEXT NOT NULL,
  timezone VARCHAR(100) DEFAULT 'IST (UTC+5:30)',
  shift VARCHAR(100) DEFAULT '09:00 AM - 06:00 PM',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS & Allow Access
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to branches" ON public.branches;
CREATE POLICY "Allow all access to branches" ON public.branches FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Enable Realtime Publication on Branches
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'branches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.branches;
  END IF;
END $$;

-- Indexes for Fast Querying
CREATE INDEX IF NOT EXISTS idx_branches_company ON public.branches(company_id);
CREATE INDEX IF NOT EXISTS idx_branches_status ON public.branches(status);

-- ── 3. SEED SINGLE TENANT COMPANY (Joy Corporate Solutions Pvt. Ltd.) ──────────
INSERT INTO public.companies (id, name, code, logo, plan, status, contact_email, storage_used, api_usage, renewal_date)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Joy Corporate Solutions Pvt. Ltd.',
  'COMP-001',
  '🏢',
  'Enterprise',
  'Active',
  'admin@joycorporate.com',
  '4.2 GB',
  '28 / 10,000',
  '2027-01-01'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  plan = EXCLUDED.plan,
  status = EXCLUDED.status,
  contact_email = EXCLUDED.contact_email;

-- ============================================================================
-- SUCCESS: Fixed UUID type matching for companies.id and branches.company_id!
-- ============================================================================
