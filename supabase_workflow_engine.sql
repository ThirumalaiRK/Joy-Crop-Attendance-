-- ============================================================================
-- JOY CORPORATE SOLUTIONS PVT. LTD. — JRM ENTERPRISE HRMS
-- ENTERPRISE MULTI-LEVEL WORKFLOW & APPROVAL ENGINE SCHEMA
-- ============================================================================

-- 1. Main Workflow Requests Table
CREATE TABLE IF NOT EXISTS public.workflow_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number VARCHAR(50) NOT NULL UNIQUE,
  employee_id VARCHAR(50) NOT NULL,
  employee_name VARCHAR(150) NOT NULL,
  department VARCHAR(100),
  reporting_manager VARCHAR(150) DEFAULT 'Joy Corporate Board',
  request_type VARCHAR(100) NOT NULL, -- CORRECTION, LEAVE, OVERTIME, PAYROLL_EXCEPT
  payload JSONB DEFAULT '{}'::jsonb,
  current_step VARCHAR(50) DEFAULT 'MANAGER_REVIEW',
  approval_status VARCHAR(50) DEFAULT 'SUBMITTED', -- SUBMITTED, MANAGER_APPROVED, HR_APPROVED, AUTO_APPROVED, REJECTED, APPLIED
  assigned_role VARCHAR(50) DEFAULT 'Reporting Manager',
  assigned_user_id VARCHAR(50),
  sla_deadline TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 2. Approval History Audit Trail
CREATE TABLE IF NOT EXISTS public.workflow_approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.workflow_requests(id) ON DELETE CASCADE,
  step_name VARCHAR(50) NOT NULL,
  action VARCHAR(30) NOT NULL, -- APPROVED, REJECTED, REQUEST_INFO, AUTO_APPROVED
  actor_id VARCHAR(50) NOT NULL,
  actor_name VARCHAR(150) NOT NULL,
  actor_role VARCHAR(50) NOT NULL,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Jira-Style Workflow Comments
CREATE TABLE IF NOT EXISTS public.workflow_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.workflow_requests(id) ON DELETE CASCADE,
  sender_id VARCHAR(50) NOT NULL,
  sender_name VARCHAR(150) NOT NULL,
  sender_role VARCHAR(50) NOT NULL,
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.workflow_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_comments ENABLE ROW LEVEL SECURITY;

-- Security Policies
CREATE POLICY "Allow read workflow_requests" ON public.workflow_requests FOR ALL USING (TRUE);
CREATE POLICY "Allow read workflow_approval_history" ON public.workflow_approval_history FOR ALL USING (TRUE);
CREATE POLICY "Allow read workflow_comments" ON public.workflow_comments FOR ALL USING (TRUE);

-- Enable Supabase Realtime Broadcast Publications
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_comments;
