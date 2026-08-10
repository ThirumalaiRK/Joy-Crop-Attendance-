'use client';
import React from 'react';
import { Bot, Send, Sparkles } from 'lucide-react';
import { useState } from 'react';

const SUGGESTIONS = [
  'Why did attendance drop today?',
  'Show late employees this week',
  'Which device had the most scans?',
  'How many employees enrolled this month?',
  'What is the average check-in time?',
  'Show overtime employees',
];

export function AdminCopilot() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: 'Hi! I\'m your AgencyOS AI Copilot. Ask me anything about attendance patterns, employee behavior, device health, or HR insights.' },
  ]);

  const send = (text?: string) => {
    const q = text || input.trim();
    if (!q) return;
    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setInput('');
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: 'ai', text: `Analyzing: "${q}"\n\nThis feature will connect to your Supabase attendance data for live AI-powered HR insights. Ensure your Gemini / OpenAI key is configured in Enterprise Settings.` }]);
    }, 800);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20"><Bot className="w-5 h-5 text-violet-400" /></div>
          AI Copilot
        </h1>
        <p className="text-sm text-slate-400 mt-1">Enterprise HR intelligence — attendance anomalies, predictions, insights</p>
      </div>

      {/* Suggestions */}
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => send(s)} className="px-3 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-medium hover:bg-violet-500/20 transition">
            {s}
          </button>
        ))}
      </div>

      {/* Chat */}
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 overflow-hidden">
        <div className="h-96 overflow-y-auto p-5 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'ai' && (
                <div className="w-7 h-7 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                </div>
              )}
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'bg-violet-600/20 border border-violet-500/30 text-violet-100' : 'bg-slate-800/60 border border-slate-700/40 text-slate-300'}`}>
                {m.text}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-800/60 p-3 flex items-center gap-3">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Ask about attendance, employees, devices…"
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 transition" />
          <button onClick={() => send()} className="p-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
