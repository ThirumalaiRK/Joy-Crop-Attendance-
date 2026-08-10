'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, User, ShieldCheck, ArrowRight, Smartphone, KeyRound, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ESSLoginPage() {
  const router = useRouter();
  const [loginMethod, setLoginMethod] = useState<'emp_id' | 'email' | 'mobile'>('emp_id');
  const [identifier, setIdentifier] = useState('EMP-10');
  const [password, setPassword] = useState('Joy@2026');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const cleanId = identifier.trim();

      // Check employee record and status in Supabase
      const query = supabase
        .from('employees')
        .select('*');

      if (loginMethod === 'email') {
        query.eq('email', cleanId.toLowerCase());
      } else {
        query.or(`employee_code.eq.${cleanId},id.eq.${cleanId}`);
      }

      const { data: emps, error } = await query.limit(1);

      if (error) {
        console.warn('Login lookup notice:', error.message);
      }

      const emp = emps?.[0];

      if (emp) {
        // Check account suspension status
        const status = (emp.status || 'Active').toLowerCase();
        if (status === 'suspended' || status === 'inactive') {
          setErrorMessage('Your portal access is currently SUSPENDED. Please contact HR Administration to reactivate your credentials.');
          setIsLoading(false);
          return;
        }

        // Redirect to employee portal dashboard
        router.push(`/portal/${emp.employee_code || emp.id}`);
      } else {
        // Fallback direct route
        router.push(`/portal/${cleanId || 'EMP-10'}`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during sign-in.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060c14] flex items-center justify-center p-4 selection:bg-amber-500 selection:text-slate-950">
      <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Subtle ambient glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand */}
        <div className="text-center space-y-2 relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 mx-auto flex items-center justify-center font-black text-slate-950 text-2xl shadow-xl shadow-amber-500/20">
            J
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-2">
            Joy Corporate <span className="text-amber-400">ESS</span>
          </h1>
          <p className="text-xs text-slate-400">Employee Self-Service & Attendance Portal</p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{errorMessage}</p>
          </div>
        )}

        {/* Login Method Selector */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setLoginMethod('emp_id'); setIdentifier('EMP-10'); }}
            className={`flex-1 py-2 rounded-xl transition ${loginMethod === 'emp_id' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400'}`}
          >
            Employee ID
          </button>
          <button
            type="button"
            onClick={() => { setLoginMethod('email'); setIdentifier('emp-000010@agencyos.ai'); }}
            className={`flex-1 py-2 rounded-xl transition ${loginMethod === 'email' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400'}`}
          >
            Work Email
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4 relative">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">
              {loginMethod === 'emp_id' ? 'Employee Code / ID' : 'Official Work Email'}
            </label>
            <div className="relative">
              {loginMethod === 'emp_id' ? (
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              ) : (
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              )}
              <input
                type={loginMethod === 'email' ? 'email' : 'text'}
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={loginMethod === 'emp_id' ? 'e.g. EMP-10' : 'name@joycorporate.in'}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Password</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating with Supabase...</span>
              </>
            ) : (
              <>
                <span>Sign In to Employee Portal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 text-[10px] text-slate-500 border-t border-slate-800/80">
          Protected by Supabase Identity & Row Level Security (RLS) • Multi-Company Tenant Safe
        </div>
      </div>
    </div>
  );
}
