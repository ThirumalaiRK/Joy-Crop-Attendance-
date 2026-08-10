/**
 * ExcelBuilder.ts
 *
 * Implements professional enterprise multi-sheet Excel generation using exceljs.
 * Supports Executive Summaries, styled tables, conditional formatting, and chart embedding.
 * Backward compatible with generic sheet exports.
 */

import ExcelJS from 'exceljs';
import { BrandingService, ReportMeta } from './BrandingService';
import { ChartRenderer } from './ChartRenderer';

export interface ExcelExportOptions {
  includeCharts: boolean;
  includeLogo: boolean;
  includeDeviceInfo: boolean;
  includeTimeline: boolean;
  includePayrollSummary: boolean;
  includeAuditTrail: boolean;
  fileName: string;
}

export interface ExcelSheetConfig {
  name: string;
  headers: string[];
  rows: any[][];
  conditionalFormatting?: {
    columnIndex: number; // 0-based index
    rules: { value: string; color: string; fontColor: string }[];
  };
}

export class ExcelBuilder {
  /**
   * Generates a professional Excel report and initiates download in the browser.
   * Handles both multi-sheet attendance and generic report signatures for backwards compatibility.
   */
  public static async generateAndDownload(
    reportName: string,
    metaOrSheets: ReportMeta | ExcelSheetConfig[],
    summaryCards: { label: string; value: string | number }[],
    summariesData?: any[],
    options?: ExcelExportOptions,
    deviceList: any[] = [],
    timelineLogs: any[] = []
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'JRM HRMS Enterprise';
    workbook.lastModifiedBy = 'JRM HRMS Enterprise';
    workbook.created = new Date();
    workbook.modified = new Date();

    const PRIMARY_COLOR = 'FF0B1220'; // Deep Navy
    const ACCENT_COLOR = 'FF6C5CE7';  // Royal Indigo
    const WHITE_COLOR = 'FFFFFFFF';
    const ROW_ALT_COLOR = 'FFF8FAFC'; // Light grey/slate
    
    // Helper to style a header row
    const styleHeaderRow = (ws: ExcelJS.Worksheet, rowNum: number, numCols: number, isIndigo = false) => {
      const row = ws.getRow(rowNum);
      row.height = 28;
      for (let c = 1; c <= numCols; c++) {
        const cell = row.getCell(c);
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: WHITE_COLOR } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isIndigo ? ACCENT_COLOR : PRIMARY_COLOR }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'medium', color: { argb: 'FF0B1220' } }
        };
      }
    };

    // Helper to auto-fit columns
    const autoFitColumns = (ws: ExcelJS.Worksheet, minWidth = 12) => {
      ws.columns.forEach((column) => {
        let maxLen = minWidth;
        column.eachCell?.({ includeEmpty: true }, (cell) => {
          const val = cell.value ? String(cell.value) : '';
          if (val.length > maxLen) maxLen = val.length;
        });
        column.width = Math.min(maxLen + 4, 35); // Add padding, cap at 35
      });
    };

    // Check signature path
    if (Array.isArray(metaOrSheets)) {
      // ────────────────────────────────────────────────────────────────────────
      // BACKWARD COMPATIBLE GENERIC PATH
      // ────────────────────────────────────────────────────────────────────────
      const sheets = metaOrSheets as ExcelSheetConfig[];

      // Sheet 1: Summary Sheet
      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.views = [{ showGridLines: true }];

      // Header Band
      summarySheet.mergeCells('A1:F2');
      const headerCell = summarySheet.getCell('A1');
      headerCell.value = BrandingService.COMPANY_NAME;
      headerCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: WHITE_COLOR } };
      headerCell.alignment = { vertical: 'middle', horizontal: 'center' };
      headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRIMARY_COLOR } };

      // Subtitle
      summarySheet.mergeCells('A3:F3');
      const subtitleCell = summarySheet.getCell('A3');
      subtitleCell.value = `${reportName} — Executive Dashboard`;
      subtitleCell.font = { name: 'Arial', size: 11, italic: true, bold: true, color: { argb: 'FF475569' } };
      subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Add Summary Cards
      let cardRow = 5;
      summarySheet.getCell(`A${cardRow}`).value = 'Summary Attribute';
      summarySheet.getCell(`B${cardRow}`).value = 'Value';
      styleHeaderRow(summarySheet, cardRow, 2, true);

      summaryCards.forEach((card, idx) => {
        const r = cardRow + 1 + idx;
        summarySheet.getCell(`A${r}`).value = card.label;
        summarySheet.getCell(`B${r}`).value = card.value;
        summarySheet.getCell(`A${r}`).font = { name: 'Arial', size: 10, bold: true };
        summarySheet.getCell(`B${r}`).font = { name: 'Arial', size: 10 };
      });
      autoFitColumns(summarySheet);

      // Other sheets from configuration
      sheets.forEach((sheetConfig) => {
        const ws = workbook.addWorksheet(sheetConfig.name);
        ws.views = [{ state: 'frozen', ySplit: 2, showGridLines: true }];

        // Header
        const hRow = ws.getRow(1);
        hRow.height = 24;
        sheetConfig.headers.forEach((h, idx) => {
          ws.getCell(1, idx + 1).value = h;
        });
        styleHeaderRow(ws, 1, sheetConfig.headers.length);

        // Rows
        sheetConfig.rows.forEach((rowVals, rIdx) => {
          const r = rIdx + 2;
          rowVals.forEach((val, cIdx) => {
            ws.getCell(r, cIdx + 1).value = val;
          });

          // Row styling
          if (rIdx % 2 === 0) {
            for (let col = 1; col <= sheetConfig.headers.length; col++) {
              ws.getCell(r, col).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: ROW_ALT_COLOR }
              };
            }
          }

          // Conditional Formatting application
          if (sheetConfig.conditionalFormatting) {
            const ruleCol = sheetConfig.conditionalFormatting.columnIndex + 1;
            const cell = ws.getCell(r, ruleCol);
            const cellVal = String(cell.value);

            const matchedRule = sheetConfig.conditionalFormatting.rules.find(
              rule => rule.value === cellVal
            );

            if (matchedRule) {
              const bgHex = matchedRule.color.replace('#', 'FF');
              const textHex = matchedRule.fontColor.replace('#', 'FF');
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: bgHex }
              };
              cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: textHex } };
            }
          }
        });

        ws.autoFilter = `A1:${ws.getColumn(sheetConfig.headers.length).letter}${sheetConfig.rows.length + 1}`;
        autoFitColumns(ws);
      });

    } else {
      // ────────────────────────────────────────────────────────────────────────
      // NEW DYNAMIC MULTI-SHEET ENTERPRISE PATH
      // ────────────────────────────────────────────────────────────────────────
      const meta = metaOrSheets as ReportMeta;
      const dataSummaries = summariesData || [];
      const opts = options || {
        includeCharts: true,
        includeLogo: true,
        includeDeviceInfo: true,
        includeTimeline: true,
        includePayrollSummary: true,
        includeAuditTrail: true,
        fileName: reportName
      };

      // Sheet 1: Executive Summary
      const summarySheet = workbook.addWorksheet('Executive Summary');
      summarySheet.views = [{ showGridLines: true }];

      // Company Header Band
      summarySheet.mergeCells('A1:H2');
      const headerCell = summarySheet.getCell('A1');
      headerCell.value = BrandingService.COMPANY_NAME;
      headerCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: WHITE_COLOR } };
      headerCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      headerCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: PRIMARY_COLOR }
      };

      // Report Subtitle
      summarySheet.mergeCells('A3:H3');
      const subtitleCell = summarySheet.getCell('A3');
      subtitleCell.value = `${reportName} — Operations Dashboard`;
      subtitleCell.font = { name: 'Arial', size: 11, italic: true, bold: true, color: { argb: 'FF475569' } };
      subtitleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

      // Metadata Block
      summarySheet.getCell('A5').value = 'Report ID:';
      summarySheet.getCell('B5').value = meta.reportId;
      summarySheet.getCell('A6').value = 'Generation Date:';
      summarySheet.getCell('B6').value = meta.generationDate;
      summarySheet.getCell('A7').value = 'Generated By:';
      summarySheet.getCell('B7').value = meta.generatedBy;
      summarySheet.getCell('A8').value = 'Target Branch:';
      summarySheet.getCell('B8').value = meta.branch;

      // Bold label formatting
      ['A5', 'A6', 'A7', 'A8'].forEach(cell => {
        summarySheet.getCell(cell).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF475569' } };
      });

      // KPI Summary Grid (horizontal format)
      const kpiStartRow = 10;
      summarySheet.getCell(`A${kpiStartRow}`).value = 'KPI Metric';
      summarySheet.getCell(`B${kpiStartRow}`).value = 'Count / Value';

      summaryCards.forEach((card, idx) => {
        const r = kpiStartRow + 1 + idx;
        summarySheet.getCell(`A${r}`).value = card.label;
        summarySheet.getCell(`B${r}`).value = card.value;
        summarySheet.getCell(`A${r}`).font = { name: 'Arial', size: 10, bold: true };
        summarySheet.getCell(`B${r}`).font = { name: 'Arial', size: 10 };
        summarySheet.getCell(`B${r}`).alignment = { horizontal: 'right' };
      });

      styleHeaderRow(summarySheet, kpiStartRow, 2, true);

      // Embedded Charts
      if (opts.includeCharts) {
        const present = summaryCards.find(c => c.label.toLowerCase().includes('present'))?.value || 0;
        const absent = summaryCards.find(c => c.label.toLowerCase().includes('absent'))?.value || 0;
        const late = summaryCards.find(c => c.label.toLowerCase().includes('late'))?.value || 0;

        const pieData = [
          { label: 'Present', value: Number(present), color: '#22C55E' },
          { label: 'Absent', value: Number(absent), color: '#EF4444' },
          { label: 'Late', value: Number(late), color: '#F59E0B' },
        ];

        try {
          const pieDataUrl = ChartRenderer.renderPieChart(350, 220, pieData);
          if (pieDataUrl) {
            const imageId = workbook.addImage({
              base64: pieDataUrl.split(',')[1],
              extension: 'png',
            });
            summarySheet.addImage(imageId, 'D5:H18');
          }
        } catch (e) {
          console.warn('Excel Pie Chart embedding bypassed', e);
        }
      }

      autoFitColumns(summarySheet);

      // Sheet 2: Attendance Details
      const attendanceSheet = workbook.addWorksheet('Attendance Logs');
      attendanceSheet.views = [{ state: 'frozen', ySplit: 4, showGridLines: true }];

      // Sheet title block
      attendanceSheet.mergeCells('A1:K2');
      const attTitle = attendanceSheet.getCell('A1');
      attTitle.value = 'DETAILED ATTENDANCE AUDIT LOGS';
      attTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: WHITE_COLOR } };
      attTitle.alignment = { vertical: 'middle', horizontal: 'center' };
      attTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRIMARY_COLOR } };

      const attHeaders = [
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
        'Late (Mins)',
        'Status'
      ];

      const attHeaderRow = 4;
      attHeaders.forEach((h, idx) => {
        attendanceSheet.getCell(attHeaderRow, idx + 1).value = h;
      });
      styleHeaderRow(attendanceSheet, attHeaderRow, attHeaders.length);

      dataSummaries.forEach((s, idx) => {
        const r = attHeaderRow + 1 + idx;
        attendanceSheet.getCell(r, 1).value = s.employeeCode || s.employeeId;
        attendanceSheet.getCell(r, 2).value = s.employeeName;
        attendanceSheet.getCell(r, 3).value = s.department;
        attendanceSheet.getCell(r, 4).value = s.date;
        attendanceSheet.getCell(r, 5).value = s.checkInTime || '—';
        attendanceSheet.getCell(r, 6).value = s.checkOutTime || '—';
        attendanceSheet.getCell(r, 7).value = s.breakDurationMinutes;
        attendanceSheet.getCell(r, 8).value = s.lunchDurationMinutes;
        
        const hoursStr = `${Math.floor(s.workingTimeMinutes / 60)}h ${s.workingTimeMinutes % 60}m`;
        attendanceSheet.getCell(r, 9).value = hoursStr;
        
        attendanceSheet.getCell(r, 10).value = s.overtimeMinutes;
        attendanceSheet.getCell(r, 11).value = s.lateMinutes;
        
        const statusCell = attendanceSheet.getCell(r, 12);
        statusCell.value = s.status;

        // Formatting
        attendanceSheet.getRow(r).height = 20;

        // Row shading
        if (idx % 2 === 0) {
          for (let col = 1; col <= attHeaders.length; col++) {
            attendanceSheet.getCell(r, col).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: ROW_ALT_COLOR }
            };
          }
        }

        // Status cell formatting
        let statusColor = 'FF475569'; // Muted Slate
        if (s.status === 'PRESENT') statusColor = 'FF22C55E'; // Green
        else if (s.status === 'ABSENT') statusColor = 'FFEF4444'; // Red
        else if (s.status === 'LATE') statusColor = 'FFF59E0B'; // Amber
        else if (s.status === 'OVERTIME') statusColor = 'FF8B5CF6'; // Purple

        statusCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: statusColor } };
        statusCell.alignment = { horizontal: 'center' };
      });

      attendanceSheet.autoFilter = `A${attHeaderRow}:L${attHeaderRow + dataSummaries.length}`;
      autoFitColumns(attendanceSheet);

      // Sheet 3: Payroll Summary
      if (opts.includePayrollSummary) {
        const payrollSheet = workbook.addWorksheet('Payroll Summary');
        payrollSheet.views = [{ showGridLines: true }];

        payrollSheet.mergeCells('A1:J2');
        const payTitle = payrollSheet.getCell('A1');
        payTitle.value = 'EMPLOYEE PAYROLL SUMMARY';
        payTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: WHITE_COLOR } };
        payTitle.alignment = { vertical: 'middle', horizontal: 'center' };
        payTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ACCENT_COLOR } };

        const payHeaders = [
          'Employee Code',
          'Employee Name',
          'Department',
          'Total Days Scheduled',
          'Days Present',
          'Days Late',
          'Total Working Hours',
          'Total Overtime Hours',
          'Payable Hours',
          'Payroll Status'
        ];

        const payHeaderRow = 4;
        payHeaders.forEach((h, idx) => {
          payrollSheet.getCell(payHeaderRow, idx + 1).value = h;
        });
        styleHeaderRow(payrollSheet, payHeaderRow, payHeaders.length, true);

        // Group summaries by employee code
        const empMap = new Map<string, any>();
        dataSummaries.forEach((s) => {
          const key = s.employeeCode || s.employeeId;
          if (!empMap.has(key)) {
            empMap.set(key, {
              code: key,
              name: s.employeeName,
              dept: s.department,
              totalDays: 0,
              presentDays: 0,
              lateDays: 0,
              workMins: 0,
              otMins: 0,
            });
          }
          const accum = empMap.get(key)!;
          accum.totalDays += 1;
          if (s.status !== 'ABSENT') accum.presentDays += 1;
          if (s.lateMinutes > 0) accum.lateDays += 1;
          accum.workMins += s.workingTimeMinutes;
          accum.otMins += s.overtimeMinutes;
        });

        let idx = 0;
        empMap.forEach((accum) => {
          const r = payHeaderRow + 1 + idx;
          payrollSheet.getCell(r, 1).value = accum.code;
          payrollSheet.getCell(r, 2).value = accum.name;
          payrollSheet.getCell(r, 3).value = accum.dept;
          payrollSheet.getCell(r, 4).value = accum.totalDays;
          payrollSheet.getCell(r, 5).value = accum.presentDays;
          payrollSheet.getCell(r, 6).value = accum.lateDays;
          payrollSheet.getCell(r, 7).value = parseFloat((accum.workMins / 60).toFixed(2));
          payrollSheet.getCell(r, 8).value = parseFloat((accum.otMins / 60).toFixed(2));
          payrollSheet.getCell(r, 9).value = parseFloat(((accum.workMins + accum.otMins) / 60).toFixed(2));
          
          const payStatusCell = payrollSheet.getCell(r, 10);
          payStatusCell.value = accum.presentDays > 0 ? 'Approved for Payout' : 'Hold — No Check Ins';
          payStatusCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: accum.presentDays > 0 ? 'FF22C55E' : 'FFEF4444' } };

          if (idx % 2 === 0) {
            for (let col = 1; col <= payHeaders.length; col++) {
              payrollSheet.getCell(r, col).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: ROW_ALT_COLOR }
              };
            }
          }
          idx++;
        });

        autoFitColumns(payrollSheet);
      }

      // Sheet 4: Late Report
      const lateSheet = workbook.addWorksheet('Late Report');
      lateSheet.views = [{ showGridLines: true }];
      lateSheet.getCell('A1').value = 'LATE IN-PUNCH EXCEPTION REPORT';
      lateSheet.getCell('A1').font = { name: 'Arial', size: 12, bold: true };

      const lateHeaders = ['Employee Code', 'Employee Name', 'Department', 'Date', 'Check In', 'Late Minutes', 'Manager Approval'];
      lateHeaders.forEach((h, idx) => lateSheet.getCell(3, idx + 1).value = h);
      styleHeaderRow(lateSheet, 3, lateHeaders.length);

      let lateIdx = 0;
      dataSummaries.forEach((s) => {
        if (s.lateMinutes <= 0) return;
        const r = 4 + lateIdx;
        lateSheet.getCell(r, 1).value = s.employeeCode || s.employeeId;
        lateSheet.getCell(r, 2).value = s.employeeName;
        lateSheet.getCell(r, 3).value = s.department;
        lateSheet.getCell(r, 4).value = s.date;
        lateSheet.getCell(r, 5).value = s.checkInTime || '—';
        lateSheet.getCell(r, 6).value = s.lateMinutes;
        lateSheet.getCell(r, 7).value = s.lateMinutes <= 15 ? 'Auto-Grace Approved' : 'Pending Verification';

        if (lateIdx % 2 === 0) {
          for (let col = 1; col <= lateHeaders.length; col++) {
            lateSheet.getCell(r, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROW_ALT_COLOR } };
          }
        }
        lateIdx++;
      });
      autoFitColumns(lateSheet);

      // Sheet 5: Overtime Report
      const otSheet = workbook.addWorksheet('Overtime Logs');
      otSheet.views = [{ showGridLines: true }];
      otSheet.getCell('A1').value = 'EMPLOYEE OVERTIME AUDIT TRAIL';
      otSheet.getCell('A1').font = { name: 'Arial', size: 12, bold: true };

      const otHeaders = ['Employee Code', 'Employee Name', 'Department', 'Date', 'Net Hours', 'Overtime (Mins)', 'Payout Est (INR)'];
      otHeaders.forEach((h, idx) => otSheet.getCell(3, idx + 1).value = h);
      styleHeaderRow(otSheet, 3, otHeaders.length);

      let otIdx = 0;
      dataSummaries.forEach((s) => {
        if (s.overtimeMinutes <= 0) return;
        const r = 4 + otIdx;
        otSheet.getCell(r, 1).value = s.employeeCode || s.employeeId;
        otSheet.getCell(r, 2).value = s.employeeName;
        otSheet.getCell(r, 3).value = s.department;
        otSheet.getCell(r, 4).value = s.date;
        otSheet.getCell(r, 5).value = parseFloat((s.workingTimeMinutes / 60).toFixed(2));
        otSheet.getCell(r, 6).value = s.overtimeMinutes;
        
        const rate = 250;
        const amount = parseFloat(((s.overtimeMinutes / 60) * rate).toFixed(2));
        otSheet.getCell(r, 7).value = amount;

        if (otIdx % 2 === 0) {
          for (let col = 1; col <= otHeaders.length; col++) {
            otSheet.getCell(r, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROW_ALT_COLOR } };
          }
        }
        otIdx++;
      });
      autoFitColumns(otSheet);

      // Sheet 6: Break Analysis
      const breakSheet = workbook.addWorksheet('Break Analysis');
      breakSheet.views = [{ showGridLines: true }];
      breakSheet.getCell('A1').value = 'BIOMETRIC TEA & LUNCH BREAK LOGS';
      breakSheet.getCell('A1').font = { name: 'Arial', size: 12, bold: true };

      const breakHeaders = ['Employee Code', 'Employee Name', 'Department', 'Date', 'Tea Break (Mins)', 'Lunch Break (Mins)', 'Total Break Time', 'Exceeded Limit?'];
      breakHeaders.forEach((h, idx) => breakSheet.getCell(3, idx + 1).value = h);
      styleHeaderRow(breakSheet, 3, breakHeaders.length);

      let breakIdx = 0;
      dataSummaries.forEach((s) => {
        const r = 4 + breakIdx;
        breakSheet.getCell(r, 1).value = s.employeeCode || s.employeeId;
        breakSheet.getCell(r, 2).value = s.employeeName;
        breakSheet.getCell(r, 3).value = s.department;
        breakSheet.getCell(r, 4).value = s.date;
        breakSheet.getCell(r, 5).value = s.breakDurationMinutes;
        breakSheet.getCell(r, 6).value = s.lunchDurationMinutes;
        
        const totalBreak = s.breakDurationMinutes + s.lunchDurationMinutes;
        breakSheet.getCell(r, 7).value = totalBreak;

        const limitsExceeded = (s.breakDurationMinutes > 30 || s.lunchDurationMinutes > 45);
        const limitCell = breakSheet.getCell(r, 8);
        limitCell.value = limitsExceeded ? 'YES — Flagged' : 'OK';
        limitCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: limitsExceeded ? 'FFEF4444' : 'FF22C55E' } };

        if (breakIdx % 2 === 0) {
          for (let col = 1; col <= breakHeaders.length; col++) {
            breakSheet.getCell(r, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROW_ALT_COLOR } };
          }
        }
        breakIdx++;
      });
      autoFitColumns(breakSheet);

      // Sheet 7: Device Logs
      if (opts.includeDeviceInfo && deviceList.length > 0) {
        const deviceSheet = workbook.addWorksheet('Terminal Status');
        deviceSheet.views = [{ showGridLines: true }];
        deviceSheet.getCell('A1').value = 'BIOMETRIC DEVICES INVENTORY & HEALTH HEARTBEAT';
        deviceSheet.getCell('A1').font = { name: 'Arial', size: 12, bold: true };

        const devHeaders = ['Device Name', 'IP Address', 'MAC Address', 'Serial Number', 'Active Users', 'Templates Enrolled', 'Gateway Latency', 'Health Status'];
        devHeaders.forEach((h, idx) => deviceSheet.getCell(3, idx + 1).value = h);
        styleHeaderRow(deviceSheet, 3, devHeaders.length);

        deviceList.forEach((dev, dIdx) => {
          const r = 4 + dIdx;
          deviceSheet.getCell(r, 1).value = dev.name || 'Identix K90 Pro';
          deviceSheet.getCell(r, 2).value = dev.ip_address || '—';
          deviceSheet.getCell(r, 3).value = dev.mac_address || '—';
          deviceSheet.getCell(r, 4).value = dev.serial_number || '—';
          deviceSheet.getCell(r, 5).value = dev.user_count || 0;
          deviceSheet.getCell(r, 6).value = dev.template_count || 0;
          deviceSheet.getCell(r, 7).value = `${dev.latency_ms || 0} ms`;
          
          const healthCell = deviceSheet.getCell(r, 8);
          healthCell.value = String(dev.status || 'offline').toUpperCase();
          healthCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: dev.status === 'online' ? 'FF22C55E' : 'FFEF4444' } };

          if (dIdx % 2 === 0) {
            for (let col = 1; col <= devHeaders.length; col++) {
              deviceSheet.getCell(r, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROW_ALT_COLOR } };
            }
          }
        });
        autoFitColumns(deviceSheet);
      }

      // Sheet 8: Audit Trail
      if (opts.includeAuditTrail) {
        const auditSheet = workbook.addWorksheet('System Audit Trail');
        auditSheet.views = [{ showGridLines: true }];
        auditSheet.getCell('A1').value = 'DOCUMENT CRYPTOGRAPHIC INTEGRITY AUDIT TRAIL';
        auditSheet.getCell('A1').font = { name: 'Arial', size: 12, bold: true };

        const auditHeaders = ['Audit Attribute', 'Recorded Value'];
        auditHeaders.forEach((h, idx) => auditSheet.getCell(3, idx + 1).value = h);
        styleHeaderRow(auditSheet, 3, auditHeaders.length, true);

        const auditLines = [
          { label: 'Document Creator', value: meta.generatedBy },
          { label: 'Creation Timestamp', value: meta.generationDate },
          { label: 'Data Registry Reference ID', value: meta.reportId },
          { label: 'Cryptographic Checksum (SHA-256)', value: meta.checksum },
          { label: 'App Version', value: BrandingService.VERSION },
          { label: 'Total Records Exported', value: dataSummaries.length },
          { label: 'Verification Registry Endpoint', value: 'https://joycorporate.com/verify-report' }
        ];

        auditLines.forEach((line, aIdx) => {
          const r = 4 + aIdx;
          auditSheet.getCell(r, 1).value = line.label;
          auditSheet.getCell(r, 2).value = line.value;
          auditSheet.getCell(r, 1).font = { name: 'Arial', size: 10, bold: true };
          auditSheet.getCell(r, 2).font = { name: 'Courier New', size: 9.5 };

          if (aIdx % 2 === 0) {
            auditSheet.getCell(r, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROW_ALT_COLOR } };
            auditSheet.getCell(r, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROW_ALT_COLOR } };
          }
        });
        autoFitColumns(auditSheet);
      }
    }

    // Write buffer and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Choose file name
    let filenameStr = reportName;
    if (!Array.isArray(metaOrSheets)) {
      const opts = options || { fileName: reportName };
      filenameStr = opts.fileName;
    }
    const formattedName = filenameStr.replace(/\s+/g, '_');
    link.setAttribute('download', `${formattedName}.xlsx`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
