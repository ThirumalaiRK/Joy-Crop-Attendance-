'use client';

import React, { useState } from 'react';
import { Key, ShieldAlert, ShieldCheck, Save, Users, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface PermissionRule {
  resource: string;
  read: boolean;
  write: boolean;
  delete: boolean;
}

const INITIAL_RULES: Record<string, PermissionRule[]> = {
  'SUPER_ADMIN': [
    { resource: 'Dashboard & Summaries', read: true, write: true, delete: true },
    { resource: 'Employee Profiles', read: true, write: true, delete: true },
    { resource: 'Biometric Credentials', read: true, write: true, delete: true },
    { resource: 'Payroll & Pay Codes', read: true, write: true, delete: true },
    { resource: 'Hardware & Device commands', read: true, write: true, delete: true },
    { resource: 'Security & App Settings', read: true, write: true, delete: true },
  ],
  'HR_MANAGER': [
    { resource: 'Dashboard & Summaries', read: true, write: true, delete: false },
    { resource: 'Employee Profiles', read: true, write: true, delete: false },
    { resource: 'Biometric Credentials', read: true, write: true, delete: false },
    { resource: 'Payroll & Pay Codes', read: true, write: true, delete: false },
    { resource: 'Hardware & Device commands', read: true, write: false, delete: false },
    { resource: 'Security & App Settings', read: false, write: false, delete: false },
  ],
  'EMPLOYEE': [
    { resource: 'Dashboard & Summaries', read: true, write: false, delete: false },
    { resource: 'Employee Profiles', read: true, write: false, delete: false },
    { resource: 'Biometric Credentials', read: false, write: false, delete: false },
    { resource: 'Payroll & Pay Codes', read: false, write: false, delete: false },
    { resource: 'Hardware & Device commands', read: false, write: false, delete: false },
    { resource: 'Security & App Settings', read: false, write: false, delete: false },
  ],
};

export function AccessControl() {
  const [selectedRole, setSelectedRole] = useState<'SUPER_ADMIN' | 'HR_MANAGER' | 'EMPLOYEE'>('SUPER_ADMIN');
  const [rules, setRules] = useState<Record<string, PermissionRule[]>>(INITIAL_RULES);

  const handleToggle = (index: number, field: 'read' | 'write' | 'delete') => {
    setRules((prev) => {
      const currentRules = [...prev[selectedRole]];
      currentRules[index] = {
        ...currentRules[index],
        [field]: !currentRules[index][field],
      };
      return {
        ...prev,
        [selectedRole]: currentRules,
      };
    });
  };

  const handleSave = () => {
    toast.success(`Access control rules updated successfully for role: ${selectedRole}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Access Control & User Roles</h1>
        <p className="text-xs text-slate-400">Map system permissions to roles and audit security policy bindings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Role Selection Column */}
        <div className="space-y-3">
          <h2 className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider">System Roles</h2>
          
          <button
            onClick={() => setSelectedRole('SUPER_ADMIN')}
            className={`w-full text-left p-3 rounded-xl border transition flex items-center gap-3 ${
              selectedRole === 'SUPER_ADMIN'
                ? 'bg-amber-500/10 border-amber-500/20 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <div className="text-xs font-bold">Super Admin</div>
          </button>

          <button
            onClick={() => setSelectedRole('HR_MANAGER')}
            className={`w-full text-left p-3 rounded-xl border transition flex items-center gap-3 ${
              selectedRole === 'HR_MANAGER'
                ? 'bg-amber-500/10 border-amber-500/20 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
            }`}
          >
            <Users className="w-4 h-4 text-blue-400" />
            <div className="text-xs font-bold">HR Manager</div>
          </button>

          <button
            onClick={() => setSelectedRole('EMPLOYEE')}
            className={`w-full text-left p-3 rounded-xl border transition flex items-center gap-3 ${
              selectedRole === 'EMPLOYEE'
                ? 'bg-amber-500/10 border-amber-500/20 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
            }`}
          >
            <Users className="w-4 h-4 text-slate-400" />
            <div className="text-xs font-bold">Employee</div>
          </button>
        </div>

        {/* Permissions Mapping Grid */}
        <div className="lg:col-span-3 space-y-4 p-6 rounded-2xl bg-slate-900/90 border border-slate-800/80 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400" />
              Permissions Matrix - {selectedRole.replace('_', ' ')}
            </h2>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-xs font-bold text-slate-950 transition"
            >
              <Save className="w-3 h-3" />
              Save Rules
            </button>
          </div>

          <div className="divide-y divide-slate-800/60">
            {rules[selectedRole].map((rule, idx) => (
              <div key={rule.resource} className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                <span className="font-bold text-slate-200">{rule.resource}</span>
                <div className="flex gap-4">
                  
                  {/* Read Toggle */}
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rule.read}
                      onChange={() => handleToggle(idx, 'read')}
                      className="rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                    />
                    <span className="text-slate-400 font-medium">Read</span>
                  </label>

                  {/* Write Toggle */}
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rule.write}
                      onChange={() => handleToggle(idx, 'write')}
                      className="rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                    />
                    <span className="text-slate-400 font-medium">Write</span>
                  </label>

                  {/* Delete Toggle */}
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rule.delete}
                      onChange={() => handleToggle(idx, 'delete')}
                      className="rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                    />
                    <span className="text-slate-400 font-medium">Delete</span>
                  </label>

                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    </div>
  );
}
