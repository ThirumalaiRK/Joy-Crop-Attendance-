import { NextRequest, NextResponse } from 'next/server';
import { supabase, updateEmployeeInSupabase, fetchEmployeesFromSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code') || searchParams.get('id');

    const employees = await fetchEmployeesFromSupabase();
    if (code) {
      const match = employees.find(
        (e) => (e.employeeCode || e.id).toUpperCase() === code.toUpperCase()
      );
      if (!match) {
        return NextResponse.json({ success: false, error: `Employee ${code} not found` }, { status: 404 });
      }
      return NextResponse.json({ success: true, employee: match });
    }

    return NextResponse.json({ success: true, employees, count: employees.length });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to fetch employee profiles' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeCode, id, name, email, phone, designation, department, shift, manager, status, avatar } = body;

    const targetCode = employeeCode || id;
    if (!targetCode) {
      return NextResponse.json({ success: false, error: 'employeeCode or id is required' }, { status: 400 });
    }

    const payload: any = {
      id: id || targetCode,
      employeeCode: targetCode,
      name: name || 'Employee',
      email: email || `${targetCode.toLowerCase()}@agencyos.ai`,
      phone: phone || null,
      designation: designation || 'Software Engineer',
      department: department || 'Software Development',
      shift: shift || 'General Morning (09:00 AM - 06:00 PM)',
      manager: manager || 'THIRUMALAI R K (MD)',
      avatar: avatar || null,
      status: status || 'Active',
    };

    const updateRes = await updateEmployeeInSupabase(payload);

    return NextResponse.json({
      success: true,
      message: `Employee profile ${targetCode} successfully synchronized across backend & realtime DB!`,
      data: updateRes,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to sync employee profile' }, { status: 500 });
  }
}
