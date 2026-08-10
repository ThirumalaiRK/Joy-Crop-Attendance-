/**
 * export-engine.ts
 *
 * Coordinates the export actions for the Attendance Command Center.
 * Delegates PDF generation to PDFBuilder, Excel generation to ExcelBuilder,
 * and handles clean CSV output using PapaParse (or robust raw CSV escaping).
 */

import { AttendanceSummary } from './attendance-types';
import { PDFBuilder, PDFExportOptions } from '../reports/PDFBuilder';
import { ExcelBuilder, ExcelExportOptions } from '../reports/ExcelBuilder';
import { BrandingService, ReportMeta } from '../reports/BrandingService';
import { formatDurationMinutes } from './time-engine';
import * as Papa from 'papaparse';

/**
 * Builds standard Report Metadata for branding and integrity checks.
 */
function buildReportMetadata(summaries: AttendanceSummary[]): ReportMeta {
  const contentStr = summaries.map((s) => `${s.employeeId}-${s.workingTimeMinutes}-${s.status}`).join('|');
  const checksum = BrandingService.calculateChecksum(contentStr);
  const now = new Date();

  return {
    reportId: BrandingService.generateReportId(),
    generationDate: now.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }),
    generatedBy: 'System HR Administrator',
    branch: 'Corporate HQ Office',
    checksum,
  };
}

/**
 * Orchestrates PDF export.
 */
export async function exportToPDF(
  summaries: AttendanceSummary[],
  options: PDFExportOptions,
  deviceList: any[] = [],
  timelineLogs: any[] = []
): Promise<void> {
  const meta = buildReportMetadata(summaries);

  // Calculate stats cards
  const totalStaff = summaries.length;
  const presentCount = summaries.filter(s => s.status !== 'ABSENT').length;
  const absentCount = summaries.filter(s => s.status === 'ABSENT').length;
  const lateCount = summaries.filter(s => s.lateMinutes > 0).length;
  const otMins = summaries.reduce((sum, s) => sum + s.overtimeMinutes, 0);
  const workMins = summaries.reduce((sum, s) => sum + s.workingTimeMinutes, 0);
  const avgWorkMins = totalStaff > 0 ? Math.round(workMins / totalStaff) : 0;

  const summaryCards = [
    { label: 'Total Staff', value: totalStaff },
    { label: 'Present Days', value: presentCount },
    { label: 'Absent Days', value: absentCount },
    { label: 'Late Punches', value: lateCount },
    { label: 'Total Overtime', value: formatDurationMinutes(otMins) },
    { label: 'Avg Net Hours', value: formatDurationMinutes(avgWorkMins) },
  ];

  // Table Configuration
  const isLandscape = options.orientation === 'landscape';
  
  // Headers and widths depending on orientation
  let headers: string[] = [];
  let colWidths: number[] = [];

  if (isLandscape) {
    headers = [
      'Employee Code', 'Employee Name', 'Department', 'Date', 
      'Check In', 'Check Out', 'Break (m)', 'Lunch (m)', 
      'Net Hours', 'OT (m)', 'Late (m)', 'Status'
    ];
    // Sum = 760 (printable width = 761.89)
    colWidths = [80, 110, 90, 65, 55, 55, 50, 50, 75, 45, 45, 60];
  } else {
    // Portrait mode - more compact
    headers = [
      'Emp Code', 'Employee Name', 'Department', 
      'Check In', 'Check Out', 'Net Hours', 'OT', 'Late', 'Status'
    ];
    // Sum = 515 (printable width = 515.27)
    colWidths = [60, 100, 85, 55, 55, 60, 30, 30, 40];
  }

  // Row mapper
  const rows = summaries.map((s) => {
    const code = s.employeeCode || s.employeeId;
    const name = s.employeeName;
    const dept = s.department;
    const date = s.date;
    const checkIn = s.checkInTime || '—';
    const checkOut = s.checkOutTime || '—';
    const breaks = `${s.breakDurationMinutes}`;
    const lunch = `${s.lunchDurationMinutes}`;
    const workingHours = formatDurationMinutes(s.workingTimeMinutes);
    const overtime = `${s.overtimeMinutes}`;
    const late = `${s.lateMinutes}`;
    const status = s.status;

    if (isLandscape) {
      return [code, name, dept, date, checkIn, checkOut, breaks, lunch, workingHours, overtime, late, status];
    } else {
      return [code, name, dept, checkIn, checkOut, workingHours, overtime > '0' ? `${overtime}m` : '—', late > '0' ? `${late}m` : '—', status];
    }
  });

  await PDFBuilder.generateAndDownload(
    'Attendance Summary & Operations Audit',
    meta,
    summaryCards,
    { headers, colWidths, rows },
    options,
    deviceList,
    timelineLogs
  );
}

