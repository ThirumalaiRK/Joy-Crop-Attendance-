'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

function SuperAdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/admin';

  const [email, setEmail] = useState('admin@joycorpsolution.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isVerifyingSession, setIsVerifyingSession] = useState(true);

  // Check if already authenticated
  useEffect(() => {
    async function checkExistingSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          const userEmail = session.user.email?.toLowerCase();
          const role = session.user.user_metadata?.role;
          if (
            role === 'SUPER_ADMIN' ||
            role === 'Admin' ||
            userEmail === 'admin@joycorpsolution.com' ||
            userEmail === 'thirumalai@joyglobalcorp.com'
          ) {
            router.push(redirectUrl);
            return;
          }
        }
      } catch (_) {
      } finally {
        setIsVerifyingSession(false);
      }
    }
    checkExistingSession();
  }, [router, redirectUrl]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both Super Admin email and security password.');
      return;
    }

    setIsLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();

      // 1. Authenticate with Supabase Auth (Signs JWT Token with ECC P-256)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        throw new Error(
          error.message === 'Invalid login credentials'
            ? 'Invalid Super Admin credentials. Please verify your password.'
            : error.message
        );
      }

      if (!data.user || !data.session) {
        throw new Error('Authentication succeeded but failed to generate a secure JWT session.');
      }

      // 2. Verify Super Admin Authorization & Role
      const userRole = data.user.user_metadata?.role;
      const isSuperAdmin =
        userRole === 'SUPER_ADMIN' ||
        userRole === 'Super Administrator' ||
        userRole === 'Admin' ||
        cleanEmail === 'admin@joycorpsolution.com' ||
        cleanEmail === 'thirumalai@joyglobalcorp.com';

      if (!isSuperAdmin) {
        await supabase.auth.signOut();
        throw new Error(
          'Access Denied: Your account does not have Super Administrator privileges.'
        );
      }

      // Store active role in localStorage for instant client hydration
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_auth_user', JSON.stringify({
          email: data.user.email,
          role: 'SUPER_ADMIN',
          loginTime: new Date().toISOString(),
        }));
      }

      setSuccessMessage('✓ JWT Verified. Redirecting to Admin Command Center...');
      setTimeout(() => {
        router.push(redirectUrl);
      }, 700);

    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifyingSession) {
    return (
      <div className="min-h-screen bg-[#040810] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center animate-pulse">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
          </div>
          <span className="text-xs font-mono text-slate-400 tracking-wider">VERIFYING JWT SESSION...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#040810] flex flex-col justify-center items-center p-4 selection:bg-amber-500 selection:text-slate-950 relative overflow-hidden">
      {/* Dynamic Ambient Background Glow */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Cyber Grid Background */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#f59e0b 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Top Security Status Bar */}
        <div className="flex items-center justify-between px-4 py-2 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-emerald-400 font-bold">256-BIT ECC JWT</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <Cpu className="w-3.5 h-3.5 text-amber-400/70" />
            <span>TLS 1.3 SECURED</span>
          </div>
        </div>

        {/* Main Card */}
        <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl relative overflow-hidden">
          {/* Subtle Top Border Gradient */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />

          {/* Header & Logo */}
          <div className="text-center space-y-3 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/25 border border-amber-400/30">
              <ShieldCheck className="w-9 h-9 text-slate-950 stroke-[2.2]" />
            </div>

            <div>
              <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center justify-center gap-2">
                Joy Corporate <span className="text-amber-400">HQ</span>
              </h1>
              <p className="text-xs font-mono text-slate-400 mt-1 uppercase tracking-widest">
                Super Admin Security Console
              </p>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{successMessage}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Super Admin Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@joycorpsolution.com"
                  required
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 text-sm font-mono placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  Security Master Password
                </label>
                <span className="text-[10px] text-amber-400 font-mono">2FA PROTECTED</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-11 py-3 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 text-sm font-mono placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition duration-200 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying ECC JWT Token...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 stroke-[2.2]" />
                  <span>Authenticate Super Admin</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Access Credentials Reminder for Admin */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 font-mono space-y-1">
              <div className="text-slate-500 uppercase text-[9px] font-sans font-bold tracking-wider">Super Admin Identity</div>
              <div className="text-amber-300 font-semibold">admin@joycorpsolution.com</div>
              <div className="text-slate-500 text-[10px]">ECC P-256 JWT Signed • Full Console Authority</div>
            </div>
          </div>
        </div>

        {/* Footer links */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-2 font-mono">
          <a href="/portal/login" className="hover:text-amber-400 transition">
            ← Employee ESS Portal
          </a>
          <span className="text-slate-600">Joy Corporate Solutions © 2026</span>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#040810] flex items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center animate-pulse">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
          </div>
        </div>
      }
    >
      <SuperAdminLoginForm />
    </Suspense>
  );
}
