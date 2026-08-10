import { NextResponse } from 'next/server';
import {
  fetchEmployeeTimeline,
  syncSupabaseEvents,
} from '../../../../lib/attendance/time-engine';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get('employeeId') || 'EMP-000003';

  await syncSupabaseEvents();

  const events = fetchEmployeeTimeline(employeeId);

  return NextResponse.json({
    employeeId,
    events,
    totalEvents: events.length,
    serverTime: new Date().toISOString(),
  });
}
