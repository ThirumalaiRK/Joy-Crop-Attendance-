import { NextResponse } from 'next/server';
import {
  getEmployeeCurrentState,
  hasCheckedOut,
  hasCheckedIn,
  getValidActionsForState,
  syncSupabaseEvents,
} from '../../../../lib/attendance/time-engine';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get('employeeId') || 'EMP-000003';

  await syncSupabaseEvents();

  const checkedOut = hasCheckedOut(employeeId);
  const checkedIn = hasCheckedIn(employeeId);
  let status = getEmployeeCurrentState(employeeId);

  if (checkedOut) {
    status = 'CHECKED_OUT' as any;
  } else if (!checkedIn) {
    status = 'ABSENT' as any;
  }

  const validActions = getValidActionsForState(status, checkedOut);

  return NextResponse.json({
    employeeId,
    status,
    checkedIn,
    checkedOut,
    validActions,
    serverTime: new Date().toISOString(),
  });
}
