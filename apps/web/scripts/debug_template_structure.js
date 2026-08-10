const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://powyigqkkzfpbalqunyl.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MzIzMzUsImV4cCI6MjEwMTMwODMzNX0.YgznbTw4Ri1zL14svON5R3skUSBb-AnAo6R2IMR7sRk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectStoredTemplates() {
  console.log('=== INSPECTING STORED TEMPLATES IN SUPABASE ===\n');
  const { data: templates } = await supabase.from('fingerprint_templates').select('*');

  if (!templates || templates.length === 0) {
    console.log('No templates found.');
    return;
  }

  templates.forEach((t, i) => {
    const raw = t.finger_template || '';
    let decodedPrefix = '';
    try {
      decodedPrefix = Buffer.from(raw.slice(0, 100), 'base64').toString('utf8');
    } catch (e) {}

    console.log(`[${i + 1}] ID: ${t.id} | Code: ${t.employee_code} | Pos: ${t.finger_position} | Len: ${raw.length}`);
    console.log(`    Raw Start  : ${raw.slice(0, 60)}...`);
    console.log(`    Decoded Start: ${JSON.stringify(decodedPrefix.slice(0, 60))}`);
    console.log('--------------------------------------------------');
  });
}

inspectStoredTemplates().catch(console.error);
