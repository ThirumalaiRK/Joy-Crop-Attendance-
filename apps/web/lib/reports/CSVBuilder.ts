/**
 * CSVBuilder.ts
 *
 * Implements standard RFC-compliant CSV generation with clean escaping
 * using PapaParse.
 */

import Papa from 'papaparse';

export class CSVBuilder {
  /**
   * Generates a CSV string from headers and table rows.
   */
  public static generate(headers: string[], rows: any[][]): string {
    const data = [headers, ...rows];
    return Papa.unparse(data, {
      quotes: true, // Force quote escaping where needed
      newline: '\r\n',
    });
  }

  /**
   * Triggers a browser download of the CSV data.
   */
  public static download(filename: string, csvContent: string): void {
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
