const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://powyigqkkzfpbalqunyl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MzIzMzUsImV4cCI6MjEwMTMwODMzNX0.YgznbTw4Ri1zL14svON5R3skUSBb-AnAo6R2IMR7sRk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: all } = await supabase.from('employees').select('id, employee_code, name').order('created_at', { ascending: true });
  
  const keepMap = new Map();
  const deleteIds = [];

  for (const emp of all) {
    const key = (emp.employee_code || emp.name).trim().toUpperCase();
    if (!keepMap.has(key)) {
      keepMap.set(key, emp.id);
    } else {
      deleteIds.push(emp.id);
    }
  }

  console.log(`Deleting ${deleteIds.length} duplicate IDs...`);
  if (deleteIds.length > 0) {
    await supabase.from('employees').delete().in('id', deleteIds);
  }

  const { data: final } = await supabase.from('employees').select('id, employee_code, name, status');
  console.table(final);
  console.log(`📊 PERFECT FINAL ROW COUNT: ${final.length}`);
}

main().catch(console.error);
