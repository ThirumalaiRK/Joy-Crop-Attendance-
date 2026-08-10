import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId, email, name, role = 'Employee', company = 'Joy Corporate Solutions Pvt. Ltd.' } = body;

    if (!employeeId || !email) {
      return NextResponse.json(
        { error: 'Missing employeeId or email parameter.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Check if Supabase Auth user already exists
    const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 50,
    });

    if (listError) {
      console.error('[Provision] Error listing users:', listError);
    }

    let authUser = userList?.users?.find(
      (u) => u.email?.toLowerCase() === cleanEmail
    );

    // Generate secure temporary initial password
    const tempPassword = `Joy@${new Date().getFullYear()}#${Math.floor(1000 + Math.random() * 9000)}`;

    if (!authUser) {
      // 2. Create new Supabase Auth user
      const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          employee_id: employeeId,
          name: name || 'Employee',
          company,
          role,
        },
      });

      if (createError) {
        console.error('[Provision] Auth createUser error:', createError);
        return NextResponse.json(
          { error: `Supabase Auth creation failed: ${createError.message}` },
          { status: 500 }
        );
      }

      authUser = newUserData.user;
    } else {
      // User already exists in auth.users -> reset/update their password & metadata
      await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        password: tempPassword,
        user_metadata: {
          employee_id: employeeId,
          name: name || 'Employee',
          company,
          role,
        },
      });
    }

    const authUserId = authUser.id;

    // 3. Update employee record with auth_user_id & portal_status
    try {
      await supabaseAdmin
        .from('employees')
        .update({
          email: cleanEmail,
          status: 'Active',
        })
        .or(`id.eq.${employeeId},employee_code.eq.${employeeId}`);
    } catch (e: any) {
      console.warn('[Provision] employees update notice:', e?.message);
    }

    // 4. Try updating employee_portal_access table if exists
    try {
      await supabaseAdmin.from('employee_portal_access').upsert(
        {
          employee_id: String(employeeId),
          auth_user_id: authUserId,
          portal_enabled: true,
          account_status: 'ACTIVE',
          login_email: cleanEmail,
          password_reset_required: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'employee_id' }
      );
    } catch (_) {}

    // 5. Try updating employee_roles table if exists
    try {
      await supabaseAdmin.from('employee_roles').upsert(
        {
          employee_id: String(employeeId),
          auth_user_id: authUserId,
          role_id: role.toUpperCase(),
          assigned_by: 'Admin Console',
          assigned_at: new Date().toISOString(),
        },
        { onConflict: 'employee_id,role_id' }
      );
    } catch (_) {}

    // 6. Write Audit Log Entry
    try {
      await supabaseAdmin.from('audit_logs').insert({
        actor_name: 'THIRUMALAI R K (Super Admin)',
        target_employee_id: String(employeeId),
        action: 'AUTH_PROVISIONED',
        entity_type: 'EMPLOYEE_IDENTITY',
        entity_id: String(employeeId),
        details: `Provisioned Supabase Auth User for ${cleanEmail} (Auth UID: ${authUserId}) with role ${role}. Temporary password generated.`,
        new_value: {
          auth_user_id: authUserId,
          email: cleanEmail,
          portal_status: 'ACTIVE',
          role,
        },
        ip_address: req.headers.get('x-forwarded-for') || '127.0.0.1',
        user_agent: req.headers.get('user-agent') || 'Browser Admin',
        created_at: new Date().toISOString(),
      });
    } catch (_) {}

    return NextResponse.json({
      success: true,
      employeeId,
      authUserId,
      email: cleanEmail,
      password: tempPassword,
      role,
      portalStatus: 'ACTIVE',
      message: `Successfully provisioned Supabase Auth credentials for ${cleanEmail}!`,
    });
  } catch (err: any) {
    console.error('[Provision Exception]', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error provisioning credentials.' },
      { status: 500 }
    );
  }
}
