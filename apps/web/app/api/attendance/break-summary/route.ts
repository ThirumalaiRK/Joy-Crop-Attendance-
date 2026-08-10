import { NextResponse } from 'next/server';
import {
  fetchAllAttendanceSummaries,
  syncSupabaseEvents,
  fetchEmployeeTimeline,
} from '../../../../lib/attendance/time-engine';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get('employeeId') || 'EMP-000003';

  await syncSupabaseEvents();

  const summaries = fetchAllAttendanceSummaries();
  const summary = summaries.find((s) => s.employeeId === employeeId) || null;
  const events = fetchEmployeeTimeline(employeeId);

  const hasTeaBreak = events.some((e) => e.eventType === 'BREAK_START');
  const hasLunchBreak = events.some((e) => e.eventType === 'LUNCH_START');
  const hasMeeting = events.some((e) => e.eventType === 'MEETING_OUT');
  const hasFieldVisit = events.some((e) => e.eventType === 'FIELD_VISIT_START');

  return NextResponse.json({
    employeeId,
    teaBreak: {
      taken: hasTeaBreak,
      durationMinutes: hasTeaBreak ? summary?.breakDurationMinutes || 0 : 0,
      displayLabel: hasTeaBreak ? `${summary?.breakDurationMinutes || 0} Minutes` : 'Not Taken Today',
      allowedMinutes: 15,
      remainingMinutes: hasTeaBreak ? Math.max(0, 15 - (summary?.breakDurationMinutes || 0)) : 15,
    },
    lunchBreak: {
      taken: hasLunchBreak,
      durationMinutes: hasLunchBreak ? summary?.lunchDurationMinutes || 0 : 0,
      displayLabel: hasLunchBreak ? `${summary?.lunchDurationMinutes || 0} Minutes` : 'Not Taken Today',
      allowedMinutes: 60,
      remainingMinutes: hasLunchBreak ? Math.max(0, 60 - (summary?.lunchDurationMinutes || 0)) : 60,
    },
    meeting: {
      taken: hasMeeting,
      durationMinutes: hasMeeting ? summary?.meetingDurationMinutes || 0 : 0,
      displayLabel: hasMeeting ? `${summary?.meetingDurationMinutes || 0} Minutes` : 'No Meeting Logged',
    },
    fieldVisit: {
      taken: hasFieldVisit,
      durationMinutes: hasFieldVisit ? summary?.fieldDurationMinutes || 0 : 0,
      displayLabel: hasFieldVisit ? `${summary?.fieldDurationMinutes || 0} Minutes` : 'None Today',
    },
    serverTime: new Date().toISOString(),
  });
}
