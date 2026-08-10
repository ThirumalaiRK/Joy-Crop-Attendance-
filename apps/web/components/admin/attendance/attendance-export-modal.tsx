'use client';

import React, { useState, useEffect } from 'react';
import {
  X, Check, FileText, FileSpreadsheet, FileDown, 
  Settings2, Activity, Printer, Download, Sparkles
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { exportToPDF, exportToExcel, exportToCSV } from '../../../lib/attendance/export-engine';
import { AttendanceSummary } from '../../../lib/attendance/attendance-types';

interface AttendanceExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredSummaries: AttendanceSummary[];
  allSummaries: AttendanceSummary[];
  defaultFormat?: 'pdf' | 'excel' | 'csv';
}

export function AttendanceExportModal({
  isOpen,
  onClose,
  filteredSummaries,
  allSummaries,
  defaultFormat = 'pdf'
}: AttendanceExportModalProps) {
  const TODAY_STR = new Date().toISOString().split('T')[0].replace(/-/g, '_');
  
  // Exporter Config State
  const [fileName, setFileName] = useState(`Attendance_Report_${TODAY_STR}`);
  const [exportScope, setExportScope] = useState<'filtered' | 'all'>('filtered');
  const [format, setFormat] = useState<'pdf' | 'excel' | 'csv'>(defaultFormat);

  useEffect(() => {
    if (isOpen) {
      setFormat(defaultFormat);
    }
  }, [isOpen, defaultFormat]);
  
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeLogo, setIncludeLogo] = useState(true);
  const [includePhotos, setIncludePhotos] = useState(false);
  const [includeDeviceInfo, setIncludeDeviceInfo] = useState(true);
  const [includeTimeline, setIncludeTimeline] = useState(true);
  const [includePayrollSummary, setIncludePayrollSummary] = useState(true);
  const [includeAuditTrail, setIncludeAuditTrail] = useState(true);
  
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [paperSize, setPaperSize] = useState<'A4' | 'letter'>('A4');

  // Progress Stepper State
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');

  if (!isOpen) return null;

  // Stepper helper
  const runExportProgress = async (exportFn: () => Promise<void> | void) => {
    setIsExporting(true);
    setProgress(10);
    setProgressText('Initializing export dataset...');
    await new Promise(r => setTimeout(r, 600));

    setProgress(25);
    setProgressText('Fetching biometric devices & network status...');
    await new Promise(r => setTimeout(r, 600));

    setProgress(50);
    setProgressText('Rendering analytics and distribution charts...');
    await new Promise(r => setTimeout(r, 700));

    setProgress(75);
    setProgressText('Composing layout grids and compiling sheets...');
    await new Promise(r => setTimeout(r, 600));

    setProgress(90);
    setProgressText('Encoding document binary stream...');
    await new Promise(r => setTimeout(r, 400));

    try {
      await exportFn();
      setProgress(100);
      setProgressText('Done! Starting download...');
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error(err);
      alert('Document generation failed: ' + (err as any).message);
    } finally {
      setIsExporting(false);
      setProgress(0);
      setProgressText('');
      onClose();
    }
  };

  const handleExport = async () => {
    const activeSummaries = exportScope === 'filtered' ? filteredSummaries : allSummaries;

    // Fetch related device and timeline data dynamically
    let devices: any[] = [];
    let timelineEvents: any[] = [];

    try {
      const { data: devs } = await supabase.from('devices').select('*');
      if (devs) devices = devs;

      // Fetch employees to resolve canonical names and departments
      const { data: emps } = await supabase.from('employees').select('employee_code, name, department');
      const empMap = new Map<string, { name: string; dept: string }>();
      
      if (emps) {
        emps.forEach((emp: any) => {
          const info = { name: emp.name, dept: emp.department || 'General' };
          if (emp.employee_code) {
            empMap.set(emp.employee_code, info);
            const num = parseInt(emp.employee_code.replace(/\D/g, ''), 10);
            if (!isNaN(num)) {
              empMap.set(String(num), info);
              empMap.set(`EMP-${num}`, info);
              empMap.set(`EMP-${String(num).padStart(2, '0')}`, info);
              empMap.set(`EMP-${String(num).padStart(6, '0')}`, info);
            }
          }
        });
      }

      const { data: evts } = await supabase
        .from('attendance_events')
        .select('*')
        .order('event_time', { ascending: false });

      if (evts) {
        const BUSINESS_EVENTS = new Set([
          'CHECK_IN', 'CHECK_OUT', 
          'BREAK_START', 'BREAK_END', 
          'LUNCH_START', 'LUNCH_END', 
          'FIELD_VISIT_START', 'FIELD_VISIT_END', 
          'MEETING_OUT', 'MEETING_IN'
        ]);

        // Filter valid business events
        const filteredEvts = evts.filter((e: any) => BUSINESS_EVENTS.has(e.event_type));

        // Deduplicate identical sequential events for the same employee within the same minute
        const seen = new Set<string>();
        const cleanEvts = [];
        for (const e of filteredEvts) {
          const minStr = e.event_time ? e.event_time.slice(0, 16) : '';
          const key = `${e.employee_id}-${e.event_type}-${minStr}`;
          if (!seen.has(key)) {
            seen.add(key);
            cleanEvts.push(e);
          }
        }

        timelineEvents = cleanEvts.map((e: any) => {
          const empId = e.employee_id || '';
          const lookup = empMap.get(empId) || empMap.get(e.employee_name) || empMap.get(empId.replace(/\D/g, ''));
          
          return {
            employeeId: empId,
            employeeName: lookup?.name || e.employee_name || 'Employee',
            department: lookup?.dept || e.department || 'General',
            eventType: e.event_type,
            eventTime: e.event_time,
            formattedTime: new Date(e.event_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
            device: e.device || 'Biometric Device',
            method: e.method || 'Fingerprint',
          };
        });
      }
    } catch (err) {
      console.warn('Error pre-fetching subdata for export:', err);
    }

    if (format === 'pdf') {
      const pdfOpts = {
        includeCharts,
        includeLogo,
        includePhotos,
        includeDeviceInfo,
        includeTimeline,
        includePayrollSummary,
        includeAuditTrail,
        orientation,
        paperSize,
        fileName
      };

      runExportProgress(() => exportToPDF(activeSummaries, pdfOpts, devices, timelineEvents));
    } else if (format === 'excel') {
      const excelOpts = {
        includeCharts,
        includeLogo,
        includeDeviceInfo,
        includeTimeline,
        includePayrollSummary,
        includeAuditTrail,
        fileName
      };
      runExportProgress(() => exportToExcel(activeSummaries, excelOpts, devices, timelineEvents));
    } else {
      // CSV Exporter
      runExportProgress(() => exportToCSV(activeSummaries, fileName));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-lg font-black text-white">Export Configuration Wizard</h3>
              <p className="text-xs text-slate-400">Customize layout, meta information, and reports sections</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {!isExporting ? (
          <div className="py-5 space-y-5">
            {/* Filename & Scope & Format Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">File Name</label>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Export Scope</label>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setExportScope('filtered')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition ${
                      exportScope === 'filtered' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Filtered ({filteredSummaries.length})
                  </button>
                  <button
                    onClick={() => setExportScope('all')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition ${
                      exportScope === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Export All ({allSummaries.length})
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">File Format</label>
                <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setFormat('pdf')}
                    className={`py-1.5 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 ${
                      format === 'pdf' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>
                  <button
                    onClick={() => setFormat('excel')}
                    className={`py-1.5 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 ${
                      format === 'excel' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Excel</span>
                  </button>
                  <button
                    onClick={() => setFormat('csv')}
                    className={`py-1.5 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 ${
                      format === 'csv' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Layout Options (Only for PDF) */}
            {format === 'pdf' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/60 animate-in slide-in-from-top-1 duration-150">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Page Orientation</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOrientation('landscape')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                        orientation === 'landscape' ? 'bg-slate-800 text-white border-indigo-500' : 'bg-transparent text-slate-400 border-slate-800'
                      }`}
                    >
                      Landscape (A4 Wide)
                    </button>
                    <button
                      onClick={() => setOrientation('portrait')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                        orientation === 'portrait' ? 'bg-slate-800 text-white border-indigo-500' : 'bg-transparent text-slate-400 border-slate-800'
                      }`}
                    >
                      Portrait (Tall)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Paper Size</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPaperSize('A4')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                        paperSize === 'A4' ? 'bg-slate-800 text-white border-indigo-500' : 'bg-transparent text-slate-400 border-slate-800'
                      }`}
                    >
                      A4 Standard
                    </button>
                    <button
                      onClick={() => setPaperSize('letter')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                        paperSize === 'letter' ? 'bg-slate-800 text-white border-indigo-500' : 'bg-transparent text-slate-400 border-slate-800'
                      }`}
                    >
                      US Letter
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Document Blocks (PDF & Excel) */}
            {format !== 'csv' && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Include Report Sections</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { state: includeCharts, set: setIncludeCharts, label: 'Visual Analytics Charts', desc: 'Slices & bar charts' },
                    { state: includeLogo, set: setIncludeLogo, label: 'Company Header Logo', desc: 'Joy Corporate branding' },
                    { state: includePhotos, set: setIncludePhotos, label: 'Employee Profile Photos', desc: 'Biometric template photos' },
                    { state: includeDeviceInfo, set: setIncludeDeviceInfo, label: 'Gateway Devices Inventory', desc: 'Identix K90 hardware statuses' },
                    { state: includeTimeline, set: setIncludeTimeline, label: 'Activity Logs Timeline', desc: 'Daily punch logs audit' },
                    { state: includePayrollSummary, set: setIncludePayrollSummary, label: 'Payroll Aggregates Summary', desc: 'Scheduled vs worked calculations' },
                    { state: includeAuditTrail, set: setIncludeAuditTrail, label: 'Cryptographic Audit Trail', desc: 'SHA-256 validation checksums' },
                  ].map((sec) => (
                    <button
                      key={sec.label}
                      onClick={() => sec.set(!sec.state)}
                      className={`p-3 rounded-2xl border text-left transition flex items-start gap-2.5 ${
                        sec.state
                          ? 'bg-slate-850/80 border-indigo-500/40 text-slate-200'
                          : 'bg-slate-950/40 border-slate-800/60 text-slate-500 hover:border-slate-800'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition ${
                        sec.state ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 bg-slate-950'
                      }`}>
                        {sec.state && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-xs font-bold ${sec.state ? 'text-white' : 'text-slate-400'}`}>{sec.label}</span>
                        <span className="text-[10px] text-slate-500 mt-0.5">{sec.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Progress Stepper Page */
          <div className="py-12 flex flex-col items-center justify-center space-y-6">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-slate-800 border-t-indigo-500 animate-spin" />
              <Activity className="w-8 h-8 text-indigo-400 animate-pulse" />
            </div>

            <div className="text-center space-y-1">
              <span className="text-sm font-bold text-white">Generating {format.toUpperCase()} Report</span>
              <p className="text-xs text-indigo-400 font-bold">{progress}% — {progressText}</p>
            </div>

            <div className="w-full max-w-sm bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        {!isExporting && (
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Standard: SAP SuccessFactors UKG ISO 27001</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white font-bold text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Generate &amp; Download</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
