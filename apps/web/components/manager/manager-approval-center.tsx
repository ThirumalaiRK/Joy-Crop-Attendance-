'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2, XCircle, Clock, AlertTriangle, ChevronDown,
  ChevronUp, MessageSquare, RefreshCw, Filter, User,
  Calendar, FileText, Sparkles,
} from 'lucide-react';
import {
  WorkflowRequest,
  WorkflowHistoryEntry,
  fetchWorkflowRequestsFromSupabase,
  fetchWorkflowHistoryFromSupabase,
  processWorkflowApprovalInSupabase,
  subscribeToWorkflowRealtime,
} from '../../lib/workflow/workflow-engine';
import {
  notifyWorkflowStatusChanged,
  pushNotification,
} from '../../lib/notifications/notification-engine';
import { clsx } from 'clsx';

type FilterStatus = 'ALL' | 'SUBMITTED' | 'MANAGER_APPROVED' | 'REJECTED' | 'APPLIED';

export function ManagerApprovalCenter() {
  const [requests, setRequests] = useState<WorkflowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('SUBMITTED');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historyMap, setHistoryMap] = useState<Record<string, WorkflowHistoryEntry[]>>({});
  const [commentDraft, setCommentDraft] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await fetchWorkflowRequestsFromSupabase('ReportingManager');
    setRequests(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const unsub = subscribeToWorkflowRealtime(() => load());
    return () => unsub();
  }, []);

  const loadHistory = async (reqId: string) => {
    if (historyMap[reqId]) return;
    const hist = await fetchWorkflowHistoryFromSupabase(reqId);
    setHistoryMap((prev) => ({ ...prev, [reqId]: hist }));
  };

  const handleToggle = (reqId: string) => {
    if (expandedId === reqId) {
      setExpandedId(null);
    } else {
      setExpandedId(reqId);
      loadHistory(reqId);
    }
  };

  const handleAction = async (req: WorkflowRequest, action: 'APPROVE' | 'REJECT') => {
    setProcessingId(req.id);
    const comment = commentDraft.trim() || (action === 'APPROVE' ? 'Manager reviewed and approved.' : 'Manager reviewed and rejected.');

    const result = await processWorkflowApprovalInSupabase(
      req.id,
      action,
      'Reporting Manager — Joy Corporate',
      'ReportingManager',
      comment
    );

    if (result.success) {
      // Send notification to employee
      await notifyWorkflowStatusChanged(
        req.employeeId,
        req.employeeName,
        req.requestNumber,
        action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        'Reporting Manager'
      );

      // Notify HR if escalated
      if (action === 'APPROVE' && result.newStatus === 'MANAGER_APPROVED') {
        await pushNotification({
          recipientId: 'HR-001',
          recipientName: 'HR Specialist',
          recipientRole: 'HRSpecialist',
          title: `📋 HR Review Required: ${req.requestNumber}`,
          body: `Manager approved ${req.employeeName}'s ${req.subType}. Now awaiting HR review.`,
          category: 'WORKFLOW',
          priority: 'HIGH',
          channel: 'IN_APP',
          actionUrl: '/hr?tab=corrections',
          metadata: { requestNumber: req.requestNumber },
        });
      }
    }

    setCommentDraft('');
    setProcessingId(null);
    setExpandedId(null);
    load();
  };

  const filtered = requests.filter((r) => {
    if (filter === 'ALL') return true;
    return r.approvalStatus === filter;
  });

  const statusCounts = {
    SUBMITTED: requests.filter((r) => r.approvalStatus === 'SUBMITTED').length,
    MANAGER_APPROVED: requests.filter((r) => r.approvalStatus === 'MANAGER_APPROVED').length,
    REJECTED: requests.filter((r) => r.approvalStatus === 'REJECTED').length,
    APPLIED: requests.filter((r) => r.approvalStatus === 'APPLIED' || r.approvalStatus === 'AUTO_APPROVED').length,
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      SUBMITTED: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      MANAGER_APPROVED: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      HR_APPROVED: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      APPLIED: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      AUTO_APPROVED: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      REJECTED: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    };
    return map[status] || 'bg-slate-700 text-slate-300 border-slate-600';
  };

  const getStepIcon = (action: string) => {
    if (action === 'APPROVED' || action === 'AUTO_APPROVED') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
    if (action === 'REJECTED') return <XCircle className="w-3.5 h-3.5 text-rose-400" />;
    return <Clock className="w-3.5 h-3.5 text-amber-400" />;
  };

  return (
    <div className="space-y-5">

      {/* Header + Stats */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-widest block">MANAGER APPROVAL CENTER</span>
          <h2 className="text-xl font-black text-white">Team Attendance Corrections</h2>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-bold transition">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {([
          { key: 'ALL', label: 'All Requests', count: requests.length },
          { key: 'SUBMITTED', label: 'Pending My Review', count: statusCounts.SUBMITTED },
          { key: 'MANAGER_APPROVED', label: 'Sent to HR', count: statusCounts.MANAGER_APPROVED },
          { key: 'APPLIED', label: 'Completed', count: statusCounts.APPLIED },
          { key: 'REJECTED', label: 'Rejected', count: statusCounts.REJECTED },
        ] as { key: FilterStatus; label: string; count: number }[]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={clsx(
              'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition',
              filter === tab.key
                ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={clsx(
                'px-1.5 py-0.5 rounded-full text-[9px] font-black',
                filter === tab.key ? 'bg-purple-500/30 text-purple-200' : 'bg-slate-800 text-slate-400'
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Request Cards */}
      {loading ? (
        <div className="py-16 text-center">
          <RefreshCw className="w-8 h-8 text-slate-700 animate-spin mx-auto mb-3" />
          <span className="text-slate-500 font-mono text-xs">Loading approval queue from Supabase...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center rounded-3xl bg-slate-900 border border-slate-800">
          <Sparkles className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <h3 className="text-lg font-black text-slate-300 mb-1">
            {filter === 'SUBMITTED' ? 'No pending approvals' : `No ${filter.toLowerCase()} requests`}
          </h3>
          <p className="text-slate-500 text-xs font-mono">
            {filter === 'SUBMITTED' ? 'Your team is all caught up.' : 'Nothing to show here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => {
            const isExpanded = expandedId === req.id;
            const slaMs = new Date(req.slaDeadline).getTime() - Date.now();
            const slaHrs = Math.floor(Math.abs(slaMs) / 3600000);
            const slaMins = Math.floor((Math.abs(slaMs) % 3600000) / 60000);
            const slaExpired = slaMs < 0;
            const isPending = req.approvalStatus === 'SUBMITTED';
            const isProcessing = processingId === req.id;

            return (
              <div
                key={req.id}
                className={clsx(
                  'rounded-3xl border transition-all duration-200',
                  isPending
                    ? 'bg-slate-900 border-amber-500/20 shadow-lg shadow-amber-500/5'
                    : 'bg-slate-900/60 border-slate-800'
                )}
              >
                {/* Card Header */}
                <div
                  className="flex items-center gap-4 p-5 cursor-pointer"
                  onClick={() => handleToggle(req.id)}
                >
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-purple-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-purple-400 text-xs">{req.requestNumber}</span>
                      <span className={clsx('px-2 py-0.5 rounded-full border text-[9px] font-bold font-mono', getStatusBadge(req.approvalStatus))}>
                        {req.approvalStatus.replace('_', ' ')}
                      </span>
                      {slaExpired && isPending && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[9px] font-bold animate-pulse">
                          ⚠️ SLA EXPIRED
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="font-bold text-white text-sm">{req.employeeName}</span>
                      <span className="text-slate-400 text-xs">•</span>
                      <span className="text-slate-400 text-xs">{req.department}</span>
                      <span className="text-slate-400 text-xs">•</span>
                      <span className="text-slate-300 text-xs font-medium">{req.subType}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 hidden sm:block">
                    <div className={clsx('text-xs font-mono font-bold', slaExpired ? 'text-rose-400' : 'text-slate-400')}>
                      {slaExpired ? `${slaHrs}h ${slaMins}m overdue` : isPending ? `${slaHrs}h ${slaMins}m left` : '—'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {new Date(req.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </div>
                  </div>

                  <div className="shrink-0 text-slate-500">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-slate-800 px-5 pb-5 pt-4 space-y-4">

                    {/* Payload Details */}
                    {req.payload && Object.keys(req.payload).length > 0 && (
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">Request Details</span>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                          {Object.entries(req.payload).map(([k, v]) => (
                            <div key={k} className="flex justify-between gap-2">
                              <span className="text-slate-500 capitalize">{k.replace(/_/g, ' ')}:</span>
                              <span className="text-slate-200 font-mono font-semibold text-right">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Approval History Timeline */}
                    {historyMap[req.id] && historyMap[req.id].length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">Approval Trail</span>
                        {historyMap[req.id].map((h) => (
                          <div key={h.id} className="flex items-start gap-2.5 text-xs">
                            <div className="mt-0.5">{getStepIcon(h.action)}</div>
                            <div>
                              <span className="font-bold text-white">{h.actorName}</span>
                              <span className="text-slate-400 ml-1.5">({h.actorRole})</span>
                              <span className="text-slate-500 ml-1.5 font-mono">→ {h.action}</span>
                              {h.comments && <p className="text-slate-400 mt-0.5 font-sans">{h.comments}</p>}
                              <span className="text-[10px] text-slate-600 font-mono block mt-0.5">
                                {new Date(h.createdAt).toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action Buttons — only for SUBMITTED requests assigned to manager */}
                    {isPending && (
                      <div className="space-y-3">
                        <textarea
                          value={commentDraft}
                          onChange={(e) => setCommentDraft(e.target.value)}
                          placeholder="Add a comment or reason for your decision (optional)..."
                          className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 resize-none font-sans"
                          rows={2}
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAction(req, 'APPROVE')}
                            disabled={!!isProcessing}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            {isProcessing ? 'Processing...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleAction(req, 'REJECT')}
                            disabled={!!isProcessing}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 font-black text-xs transition disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
