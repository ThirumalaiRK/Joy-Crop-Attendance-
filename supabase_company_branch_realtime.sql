-- ============================================================================
-- JOY CORPORATE SOLUTIONS PVT. LTD. — JRM HRMS v2.0
-- COMPANY & BRANCH MANAGEMENT REALTIME DATABASE SCHEMA
-- ============================================================================
-- Copy and paste this complete SQL file into your Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New Query -> Paste & Run
-- ============================================================================

-- ── 1. COMPANIES TABLE ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.companies (
  id VARCHAR(100) PRIMARY KEY,
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
CREATE TABLE IF NOT EXISTS public.branches (
  id VARCHAR(100) PRIMARY KEY,
  company_id VARCHAR(100) REFERENCES public.companies(id) ON DELETE CASCADE,
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
  'COMP-001',
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
  plan = EXCLUDED.plan,
  status = EXCLUDED.status,
  contact_email = EXCLUDED.contact_email;

-- ============================================================================
-- SUCCESS: Single Company Created & Branches Table Ready for Realtime Additions!
-- ============================================================================