/**
 * Orchestrates Excel multi-sheet export.
 */
export async function exportToExcel(
  summaries: AttendanceSummary[],
  options: ExcelExportOptions,
  deviceList: any[] = [],
  timelineLogs: any[] = []
): Promise<void> {
  const meta = buildReportMetadata(summaries);

  const totalStaff = summaries.length;
  const presentCount = summaries.filter(s => s.status !== 'ABSENT').length;
  const absentCount = summaries.filter(s => s.status === 'ABSENT').length;
  const lateCount = summaries.filter(s => s.lateMinutes > 0).length;
  const otMins = summaries.reduce((sum, s) => sum + s.overtimeMinutes, 0);
  const workMins = summaries.reduce((sum, s) => sum + s.workingTimeMinutes, 0);

  const summaryCards = [
    { label: 'Total Employees Scheduled', value: totalStaff },
    { label: 'Total Present Records', value: presentCount },
    { label: 'Total Absent Records', value: absentCount },
    { label: 'Total Late In-Punches', value: lateCount },
    { label: 'Total Calculated Overtime', value: formatDurationMinutes(otMins) },
    { label: 'Total Net Hours Worked', value: formatDurationMinutes(workMins) },
  ];

  await ExcelBuilder.generateAndDownload(
    'Enterprise Attendance Report',
    meta,
    summaryCards,
    summaries,
    options,
    deviceList,
    timelineLogs
  );
}

/**
 * Orchestrates CSV export using papaparse with clean escaping.
 */
export function exportToCSV(summaries: AttendanceSummary[], fileName: string): void {
  const headers = [
    'Employee Code',
    'Employee Name',
    'Department',
    'Date',
    'Check In',
    'Check Out',
    'Tea Break (Mins)',
    'Lunch (Mins)',
    'Net Working Hours',
    'Overtime (Mins)',
    'Late Arrival (Mins)',
    'Attendance Status',
  ];

  const rows = summaries.map((s) => [
    s.employeeCode || s.employeeId,
    s.employeeName,
    s.department,
    s.date,
    s.checkInTime || '—',
    s.checkOutTime || '—',
    s.breakDurationMinutes,
    s.lunchDurationMinutes,
    formatDurationMinutes(s.workingTimeMinutes),
    s.overtimeMinutes,
    s.lateMinutes,
    s.status,
  ]);

  // Combine CSV content
  const data = [headers, ...rows];
  const csvString = Papa.unparse(data, {
    quotes: true,
    newline: '\r\n',
  });

  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvString], {
    type: 'text/csv;charset=utf-8;'
  });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const formattedName = fileName.replace(/\s+/g, '_');
  link.setAttribute('download', `${formattedName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Preserve backwards compatibility signature
export function exportAttendanceToExcel(summaries: AttendanceSummary[]) {
  exportToCSV(summaries, 'Attendance_Report');
}

export function exportAttendanceToPDF(summaries: AttendanceSummary[]) {
  exportToPDF(summaries, {
    includeCharts: true,
    includeLogo: true,
    includePhotos: false,
    includeDeviceInfo: true,
    includeTimeline: true,
    includePayrollSummary: true,
    includeAuditTrail: true,
    orientation: 'landscape',
    paperSize: 'A4',
    fileName: 'Attendance_Report'
  });
}
