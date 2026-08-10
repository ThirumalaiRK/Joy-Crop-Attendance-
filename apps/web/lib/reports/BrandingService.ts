/**
 * BrandingService.ts
 *
 * Centralized service holding JRM corporate identity design tokens,
 * color schemes, and security checksum/QR generation metadata.
 */

import QRCode from 'qrcode';

export interface ReportMeta {
  reportId: string;
  generationDate: string;
  generatedBy: string;
  branch: string;
  checksum: string;
}

export class BrandingService {
  // Theme Color Palette (SAP/UKG Corporate Clean)
  public static readonly COLORS = {
    PRIMARY: '#6C5CE7',      // Royal Indigo
    DARK: '#0B1220',         // Deep Navy
    BACKGROUND: '#F8FAFC',   // Clean Slate Light
    BORDER: '#E5E7EB',       // Light Border
    SUCCESS: '#22C55E',      // Emerald Green
    DANGER: '#EF4444',       // Crimson Red
    WARNING: '#F59E0B',      // Amber Yellow
    TEXT: '#111827',         // Charcoal Dark
    MUTED: '#64748B',        // Muted Gray
    WHITE: '#FFFFFF',
  };

  public static readonly COMPANY_NAME = 'JOY CORPORATE SOLUTIONS PVT LTD';
  public static readonly APP_TITLE = 'Enterprise Human Resource Management System';
  public static readonly VERSION = 'JRM HRMS Enterprise v2.0';

  /**
   * Generates a unique Report ID following: REP-YYYYMMDD-HHMMSS
   */
  public static generateReportId(): string {
    const now = new Date();
    const YYYY = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const DD = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const rand = Math.floor(Math.random() * 900) + 100;
    return `REP-${YYYY}${MM}${DD}-${hh}${mm}${ss}${rand}`;
  }

  /**
   * Calculates a checksum representing report data integrity (CRC-style check)
   */
  public static calculateChecksum(contentString: string): string {
    let hash = 0;
    for (let i = 0; i < contentString.length; i++) {
      const char = contentString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).toUpperCase();
  }

  /**
   * Generates a QR Code as DataURL containing verification data
   */
  public static async generateQrCode(meta: ReportMeta): Promise<string> {
    const text = `ID: ${meta.reportId}\nDate: ${meta.generationDate}\nIssuer: ${meta.generatedBy}\nBranch: ${meta.branch}\nChecksum: ${meta.checksum}\nVerify: https://joycorporate.com/verify-report`;
    try {
      return await QRCode.toDataURL(text, {
        margin: 1,
        width: 100,
        color: {
          dark: '#0B1220',
          light: '#FFFFFF'
        }
      });
    } catch (err) {
      console.error('QR code generation failed:', err);
      return '';
    }
  }
}
