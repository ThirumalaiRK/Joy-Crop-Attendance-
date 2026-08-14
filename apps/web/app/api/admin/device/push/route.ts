import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const CONNECTOR_URLS = [
  process.env.CONNECTOR_URL,
  process.env.NEXT_PUBLIC_CONNECTOR_URL,
  'https://courageous-unexplosively-beckett.ngrok-free.dev',
  'http://127.0.0.1:4000',
  'http://localhost:4000',
].filter(Boolean) as string[];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeCode, employeeCodes, ip } = body;
    const targetIp = ip || '192.168.1.56';

    const codes: string[] = [];
    if (Array.isArray(employeeCodes)) {
      codes.push(...employeeCodes.map(String));
    } else if (employeeCode) {
      codes.push(String(employeeCode));
    }

    if (codes.length === 0) {
      return NextResponse.json({ success: false, error: 'Provide employeeCode or employeeCodes' }, { status: 400 });
    }

    // 1. Attempt via Candidate Connector HTTP APIs (including ngrok tunnel)
    for (const baseUrl of CONNECTOR_URLS) {
      try {
        const targetUrl = `${baseUrl.replace(/\/+$/, '')}/api/device/users/push`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const connRes = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
          body: JSON.stringify({ ip: targetIp, employeeCodes: codes }),
          signal: controller.signal,
          cache: 'no-store',
        });
        clearTimeout(timeoutId);

        if (connRes.ok) {
          const data = await connRes.json();
          return NextResponse.json({ success: true, via: 'connector', data });
        }
      } catch (_) {
        // Try next candidate connector URL
      }
    }

    // 2. Database update fallback
    const { data: empRows, error: empErr } = await supabase
      .from('employees')
      .select('*')
      .in('employee_code', codes);

    if (empErr || !empRows || empRows.length === 0) {
      return NextResponse.json({ success: false, error: `No employee found in Supabase for code(s): ${codes.join(', ')}` }, { status: 404 });
    }

    const results: any[] = [];
    for (const emp of empRows) {
      const codeStr = emp.employee_code || emp.id;
      const numericUid = emp.device_uid
        ? parseInt(String(emp.device_uid), 10)
        : (parseInt(codeStr.replace(/\D/g, ''), 10) || 1);

      await supabase
        .from('employees')
        .update({ device_uid: numericUid, device_user_id: codeStr, updated_at: new Date().toISOString() })
        .eq('id', emp.id);

      results.push({ employeeCode: codeStr, name: emp.name, uid: numericUid, status: 'Queued in Supabase DB for Connector' });
    }

    return NextResponse.json({
      success: true,
      via: 'supabase_db',
      message: `Employee record(s) updated in database for automatic sync to hardware terminal at ${targetIp}`,
      results,
    });

  } catch (err: any) {
    console.error('[PushAPI] Internal error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Push failed' }, { status: 500 });
  }
}
