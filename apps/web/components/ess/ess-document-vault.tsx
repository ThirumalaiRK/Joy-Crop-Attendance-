'use client';

import React from 'react';
import { FileText, Download, ShieldCheck, Eye, Sparkles, FolderDown, Search } from 'lucide-react';

interface DocumentItem {
  id: string;
  title: string;
  category: 'PAYSLIP' | 'LETTER' | 'TAX' | 'POLICY' | 'CERTIFICATE';
  date: string;
  size: string;
}

export function ESSDocumentVault() {
  const documents: DocumentItem[] = [
    { id: 'DOC-2026-07', title: 'Payslip — July 2026', category: 'PAYSLIP', date: '2026-08-01', size: '240 KB' },
    { id: 'DOC-2026-06', title: 'Payslip — June 2026', category: 'PAYSLIP', date: '2026-07-01', size: '235 KB' },
    { id: 'DOC-2026-05', title: 'Payslip — May 2026', category: 'PAYSLIP', date: '2026-06-01', size: '238 KB' },
    { id: 'DOC-OFF-2024', title: 'Official Appointment Letter', category: 'LETTER', date: '2024-03-15', size: '1.2 MB' },
    { id: 'DOC-TAX-2026', title: 'Form 16 Tax Certificate (FY 2025-26)', category: 'TAX', date: '2026-05-15', size: '850 KB' },
    { id: 'DOC-POL-2026', title: 'AgencyOS Employee Code of Conduct', category: 'POLICY', date: '2026-01-10', size: '2.4 MB' },
  ];

  const handleDownload = (doc: DocumentItem) => {
    // Generate dummy downloadable file content
    const blob = new Blob([`AgencyOS Official Document: ${doc.title}\nID: ${doc.id}\nIssued: ${doc.date}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <span>My Document Vault</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">View and download official payslips, letters, policies, and tax forms</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition shadow-xl flex items-center justify-between gap-4 group"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-white text-sm truncate">{doc.title}</span>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                  <span>{doc.date}</span>
                  <span>•</span>
                  <span>{doc.size}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleDownload(doc)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-amber-500 text-slate-300 hover:text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
