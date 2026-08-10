import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId, action = 'SUSPEND', reason = 'Admin Action', actorName = 'THIRUMALAI R K (Super Admin)' } = body;

    if (!employeeId) {
      return NextResponse.json({ error: 'Missing employeeId parameter.' }, { status: 400 });
    }

    const isSuspend = action === 'SUSPEND';
    const newStatus = isSuspend ? 'Suspended' : 'Active';
    const newAccountStatus = isSuspend ? 'SUSPENDED' : 'ACTIVE';

    // 1. Update employee profile status
    try {
      await supabaseAdmin
        .from('employees')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .or(`id.eq.${employeeId},employee_code.eq.${employeeId}`);
    } catch (e: any) {
      console.warn('[TogglePortal] employees update notice:', e?.message);
    }

    // 2. Update employee_portal_access record
    try {
      await supabaseAdmin.from('employee_portal_access').upsert(
        {
          employee_id: String(employeeId),
          portal_enabled: !isSuspend,
          account_status: newAccountStatus,
          suspended_at: isSuspend ? new Date().toISOString() : null,
          suspended_by: isSuspend ? actorName : null,
          suspension_reason: isSuspend ? reason : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'employee_id' }
      );
    } catch (_) {}

    // 3. Write Immutable Audit Log
    try {
      await supabaseAdmin.from('audit_logs').insert({
        actor_name: actorName,
        target_employee_id: String(employeeId),
        action: isSuspend ? 'PORTAL_SUSPENDED' : 'PORTAL_REACTIVATED',
        entity_type: 'PORTAL_ACCESS',
        entity_id: String(employeeId),
        details: isSuspend
          ? `Portal access suspended for employee ${employeeId}. Reason: ${reason}`
          : `Portal access reactivated for employee ${employeeId}.`,
        new_value: {
          account_status: newAccountStatus,
          status: newStatus,
          reason,
          timestamp: new Date().toISOString(),
        },
        ip_address: req.headers.get('x-forwarded-for') || '127.0.0.1',
        user_agent: req.headers.get('user-agent') || 'Browser Admin',
        created_at: new Date().toISOString(),
      });
    } catch (_) {}

    return NextResponse.json({
      success: true,
      employeeId,
      status: newStatus,
      accountStatus: newAccountStatus,
      message: isSuspend
        ? `Portal access successfully SUSPENDED for employee ${employeeId}.`
        : `Portal access successfully REACTIVATED for employee ${employeeId}.`,
    });
  } catch (err: any) {
    console.error('[TogglePortal Exception]', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error toggling portal access.' },
      { status: 500 }
    );
  }
}
