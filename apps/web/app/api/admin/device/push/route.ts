import { NextRequest, NextResponse } from 'next/server';
import { ZKTecoDevice } from '@hrms/biometrics-sdk';
import { supabase } from '@/lib/supabase';

const CONNECTOR_BASE = process.env.NEXT_PUBLIC_CONNECTOR_URL || 'http://localhost:4000';

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

    // 1. First attempt via Connector HTTP API
    try {
      const connRes = await fetch(`${CONNECTOR_BASE}/api/device/users/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: targetIp, employeeCodes: codes }),
      });

      if (connRes.ok) {
        const data = await connRes.json();
        return NextResponse.json({ success: true, via: 'connector', data });
      }
    } catch (_) {
      console.warn('[PushAPI] Connector service unreachable on port 4000 — using direct SDK fallback');
    }

    // 2. Direct TCP Fallback via @hrms/biometrics-sdk
    const { data: empRows, error: empErr } = await supabase
      .from('employees')
      .select('*')
      .in('employee_code', codes);

    if (empErr || !empRows || empRows.length === 0) {
      return NextResponse.json({ success: false, error: `No employee found in Supabase for code(s): ${codes.join(', ')}` }, { status: 404 });
    }

    const device = new ZKTecoDevice(targetIp, 4370);
    const connected = await device.connect();
    if (!connected) {
      return NextResponse.json({ success: false, error: `Cannot reach biometric hardware device at ${targetIp}` }, { status: 503 });
    }

    const results: any[] = [];
    for (const emp of empRows) {
      const codeStr = emp.employee_code || emp.id;
      const numericUid = emp.device_uid
        ? parseInt(String(emp.device_uid), 10)
        : (parseInt(codeStr.replace(/\D/g, ''), 10) || 1);

      const written = await device.setUser(numericUid, codeStr, emp.name || 'Employee', '', 0, 0);

      if (written) {
        // Update device_uid in Supabase
        await supabase
          .from('employees')
          .update({ device_uid: numericUid, device_user_id: codeStr, updated_at: new Date().toISOString() })
          .eq('id', emp.id);

        // Push stored fingerprint templates if any
        const { data: templates } = await supabase
          .from('fingerprint_templates')
          .select('*')
          .eq('employee_code', codeStr);

        let tplCount = 0;
        if (templates && templates.length > 0) {
          const FINGER_MAP: Record<string, number> = {
            'Right Thumb': 0, 'Right Index': 1, 'Right Middle': 2, 'Right Ring': 3, 'Right Little': 4,
            'Left Thumb': 5, 'Left Index': 6, 'Left Middle': 7, 'Left Ring': 8, 'Left Little': 9,
          };
          for (const tpl of templates) {
            const fingerIndex = FINGER_MAP[tpl.finger_position] ?? 0;
            try {
              const buf = Buffer.from(tpl.finger_template, 'base64');
              const ok = await (device as any).setTemplate(numericUid, fingerIndex, buf);
              if (ok) tplCount++;
            } catch (_) {}
          }
        }

        results.push({ employeeCode: codeStr, name: emp.name, uid: numericUid, templatesPushed: tplCount, status: 'Success' });
      } else {
        results.push({ employeeCode: codeStr, name: emp.name, status: 'Failed to write to device' });
      }
    }

    await device.disconnect();

    return NextResponse.json({
      success: true,
      via: 'direct_sdk',
      message: `Pushed ${results.length} employee(s) directly to hardware terminal at ${targetIp}`,
      results,
    });

  } catch (err: any) {
    console.error('[PushAPI] Internal error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Push failed' }, { status: 500 });
  }
}
