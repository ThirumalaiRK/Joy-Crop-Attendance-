import { NextResponse } from 'next/server';
import {
  triggerEmployeeEvent,
  getEmployeeCurrentState,
  hasCheckedOut,
  getValidActionsForState,
  syncSupabaseEvents,
} from '../../../../lib/attendance/time-engine';
import { AttendanceEventType } from '../../../../lib/attendance/attendance-types';

export async function POST(request: Request) {
  try {
    const clientToken = request.headers.get('x-jrm-client-token');
    if (clientToken !== 'jrm_dev_token_secret_1842') {
      return NextResponse.json({ error: 'Unauthorized client signature' }, { status: 401 });
    }

    const body = await request.json();
    const {
      employeeId = 'EMP-000003',
      employeeName = 'THIRUMALAI R K',
      department = 'Engineering',
      action,
      eventType,
      notes,
    } = body;

    const targetAction = action || eventType;

    if (!targetAction) {
      return NextResponse.json({ error: 'Action or eventType is required' }, { status: 400 });
    }

    // Ensure memory engine is in full 2-way sync with Supabase DB first
    await syncSupabaseEvents();

    // Trigger state transition with server timestamping inside time-engine
    const result = await triggerEmployeeEvent(
      employeeId,
      employeeName,
      department,
      targetAction as AttendanceEventType,
      'Employee Portal (Web)',
      'Web Action',
      notes
    );

    const checkedOut = hasCheckedOut(employeeId);
    const newState = getEmployeeCurrentState(employeeId);
    const validActions = getValidActionsForState(newState, checkedOut);

    return NextResponse.json({
      success: result.success,
      actionTriggered: targetAction,
      newState,
      validActions,
      serverTimestamp: new Date().toISOString(),
      error: result.error,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
