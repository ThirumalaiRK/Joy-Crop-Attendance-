'use client';

import React, { useState, useEffect } from 'react';
import {
  CalendarClock, Plus, CheckCircle2, XCircle, Clock, AlertCircle,
  FileText, User, Check, AlertTriangle, ShieldCheck, Filter
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AttendanceCorrection } from '../../lib/attendance/attendance-types';
import {
  fetchAttendanceCorrections,
  submitAttendanceCorrection,
  updateCorrectionStatus,
  subscribeAttendanceEvents,
} from '../../lib/attendance/time-engine';
import { fetchEmployeesFromSupabase } from '../../lib/supabase';
import { Employee } from '../../types';

import {
  WorkflowRequest,
  fetchWorkflowRequestsFromSupabase,
  submitWorkflowRequestInSupabase,
  processWorkflowApprovalInSupabase,
  subscribeToWorkflowRealtime,
} from '../../lib/workflow/workflow-engine';

export function AttendanceCorrections() {
  const [workflowReqs, setWorkflowReqs] = useState<WorkflowRequest[]>([]);
  const [corrections, setCorrections] = useState<AttendanceCorrection[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  const [formData, setFormData] = useState({
    employeeId: '',
    requestType: 'MISSING_CHECKOUT' as any,
    requestedTime: '06:00 PM',
    reason: 'Hardware scanner connection reset during checkout',
  });
  const [formError, setFormError] = useState('');

  const loadData = async () => {
    const list = fetchAttendanceCorrections();
    setCorrections(list);
    const wf = await fetchWorkflowRequestsFromSupabase('ALL');
    setWorkflowReqs(wf);
    const emps = await fetchEmployeesFromSupabase();
    if (emps && emps.length > 0) {
      setEmployees(emps);
      if (!formData.employeeId) {
        setFormData((prev) => ({ ...prev, employeeId: emps[0].id }));
      }
    }
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeAttendanceEvents(() => loadData());
    const unsubWf = subscribeToWorkflowRealtime(() => loadData());
    return () => {
      unsub();
      unsubWf();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((e) => e.id === formData.employeeId);
    if (!emp) {
      setFormError('Please select a valid employee.');
      return;
    }

    await submitWorkflowRequestInSupabase({
      employeeId: emp.id,
      employeeName: emp.name,
      department: emp.department || 'Software Development',
      requestType: 'ATTENDANCE_CORRECTION',
      subType: formData.requestType,
      payload: { requestedTime: formData.requestedTime, reason: formData.reason },
    });

    await submitAttendanceCorrection({
      employeeId: emp.id,
      employeeName: emp.name,
      department: emp.department || 'Staff',
      requestType: formData.requestType,
      requestedTime: formData.requestedTime,
      reason: formData.reason,
    });

    confetti({ particleCount: 80, spread: 60 });
    setIsModalOpen(false);
    loadData();
  };

  const handleApprove = async (id: string) => {
    await updateCorrectionStatus(id, 'APPROVED');
    await processWorkflowApprovalInSupabase(id, 'APPROVE', 'THIRUMALAI R K (Super Admin)', 'SuperAdmin', 'Super Admin Override Approved');
    confetti({ particleCount: 70, spread: 50 });
    loadData();
  };

  const handleReject = async (id: string) => {
    await updateCorrectionStatus(id, 'REJECTED');
    await processWorkflowApprovalInSupabase(id, 'REJECT', 'THIRUMALAI R K (Super Admin)', 'SuperAdmin', 'Super Admin Rejected');
    loadData();
  };

  const filtered = corrections.filter(
    (c) => statusFilter === 'ALL' || c.approvalStatus === statusFilter
  );

  return (
    <div className="space-y-6 pb-12 animate-in fade-in select-none">
      {/* Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <CalendarClock className="w-7 h-7" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-2xl font-black text-white tracking-tight">Attendance Correction Requests</h2>
            <p className="text-xs text-slate-400">Manager & HR Approval Workflow for Missing Scans & Time Adjustments</p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xl shadow-amber-500/20 transition active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>New Correction Request</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition ${
              statusFilter === st
                ? 'bg-amber-500 text-slate-950 shadow border border-amber-400'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {st} {st === 'PENDING' && corrections.filter((c) => c.approvalStatus === 'PENDING').length > 0 && `(${corrections.filter((c) => c.approvalStatus === 'PENDING').length})`}
          </button>
        ))}
      </div>

      {/* Requests List */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs font-medium">
            No attendance correction requests found under this filter.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((corr) => (
              <div
                key={corr.id}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-amber-400 text-sm">
                    {corr.employeeName[0]}
                  </div>
                  <div className="flex flex-col text-left space-y-0.5">
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      {corr.employeeName}
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        {corr.requestType}
                      </span>
                    </span>
                    <span className="text-xs text-slate-400">
                      Requested Adjustment Time: <strong className="text-emerald-400 font-mono">{corr.requestedTime}</strong>
                    </span>
                    <span className="text-[11px] text-slate-500">Reason: "{corr.reason}"</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                      corr.approvalStatus === 'APPROVED'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : corr.approvalStatus === 'REJECTED'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
                    }`}
                  >
                    {corr.approvalStatus}
                  </span>

                  {corr.approvalStatus === 'PENDING' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApprove(corr.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleReject(corr.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 font-bold text-xs transition"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white">Submit Attendance Correction Request</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold">Select Employee</label>
                <select
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:border-amber-500 focus:outline-none"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold">Correction Exception Type</label>
                <select
                  value={formData.requestType}
                  onChange={(e) => setFormData({ ...formData, requestType: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:border-amber-500 focus:outline-none"
                >
                  <option value="MISSING_CHECKOUT">Missing Check-Out</option>
                  <option value="MISSING_CHECKIN">Missing Check-In</option>
                  <option value="WRONG_BREAK">Tea Break Duration Adjustment</option>
                  <option value="WRONG_LUNCH">Lunch Break Adjustment</option>
                  <option value="DEVICE_FAILURE">Hardware Scanner Failure</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold">Requested Timestamp (Format: HH:MM AM/PM)</label>
                <input
                  type="text"
                  required
                  value={formData.requestedTime}
                  onChange={(e) => setFormData({ ...formData, requestedTime: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold">Reason for Adjustment</label>
                <textarea
                  rows={3}
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
