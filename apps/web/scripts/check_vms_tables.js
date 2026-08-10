const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://powyigqkkzfpbalqunyl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MzIzMzUsImV4cCI6MjEwMTMwODMzNX0.YgznbTw4Ri1zL14svON5R3skUSBb-AnAo6R2IMR7sRk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('Checking visitors table...');
  const { data: vData, error: vErr } = await supabase.from('visitors').select('*').limit(1);
  if (vErr) {
    console.log('Visitors table error:', vErr.message, vErr.code);
  } else {
    console.log('Visitors table exists! Count:', vData.length);
  }

  console.log('Checking visitor_passes table...');
  const { data: pData, error: pErr } = await supabase.from('visitor_passes').select('*').limit(1);
  if (pErr) {
    console.log('Visitor_passes table error:', pErr.message, pErr.code);
  } else {
    console.log('Visitor_passes table exists! Count:', pData.length);
  }
}

run();
