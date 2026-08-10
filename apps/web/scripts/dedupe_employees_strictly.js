const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://powyigqkkzfpbalqunyl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MzIzMzUsImV4cCI6MjEwMTMwODMzNX0.YgznbTw4Ri1zL14svON5R3skUSBb-AnAo6R2IMR7sRk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🔍 Deduplicating employees table strictly...');

  const { data: all, error } = await supabase.from('employees').select('*').order('created_at', { ascending: true });
  if (error || !all) {
    console.error('Error:', error);
    return;
  }

  const seenCodes = new Set();
  const toDeleteIds = [];

  for (const emp of all) {
    const code = (emp.employee_code || emp.id).trim();
    if (seenCodes.has(code)) {
      toDeleteIds.push(emp.id);
    } else {
      seenCodes.add(code);
    }
  }

  console.log(`Found ${toDeleteIds.length} duplicate IDs to delete.`);

  if (toDeleteIds.length > 0) {
    for (let i = 0; i < toDeleteIds.length; i += 20) {
      const chunk = toDeleteIds.slice(i, i + 20);
      await supabase.from('employees').delete().in('id', chunk);
    }
    console.log('✅ Deleted all duplicate rows.');
  }

  const { count } = await supabase.from('employees').select('count', { count: 'exact', head: true });
  console.log(`📊 FINAL EXACT COUNT IN EMPLOYEES TABLE: ${count}`);
}

main().catch(console.error);
