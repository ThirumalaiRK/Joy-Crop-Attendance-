import { NextResponse } from 'next/server';
import {
  fetchAllAttendanceSummaries,
  getEmployeeCurrentState,
  hasCheckedOut,
  getValidActionsForState,
  syncSupabaseEvents,
} from '../../../../lib/attendance/time-engine';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get('employeeId') || 'EMP-000003';

  // Ensure latest Supabase events are merged into memory engine
  await syncSupabaseEvents();

  const summaries = fetchAllAttendanceSummaries();
  const summary = summaries.find((s) => s.employeeId === employeeId) || null;

  const rawStatus = getEmployeeCurrentState(employeeId);
  const checkedOut = hasCheckedOut(employeeId);
  const validActions = getValidActionsForState(rawStatus, checkedOut);

  // Status mapping: if summary has checkOutTime set, return CHECKED_OUT
  let status = rawStatus;
  if (checkedOut || (summary?.checkOutTime && summary.checkOutTime !== '—')) {
    status = 'CHECKED_OUT' as any;
  } else if (!summary || !summary.checkInTime || summary.checkInTime === '—') {
    status = 'ABSENT' as any;
  }

  return NextResponse.json({
    employeeId,
    summary,
    status,
    checkedOut,
    validActions,
    serverTimestamp: new Date().toISOString(),
  });
}
