'use me';
'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  AlertTriangle,
  FileText,
  BrainCircuit,
  CheckCircle2,
  TrendingUp,
  ShieldAlert,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AiInsight {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: string;
  action_label: string;
  action_href: string;
}

interface ChatMessage {
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  insights?: AiInsight[];
}

export function AiAssistantDrawer({ isOpen, onClose }: AiAssistantDrawerProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'ai',
      text: 'Good morning, Thirumalai! I am your AI Attendance Intelligence Copilot. I continuously analyze real-time biometric feeds, device health, and shift anomalies.',
      timestamp: '09:00 AM',
      insights: [],
    },
  ]);

  React.useEffect(() => {
    if (!isOpen) return;
    async function loadInsights() {
      try {
        const { data, error } = await supabase.from('ai_insights').select('*');
        if (data && !error) {
          setMessages((prev) => {
            const newMessages = [...prev];
            if (newMessages[0] && newMessages[0].sender === 'ai') {
              newMessages[0].insights = data;
            }
            return newMessages;
          });
        }
      } catch (err) {
        console.error('Failed to load insights', err);
      }
    }
    loadInsights();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      sender: 'user',
      text: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    const currentInput = input;
    setInput('');

    // Simulated AI response logic based on user prompt
    setTimeout(() => {
      let aiText = 'I have processed your query against the live biometric database.';
      if (currentInput.toLowerCase().includes('late') || currentInput.toLowerCase().includes('absent')) {
        aiText = 'Today we have 4 late arrivals (Avg late duration: 12 minutes). Vikramaditya Sharma checked in 5 mins late via QR pass due to traffic delay near East Gate.';
      } else if (currentInput.toLowerCase().includes('buddy') || currentInput.toLowerCase().includes('anomaly')) {
        aiText = 'Buddy Punching Alert: 1 potential anomaly detected on Ground Lobby Gate A at 09:16 AM. Face confidence score was 96%, but timestamp interval was 1.2s. Flagged for HR review.';
      } else if (currentInput.toLowerCase().includes('report') || currentInput.toLowerCase().includes('summary')) {
        aiText = 'Generated Daily HR Executive Summary: Total Attendance 94.2% (Present: 48, Late: 4, WFH: 3, Leave: 1). Overtime logged: 8.5 hrs across Engineering & Security.';
      } else {
        aiText = `Analyzing "${currentInput}"... All 5 biometric hardware terminals are functioning within normal thermal bounds (Avg temp: 36.4°C). Cloud sync latency is 0.4ms.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: aiText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 600);
  };

  const quickPrompts = [
    'Summarize Today’s Attendance & Anomalies',
    'Detect Buddy Punching Risks',
    'Which Employees Are Late Today?',
    'Check Hardware Devices Health',
  ];

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900/95 border-l border-slate-800 backdrop-blur-2xl shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
      {/* Drawer Header */}
      <div className="flex items-center justify-between h-16 px-5 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20 ring-1 ring-white/20">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-100 flex items-center gap-2">
              AgencyOS AI Copilot
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-purple-500/20 text-purple-300 rounded border border-purple-500/30">
                GPT-4o HR
              </span>
            </span>
            <span className="text-[10px] text-slate-400">Autonomous Predictive Engine</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Insights Banner */}
      <div className="p-3 bg-purple-950/20 border-b border-purple-900/30 text-xs flex items-center justify-between text-purple-300">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-purple-400" />
          <span>Real-time anomaly monitoring active</span>
        </div>
        <span className="font-semibold text-emerald-400">99.4% Accuracy</span>
      </div>

      {/* Chat History Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-2 mb-1">
              {msg.sender === 'ai' ? (
                <span className="text-[10px] font-semibold text-purple-400 flex items-center gap-1">
                  <Bot className="w-3 h-3" /> AI Copilot
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                  <User className="w-3 h-3" /> You
                </span>
              )}
              <span className="text-[9px] text-slate-500">{msg.timestamp}</span>
            </div>

            <div
              className={`p-3.5 rounded-2xl text-xs leading-relaxed max-w-[90%] shadow-md ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-slate-800/90 border border-slate-700 text-slate-200 rounded-bl-none'
              }`}
            >
              {msg.text}

              {msg.insights && msg.insights.length > 0 && (
                <div className="mt-4 grid grid-cols-1 gap-2">
                  {msg.insights.map((insight: any) => (
                    <div
                      key={insight.id}
                      className={`p-3 rounded-xl border flex flex-col gap-2 ${
                        insight.type === 'warning'
                          ? 'bg-rose-500/10 border-rose-500/30'
                          : insight.type === 'info'
                            ? 'bg-blue-500/10 border-blue-500/30'
                            : 'bg-emerald-500/10 border-emerald-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {insight.type === 'warning' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
                          {insight.type === 'info' && <TrendingUp className="w-4 h-4 text-blue-400" />}
                          {insight.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                          <span className={`font-bold text-xs ${
                            insight.type === 'warning' ? 'text-rose-300' :
                            insight.type === 'info' ? 'text-blue-300' : 'text-emerald-300'
                          }`}>
                            {insight.title}
                          </span>
                        </div>
                        {insight.priority && (
                          <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded ${
                            insight.priority === 'High' ? 'bg-rose-500/20 text-rose-400' :
                            insight.priority === 'Medium' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-slate-700 text-slate-300'
                          }`}>
                            {insight.priority}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300">{insight.description}</p>
                      {insight.action_label && (
                        <button className="self-start mt-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded text-[10px] font-semibold transition">
                          {insight.action_label}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Suggested Quick Questions */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
          Suggested AI Commands
        </span>
        <div className="flex flex-wrap gap-1.5">
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInput(prompt);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-300 transition"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Form Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-slate-800 bg-slate-950 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask AI Copilot anything about attendance..."
          className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 outline-none focus:border-purple-500 transition placeholder:text-slate-500"
        />
        <button
          type="submit"
          className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs transition shadow-lg shadow-purple-600/30"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
