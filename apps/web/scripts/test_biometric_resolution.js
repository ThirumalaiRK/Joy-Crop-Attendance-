const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://powyigqkkzfpbalqunyl.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MzIzMzUsImV4cCI6MjEwMTMwODMzNX0.YgznbTw4Ri1zL14svON5R3skUSBb-AnAo6R2IMR7sRk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function matchLiveFingerprintToSupabaseTemplates(liveB64, templates) {
  if (!liveB64 || !templates || templates.length === 0) return null;

  let bestMatch = null;
  let highestScore = -1;

  const liveMinutiae = liveB64.length > 50 && liveB64.startsWith('MjAy') ? liveB64.slice(28) : liveB64;

  for (const tmpl of templates) {
    const storedB64 = tmpl.finger_template;
    if (!storedB64) continue;

    // 1. Exact string match
    if (liveB64 === storedB64) {
      return { template: tmpl, score: 100, method: 'EXACT' };
    }

    const storedMinutiae = storedB64.length > 50 && storedB64.startsWith('MjAy') ? storedB64.slice(28) : storedB64;

    // 2. Length difference penalty
    const lenDiff = Math.abs(liveB64.length - storedB64.length);

    // 3. Sliding 12-char minutiae block overlap score
    let hits = 0;
    let total = 0;
    for (let i = 0; i <= liveMinutiae.length - 12; i += 6) {
      total++;
      if (storedMinutiae.includes(liveMinutiae.slice(i, i + 12))) {
        hits++;
      }
    }

    const blockScore = total > 0 ? (hits / total) * 100 : 0;
    
    // Total combined score: weighted block score minus length difference penalty
    let score = blockScore - (lenDiff > 500 ? (lenDiff - 500) / 50 : 0);

    if (score > highestScore) {
      highestScore = score;
      bestMatch = { template: tmpl, score: Math.round(score), lenDiff, hits, total };
    }
  }

  return bestMatch;
}

async function testResolution() {
  const { data: templates } = await supabase.from('fingerprint_templates').select('*');
  console.log(`Loaded ${templates.length} templates.`);
  
  templates.forEach((t) => {
    const res = matchLiveFingerprintToSupabaseTemplates(t.finger_template, templates.filter(x => x !== t));
    console.log(`Matching [${t.employee_code} (${t.finger_position}) - Len: ${t.finger_template.length}] -> Best Match: ${res ? `${res.template.employee_code} (${res.template.finger_position}) Score: ${res.score}% (LenDiff: ${res.lenDiff})` : 'None'}`);
  });
}

if (require.main === module) {
  testResolution().catch(console.error);
}
