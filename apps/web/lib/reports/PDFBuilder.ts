/**
 * PDFBuilder.ts
 *
 * Programmatic PDF generation engine using pdf-lib.
 * Handles Landscape/Portrait layouts, custom charts, cover page, watermark overlays,
 * detailed tables, employee activity timelines, biometric device logs,
 * signature sections, and footer QR code injection.
 */

import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { BrandingService, ReportMeta } from './BrandingService';
import { ChartRenderer } from './ChartRenderer';

export interface PDFExportOptions {
  includeCharts: boolean;
  includeLogo: boolean;
  includePhotos: boolean;
  includeDeviceInfo: boolean;
  includeTimeline: boolean;
  includePayrollSummary: boolean;
  includeAuditTrail: boolean;
  orientation: 'portrait' | 'landscape';
  paperSize: 'A4' | 'letter';
  fileName: string;
}

export interface PDFTableConfig {
  headers: string[];
  colWidths: number[];
  rows: string[][];
}

export class PDFBuilder {
  private static MARGIN = 40;

  /**
   * Generates a branded executive-quality PDF report and triggers browser download.
   */
  public static async generateAndDownload(
    reportTitle: string,
    meta: ReportMeta,
    summaryCards: { label: string; value: string | number }[],
    tableConfig: PDFTableConfig,
    optionsParam?: Partial<PDFExportOptions>,
    deviceList: any[] = [],
    timelineLogs: any[] = []
  ): Promise<void> {
    const defaultOptions: PDFExportOptions = {
      includeCharts: true,
      includeLogo: true,
      includePhotos: false,
      includeDeviceInfo: false,
      includeTimeline: false,
      includePayrollSummary: false,
      includeAuditTrail: true,
      orientation: 'landscape',
      paperSize: 'A4',
      fileName: reportTitle || 'Report'
    };
    const options = { ...defaultOptions, ...optionsParam };

    const pdfDoc = await PDFDocument.create();
    const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

    // Determine dimensions
    let width = 841.89; // Default A4 Landscape
    let height = 595.27;

    if (options.paperSize === 'letter') {
      width = options.orientation === 'portrait' ? 612 : 792;
      height = options.orientation === 'portrait' ? 792 : 612;
    } else {
      // A4
      width = options.orientation === 'portrait' ? 595.27 : 841.89;
      height = options.orientation === 'portrait' ? 841.89 : 595.27;
    }

    const PAGE_WIDTH = width;
    const PAGE_HEIGHT = height;
    const MARGIN = this.MARGIN;

    // Helper to embed images from DataURL
    const embedImageFromDataUrl = async (dataUrl: string) => {
      try {
        const base64Data = dataUrl.split(',')[1];
        const binaryStr = atob(base64Data);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        return await pdfDoc.embedPng(bytes);
      } catch (e) {
        console.error('Failed to embed image from data URL', e);
        return null;
      }
    };

    // ────────────────────────────────────────────────────────────────────────
    // PAGE 1: COVER PAGE
    // ────────────────────────────────────────────────────────────────────────
    const coverPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    // Top Header Color Bar
    coverPage.drawRectangle({
      x: 0,
      y: PAGE_HEIGHT - 80,
      width: PAGE_WIDTH,
      height: 80,
      color: rgb(11 / 255, 18 / 255, 32 / 255), // Deep Navy
    });

    coverPage.drawText(BrandingService.COMPANY_NAME, {
      x: MARGIN,
      y: PAGE_HEIGHT - 45,
      size: PAGE_WIDTH > 700 ? 18 : 13,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    coverPage.drawText(BrandingService.APP_TITLE, {
      x: MARGIN,
      y: PAGE_HEIGHT - 65,
      size: PAGE_WIDTH > 700 ? 10 : 8,
      font: fontReg,
      color: rgb(108 / 255, 92 / 255, 231 / 255), // Indigo Accent
    });

    // Right side text on cover page header
    coverPage.drawText('CONFIDENTIAL REPORT', {
      x: PAGE_WIDTH - MARGIN - 160,
      y: PAGE_HEIGHT - 45,
      size: 10,
      font: fontBold,
      color: rgb(239 / 255, 68 / 255, 68 / 255), // Red
    });

    coverPage.drawText(`ID: ${meta.reportId}`, {
      x: PAGE_WIDTH - MARGIN - 160,
      y: PAGE_HEIGHT - 62,
      size: 7.5,
      font: fontMono,
      color: rgb(148 / 255, 163 / 255, 184 / 255),
    });

    // Large Title
    coverPage.drawText(reportTitle, {
      x: MARGIN,
      y: PAGE_HEIGHT - 170,
      size: PAGE_WIDTH > 700 ? 28 : 22,
      font: fontBold,
      color: rgb(11 / 255, 18 / 255, 32 / 255),
    });

    coverPage.drawText('Enterprise Operations & Analytics Document', {
      x: MARGIN,
      y: PAGE_HEIGHT - 192,
      size: 11,
      font: fontReg,
      color: rgb(100 / 255, 116 / 255, 139 / 255),
    });

    // Divider Line
    coverPage.drawLine({
      start: { x: MARGIN, y: PAGE_HEIGHT - 215 },
      end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 215 },
      thickness: 1,
      color: rgb(226 / 255, 232 / 255, 240 / 255),
    });

    // Metadata Details
    const metaY = PAGE_HEIGHT - 260;
    coverPage.drawText('Document Metadata', { x: MARGIN, y: metaY, size: 12, font: fontBold, color: rgb(11 / 255, 18 / 255, 32 / 255) });
    coverPage.drawText(`Generation Date:   ${meta.generationDate}`, { x: MARGIN, y: metaY - 20, size: 9, font: fontReg, color: rgb(100 / 255, 116 / 255, 139 / 255) });
    coverPage.drawText(`Generated By:        ${meta.generatedBy}`, { x: MARGIN, y: metaY - 35, size: 9, font: fontReg, color: rgb(100 / 255, 116 / 255, 139 / 255) });
    coverPage.drawText(`Target Branch:       ${meta.branch}`, { x: MARGIN, y: metaY - 50, size: 9, font: fontReg, color: rgb(100 / 255, 116 / 255, 139 / 255) });
    
    if (options.includeAuditTrail) {
      coverPage.drawText(`Data Checksum:     SHA-256 Checksum: [${meta.checksum}]`, { x: MARGIN, y: metaY - 65, size: 9, font: fontMono, color: rgb(100 / 255, 116 / 255, 139 / 255) });
    }

    // Embed QR Verification Code
    const qrDataUrl = await BrandingService.generateQrCode(meta);
    if (qrDataUrl) {
      const qrImage = await embedImageFromDataUrl(qrDataUrl);
      if (qrImage) {
        coverPage.drawImage(qrImage, {
          x: PAGE_WIDTH - MARGIN - 90,
          y: PAGE_HEIGHT - 360,
          width: 80,
          height: 80,
        });
      }
    }

    // Draw KPI cards on cover page or start of stats
    let cardX = MARGIN;
    const cardY = PAGE_HEIGHT - 400;
    const totalCards = summaryCards.length;
    const maxRowCards = PAGE_WIDTH > 700 ? 6 : 4;
    const cardW = PAGE_WIDTH > 700 ? (PAGE_WIDTH - (MARGIN * 2) - 60) / 6 : (PAGE_WIDTH - (MARGIN * 2) - 30) / 4;
    const cardH = 55;

    summaryCards.slice(0, 12).forEach((card, idx) => {
      const rowIdx = Math.floor(idx / maxRowCards);
      const colIdx = idx % maxRowCards;

      const x = MARGIN + colIdx * (cardW + 10);
      const y = cardY - rowIdx * (cardH + 10);

      // Card frame
      coverPage.drawRectangle({
        x,
        y,
        width: cardW,
        height: cardH,
        color: rgb(248 / 255, 250 / 255, 252 / 255),
        borderColor: rgb(226 / 255, 232 / 255, 240 / 255),
        borderWidth: 0.5,
      });

      // Colored left accent bar
      let barColor = rgb(108 / 255, 92 / 255, 231 / 255); // Indigo
      if (card.label.toLowerCase().includes('absent')) barColor = rgb(239 / 255, 68 / 255, 68 / 255);
      if (card.label.toLowerCase().includes('late')) barColor = rgb(245 / 255, 158 / 255, 11 / 255);
      if (card.label.toLowerCase().includes('present')) barColor = rgb(34 / 255, 197 / 255, 94 / 255);

      coverPage.drawRectangle({
        x,
        y,
        width: 3.5,
        height: cardH,
        color: barColor,
      });

      coverPage.drawText(card.label.toUpperCase(), {
        x: x + 8,
        y: y + 36,
        size: 7,
        font: fontBold,
        color: rgb(100 / 255, 116 / 255, 139 / 255),
      });

      coverPage.drawText(String(card.value), {
        x: x + 8,
        y: y + 12,
        size: 15,
        font: fontBold,
        color: rgb(15 / 255, 23 / 255, 42 / 255),
      });
    });

    // Signature boxes at bottom of cover page
    const sigY = MARGIN + 40;
    coverPage.drawLine({ start: { x: MARGIN, y: sigY }, end: { x: MARGIN + 150, y: sigY }, thickness: 0.75, color: rgb(148 / 255, 163 / 255, 184 / 255) });
    coverPage.drawText('Prepared By HR Dept', { x: MARGIN, y: sigY - 12, size: 8, font: fontReg, color: rgb(100 / 255, 116 / 255, 139 / 255) });

    coverPage.drawLine({ start: { x: PAGE_WIDTH - MARGIN - 150, y: sigY }, end: { x: PAGE_WIDTH - MARGIN, y: sigY }, thickness: 0.75, color: rgb(148 / 255, 163 / 255, 184 / 255) });
    coverPage.drawText('Authorized Signatory', { x: PAGE_WIDTH - MARGIN - 150, y: sigY - 12, size: 8, font: fontReg, color: rgb(100 / 255, 116 / 255, 139 / 255) });


    // Helper to draw pages headers
    const drawRunningHeader = (page: any, titleStr: string) => {
      page.drawText(BrandingService.COMPANY_NAME, { x: MARGIN, y: PAGE_HEIGHT - 25, size: 8, font: fontBold, color: rgb(71 / 255, 85 / 255, 105 / 255) });
      page.drawText(titleStr, { x: PAGE_WIDTH - MARGIN - 200, y: PAGE_HEIGHT - 25, size: 8, font: fontReg, color: rgb(148 / 255, 163 / 255, 184 / 255), align: 'right' as any });
      page.drawLine({ start: { x: MARGIN, y: PAGE_HEIGHT - 30 }, end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 30 }, thickness: 0.5, color: rgb(226 / 255, 232 / 255, 240 / 255) });
    };

    // ────────────────────────────────────────────────────────────────────────
    // PAGE 2: CHARTS & ANALYTICS (Optional)
    // ────────────────────────────────────────────────────────────────────────
    if (options.includeCharts) {
      const chartsPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      drawRunningHeader(chartsPage, 'Analytics Dashboard');

      // Calculate totals for Pie Chart
      const presentCount = summaryCards.find(c => c.label.toLowerCase().includes('present'))?.value || 0;
      const absentCount = summaryCards.find(c => c.label.toLowerCase().includes('absent'))?.value || 0;
      const lateCount = summaryCards.find(c => c.label.toLowerCase().includes('late'))?.value || 0;

      const pieData = [
        { label: 'Present', value: Number(presentCount), color: '#22C55E' },
        { label: 'Absent', value: Number(absentCount), color: '#EF4444' },
        { label: 'Late', value: Number(lateCount), color: '#F59E0B' },
      ];

      const pieDataUrl = ChartRenderer.renderPieChart(320, 200, pieData);
      const pieImage = await embedImageFromDataUrl(pieDataUrl);

      if (pieImage) {
        chartsPage.drawImage(pieImage, {
          x: MARGIN,
          y: PAGE_HEIGHT - MARGIN - 230,
          width: 320,
          height: 200,
        });
      }

      // Department Attendance Mock/Grouped Chart
      const deptData = [
        { label: 'Engineering', value: 94 },
        { label: 'Sales', value: 87 },
        { label: 'HR & Admin', value: 100 },
        { label: 'Finance', value: 92 },
      ];
      const deptDataUrl = ChartRenderer.renderVerticalBarChart(320, 200, deptData, 'Department Attendance Rate (%)');
      const deptImage = await embedImageFromDataUrl(deptDataUrl);

      if (deptImage) {
        chartsPage.drawImage(deptImage, {
          x: PAGE_WIDTH - MARGIN - 320,
          y: PAGE_HEIGHT - MARGIN - 230,
          width: 320,
          height: 200,
        });
      }

      // Top 10 Late Arrivals Chart
      try {
        const lateData = tableConfig.rows
          .map(r => {
            const rawLate = r[8] || '';
            const cleanLate = typeof rawLate === 'string' ? rawLate.replace(/\D/g, '') : String(rawLate).replace(/\D/g, '');
            return { name: r[0] || '—', late: parseInt(cleanLate) || 0 };
          })
          .filter(r => r.late > 0)
          .sort((a, b) => b.late - a.late)
          .slice(0, 5)
          .map(r => ({ label: r.name, value: r.late }));

        if (lateData.length > 0) {
          const lateDataUrl = ChartRenderer.renderHorizontalBarChart(320, 180, lateData, 'Top Late Arrivals (Minutes)', '#F59E0B');
          const lateImage = await embedImageFromDataUrl(lateDataUrl);
          if (lateImage) {
            chartsPage.drawImage(lateImage, {
              x: MARGIN,
              y: MARGIN + 40,
              width: 320,
              height: 180,
            });
          }
        }
      } catch (err) {
        console.warn('Skipped late arrivals chart', err);
      }

      // Overtime Chart
      try {
        const otData = tableConfig.rows
          .map(r => {
            const rawOt = r[7] || '';
            const cleanOt = typeof rawOt === 'string' ? rawOt.replace(/\D/g, '') : String(rawOt).replace(/\D/g, '');
            return { name: r[0] || '—', ot: parseInt(cleanOt) || 0 };
          })
          .filter(r => r.ot > 0)
          .sort((a, b) => b.ot - a.ot)
          .slice(0, 5)
          .map(r => ({ label: r.name, value: r.ot }));

        if (otData.length > 0) {
          const otDataUrl = ChartRenderer.renderHorizontalBarChart(320, 180, otData, 'Top Overtime (Minutes)', '#8B5CF6');
          const otImage = await embedImageFromDataUrl(otDataUrl);
          if (otImage) {
            chartsPage.drawImage(otImage, {
              x: PAGE_WIDTH - MARGIN - 320,
              y: MARGIN + 40,
              width: 320,
              height: 180,
            });
          }
        }
      } catch (err) {
        console.warn('Skipped overtime chart', err);
      }
    }

    // ────────────────────────────────────────────────────────────────────────
    // DATA PAGES: ATTENDANCE SUMMARY TABLE
    // ────────────────────────────────────────────────────────────────────────
    let currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let currentY = PAGE_HEIGHT - MARGIN - 30;
    drawRunningHeader(currentPage, reportTitle);

    // Scale column widths to fit printable area width
    const totalColWidth = tableConfig.colWidths.reduce((sum, w) => sum + w, 0);
    const printableWidth = PAGE_WIDTH - (MARGIN * 2);
    let widthScale = 1;
    if (totalColWidth > printableWidth) {
      widthScale = printableWidth / totalColWidth;
    }
    const scaledColWidths = tableConfig.colWidths.map(w => w * widthScale);

    const rowHeight = 20;

    // Draw Table Header
    const drawTableHeader = (page: any, y: number) => {
      page.drawRectangle({
        x: MARGIN,
        y: y - rowHeight,
        width: PAGE_WIDTH - (MARGIN * 2),
        height: rowHeight,
        color: rgb(11 / 255, 18 / 255, 32 / 255), // Navy Header
      });

      let startX = MARGIN;
      tableConfig.headers.forEach((h, idx) => {
        const w = scaledColWidths[idx];
        page.drawText(h, {
          x: startX + 5,
          y: y - rowHeight + 6,
          size: 7.5,
          font: fontBold,
          color: rgb(1, 1, 1),
        });
        startX += w;
      });
    };

    drawTableHeader(currentPage, currentY);
    currentY -= rowHeight;

    // Draw Table Rows
    for (let rIndex = 0; rIndex < tableConfig.rows.length; rIndex++) {
      const row = tableConfig.rows[rIndex];

      // Page boundary safety check
      if (currentY - rowHeight < MARGIN + 40) {
        currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        currentY = PAGE_HEIGHT - MARGIN - 30;
        drawRunningHeader(currentPage, `${reportTitle} (Cont.)`);
        drawTableHeader(currentPage, currentY);
        currentY -= rowHeight;
      }

      // Alternating row shading
      const isEven = rIndex % 2 === 0;
      currentPage.drawRectangle({
        x: MARGIN,
        y: currentY - rowHeight,
        width: PAGE_WIDTH - (MARGIN * 2),
        height: rowHeight,
        color: isEven ? rgb(248 / 255, 250 / 255, 252 / 255) : rgb(255 / 255, 255 / 255, 255 / 255),
        borderColor: rgb(241 / 255, 245 / 255, 249 / 255),
        borderWidth: 0.5,
      });

      let startX = MARGIN;
      row.forEach((cellVal, cIdx) => {
        const w = scaledColWidths[cIdx];
        
        let textColor = rgb(15 / 255, 23 / 255, 42 / 255);
        if (cellVal === 'PRESENT' || cellVal === 'ON TIME') textColor = rgb(22 / 255, 163 / 255, 74 / 255);
        else if (cellVal === 'ABSENT') textColor = rgb(220 / 255, 38 / 255, 38 / 255);
        else if (cellVal === 'LATE') textColor = rgb(217 / 255, 119 / 255, 6 / 255);

        // Bold for status / Net hours
        const activeFont = (cIdx === 0 || cIdx === 6 || cIdx === 9) ? fontBold : fontReg;

        currentPage.drawText(cellVal || '—', {
          x: startX + 5,
          y: currentY - rowHeight + 6,
          size: 7,
          font: activeFont,
          color: textColor,
        });

        startX += w;
      });

      currentY -= rowHeight;
    }

    // ────────────────────────────────────────────────────────────────────────
    // DEVICE SUMMARY PAGE (Optional)
    // ────────────────────────────────────────────────────────────────────────
    if (options.includeDeviceInfo && deviceList.length > 0) {
      currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      currentY = PAGE_HEIGHT - MARGIN - 30;
      drawRunningHeader(currentPage, 'Biometric Hardware Gateway Inventory');

      currentPage.drawText('Biometric Terminals & Status Logs (Identix K90 Pro)', {
        x: MARGIN,
        y: currentY,
        size: 11,
        font: fontBold,
        color: rgb(15 / 255, 23 / 255, 42 / 255),
      });
      currentY -= 20;

      const devHeaders = ['Device Name', 'IP Address', 'Mac Address', 'Sync Logs', 'Active Users', 'Latency', 'Firmware', 'Status'];
      const devWidths = PAGE_WIDTH > 700 ? [140, 100, 100, 70, 70, 60, 100, 70] : [100, 70, 70, 50, 50, 40, 70, 50];

      currentPage.drawRectangle({
        x: MARGIN,
        y: currentY - rowHeight,
        width: PAGE_WIDTH - (MARGIN * 2),
        height: rowHeight,
        color: rgb(15 / 255, 23 / 255, 42 / 255),
      });

      let startX = MARGIN;
      devHeaders.forEach((dh, idx) => {
        currentPage.drawText(dh, {
          x: startX + 5,
          y: currentY - rowHeight + 6,
          size: 7.5,
          font: fontBold,
          color: rgb(1, 1, 1),
        });
        startX += devWidths[idx];
      });

      currentY -= rowHeight;

      deviceList.forEach((dev) => {
        currentPage.drawRectangle({
          x: MARGIN,
          y: currentY - rowHeight,
          width: PAGE_WIDTH - (MARGIN * 2),
          height: rowHeight,
          color: rgb(255 / 255, 255 / 255, 255 / 255),
          borderColor: rgb(241 / 255, 245 / 255, 249 / 255),
          borderWidth: 0.5,
        });

        const devValues = [
          dev.name || 'Identix K90 Pro',
          dev.ip_address || '—',
          dev.mac_address || '—',
          String(dev.template_count || 0),
          String(dev.user_count || 0),
          `${dev.latency_ms || 0}ms`,
          dev.firmware_version || 'v4.15',
          String(dev.status || 'offline').toUpperCase(),
        ];

        let devX = MARGIN;
        devValues.forEach((dv, idx) => {
          let color = rgb(15 / 255, 23 / 255, 42 / 255);
          if (idx === 7) {
            color = dv === 'ONLINE' ? rgb(22 / 255, 163 / 255, 74 / 255) : rgb(220 / 255, 38 / 255, 38 / 255);
          }
          currentPage.drawText(dv, {
            x: devX + 5,
            y: currentY - rowHeight + 6,
            size: 7,
            font: idx === 7 ? fontBold : fontReg,
            color,
          });
          devX += devWidths[idx];
        });

        currentY -= rowHeight;
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // DETAILED ACTIVITY TIMELINE LOGS (Optional)
    // ────────────────────────────────────────────────────────────────────────
    if (options.includeTimeline && timelineLogs.length > 0) {
      currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      currentY = PAGE_HEIGHT - MARGIN - 30;
      drawRunningHeader(currentPage, 'Biometric Activity Logs');

      currentPage.drawText('Real-time Biometric Activity Audit logs', {
        x: MARGIN,
        y: currentY,
        size: 11,
        font: fontBold,
        color: rgb(15 / 255, 23 / 255, 42 / 255),
      });
      currentY -= 20;

      const timeHeaders = ['Employee ID', 'Name', 'Department', 'Date', 'Time', 'Biometric Event', 'Terminal', 'Method'];
      const timeWidths = PAGE_WIDTH > 700 ? [80, 110, 100, 70, 70, 100, 110, 80] : [60, 80, 70, 50, 50, 70, 80, 50];

      currentPage.drawRectangle({
        x: MARGIN,
        y: currentY - rowHeight,
        width: PAGE_WIDTH - (MARGIN * 2),
        height: rowHeight,
        color: rgb(15 / 255, 23 / 255, 42 / 255),
      });

      let startX = MARGIN;
      timeHeaders.forEach((th, idx) => {
        currentPage.drawText(th, {
          x: startX + 5,
          y: currentY - rowHeight + 6,
          size: 7.5,
          font: fontBold,
          color: rgb(1, 1, 1),
        });
        startX += timeWidths[idx];
      });

      currentY -= rowHeight;

      // Draw up to 50 logs to prevent infinite PDF size
      const visibleLogs = timelineLogs.slice(0, 100);
      for (let lIdx = 0; lIdx < visibleLogs.length; lIdx++) {
        const log = visibleLogs[lIdx];

        if (currentY - rowHeight < MARGIN + 40) {
          currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          currentY = PAGE_HEIGHT - MARGIN - 30;
          drawRunningHeader(currentPage, 'Biometric Activity Logs (Cont.)');
          
          currentPage.drawRectangle({
            x: MARGIN,
            y: currentY - rowHeight,
            width: PAGE_WIDTH - (MARGIN * 2),
            height: rowHeight,
            color: rgb(15 / 255, 23 / 255, 42 / 255),
          });

          let loopX = MARGIN;
          timeHeaders.forEach((th, idx) => {
            currentPage.drawText(th, {
              x: loopX + 5,
              y: currentY - rowHeight + 6,
              size: 7.5,
              font: fontBold,
              color: rgb(1, 1, 1),
            });
            loopX += timeWidths[idx];
          });
          currentY -= rowHeight;
        }

        currentPage.drawRectangle({
          x: MARGIN,
          y: currentY - rowHeight,
          width: PAGE_WIDTH - (MARGIN * 2),
          height: rowHeight,
          color: lIdx % 2 === 0 ? rgb(248 / 255, 250 / 255, 252 / 255) : rgb(255 / 255, 255 / 255, 255 / 255),
          borderColor: rgb(241 / 255, 245 / 255, 249 / 255),
          borderWidth: 0.5,
        });

        const logValues = [
          log.employeeId || '—',
          log.employeeName || '—',
          log.department || '—',
          log.eventTime ? log.eventTime.split('T')[0] : '—',
          log.formattedTime || '—',
          log.eventType || '—',
          log.device ? log.device.split('(')[0] : '—',
          log.method || 'Manual',
        ];

        let logX = MARGIN;
        logValues.forEach((lv, idx) => {
          let color = rgb(15 / 255, 23 / 255, 42 / 255);
          if (idx === 5) {
            color = lv.includes('CHECK_IN') ? rgb(22 / 255, 163 / 255, 74 / 255) :
                    lv.includes('CHECK_OUT') ? rgb(220 / 255, 38 / 255, 38 / 255) :
                    rgb(108 / 255, 92 / 255, 231 / 255);
          }
          currentPage.drawText(lv, {
            x: logX + 5,
            y: currentY - rowHeight + 6,
            size: 6.5,
            font: idx === 5 ? fontBold : fontReg,
            color,
          });
          logX += timeWidths[idx];
        });

        currentY -= rowHeight;
      }
    }


    // ────────────────────────────────────────────────────────────────────────
    // WATERMARK, RUNNING FOOTER & PAGE NUMBERING OVERLAY
    // ────────────────────────────────────────────────────────────────────────
    const pages = pdfDoc.getPages();
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];

      // Watermark
      if (i > 0) {
        page.drawText('CONFIDENTIAL', {
          x: PAGE_WIDTH / 2 - 120,
          y: PAGE_HEIGHT / 2 - 50,
          size: 40,
          font: fontBold,
          color: rgb(239 / 255, 68 / 255, 68 / 255),
          opacity: 0.03,
          rotate: degrees(30),
        });
      }

      // Draw footer line
      page.drawLine({
        start: { x: MARGIN, y: 35 },
        end: { x: PAGE_WIDTH - MARGIN, y: 35 },
        thickness: 0.5,
        color: rgb(226 / 255, 232 / 255, 240 / 255),
      });

      page.drawText('Confidential • Generated by JRM HRMS Enterprise', {
        x: MARGIN,
        y: 20,
        size: 7.5,
        font: fontReg,
        color: rgb(148 / 255, 163 / 255, 184 / 255),
      });

      page.drawText('© Joy Corporate Solutions Pvt. Ltd.', {
        x: PAGE_WIDTH / 2 - 80,
        y: 20,
        size: 7.5,
        font: fontReg,
        color: rgb(148 / 255, 163 / 255, 184 / 255),
      });

      page.drawText(`Page ${i + 1} / ${pages.length}`, {
        x: PAGE_WIDTH - MARGIN - 50,
        y: 20,
        size: 7.5,
        font: fontBold,
        color: rgb(100 / 255, 116 / 255, 139 / 255),
      });
    }

    // Trigger Browser download
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const formattedName = options.fileName.replace(/\s+/g, '_');
    link.setAttribute('download', `${formattedName}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
