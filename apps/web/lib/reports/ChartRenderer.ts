/**
 * ChartRenderer.ts
 *
 * Implements high-fidelity programmatic HTML5 canvas drawing for analytics charts.
 * Runs in the browser context to export PNG data URLs for PDF and Excel report injection.
 */

export interface ChartDataItem {
  label: string;
  value: number;
  color?: string;
}

export class ChartRenderer {
  /**
   * Generates a canvas and draws a custom Pie Chart (e.g. for Attendance Distribution).
   */
  public static renderPieChart(
    width: number,
    height: number,
    data: ChartDataItem[]
  ): string {
    const canvas = document.createElement('canvas');
    canvas.width = width * 2; // high-DPI scaling
    canvas.height = height * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.scale(2, 2);
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    const total = data.reduce((sum, item) => sum + item.value, 0);
    const radius = Math.min(width, height) * 0.35;
    const centerX = width * 0.35;
    const centerY = height * 0.5;

    // Draw Slices
    let startAngle = -Math.PI / 2;
    data.forEach((item) => {
      if (item.value <= 0 || total === 0) return;
      const sliceAngle = (item.value / total) * 2 * Math.PI;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      ctx.closePath();

      // Shadow/3D style
      ctx.fillStyle = item.color || '#CBD5E1';
      ctx.fill();

      // Delicate slice borders
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      startAngle += sliceAngle;
    });

    // Draw Legend on the right
    const legendX = width * 0.68;
    let legendY = height * 0.22;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#1E293B';
    ctx.fillText('Distribution', legendX, legendY - 15);

    data.forEach((item) => {
      // Color dot
      ctx.beginPath();
      ctx.arc(legendX, legendY - 3, 5, 0, 2 * Math.PI);
      ctx.fillStyle = item.color || '#CBD5E1';
      ctx.fill();

      // Text label and percent
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#475569';
      const percent = total > 0 ? ((item.value / total) * 100).toFixed(0) : '0';
      ctx.fillText(`${item.label}: ${item.value} (${percent}%)`, legendX + 12, legendY);

      legendY += 18;
    });

    return canvas.toDataURL('image/png');
  }

  /**
   * Generates a canvas and draws a custom Horizontal Bar Chart (e.g. for Employee working hours).
   */
  public static renderHorizontalBarChart(
    width: number,
    height: number,
    data: ChartDataItem[],
    title: string,
    barColor: string = '#6366F1'
  ): string {
    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.scale(2, 2);
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Chart title
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#1E293B';
    ctx.fillText(title, 20, 25);

    const marginL = 90;
    const marginR = 30;
    const marginT = 45;
    const marginB = 30;
    const chartW = width - marginL - marginR;
    const chartH = height - marginT - marginB;

    const maxVal = Math.max(...data.map((d) => d.value), 1);
    const rowHeight = data.length > 0 ? chartH / data.length : 20;

    data.forEach((item, index) => {
      const y = marginT + index * rowHeight + rowHeight * 0.15;
      const barH = rowHeight * 0.7;
      const barW = (item.value / maxVal) * chartW;

      // Draw Row Guideline
      ctx.strokeStyle = '#F1F5F9';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(marginL, y + barH / 2);
      ctx.lineTo(marginL + chartW, y + barH / 2);
      ctx.stroke();

      // Draw label
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#475569';
      ctx.textAlign = 'right';
      ctx.fillText(
        item.label.length > 12 ? item.label.slice(0, 10) + '..' : item.label,
        marginL - 8,
        y + barH / 2 + 3.5
      );

      // Draw rounded bar
      ctx.fillStyle = barColor;
      ctx.fillRect(marginL, y, barW, barH);

      // Draw value on bar end
      ctx.textAlign = 'left';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillStyle = '#1E293B';
      ctx.fillText(String(item.value.toFixed(1)), marginL + barW + 5, y + barH / 2 + 3);
    });

    // Reset align
    ctx.textAlign = 'left';

    return canvas.toDataURL('image/png');
  }

  /**
   * Generates a canvas and draws a custom Vertical Bar Chart (e.g. for Department staff count).
   */
  public static renderVerticalBarChart(
    width: number,
    height: number,
    data: ChartDataItem[],
    title: string,
    barColor: string = '#3B82F6'
  ): string {
    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.scale(2, 2);
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Chart title
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#1E293B';
    ctx.fillText(title, 20, 25);

    const marginL = 40;
    const marginR = 20;
    const marginT = 45;
    const marginB = 40;
    const chartW = width - marginL - marginR;
    const chartH = height - marginT - marginB;

    const maxVal = Math.max(...data.map((d) => d.value), 1);
    const colWidth = data.length > 0 ? chartW / data.length : 30;

    // Draw Y-axis gridlines
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const y = marginT + (chartH / gridLines) * i;
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(marginL, y);
      ctx.lineTo(marginL + chartW, y);
      ctx.stroke();

      const labelVal = maxVal - (maxVal / gridLines) * i;
      ctx.font = '8px sans-serif';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(String(Math.round(labelVal)), marginL - 25, y + 3);
    }

    data.forEach((item, index) => {
      const x = marginL + index * colWidth + colWidth * 0.15;
      const barW = colWidth * 0.7;
      const barH = (item.value / maxVal) * chartH;
      const y = marginT + chartH - barH;

      // Draw Bar
      ctx.fillStyle = barColor;
      ctx.fillRect(x, y, barW, barH);

      // Label below bar
      ctx.save();
      ctx.translate(x + barW / 2, marginT + chartH + 8);
      ctx.rotate(-Math.PI / 12); // subtle tilt for labels
      ctx.font = '9px sans-serif';
      ctx.fillStyle = '#475569';
      ctx.textAlign = 'center';
      ctx.fillText(
        item.label.length > 8 ? item.label.slice(0, 7) + '.' : item.label,
        0,
        0
      );
      ctx.restore();

      // Value text above bar
      ctx.font = 'bold 9px sans-serif';
      ctx.fillStyle = '#1E293B';
      ctx.textAlign = 'center';
      ctx.fillText(String(item.value), x + barW / 2, y - 5);
    });

    return canvas.toDataURL('image/png');
  }
}
