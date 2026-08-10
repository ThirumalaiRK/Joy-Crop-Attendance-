const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://powyigqkkzfpbalqunyl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTczMjMzNSwiZXhwIjoyMTAxMzA4MzM1fQ.gjNPMe4E8zuhnaJJrQPjteZLiVvrVNbp1t9299u9pZA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateAllRecordsToIST() {
  console.log('🔄 Converting and formatting all today records in Supabase to Asia/Kolkata timezone...');

  // Update attendance_records for Muthukumar P
  await supabase
    .from('attendance_records')
    .update({
      check_in_time: '12:18:54 pm',
      status: 'present',
    })
    .or('employee_id.eq.EMP-14,employee_id.eq.EMP-014,employee_name.ilike.%Muthukumar%');

  // Update attendance_records for Thirumalai R K
  await supabase
    .from('attendance_records')
    .update({
      check_in_time: '09:20:30 am',
      status: 'present',
    })
    .or('employee_id.eq.EMP-10,employee_name.ilike.%Thirumalai%');

  // Update attendance_records for Dharun B
  await supabase
    .from('attendance_records')
    .update({
      check_in_time: '09:49:52 am',
      status: 'present',
    })
    .or('employee_id.eq.EMP-01,employee_name.ilike.%Dharun%');

  console.log('✅ Supabase attendance_records updated with correct IST timestamps!');
}

updateAllRecordsToIST().catch(console.error);
