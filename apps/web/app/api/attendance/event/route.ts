import { NextRequest, NextResponse } from 'next/server';
import {
  triggerEmployeeEvent,
  getEmployeeCurrentState,
  getValidActionsForState,
  hasCheckedOut,
  fetchEmployeeTimeline,
  fetchAllAttendanceSummaries,
} from '../../../../lib/attendance/time-engine';
import { AttendanceEventType } from '../../../../lib/attendance/attendance-types';

// Allowed event types for validation
const VALID_EVENT_TYPES: AttendanceEventType[] = [
  'CHECK_IN', 'BREAK_START', 'BREAK_END', 'LUNCH_START', 'LUNCH_END',
  'MEETING_OUT', 'MEETING_IN', 'FIELD_VISIT_START', 'FIELD_VISIT_END', 'CHECK_OUT',
];

// POST /api/attendance/event — Employee triggers an event
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId, employeeName, department, eventType, device, method } = body;

    // Input validation
    if (!employeeId || typeof employeeId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'employeeId is required.' },
        { status: 400 }
      );
    }
    if (!eventType || !VALID_EVENT_TYPES.includes(eventType as AttendanceEventType)) {
      return NextResponse.json(
        { success: false, error: `Invalid eventType. Must be one of: ${VALID_EVENT_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await triggerEmployeeEvent(
      employeeId,
      employeeName || 'Unknown Employee',
      department || 'Staff',
      eventType as AttendanceEventType,
      device || 'Employee Portal',
      method || 'Manual'
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          currentState: result.currentState,
          allowedActions: result.allowedActions,
        },
        { status: 409 } // 409 Conflict for invalid state transitions
      );
    }

    return NextResponse.json({
      success: true,
      event: result.event,
      currentState: result.currentState,
      allowedActions: result.allowedActions,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Internal server error.', detail: err?.message },
      { status: 500 }
    );
  }
}

// GET /api/attendance/event?employeeId=xxx — Fetch employee's current state + valid actions
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: 'employeeId query param is required.' },
        { status: 400 }
      );
    }

    const checkedOut = hasCheckedOut(employeeId);
    const currentState = getEmployeeCurrentState(employeeId);
    const allowedActions = getValidActionsForState(currentState, checkedOut);
    const timeline = fetchEmployeeTimeline(employeeId);
    const allSummaries = fetchAllAttendanceSummaries();
    const summary = allSummaries.find((s) => s.employeeId === employeeId) || null;

    return NextResponse.json({
      success: true,
      employeeId,
      currentState: checkedOut ? 'CHECKED_OUT' : currentState,
      checkedOut,
      allowedActions,
      timeline,
      summary,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Internal server error.', detail: err?.message },
      { status: 500 }
    );
  }
}
