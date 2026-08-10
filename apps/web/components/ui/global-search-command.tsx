'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  User,
  Building2,
  FileText,
  Fingerprint,
  HelpCircle,
  Clock,
  Sparkles,
  Command,
  X,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { fetchEmployeesFromSupabase } from '../../lib/supabase';
import { Employee } from '../../types';

interface SearchResultItem {
  id: string;
  category: 'Employee' | 'Department' | 'Ticket' | 'Device' | 'Workflow';
  title: string;
  subtitle: string;
  badge: string;
}

export function GlobalSearchCommand() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    fetchEmployeesFromSupabase().then((data) => {
      if (data) setEmployees(data);
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  const mockItems: SearchResultItem[] = [
    ...employees.map((emp) => ({
      id: emp.id,
      category: 'Employee' as const,
      title: emp.name,
      subtitle: `${emp.designation || 'Engineer'} • ${emp.department || 'Software Development'} (${emp.id})`,
      badge: 'Active Employee',
    })),
    {
      id: 'DEPT-01',
      category: 'Department',
      title: 'Software Engineering & IT',
      subtitle: 'Joy Corporate Solutions Pvt. Ltd. • Coimbatore HQ',
      badge: '18 Staff',
    },
    {
      id: 'DEV-01',
      category: 'Device',
      title: 'Mantra MFS110 L1 Fingerprint Terminal',
      subtitle: 'USB Device • Main Gate Entrance • 127.0.0.1:11100',
      badge: 'ONLINE',
    },
    {
      id: 'WRK-9402',
      category: 'Workflow',
      title: 'Attendance Correction #WRK-2026-9402',
      subtitle: 'Missed Check-In (Scanner Offline) • THIRUMALAI R K',
      badge: 'Manager Approved',
    },
    {
      id: 'TCK-1084',
      category: 'Ticket',
      title: 'Helpdesk Ticket #TCK-2026-1084',
      subtitle: 'Fingerprint Biometric Verification Retry • Open SLA',
      badge: 'IT Support',
    },
  ];

  const filtered = mockItems.filter((item) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800 bg-slate-950">
          <Search className="w-5 h-5 text-purple-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to search employees, tickets, workflows, devices... (Esc to close)"
            className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none font-mono"
          />
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-1 font-mono text-xs">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-mono text-xs">
              No matching enterprise records found.
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-800/80 cursor-pointer transition border border-transparent hover:border-slate-700"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 font-bold">
                    {item.category === 'Employee' && <User className="w-4 h-4" />}
                    {item.category === 'Department' && <Building2 className="w-4 h-4" />}
                    {item.category === 'Device' && <Fingerprint className="w-4 h-4" />}
                    {item.category === 'Workflow' && <FileText className="w-4 h-4" />}
                    {item.category === 'Ticket' && <HelpCircle className="w-4 h-4" />}
                  </div>
                  <div>
                    <span className="font-bold text-white block text-sm font-sans">{item.title}</span>
                    <span className="text-[11px] text-slate-400 block">{item.subtitle}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-[10px] font-bold text-purple-300">
                    {item.badge}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div className="px-5 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">CTRL + K</span>
            <span>Global Command Palette</span>
          </div>
          <span>Joy Corporate HRMS Production v2.0</span>
        </div>

      </div>
    </div>
  );
}
