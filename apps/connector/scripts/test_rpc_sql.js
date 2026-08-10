const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://powyigqkkzfpbalqunyl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTczMjMzNSwiZXhwIjoyMTAxMzA4MzM1fQ.gjNPMe4E8zuhnaJJrQPjteZLiVvrVNbp1t9299u9pZA'
);

async function testRpc() {
  const sql = `
    CREATE TABLE IF NOT EXISTS public.attendance_daily_summary (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      company_id uuid,
      employee_id text NOT NULL,
      employee_name text,
      department text,
      attendance_date text NOT NULL,
      first_check_in timestamp with time zone,
      last_check_out timestamp with time zone,
      gross_working_minutes integer DEFAULT 0,
      explicit_break_minutes integer DEFAULT 0,
      automatic_break_minutes integer DEFAULT 0,
      lunch_break_minutes integer DEFAULT 0,
      total_break_minutes integer DEFAULT 0,
      net_working_minutes integer DEFAULT 0,
      late_minutes integer DEFAULT 0,
      early_out_minutes integer DEFAULT 0,
      overtime_minutes integer DEFAULT 0,
      attendance_status text DEFAULT 'PRESENT',
      calculation_status text DEFAULT 'COMPLETED',
      lunch_break_type text DEFAULT 'AUTO_DEDUCT',
      lunch_start_time text DEFAULT '13:00',
      lunch_end_time text DEFAULT '14:00',
      breakdown jsonb DEFAULT '{}'::jsonb,
      last_calculated_at timestamp with time zone DEFAULT now(),
      created_at timestamp with time zone DEFAULT now(),
      updated_at timestamp with time zone DEFAULT now(),
      CONSTRAINT attendance_daily_summary_pkey PRIMARY KEY (id),
      CONSTRAINT attendance_daily_summary_unique UNIQUE (employee_id, attendance_date)
    );
  `;

  // Test if exec_sql exists
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  console.log('exec_sql RPC result:', error ? error.message : 'SUCCESS', data);
}

testRpc().catch(console.error);
