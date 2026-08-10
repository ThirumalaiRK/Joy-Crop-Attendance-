import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId, email } = body;

    if (!employeeId || !email) {
      return NextResponse.json(
        { error: 'Missing employeeId or email parameter.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const newTempPassword = `Joy@${new Date().getFullYear()}#${Math.floor(1000 + Math.random() * 9000)}`;

    // 1. Check if auth user exists
    const { data: userList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 50 });
    const authUser = userList?.users?.find(
      (u) => u.email?.toLowerCase() === cleanEmail
    );

    if (authUser) {
      // Update password via Supabase Admin Auth API
      const { error: updateAuthErr } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        password: newTempPassword,
      });

      if (updateAuthErr) {
        console.error('[ResetPassword] Error updating user password:', updateAuthErr);
      }
    }

    // 2. Update employee_portal_access record
    try {
      await supabaseAdmin.from('employee_portal_access').update({
        password_reset_required: true,
        last_password_change_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('employee_id', String(employeeId));
    } catch (_) {}

    // 3. Write Audit Log
    try {
      await supabaseAdmin.from('audit_logs').insert({
        actor_name: 'THIRUMALAI R K (Super Admin)',
        target_employee_id: String(employeeId),
        action: 'PASSWORD_RESET_REQUESTED',
        entity_type: 'EMPLOYEE_SECURITY',
        entity_id: String(employeeId),
        details: `Generated secure temporary password reset for ${cleanEmail}. Password change will be required on login.`,
        new_value: {
          password_reset_required: true,
          email: cleanEmail,
          requested_at: new Date().toISOString(),
        },
        ip_address: req.headers.get('x-forwarded-for') || '127.0.0.1',
        user_agent: req.headers.get('user-agent') || 'Browser Admin',
        created_at: new Date().toISOString(),
      });
    } catch (_) {}

    return NextResponse.json({
      success: true,
      email: cleanEmail,
      newPassword: newTempPassword,
      message: `Password reset successfully for ${cleanEmail}! Temporary Password: ${newTempPassword}`,
    });
  } catch (err: any) {
    console.error('[ResetPassword Exception]', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error resetting password.' },
      { status: 500 }
    );
  }
}
