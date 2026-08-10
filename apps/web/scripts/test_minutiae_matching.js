const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://powyigqkkzfpbalqunyl.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MzIzMzUsImV4cCI6MjEwMTMwODMzNX0.YgznbTw4Ri1zL14svON5R3skUSBb-AnAo6R2IMR7sRk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function compareMinutiae(t1, t2) {
  if (!t1 || !t2) return 0;
  // Strip the 28-character ISO timestamp prefix if present
  const m1 = t1.length > 50 && t1.startsWith('MjAy') ? t1.slice(28) : t1;
  const m2 = t2.length > 50 && t2.startsWith('MjAy') ? t2.slice(28) : t2;

  if (m1 === m2) return 100;

  // Exact prefix signature match on minutiae vector
  if (m1.slice(0, 16) === m2.slice(0, 16) || m1.slice(10, 26) === m2.slice(10, 26)) {
    return 95;
  }

  // Sliding pattern search on minutiae blocks (12-char blocks)
  let hits = 0;
  let totalBlocks = 0;
  for (let i = 0; i <= m1.length - 12; i += 6) {
    totalBlocks++;
    const block = m1.slice(i, i + 12);
    if (m2.includes(block)) {
      hits++;
    }
  }

  const matchRatio = totalBlocks > 0 ? (hits / totalBlocks) * 100 : 0;
  return Math.round(matchRatio);
}

async function runTest() {
  const { data: templates } = await supabase.from('fingerprint_templates').select('*');
  console.log(`Loaded ${templates.length} stored templates from Supabase.`);

  // Compare templates against each other
  for (let i = 0; i < templates.length; i++) {
    for (let j = i + 1; j < templates.length; j++) {
      const t1 = templates[i];
      const t2 = templates[j];
      const score = compareMinutiae(t1.finger_template, t2.finger_template);
      console.log(`Comparison [${t1.employee_code} (${t1.finger_position})] VS [${t2.employee_code} (${t2.finger_position})]: Match Score = ${score}%`);
    }
  }
}

runTest().catch(console.error);
