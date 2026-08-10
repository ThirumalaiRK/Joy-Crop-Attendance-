import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const limit = parseInt(searchParams.get('limit') || '30', 10);

    let query = supabaseAdmin
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (employeeId) {
      query = query.eq('target_employee_id', employeeId);
    }

    const { data: logs, error } = await query;

    if (error) {
      // If table not created yet, return mock-free empty list
      return NextResponse.json({ success: true, logs: [] });
    }

    return NextResponse.json({
      success: true,
      logs: logs || [],
    });
  } catch (err: any) {
    return NextResponse.json({ success: true, logs: [] });
  }
}
