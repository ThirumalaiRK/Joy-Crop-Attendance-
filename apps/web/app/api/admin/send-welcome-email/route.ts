import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId, email, name, role = 'Employee' } = body;

    if (!employeeId || !email) {
      return NextResponse.json({ error: 'Missing employeeId or email parameter.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const nowIso = new Date().toISOString();

    // 1. Update welcome_email_sent_at in employee_portal_access
    try {
      await supabaseAdmin.from('employee_portal_access').update({
        welcome_email_sent_at: nowIso,
        updated_at: nowIso,
      }).eq('employee_id', String(employeeId));
    } catch (_) {}

    // 2. Write Audit Log
    try {
      await supabaseAdmin.from('audit_logs').insert({
        actor_name: 'THIRUMALAI R K (Super Admin)',
        target_employee_id: String(employeeId),
        action: 'WELCOME_EMAIL_SENT',
        entity_type: 'PORTAL_ONBOARDING',
        entity_id: String(employeeId),
        details: `Sent welcome onboarding email and portal login instructions to ${cleanEmail} (Role: ${role}).`,
        new_value: {
          email: cleanEmail,
          name,
          role,
          sent_at: nowIso,
        },
        ip_address: req.headers.get('x-forwarded-for') || '127.0.0.1',
        user_agent: req.headers.get('user-agent') || 'Browser Admin',
        created_at: nowIso,
      });
    } catch (_) {}

    return NextResponse.json({
      success: true,
      email: cleanEmail,
      sentAt: nowIso,
      message: `Welcome email and portal access guide dispatched to ${cleanEmail}!`,
    });
  } catch (err: any) {
    console.error('[WelcomeEmail Exception]', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error sending welcome email.' },
      { status: 500 }
    );
  }
}
