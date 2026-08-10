'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2, Plus, QrCode, CheckCircle2, Clock, UserCheck, Search,
  AlertCircle, ShieldCheck, X, Check, AlertTriangle, Eye, ArrowUpRight,
  UserX, Sparkles, Filter, RefreshCw, Calendar, MapPin, User, FileText,
  Phone, Mail, Car, Shield, CheckSquare, XCircle, ChevronRight, LogIn, LogOut,
  Radio, Laptop
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  VisitorPass,
  Visitor,
  VisitorLog,
  VisitorStats,
  VisitorAuditLog,
} from '../../lib/vms/vms-types';
import {
  fetchVisitors,
  fetchVisitorPasses,
  getVisitorStats,
  createVisitorPassTransaction,
  approveVisitorPass,
  rejectVisitorPass,
  checkInVisitorPass,
  checkOutVisitorPass,
  fetchVisitorLogs,
  fetchVisitorAuditLogs,
  subscribeVMSEvents,
} from '../../lib/vms/vms-service';
import { fetchEmployeesFromSupabase } from '../../lib/supabase';
import { Employee } from '../../types';

export function VisitorManager() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'passes' | 'terminal' | 'audit'>('dashboard');
  
  // Data states
  const [passes, setPasses] = useState<VisitorPass[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [stats, setStats] = useState<VisitorStats>({
    currentlyInside: 0,
    expectedToday: 0,
    checkedInToday: 0,
    checkedOutToday: 0,
    pendingApprovals: 0,
    expiredPasses: 0,
    walkInVisitors: 0,
    vipVisitors: 0,
    blacklistedVisitors: 0,
  });
  const [logs, setLogs] = useState<VisitorLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<VisitorAuditLog[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedPassForBadge, setSelectedPassForBadge] = useState<VisitorPass | null>(null);

  // Terminal scanner state
  const [terminalInputCode, setTerminalInputCode] = useState('');
  const [terminalScanResult, setTerminalScanResult] = useState<{
    success: boolean;
    message: string;
    isCollisionError?: boolean;
    pass?: VisitorPass;
  } | null>(null);

  // Registration Form State
  const [formData, setFormData] = useState({
    fullName: '',
    companyName: '',
    mobile: '',
    email: '',
    governmentIdType: 'Aadhaar',
    governmentIdNumber: '',
    vehicleNumber: '',
    emergencyContact: '',
    hostEmployeeId: '',
    hostEmployeeName: '',
    hostDepartment: 'Engineering',
    purpose: 'Executive Meeting',
    meetingRoom: 'Conference Room 1',
    notes: '',
    visitDate: new Date().toISOString().split('T')[0],
    expectedCheckinTime: '09:30',
    expectedCheckoutTime: '17:30',
    autoApprove: true,
  });
  const [formError, setFormError] = useState('');

  // Load Data
  const loadVMSData = async () => {
    try {
      const [pData, vData, sData, lData, aData, empList] = await Promise.all([
        fetchVisitorPasses(),
        fetchVisitors(),
        getVisitorStats(),
        fetchVisitorLogs(),
        fetchVisitorAuditLogs(),
        fetchEmployeesFromSupabase(),
      ]);
      setPasses(pData);
      setVisitors(vData);
      setStats(sData);
      setLogs(lData);
      setAuditLogs(aData);
      if (empList && empList.length > 0) {
        setEmployees(empList);
        if (!formData.hostEmployeeId) {
          setFormData((prev) => ({
            ...prev,
            hostEmployeeId: empList[0].id,
            hostEmployeeName: empList[0].name,
            hostDepartment: empList[0].department || 'Staff',
          }));
        }
      }
    } catch (e) {
      console.error('VMS Data Load Error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVMSData();
    const unsubscribe = subscribeVMSEvents(() => {
      loadVMSData();
    });
    return () => unsubscribe();
  }, []);

  // Handlers
  const handleHostSelect = (empId: string) => {
    const emp = employees.find((e) => e.id === empId);
    if (emp) {
      setFormData((prev) => ({
        ...prev,
        hostEmployeeId: emp.id,
        hostEmployeeName: emp.name,
        hostDepartment: emp.department || 'Staff',
      }));
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      setFormError('Visitor Full Name is required.');
      return;
    }
    if (!formData.mobile.trim()) {
      setFormError('Visitor Mobile Number is required.');
      return;
    }
    if (!formData.companyName.trim()) {
      setFormError('Visitor Company Name is required.');
      return;
    }

    setFormError('');
    const res = await createVisitorPassTransaction({
      ...formData,
      photoUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
    });

    if (res.success && res.pass) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setIsRegisterOpen(false);
      setSelectedPassForBadge(res.pass);
      // Reset form
      setFormData((prev) => ({
        ...prev,
        fullName: '',
        companyName: '',
        mobile: '',
        email: '',
        governmentIdNumber: '',
        vehicleNumber: '',
      }));
      loadVMSData();
    } else {
      setFormError(res.error || 'Failed to create visitor pass.');
    }
  };

  const handleApprovePass = async (passId: string) => {
    const res = await approveVisitorPass(passId, 'Host Admin');
    if (res.success) {
      confetti({ particleCount: 80, spread: 60 });
      loadVMSData();
    }
  };

  const handleRejectPass = async (passId: string) => {
    await rejectVisitorPass(passId, 'Schedule conflict', 'Host Admin');
    loadVMSData();
  };

  const handleTerminalScan = async (action: 'check_in' | 'check_out', codeToUse?: string) => {
    const code = codeToUse || terminalInputCode;
    if (!code.trim()) return;

    let res;
    if (action === 'check_in') {
      res = await checkInVisitorPass(code, 'QR');
    } else {
      res = await checkOutVisitorPass(code, 'QR');
    }

    setTerminalScanResult(res);
    if (res.success) {
      confetti({ particleCount: 90, spread: 65, origin: { y: 0.6 } });
      setTerminalInputCode('');
      loadVMSData();
    }
  };

  // Filtered Passes
  const filteredPasses = passes.filter((p) => {
    const matchesSearch =
      p.visitorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.visitorCompany.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.qrCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.hostEmployeeName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'INSIDE' && p.passStatus === 'INSIDE') ||
      (statusFilter === 'PENDING' && p.approvalStatus === 'PENDING') ||
      (statusFilter === 'APPROVED' && p.approvalStatus === 'APPROVED') ||
      (statusFilter === 'CHECKED_OUT' && p.passStatus === 'CHECKED_OUT');
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in select-none">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 shadow-xl shadow-amber-500/20 ring-1 ring-white/20">
            <Building2 className="w-7 h-7" />
          </div>
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black tracking-tight text-white">Enterprise Visitor Management</h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Realtime Gateway
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Secure QR, Biometric & Host Approval access control pipeline for AgencyOS HQ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsRegisterOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-xl shadow-amber-500/20 transition active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>New Visitor Pass</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
        {[
          { id: 'dashboard', label: 'Realtime Dashboard', icon: Laptop },
          { id: 'passes', label: `Visitor Passes (${passes.length})`, icon: FileText, badge: stats.pendingApprovals > 0 ? `${stats.pendingApprovals} Pending` : undefined },
          { id: 'terminal', label: 'Reception Terminal Scanner', icon: QrCode },
          { id: 'audit', label: 'Audit Trail & Event Logs', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition relative ${
                isActive
                  ? 'bg-slate-800 text-white shadow-lg border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1: REALTIME DASHBOARD ────────────────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Live KPI Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 shadow-xl flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Currently Inside</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-3xl font-black text-emerald-400">{stats.currentlyInside}</span>
                <span className="text-[10px] font-mono text-emerald-400/80">Active in HQ</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/90 border border-blue-500/30 shadow-xl flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expected Today</span>
                <Calendar className="w-4 h-4 text-blue-400" />
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-3xl font-black text-blue-400">{stats.expectedToday}</span>
                <span className="text-[10px] font-mono text-blue-400/80">Scheduled Passes</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/90 border border-amber-500/30 shadow-xl flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Approval</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-3xl font-black text-amber-400">{stats.pendingApprovals}</span>
                <span className="text-[10px] font-mono text-amber-400/80">Host Review Needed</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/90 border border-purple-500/30 shadow-xl flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Checked Out</span>
                <CheckCircle2 className="w-4 h-4 text-purple-400" />
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-3xl font-black text-purple-400">{stats.checkedOutToday}</span>
                <span className="text-[10px] font-mono text-purple-400/80">Visits Completed</span>
              </div>
            </div>
          </div>

          {/* Visitors Currently Inside Section */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                <h3 className="text-lg font-bold text-white">Visitors Active Inside Facility ({stats.currentlyInside})</h3>
              </div>
              <button
                onClick={() => setActiveTab('passes')}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                <span>View All Passes</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {passes.filter((p) => p.passStatus === 'INSIDE').length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs font-medium">
                No active visitors inside the facility right now.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {passes
                  .filter((p) => p.passStatus === 'INSIDE')
                  .map((pass) => (
                    <div
                      key={pass.id}
                      className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 flex items-center justify-between shadow-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-emerald-400 text-sm ring-2 ring-emerald-500/20">
                          {pass.visitorName[0]}
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-bold text-white flex items-center gap-2">
                            {pass.visitorName}
                            <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                              {pass.qrCode}
                            </span>
                          </span>
                          <span className="text-xs text-slate-400">{pass.visitorCompany}</span>
                          <span className="text-[11px] text-slate-500 mt-0.5">
                            Host: <strong className="text-slate-300">{pass.hostEmployeeName}</strong> ({pass.hostDepartment})
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleTerminalScan('check_out', pass.qrCode)}
                        className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Check Out</span>
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Pending Approval Stream */}
          {stats.pendingApprovals > 0 && (
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-amber-500/30 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400 animate-bounce" />
                  <h3 className="text-base font-bold text-white">Pending Host Approvals ({stats.pendingApprovals})</h3>
                </div>
              </div>

              <div className="space-y-3">
                {passes
                  .filter((p) => p.approvalStatus === 'PENDING')
                  .map((pass) => (
                    <div
                      key={pass.id}
                      className="p-4 rounded-2xl bg-slate-950 border border-amber-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                          {pass.visitorName[0]}
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-bold text-white">{pass.visitorName} ({pass.visitorCompany})</span>
                          <span className="text-xs text-slate-400">
                            Purpose: <strong className="text-slate-200">{pass.purpose}</strong> • Host: <strong className="text-amber-300">{pass.hostEmployeeName}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleApprovePass(pass.id)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          <span>Approve & Issue Pass</span>
                        </button>
                        <button
                          onClick={() => handleRejectPass(pass.id)}
                          className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 font-bold text-xs transition"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: VISITOR PASSES LIST ────────────────────────────────────────── */}
      {activeTab === 'passes' && (
        <div className="space-y-4">
          {/* Controls & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search visitor, code, company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Status:
              </span>
              {['ALL', 'INSIDE', 'PENDING', 'APPROVED', 'CHECKED_OUT'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition uppercase ${
                    statusFilter === st
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800/90 shadow-xl overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                  <th className="pb-3">Visitor Info</th>
                  <th className="pb-3">Pass Code</th>
                  <th className="pb-3">Host Employee</th>
                  <th className="pb-3">Purpose</th>
                  <th className="pb-3">Approval</th>
                  <th className="pb-3">Pass Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200 font-medium">
                {filteredPasses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 font-medium">
                      No visitor passes found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredPasses.map((vis) => (
                    <tr key={vis.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5">
                        <div className="flex flex-col">
                          <span className="font-bold text-white text-sm">{vis.visitorName}</span>
                          <span className="text-slate-400 text-[11px]">{vis.visitorCompany} • {vis.visitorMobile}</span>
                        </div>
                      </td>

                      <td className="py-3.5">
                        <span className="font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg font-bold">
                          {vis.qrCode}
                        </span>
                      </td>

                      <td className="py-3.5">
                        <div className="flex flex-col">
                          <span className="font-bold text-blue-400">{vis.hostEmployeeName}</span>
                          <span className="text-slate-500 text-[10px]">{vis.hostDepartment}</span>
                        </div>
                      </td>

                      <td className="py-3.5">
                        <span className="text-slate-300 font-medium">{vis.purpose}</span>
                      </td>

                      <td className="py-3.5">
                        <span
                          className={`px-2.5 py-1 text-[9px] font-bold rounded-full uppercase border ${
                            vis.approvalStatus === 'APPROVED'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : vis.approvalStatus === 'REJECTED'
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {vis.approvalStatus}
                        </span>
                      </td>

                      <td className="py-3.5">
                        <span
                          className={`px-2.5 py-1 text-[9px] font-bold rounded-full uppercase border ${
                            vis.passStatus === 'INSIDE'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                              : vis.passStatus === 'CHECKED_OUT'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                              : vis.passStatus === 'APPROVED'
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                              : 'bg-slate-700/40 text-slate-400 border-slate-600/40'
                          }`}
                        >
                          {vis.passStatus}
                        </span>
                      </td>

                      <td className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedPassForBadge(vis)}
                            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                            title="View Digital Pass Badge & QR"
                          >
                            <QrCode className="w-4 h-4 text-amber-400" />
                          </button>

                          {vis.approvalStatus === 'PENDING' && (
                            <button
                              onClick={() => handleApprovePass(vis.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition"
                            >
                              Approve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 3: RECEPTION TERMINAL SCANNER ────────────────────────────────── */}
      {activeTab === 'terminal' && (
        <div className="w-full max-w-2xl mx-auto space-y-6">
          <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-6 text-center">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold uppercase tracking-wider">
                <QrCode className="w-3.5 h-3.5" />
                <span>HQ Reception Gate Access Terminal</span>
              </div>
              <h3 className="text-2xl font-black text-white">Scan Visitor QR / Enter Pass Code</h3>
              <p className="text-xs text-slate-400">
                Supports automated check-in & check-out validation with instant collision detection
              </p>
            </div>

            {/* Input & Action buttons */}
            <div className="space-y-4 max-w-md mx-auto">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter Pass Code e.g. VIS-2026-100201"
                  value={terminalInputCode}
                  onChange={(e) => setTerminalInputCode(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-2xl bg-slate-950 border-2 border-slate-800 text-white font-mono text-center font-bold text-base focus:border-amber-500 focus:outline-none tracking-wider uppercase placeholder:text-slate-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleTerminalScan('check_in')}
                  className="py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-xl shadow-emerald-500/20 transition flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Check In Visitor</span>
                </button>

                <button
                  onClick={() => handleTerminalScan('check_out')}
                  className="py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xl shadow-purple-500/20 transition flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Check Out Visitor</span>
                </button>
              </div>
            </div>

            {/* Scan Result Feedback Card */}
            {terminalScanResult && (
              <div
                className={`p-5 rounded-2xl border text-left animate-in zoom-in-95 duration-200 space-y-2 ${
                  terminalScanResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                    : terminalScanResult.isCollisionError
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                    : 'bg-rose-500/10 border-rose-500/40 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  {terminalScanResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  )}
                  <span>{terminalScanResult.message}</span>
                </div>

                {terminalScanResult.pass && (
                  <div className="pt-2 border-t border-slate-800 text-xs font-mono space-y-1 text-slate-300">
                    <div>Visitor: <strong className="text-white">{terminalScanResult.pass.visitorName}</strong></div>
                    <div>Host: <strong className="text-white">{terminalScanResult.pass.hostEmployeeName}</strong> ({terminalScanResult.pass.hostDepartment})</div>
                    <div>Purpose: <span>{terminalScanResult.pass.purpose}</span></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 4: AUDIT TRAIL & LOGS ────────────────────────────────────────── */}
      {activeTab === 'audit' && (
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="text-lg font-bold text-white">VMS Security Audit Logs & Realtime History</h3>
            <span className="text-xs text-slate-500">Immutable security event trail</span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            {auditLogs.length === 0 ? (
              <div className="py-8 text-center text-slate-500">No audit logs recorded yet.</div>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-amber-400 border border-slate-700">
                      {log.action}
                    </span>
                    <span className="text-slate-300">{log.details}</span>
                  </div>

                  <div className="flex items-center gap-4 text-slate-500 text-[11px]">
                    <span>Actor: <strong className="text-slate-400">{log.actor}</strong></span>
                    <span>{new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL 1: NEW VISITOR PASS REGISTRATION ───────────────────────────── */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Plus className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Issue Enterprise Visitor Pass</h3>
              </div>
              <button
                onClick={() => setIsRegisterOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-semibold">Visitor Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. Ananya Sharma"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 font-semibold">Company / Organization *</label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="e.g. Acme Solutions Ltd"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 font-semibold">Mobile Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 font-semibold">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="visitor@company.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 font-semibold">Government ID Type</label>
                  <select
                    value={formData.governmentIdType}
                    onChange={(e) => setFormData({ ...formData, governmentIdType: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:border-amber-500 focus:outline-none"
                  >
                    <option value="Aadhaar">Aadhaar Card</option>
                    <option value="Passport">Passport</option>
                    <option value="Driver License">Driver License</option>
                    <option value="PAN Card">PAN Card</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 font-semibold">Government ID Number</label>
                  <input
                    type="text"
                    value={formData.governmentIdNumber}
                    onChange={(e) => setFormData({ ...formData, governmentIdNumber: e.target.value })}
                    placeholder="ID Number"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-slate-400 font-semibold">Host Employee Directory Select *</label>
                  <select
                    value={formData.hostEmployeeId}
                    onChange={(e) => handleHostSelect(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:border-amber-500 focus:outline-none"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.designation || emp.department}) — {emp.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 font-semibold">Purpose of Visit</label>
                  <input
                    type="text"
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 font-semibold">Assigned Meeting Room</label>
                  <input
                    type="text"
                    value={formData.meetingRoom}
                    onChange={(e) => setFormData({ ...formData, meetingRoom: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-medium">
                  <input
                    type="checkbox"
                    checked={formData.autoApprove}
                    onChange={(e) => setFormData({ ...formData, autoApprove: e.target.checked })}
                    className="accent-amber-500 w-4 h-4"
                  />
                  <span>Auto-Approve & Activate Pass Immediately</span>
                </label>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xl shadow-amber-500/20 transition"
                >
                  Issue Visitor Pass
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: DIGITAL PASS BADGE & QR VIEWER ─────────────────────────── */}
      {selectedPassForBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col items-center p-6 space-y-6 text-center relative">
            <button
              onClick={() => setSelectedPassForBadge(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Badge Watermark Header */}
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold uppercase">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>AgencyOS Official Visitor Badge</span>
              </div>
              <h3 className="text-xl font-black text-white">{selectedPassForBadge.visitorName}</h3>
              <p className="text-xs text-slate-400 font-medium">{selectedPassForBadge.visitorCompany}</p>
            </div>

            {/* Simulated Encrypted QR Code View */}
            <div className="p-4 rounded-2xl bg-white border-4 border-amber-500/30 shadow-2xl flex flex-col items-center justify-center space-y-2">
              <QrCode className="w-40 h-40 text-slate-950" />
              <span className="font-mono text-xs font-black text-slate-950 tracking-wider">
                {selectedPassForBadge.qrCode}
              </span>
            </div>

            {/* Pass Metadata Table */}
            <div className="w-full space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs text-left font-mono">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Host</span>
                <span className="font-bold text-blue-400">{selectedPassForBadge.hostEmployeeName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Department</span>
                <span className="font-bold text-slate-300">{selectedPassForBadge.hostDepartment}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Purpose</span>
                <span className="font-bold text-slate-200">{selectedPassForBadge.purpose}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Pass Status</span>
                <span className="font-bold text-amber-400">{selectedPassForBadge.passStatus}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedPassForBadge(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
            >
              Close Pass Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
