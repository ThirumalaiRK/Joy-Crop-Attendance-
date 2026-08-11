import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const TUNNEL_URLS = [
  process.env.CONNECTOR_URL,
  process.env.NEXT_PUBLIC_CONNECTOR_URL,
  'https://courageous-unexplosively-beckett.ngrok-free.dev',
  'http://127.0.0.1:4000',
  'http://localhost:4000',
].filter(Boolean) as string[];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ip = '192.168.1.56', port = 4370, uid, userId, userName, fingerIndex = 0 } = body;

    const numericUid = uid || (userId ? parseInt(String(userId).replace(/\D/g, ''), 10) : 8) || 8;
    const strUserId = userId || `EMP-${String(numericUid).padStart(2, '0')}`;
    const empName = userName || 'Employee';

    let tunnelSuccess = false;
    let tunnelResponseData: any = null;

    // 1. Try forwarding directly to active Connector / Ngrok tunnel
    for (const baseUrl of TUNNEL_URLS) {
      try {
        const targetUrl = `${baseUrl.replace(/\/+$/, '')}/api/device/enroll`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const res = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ip,
            port,
            uid: numericUid,
            userId: strUserId,
            userName: empName,
            fingerIndex,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          tunnelResponseData = await res.json().catch(() => ({}));
          tunnelSuccess = true;
          break;
        }
      } catch (_) {
        // Continue to next fallback
      }
    }

    // 2. Queue in Supabase device_commands ONLY if all direct tunnels failed.
    // CRITICAL: Do NOT queue when tunnel succeeded — the direct route already has a poll loop
    // running on the connector. Queuing anyway causes a 2nd startEnrollment that resets the
    // device mid-scan and breaks the enrollment (finger never saved).
    if (!tunnelSuccess) {
      try {
        await supabase.from('device_commands').insert([
          {
            device_ip: ip,
            command_type: 'ENROLL_USER',
            payload: {
              uid: numericUid,
              userId: strUserId,
              employeeCode: strUserId,
              name: empName,
              fingerIndex,
              port,
            },
            status: 'PENDING',
            created_at: new Date().toISOString(),
          },
        ]);
        console.log('[Enroll API] Connector offline — queued ENROLL_USER for CommandProcessor fallback.');
      } catch (e: any) {
        console.warn('[Enroll API] Command queue notice:', e?.message);
      }
    } else {
      console.log('[Enroll API] Direct tunnel succeeded — skipping device_commands queue to avoid double-enrollment.');
    }

    // 3. Mark employee enrollment status in Supabase
    try {
      await supabase
        .from('employees')
        .update({
          fingerprint_enrolled: true,
          is_enrolled: true,
          status: 'Active',
          updated_at: new Date().toISOString(),
        })
        .or(`employee_code.eq.${strUserId},device_user_id.eq.${strUserId}`);
    } catch (_) {}

    return NextResponse.json({
      status: 'success',
      message:
        tunnelResponseData?.message ||
        `👉 Place ${empName}'s finger on the hardware scanner terminal now! (3 scans on Identix K90 Pro)`,
      uid: numericUid,
      userId: strUserId,
      name: empName,
      directTunnel: tunnelSuccess,
    });
  } catch (err: any) {
    console.error('[Device Enroll API Route] Error:', err);
    return NextResponse.json(
      {
        status: 'error',
        error: err?.message || 'Failed to dispatch hardware enrollment command',
      },
      { status: 500 }
    );
  }
}
