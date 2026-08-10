-- ============================================================================
-- JOY CORPORATE SOLUTIONS PVT. LTD. — JRM ENTERPRISE HRMS
-- ENTERPRISE HELPDESK & HR SUPPORT DATABASE SCHEMA
-- ============================================================================

-- 1. Main Support Tickets Table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number VARCHAR(50) NOT NULL UNIQUE,
  employee_id VARCHAR(50) NOT NULL,
  employee_name VARCHAR(150) NOT NULL,
  employee_email VARCHAR(255),
  department VARCHAR(100),
  category VARCHAR(100) NOT NULL,
  sub_category VARCHAR(150),
  priority VARCHAR(20) DEFAULT 'NORMAL',
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(30) DEFAULT 'OPEN',
  assigned_to VARCHAR(150) DEFAULT 'Unassigned',
  assigned_role VARCHAR(50) DEFAULT 'HR Specialist',
  device_name VARCHAR(150) DEFAULT 'Mantra MFS110 L1 / Web Browser',
  location VARCHAR(150) DEFAULT 'Coimbatore HQ',
  preferred_contact VARCHAR(50) DEFAULT 'Email',
  sla_deadline TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  rating INTEGER DEFAULT 0,
  feedback_comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  closed_at TIMESTAMP WITH TIME ZONE
);

-- 2. Ticket Slack-Style Messages & Conversation Table
CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id VARCHAR(50) NOT NULL,
  sender_name VARCHAR(150) NOT NULL,
  sender_role VARCHAR(50) DEFAULT 'Employee',
  message TEXT NOT NULL,
  is_internal_note BOOLEAN DEFAULT FALSE,
  attachment_url TEXT,
  attachment_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Ticket Attachments Table
CREATE TABLE IF NOT EXISTS public.ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(100),
  file_size VARCHAR(50),
  uploaded_by VARCHAR(150) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Ticket Status Progression History Table
CREATE TABLE IF NOT EXISTS public.ticket_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  old_status VARCHAR(30),
  new_status VARCHAR(30) NOT NULL,
  changed_by VARCHAR(150) NOT NULL,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_status_history ENABLE ROW LEVEL SECURITY;

-- Security Policies
CREATE POLICY "Allow users to view support tickets" ON public.support_tickets
  FOR ALL USING (TRUE);

CREATE POLICY "Allow users to view messages" ON public.ticket_messages
  FOR ALL USING (TRUE);

CREATE POLICY "Allow users to view attachments" ON public.ticket_attachments
  FOR ALL USING (TRUE);

CREATE POLICY "Allow users to view status history" ON public.ticket_status_history
  FOR ALL USING (TRUE);

-- Enable Supabase Realtime Broadcast Publications
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_status_history;
