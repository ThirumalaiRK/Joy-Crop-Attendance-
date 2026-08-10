const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://powyigqkkzfpbalqunyl.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MzIzMzUsImV4cCI6MjEwMTMwODMzNX0.YgznbTw4Ri1zL14svON5R3skUSBb-AnAo6R2IMR7sRk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectBytes() {
  const { data: templates } = await supabase.from('fingerprint_templates').select('*');
  if (!templates || templates.length < 2) return;

  const t2 = templates[1]; // EMP-000001 Left Thumb scan 1
  const t3 = templates[2]; // EMP-000001 Left Thumb scan 2

  const buf2 = Buffer.from(t2.finger_template, 'base64');
  const buf3 = Buffer.from(t3.finger_template, 'base64');

  console.log('Buffer 2 length:', buf2.length, 'bytes');
  console.log('Buffer 3 length:', buf3.length, 'bytes');

  console.log('\nBuffer 2 first 50 bytes (hex):', buf2.subarray(0, 50).toString('hex'));
  console.log('Buffer 3 first 50 bytes (hex):', buf3.subarray(0, 50).toString('hex'));

  // Compare byte overlapping
  let byteMatches = 0;
  const minLen = Math.min(buf2.length, buf3.length);
  for (let i = 0; i < minLen; i++) {
    if (buf2[i] === buf3[i]) byteMatches++;
  }

  console.log(`Byte match ratio: ${byteMatches}/${minLen} (${((byteMatches / minLen) * 100).toFixed(2)}%)`);

  // Substring search on 4-byte minutiae chunks
  let chunkHits = 0;
  let totalChunks = 0;
  for (let i = 20; i <= buf2.length - 4; i += 2) {
    totalChunks++;
    const chunk = buf2.subarray(i, i + 4);
    if (buf3.includes(chunk)) {
      chunkHits++;
    }
  }
  console.log(`Minutiae 4-byte chunk match ratio: ${chunkHits}/${totalChunks} (${((chunkHits / totalChunks) * 100).toFixed(2)}%)`);
}

inspectBytes().catch(console.error);
