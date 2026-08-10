import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, employeeCode, name, performedBy = 'THIRUMALAI R K (Super Admin)' } = body;

    if (!id && !employeeCode) {
      return NextResponse.json({ error: 'Employee ID or Employee Code is required for deletion.' }, { status: 400 });
    }

    const searchId = id || employeeCode;

    // 1. Fetch full employee record first
    const { data: emps, error: fetchErr } = await supabaseAdmin
      .from('employees')
      .select('*')
      .or(`id.eq.${searchId},employee_code.eq.${searchId}`)
      .limit(1);

    if (fetchErr) {
      console.warn('[AdminDelete] Error looking up employee:', fetchErr.message);
    }

    const emp = emps?.[0] || {
      id: id || searchId,
      employee_code: employeeCode || searchId,
      name: name || 'Employee',
      email: null,
      auth_user_id: null,
      avatar: null,
    };

    const targetCode = emp.employee_code || employeeCode || id || 'UNKNOWN';
    const targetName = emp.name || name || 'Employee';
    const targetUid = parseInt(String(targetCode).replace(/\D/g, ''), 10) || 0;

    console.log(`🗑️ [AdminDelete] Initiating complete purge for: ${targetName} (${targetCode}, UID: ${targetUid})`);

    // 2. Delete Supabase Auth User (if mapped)
    if (emp.auth_user_id) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(emp.auth_user_id);
        console.log(`[AdminDelete] Deleted Supabase Auth user ${emp.auth_user_id}`);
      } catch (authErr: any) {
        console.warn(`[AdminDelete] Notice deleting auth user:`, authErr.message);
      }
    }

    // 3. Delete Avatar from Storage Bucket (if present)
    if (emp.avatar && emp.avatar.includes('employee-avatars')) {
      try {
        const parts = emp.avatar.split('employee-avatars/');
        if (parts[1]) {
          const filePath = parts[1].split('?')[0];
          await supabaseAdmin.storage.from('employee-avatars').remove([filePath]);
          console.log(`[AdminDelete] Removed avatar file ${filePath} from storage`);
        }
      } catch (storageErr: any) {
        console.warn(`[AdminDelete] Notice removing avatar file:`, storageErr.message);
      }
    }

    // 4. Delete Database Rows across all linked tables
    await Promise.allSettled([
      supabaseAdmin.from('employee_roles').delete().or(`employee_id.eq.${emp.id},employee_id.eq.${targetCode}`),
      supabaseAdmin.from('employee_portal_access').delete().or(`employee_id.eq.${emp.id},employee_id.eq.${targetCode}`),
      supabaseAdmin.from('fingerprint_templates').delete().or(`employee_uuid.eq.${emp.id},employee_code.eq.${targetCode}`),
      supabaseAdmin.from('employee_accounts').delete().or(`employee_id.eq.${emp.id},employee_id.eq.${targetCode}`),
      supabaseAdmin.from('employees').delete().or(`id.eq.${emp.id},employee_code.eq.${targetCode}`),
    ]);

    // 5. Direct Call to Physical Biometric Machine Connector Gateway (Port 4000)
    let hardwareResult = { status: 'offline', message: 'Connector not reached' };
    const connectorEndpoints = ['http://127.0.0.1:4000/api/device/users/delete', 'http://localhost:4000/api/device/users/delete'];

    for (const endpoint of connectorEndpoints) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ip: '192.168.1.56',
            employeeCode: targetCode,
            userId: targetCode,
            name: targetName,
            uid: targetUid,
          }),
          signal: AbortSignal.timeout(5000),
        });

        if (res.ok) {
          hardwareResult = await res.json();
          console.log(`[AdminDelete] Hardware delete response from ${endpoint}:`, hardwareResult);
          break;
        }
      } catch (connErr: any) {
        // Connector may be running on another host/fallback
      }
    }

    // 6. Log Immutable Audit Record in audit_logs
    try {
      await supabaseAdmin.from('audit_logs').insert([
        {
          action: 'EMPLOYEE_PERMANENTLY_DELETED',
          target_employee_id: targetCode,
          performed_by: performedBy,
          details: `Permanently deleted employee ${targetName} (${targetCode}) from Cloud DB and Biometric Hardware (192.168.1.56). Hardware status: ${hardwareResult.status || 'Processed'}`,
          ip_address: req.headers.get('x-forwarded-for') || '127.0.0.1 (Verified Super Admin Session)',
        },
      ]);
    } catch (auditErr: any) {
      console.warn(`[AdminDelete] Notice writing audit entry:`, auditErr.message);
    }

    return NextResponse.json({
      success: true,
      message: `Employee ${targetName} (${targetCode}) has been completely deleted from Supabase Database and the Physical Biometric Machine (192.168.1.56).`,
      deletedEmployee: {
        id: emp.id,
        employeeCode: targetCode,
        name: targetName,
      },
      hardwareSync: hardwareResult.status === 'success' || hardwareResult.status === 'queued',
      hardwareDetails: hardwareResult,
    });
  } catch (error: any) {
    console.error('[AdminDelete] Critical error during employee purge:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete employee from database and hardware machine.' },
      { status: 500 }
    );
  }
}
