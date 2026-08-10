import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId, role = 'EMPLOYEE', actorName = 'THIRUMALAI R K (Super Admin)' } = body;

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId is required.' }, { status: 400 });
    }

    const cleanRole = role.toUpperCase();

    // 1. Update employee_roles
    try {
      await supabaseAdmin.from('employee_roles').upsert({
        employee_id: String(employeeId),
        role_id: cleanRole,
        assigned_by: actorName,
        assigned_at: new Date().toISOString(),
      }, { onConflict: 'employee_id' });
    } catch (_) {}

    // 2. Write Audit Log
    try {
      await supabaseAdmin.from('audit_logs').insert({
        actor_name: actorName,
        target_employee_id: String(employeeId),
        action: 'ROLE_ASSIGNED',
        entity_type: 'ROLE_PERMISSION',
        entity_id: String(employeeId),
        details: `Assigned RBAC role ${cleanRole} to employee ${employeeId}.`,
        new_value: { role: cleanRole },
        ip_address: req.headers.get('x-forwarded-for') || '127.0.0.1',
        user_agent: req.headers.get('user-agent') || 'Browser Admin',
        created_at: new Date().toISOString(),
      });
    } catch (_) {}

    return NextResponse.json({
      success: true,
      employeeId,
      role: cleanRole,
      message: `Role ${cleanRole} successfully assigned to employee ${employeeId}!`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
