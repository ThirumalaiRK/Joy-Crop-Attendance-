'use client';

import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  ShieldCheck,
  MessageSquare,
  Send,
  AlertTriangle,
  Lock,
  Globe,
  Monitor,
  CheckCircle2,
  Plus,
  Search,
  Paperclip,
  Clock,
  UserCheck,
  Sparkles,
  ChevronRight,
  Star,
  Fingerprint,
  Calendar,
  Building2,
  X,
  FileSpreadsheet,
  Check,
  Radio,
  Eye,
  RefreshCw,
  UserX,
} from 'lucide-react';
import {
  CATEGORY_CATALOG,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  SupportTicket,
  TicketMessage,
  fetchSupportTicketsFromSupabase,
  fetchTicketMessagesFromSupabase,
  addTicketMessageInSupabase,
  updateTicketStatusInSupabase,
  subscribeToHelpdeskRealtime,
} from '../../../lib/helpdesk/helpdesk-engine';
import { clsx } from 'clsx';
import { playSuccessChime } from '../../../lib/audio';

export function AdminHelpdeskControlCenter() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);

  // Filters & Search
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('OPEN_ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');

  // Reply Form State
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [newAssigneeRole, setNewAssigneeRole] = useState('HR Specialist');

  const loadTickets = async () => {
    const data = await fetchSupportTicketsFromSupabase('ALL', roleFilter);
    setTickets(data);
    setLoading(false);
  };

  const loadMessages = async (ticketId: string) => {
    const msgs = await fetchTicketMessagesFromSupabase(ticketId);
    setMessages(msgs);
  };

  useEffect(() => {
    loadTickets();
    const unsubscribe = subscribeToHelpdeskRealtime(() => {
      playSuccessChime();
      loadTickets();
      if (selectedTicket) loadMessages(selectedTicket.id);
    });
    return () => unsubscribe();
  }, [roleFilter]);

  useEffect(() => {
    if (selectedTicket) {
      loadMessages(selectedTicket.id);
      setNewAssigneeRole(selectedTicket.assignedRole);
    }
  }, [selectedTicket]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;

    setSendingMsg(true);
    await addTicketMessageInSupabase({
      ticketId: selectedTicket.id,
      senderId: 'ADMIN-001',
      senderName: 'THIRUMALAI R K (Super Admin)',
      senderRole: 'SuperAdmin',
      message: replyText,
      isInternalNote: isInternalNote,
    });

    // Auto update status to IN PROGRESS or WAITING FOR EMPLOYEE
    if (selectedTicket.status === 'OPEN' || selectedTicket.status === 'ACKNOWLEDGED') {
      await updateTicketStatusInSupabase(
        selectedTicket.id,
        'IN PROGRESS',
        'THIRUMALAI R K (Super Admin)',
        'Admin responded to ticket.'
      );
    }

    setReplyText('');
    setSendingMsg(false);
    loadTickets();
    loadMessages(selectedTicket.id);
  };

  const handleUpdateStatus = async (newStatus: TicketStatus, remarks?: string) => {
    if (!selectedTicket) return;
    await updateTicketStatusInSupabase(
      selectedTicket.id,
      newStatus,
      'THIRUMALAI R K (Super Admin)',
      remarks || `Status updated to ${newStatus}`,
      newAssigneeRole
    );
    loadTickets();
    setSelectedTicket({ ...selectedTicket, status: newStatus, assignedRole: newAssigneeRole });
  };

  // KPIs
  const openCount = tickets.filter((t) => ['OPEN', 'ACKNOWLEDGED', 'ASSIGNED', 'IN PROGRESS', 'WAITING FOR EMPLOYEE'].includes(t.status)).length;
  const criticalCount = tickets.filter((t) => t.priority === 'CRITICAL' && t.status !== 'CLOSED').length;
  const hrCount = tickets.filter((t) => t.assignedRole === 'HR Specialist' && t.status !== 'CLOSED').length;
  const itCount = tickets.filter((t) => t.assignedRole === 'IT Support' && t.status !== 'CLOSED').length;
  const resolvedTodayCount = tickets.filter((t) => ['RESOLVED', 'CLOSED'].includes(t.status)).length;

  const filteredTickets = tickets.filter((t) => {
    if (roleFilter !== 'ALL' && t.assignedRole !== roleFilter) return false;

    if (statusFilter === 'OPEN_ACTIVE' && ['RESOLVED', 'CLOSED'].includes(t.status)) return false;
    if (statusFilter === 'CRITICAL' && t.priority !== 'CRITICAL') return false;
    if (statusFilter === 'RESOLVED' && !['RESOLVED', 'CLOSED'].includes(t.status)) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.ticketNumber.toLowerCase().includes(q) ||
        t.employeeName.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getPriorityBadge = (p: TicketPriority) => {
    switch (p) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'NORMAL':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default:
        return 'bg-slate-700/40 text-slate-400 border-slate-700';
    }
  };

  const getStatusBadge = (s: TicketStatus) => {
    switch (s) {
      case 'OPEN':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'ACKNOWLEDGED':
      case 'ASSIGNED':
      case 'IN PROGRESS':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'WAITING FOR EMPLOYEE':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'RESOLVED':
      case 'CLOSED':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 shadow-2xl">
        <div>
          <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" /> Live Realtime Sync
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">Enterprise Helpdesk & HR Support Center</h1>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">Joy Corporate Solutions Pvt. Ltd. • Automated Category Routing & SLA Engine</p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <button
            onClick={loadTickets}
            className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh Tickets"
          >
            <RefreshCw className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 block font-mono">Active Open Tickets</span>
          <span className="text-2xl font-black text-white font-mono">{openCount}</span>
          <span className="text-[10px] text-emerald-400 font-bold block">Live Queue</span>
        </div>

        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-1">
          <span className="text-[10px] font-extrabold uppercase text-rose-300 block font-mono">Critical SLA Issues</span>
          <span className="text-2xl font-black text-rose-400 font-mono">{criticalCount}</span>
          <span className="text-[10px] text-rose-300 font-bold block">2-Hour SLA Target</span>
        </div>

        <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-1">
          <span className="text-[10px] font-extrabold uppercase text-purple-300 block font-mono">HR Specialist Queue</span>
          <span className="text-2xl font-black text-purple-400 font-mono">{hrCount}</span>
          <span className="text-[10px] text-purple-300 font-bold block">Attendance / Leave / HR</span>
        </div>

        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-1">
          <span className="text-[10px] font-extrabold uppercase text-blue-300 block font-mono">IT Support Queue</span>
          <span className="text-2xl font-black text-blue-400 font-mono">{itCount}</span>
          <span className="text-[10px] text-blue-300 font-bold block">Laptop / Password / VPN</span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
          <span className="text-[10px] font-extrabold uppercase text-emerald-300 block font-mono">Resolved & Closed</span>
          <span className="text-2xl font-black text-emerald-400 font-mono">{resolvedTodayCount}</span>
          <span className="text-[10px] text-emerald-300 font-bold block">Completed Tickets</span>
        </div>
      </div>

      {/* Main Support Workspace Table & Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Support Queue Table (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by ticket #, employee, subject..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition font-mono"
                />
              </div>

              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-amber-300 font-mono font-bold focus:outline-none"
              >
                <option value="ALL">All Routing Queues</option>
                <option value="HR Specialist">HR Specialist Queue</option>
                <option value="IT Support">IT Support Queue</option>
                <option value="Reception">Reception Queue</option>
                <option value="Reporting Manager">Manager Queue</option>
              </select>
            </div>
          </div>

          <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 uppercase text-[10px] font-mono">
                    <th className="py-3 px-4">Ticket</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Priority SLA</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 text-xs font-mono">
                        No support tickets in queue.
                      </td>
                    </tr>
                  ) : (
                    filteredTickets.map((t) => (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedTicket(t)}
                        className={clsx(
                          'cursor-pointer transition hover:bg-slate-800/50',
                          selectedTicket?.id === t.id ? 'bg-slate-800/80' : ''
                        )}
                      >
                        <td className="py-3.5 px-4 font-mono font-black text-amber-400">{t.ticketNumber}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-white block">{t.employeeName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{t.department}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-200 block">{t.category}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{t.subCategory}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <span className={clsx('px-2.5 py-0.5 rounded-full border text-[10px] font-bold', getPriorityBadge(t.priority))}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <span className={clsx('px-2.5 py-0.5 rounded-full border text-[10px] font-bold', getStatusBadge(t.status))}>
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => setSelectedTicket(t)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-600/20 text-slate-400 hover:text-amber-400 border border-slate-700 transition"
                            title="Open Conversation Drawer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Slack-Style Ticket Detail & Admin Reply Drawer (5 cols) */}
        <div className="lg:col-span-5">
          {selectedTicket ? (
            <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[680px]">
              
              {/* Drawer Header */}
              <div className="p-4 bg-slate-950 border-b border-slate-800 space-y-2 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-xs text-amber-400">{selectedTicket.ticketNumber}</span>
                  <span className={clsx('px-2.5 py-0.5 rounded-full border font-mono text-[9px] font-bold', getStatusBadge(selectedTicket.status))}>
                    {selectedTicket.status}
                  </span>
                </div>
                <h3 className="text-sm font-black text-white">{selectedTicket.subject}</h3>
                <p className="text-[11px] text-slate-400 font-mono">Author: {selectedTicket.employeeName} ({selectedTicket.department})</p>
              </div>

              {/* Status & Routing Actions Bar */}
              <div className="p-3 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between gap-2 text-xs flex-wrap shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Re-Route:</span>
                  <select
                    value={newAssigneeRole}
                    onChange={(e) => setNewAssigneeRole(e.target.value)}
                    className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-purple-300 font-bold font-mono focus:outline-none"
                  >
                    <option value="HR Specialist">HR Specialist</option>
                    <option value="IT Support">IT Support</option>
                    <option value="Reception">Reception</option>
                    <option value="Reporting Manager">Reporting Manager</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleUpdateStatus('IN PROGRESS')}
                    className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold"
                  >
                    In Progress
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('RESOLVED', 'Marked resolved by Admin.')}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold"
                  >
                    Resolve
                  </button>
                </div>
              </div>

              {/* Conversation Messages Thread */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 font-sans text-xs scrollbar-thin scrollbar-thumb-slate-800">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span className="font-bold text-amber-400">{selectedTicket.employeeName}</span>
                    <span>{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-200 leading-relaxed font-sans">{selectedTicket.description}</p>
                </div>

                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={clsx(
                      'p-3 rounded-xl space-y-1 border',
                      m.isInternalNote
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                        : m.senderRole === 'SuperAdmin' || m.senderRole === 'HR Specialist' || m.senderRole === 'IT Support'
                          ? 'bg-slate-800 border-slate-700 text-slate-100'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                    )}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="font-bold flex items-center gap-1">
                        {m.isInternalNote && <Lock className="w-3 h-3 text-amber-400" />}
                        {m.senderName} ({m.senderRole})
                      </span>
                      <span className="text-slate-500">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="leading-relaxed">{m.message}</p>
                  </div>
                ))}
              </div>

              {/* Admin Reply Form */}
              <form onSubmit={handleSendReply} className="p-4 bg-slate-950 border-t border-slate-800 space-y-3 shrink-0">
                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-amber-300 font-bold font-mono">
                    <input
                      type="checkbox"
                      checked={isInternalNote}
                      onChange={(e) => setIsInternalNote(e.target.checked)}
                      className="accent-amber-500 rounded"
                    />
                    <span>🔒 Internal Note (HR / IT Only)</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">@mention available</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={isInternalNote ? 'Write internal note visible only to HR/IT staff...' : 'Reply to employee...'}
                    className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition"
                  />
                  <button
                    type="submit"
                    disabled={sendingMsg || !replyText.trim()}
                    className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-lg disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </form>

            </div>
          ) : (
            <div className="h-[680px] rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center text-slate-500 space-y-3 p-8">
              <HelpCircle className="w-12 h-12 text-slate-700" />
              <h3 className="text-base font-bold text-slate-300">Select a Ticket from the Queue</h3>
              <p className="text-xs max-w-sm text-center">
                Select any ticket from the left queue to view realtime conversation thread, post internal notes, or change ticket status.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
