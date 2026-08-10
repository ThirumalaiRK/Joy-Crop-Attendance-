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
  FileText,
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
} from 'lucide-react';
import {
  CATEGORY_CATALOG,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  SupportTicket,
  TicketMessage,
  createSupportTicketInSupabase,
  fetchSupportTicketsFromSupabase,
  fetchTicketMessagesFromSupabase,
  addTicketMessageInSupabase,
  rateTicketResolutionInSupabase,
  subscribeToHelpdeskRealtime,
} from '../../lib/helpdesk/helpdesk-engine';
import { clsx } from 'clsx';

interface ESSSupportAuditProps {
  employeeName: string;
  employeeId: string;
}

export function ESSSupportAudit({ employeeName, employeeId }: ESSSupportAuditProps) {
  const [activeSubTab, setActiveSubTab] = useState<'SUPPORT' | 'AUDIT'>('SUPPORT');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Ticket Creation Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formCategory, setFormCategory] = useState<TicketCategory>('Attendance');
  const [formSubCategory, setFormSubCategory] = useState(CATEGORY_CATALOG[0].subCategories[0]);
  const [formPriority, setFormPriority] = useState<TicketPriority>('NORMAL');
  const [formSubject, setFormSubject] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAttachmentUrl, setFormAttachmentUrl] = useState('');
  const [formPreferredContact, setFormPreferredContact] = useState('Email');
  const [submitting, setSubmitting] = useState(false);

  // Chat Input State
  const [chatInput, setChatInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Rating State
  const [ratingVal, setRatingVal] = useState(5);
  const [ratingComment, setRatingComment] = useState('');

  const activeCategoryCatalog = CATEGORY_CATALOG.find((c) => c.category === formCategory) || CATEGORY_CATALOG[0];

  const loadTickets = async () => {
    const data = await fetchSupportTicketsFromSupabase(employeeId);
    setTickets(data);
    if (data.length > 0 && !selectedTicket) {
      setSelectedTicket(data[0]);
    }
    setLoading(false);
  };

  const loadMessages = async (ticketId: string) => {
    const msgs = await fetchTicketMessagesFromSupabase(ticketId);
    setMessages(msgs);
  };

  useEffect(() => {
    loadTickets();
    const unsubscribe = subscribeToHelpdeskRealtime(() => {
      loadTickets();
      if (selectedTicket) loadMessages(selectedTicket.id);
    });
    return () => unsubscribe();
  }, [employeeId]);

  useEffect(() => {
    if (selectedTicket) {
      loadMessages(selectedTicket.id);
    }
  }, [selectedTicket]);

  const handleCategoryChange = (cat: TicketCategory) => {
    setFormCategory(cat);
    const catObj = CATEGORY_CATALOG.find((c) => c.category === cat);
    if (catObj && catObj.subCategories.length > 0) {
      setFormSubCategory(catObj.subCategories[0]);
    }
  };

  const handleAiSuggestSubject = () => {
    if (!formDescription) {
      setFormSubject(`Inquiry regarding ${formCategory} — ${formSubCategory}`);
      return;
    }
    const cleanDesc = formDescription.slice(0, 50);
    setFormSubject(`[${formCategory}] ${formSubCategory}: ${cleanDesc}...`);
  };

  const handleCreateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSubject || !formDescription) return;

    setSubmitting(true);
    const res = await createSupportTicketInSupabase({
      employeeId,
      employeeName,
      category: formCategory,
      subCategory: formSubCategory,
      priority: formPriority,
      subject: formSubject,
      description: formDescription,
      preferredContact: formPreferredContact,
    });

    setSubmitting(false);
    if (res.success && res.data) {
      setShowCreateModal(false);
      setFormSubject('');
      setFormDescription('');
      loadTickets();
      setSelectedTicket(res.data);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedTicket) return;

    setSendingMsg(true);
    await addTicketMessageInSupabase({
      ticketId: selectedTicket.id,
      senderId: employeeId,
      senderName: employeeName,
      senderRole: 'Employee',
      message: chatInput,
      isInternalNote: false,
    });

    setChatInput('');
    setSendingMsg(false);
    loadMessages(selectedTicket.id);
  };

  const handleRateResolution = async () => {
    if (!selectedTicket) return;
    await rateTicketResolutionInSupabase(selectedTicket.id, ratingVal, ratingComment);
    loadTickets();
    setSelectedTicket({ ...selectedTicket, status: 'CLOSED', rating: ratingVal });
  };

  // Filtered Tickets
  const filteredTickets = tickets.filter((t) => {
    if (statusFilter === 'OPEN' && !['OPEN', 'ACKNOWLEDGED', 'ASSIGNED'].includes(t.status)) return false;
    if (statusFilter === 'IN_PROGRESS' && t.status !== 'IN PROGRESS' && t.status !== 'WAITING FOR EMPLOYEE') return false;
    if (statusFilter === 'RESOLVED' && t.status !== 'RESOLVED' && t.status !== 'CLOSED') return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.ticketNumber.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.subCategory.toLowerCase().includes(q)
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

  const auditLogs = [
    { id: 'LOG-1001', event: 'Biometric Check-In', time: '2026-08-04 09:01:12 AM', browser: 'Chrome 127.0.0.0', device: 'Mantra MFS110 L1', ip: '192.168.1.20', status: 'SUCCESS' },
    { id: 'LOG-1002', event: 'Start Tea Break', time: '2026-08-04 11:05:04 AM', browser: 'Chrome 127.0.0.0', device: 'Windows 11 PC', ip: '192.168.1.20', status: 'SUCCESS' },
    { id: 'LOG-1003', event: 'End Tea Break', time: '2026-08-04 11:17:22 AM', browser: 'Chrome 127.0.0.0', device: 'Windows 11 PC', ip: '192.168.1.20', status: 'SUCCESS' },
    { id: 'LOG-1004', event: 'Start Lunch Break', time: '2026-08-04 01:02:15 PM', browser: 'Chrome 127.0.0.0', device: 'Windows 11 PC', ip: '192.168.1.20', status: 'SUCCESS' },
  ];

  return (
    <div className="space-y-6 select-none">

      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('SUPPORT')}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition',
              activeSubTab === 'SUPPORT'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white'
            )}
          >
            <HelpCircle className="w-4 h-4" />
            <span>HR & IT Support Helpdesk</span>
          </button>

          <button
            onClick={() => setActiveSubTab('AUDIT')}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition',
              activeSubTab === 'AUDIT'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white'
            )}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Security Audit Logs</span>
          </button>
        </div>

        {activeSubTab === 'SUPPORT' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Raise New Ticket</span>
          </button>
        )}
      </div>

      {activeSubTab === 'SUPPORT' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left / Center Panel: Ticket Inbox & Search (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Search & Filter Bar */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search ticket #, subject, or category..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition font-mono"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px] font-mono font-bold">
                {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={clsx(
                      'px-3 py-1 rounded-lg border transition whitespace-nowrap',
                      statusFilter === st
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    )}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Ticket List */}
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {filteredTickets.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-slate-500 space-y-2">
                  <HelpCircle className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-xs font-semibold">No tickets found matching current filter.</p>
                  <p className="text-[10px]">Click "Raise New Ticket" above to submit an HR or IT request.</p>
                </div>
              ) : (
                filteredTickets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={clsx(
                      'p-4 rounded-2xl border transition cursor-pointer space-y-2.5 relative group',
                      selectedTicket?.id === t.id
                        ? 'bg-slate-900 border-emerald-500/60 ring-1 ring-emerald-500/30 shadow-lg'
                        : 'bg-slate-900/70 border-slate-800 hover:bg-slate-900 hover:border-slate-700'
                    )}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-extrabold text-emerald-400">{t.ticketNumber}</span>
                      <div className="flex items-center gap-1.5 font-mono text-[10px]">
                        <span className={clsx('px-2 py-0.5 rounded-full border font-bold', getPriorityBadge(t.priority))}>
                          {t.priority}
                        </span>
                        <span className={clsx('px-2 py-0.5 rounded-full border font-bold', getStatusBadge(t.status))}>
                          {t.status}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-xs font-bold text-white leading-snug line-clamp-1">{t.subject}</h4>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800/60">
                      <span>{t.category} • {t.subCategory}</span>
                      <span>Assigned: {t.assignedRole}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>

          {/* Right Panel: Slack-Style Live Ticket Conversation & Resolution (7 cols) */}
          <div className="lg:col-span-7">
            {selectedTicket ? (
              <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[680px]">
                
                {/* Active Ticket Banner Header */}
                <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 font-mono font-bold">
                      #
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-xs text-emerald-400">{selectedTicket.ticketNumber}</span>
                        <span className={clsx('px-2 py-0.5 rounded-full border font-mono text-[9px] font-bold', getStatusBadge(selectedTicket.status))}>
                          {selectedTicket.status}
                        </span>
                      </div>
                      <h3 className="text-sm font-extrabold text-white line-clamp-1 mt-0.5">{selectedTicket.subject}</h3>
                    </div>
                  </div>

                  <div className="text-right text-[10px] font-mono text-slate-400 hidden sm:block">
                    <span>Routing: <strong className="text-purple-400">{selectedTicket.assignedRole}</strong></span>
                    <span className="block text-slate-500 mt-0.5">Location: {selectedTicket.location}</span>
                  </div>
                </div>

                {/* Realtime Conversation Thread */}
                <div className="flex-1 p-5 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
                  {/* Initial Ticket Description Card */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span className="font-bold text-white">{selectedTicket.employeeName} (Author)</span>
                      <span>{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">{selectedTicket.description}</p>
                    {selectedTicket.deviceName && (
                      <div className="pt-2 flex items-center gap-2 text-[10px] font-mono text-slate-500 border-t border-slate-800/60">
                        <Monitor className="w-3 h-3 text-emerald-400" />
                        <span>Device: {selectedTicket.deviceName}</span>
                      </div>
                    )}
                  </div>

                  {/* Slack-Style Reply Messages */}
                  {messages.map((m) => {
                    const isAuthor = m.senderId === employeeId || m.senderRole === 'Employee';
                    if (m.isInternalNote) return null; // Internal notes hidden from employee

                    return (
                      <div
                        key={m.id}
                        className={clsx('flex flex-col space-y-1', isAuthor ? 'items-end' : 'items-start')}
                      >
                        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                          <span className="font-bold text-slate-200">{m.senderName}</span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-purple-300">{m.senderRole}</span>
                          <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div
                          className={clsx(
                            'p-3.5 rounded-2xl text-xs max-w-lg shadow-md leading-relaxed font-sans',
                            isAuthor
                              ? 'bg-emerald-600 text-white rounded-tr-none'
                              : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                          )}
                        >
                          {m.message}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* CSAT Rating Card if Resolved */}
                {selectedTicket.status === 'RESOLVED' && (
                  <div className="p-4 bg-emerald-500/10 border-t border-emerald-500/30 space-y-3 shrink-0">
                    <span className="text-xs font-bold text-emerald-300 block text-center">
                      ✨ Ticket marked as RESOLVED by HR/IT! Rate your resolution experience:
                    </span>
                    <div className="flex items-center justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setRatingVal(star)}
                          className={clsx(
                            'p-1.5 rounded-xl transition',
                            ratingVal >= star ? 'text-amber-400 scale-110' : 'text-slate-600 hover:text-slate-400'
                          )}
                        >
                          <Star className="w-5 h-5 fill-current" />
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleRateResolution}
                      className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
                    >
                      Submit Feedback & Close Ticket
                    </button>
                  </div>
                )}

                {/* Reply Form */}
                {selectedTicket.status !== 'CLOSED' && selectedTicket.status !== 'RESOLVED' && (
                  <form onSubmit={handleSendMessage} className="p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-3 shrink-0">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Type your response to HR / IT Support..."
                      className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition"
                    />
                    <button
                      type="submit"
                      disabled={sendingMsg || !chatInput.trim()}
                      className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send</span>
                    </button>
                  </form>
                )}

              </div>
            ) : (
              <div className="h-[680px] rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center text-slate-500 space-y-3 p-8">
                <HelpCircle className="w-12 h-12 text-slate-700" />
                <h3 className="text-base font-bold text-slate-300">Select a Ticket from the Inbox</h3>
                <p className="text-xs max-w-sm text-center">
                  Select an existing ticket to view real-time conversation history or click "Raise New Ticket" to open a request.
                </p>
              </div>
            )}
          </div>

        </div>
      ) : (
        /* Security Audit Log Sub-Tab */
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" /> Realtime Security Audit Logs
            </h3>
            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              IMMUTABLE AUDIT TRAIL
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-3 px-4">Log ID</th>
                  <th className="py-3 px-4">Security Event</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Device & IP</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 text-emerald-400 font-bold">{log.id}</td>
                    <td className="py-3 px-4 text-white font-semibold">{log.event}</td>
                    <td className="py-3 px-4 text-slate-400">{log.time}</td>
                    <td className="py-3 px-4 text-slate-300">{log.device} ({log.ip})</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL: RAISE NEW SUPPORT TICKET (SMART WIZARD)
      ════════════════════════════════════════════════════════════════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-2xl animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-slate-950 border border-emerald-500/40 rounded-[32px] shadow-2xl overflow-hidden flex flex-col p-6 space-y-5 animate-in zoom-in-95 duration-200 relative">
            
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute right-4 top-4 p-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition border border-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Plus className="w-6 h-6" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest">
                  JOY CORPORATE HELPDESK
                </span>
                <h3 className="text-lg font-black text-white">Raise New Helpdesk Ticket</h3>
              </div>
            </div>

            <form onSubmit={handleCreateTicketSubmit} className="space-y-4 text-xs font-sans">
              
              {/* Category Catalog Selector */}
              <div>
                <label className="text-xs font-bold text-slate-300 mb-1.5 block">Select Ticket Category *</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORY_CATALOG.map((cat) => (
                    <button
                      type="button"
                      key={cat.category}
                      onClick={() => handleCategoryChange(cat.category)}
                      className={clsx(
                        'p-2.5 rounded-xl border font-bold text-left text-xs transition flex items-center justify-between',
                        formCategory === cat.category
                          ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                      )}
                    >
                      <span>{cat.category}</span>
                      <span className="text-[9px] font-mono text-slate-500">{cat.defaultRole}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-1.5 block">Sub-Category *</label>
                  <select
                    value={formSubCategory}
                    onChange={(e) => setFormSubCategory(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white font-semibold focus:border-emerald-500 focus:outline-none"
                  >
                    {activeCategoryCatalog.subCategories.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 mb-1.5 block">Priority SLA Policy *</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as TicketPriority)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white font-semibold focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="NORMAL">NORMAL (24-Hour Resolution)</option>
                    <option value="HIGH">HIGH (4-Hour Resolution)</option>
                    <option value="CRITICAL">CRITICAL (2-Hour Urgent SLA)</option>
                    <option value="LOW">LOW (48-Hour Standard)</option>
                  </select>
                </div>
              </div>

              {/* Subject with AI Suggest Button */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300">Subject / Summary *</label>
                  <button
                    type="button"
                    onClick={handleAiSuggestSubject}
                    className="text-[10px] font-mono font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" /> Auto-Suggest Subject
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  placeholder="e.g. Fingerprint scanner rejected check-in at HQ main gate"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white font-medium focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Detailed Description */}
              <div>
                <label className="text-xs font-bold text-slate-300 mb-1.5 block">Detailed Issue Description *</label>
                <textarea
                  required
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe what happened, error codes, device name, or exact time..."
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-900 text-slate-400 text-xs font-bold hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formSubject || !formDescription}
                  className="px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg transition flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Submitting to Supabase...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Submit Ticket</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
