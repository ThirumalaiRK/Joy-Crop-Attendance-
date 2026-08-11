'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldCheck, Lock, Loader2, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AdminAuthGuardProps {
  children: React.ReactNode;
}

export function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [adminEmail, setAdminEmail] = useState<string>('admin@joycorpsolution.com');

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    // Skip guard for the login page itself
    if (isLoginPage) {
      setIsAuthenticated(true);
      return;
    }

    let isSubscribed = true;

    async function verifyAdminAuth() {
      try {
        // 1. Check Supabase Auth active session & JWT
        const { data: { session } } = await supabase.auth.getSession();

        if (session && session.user) {
          const email = session.user.email?.toLowerCase() || '';
          const role = session.user.user_metadata?.role;

          const isAuthorized =
            role === 'SUPER_ADMIN' ||
            role === 'Super Administrator' ||
            role === 'Admin' ||
            email === 'admin@joycorpsolution.com' ||
            email === 'thirumalai@joyglobalcorp.com';

          if (isAuthorized) {
            if (isSubscribed) {
              setAdminEmail(email);
              setIsAuthenticated(true);
            }
            return;
          }
        }

        // 2. Check localStorage fallback session
        if (typeof window !== 'undefined') {
          const storedAuth = localStorage.getItem('admin_auth_user');
          if (storedAuth) {
            try {
              const parsed = JSON.parse(storedAuth);
              if (parsed.role === 'SUPER_ADMIN' || parsed.email === 'admin@joycorpsolution.com') {
                if (isSubscribed) {
                  setAdminEmail(parsed.email || 'admin@joycorpsolution.com');
                  setIsAuthenticated(true);
                }
                return;
              }
            } catch (_) {}
          }
        }

        // 3. Not authenticated -> Redirect to Super Admin Login
        if (isSubscribed) {
          setIsAuthenticated(false);
          router.replace(`/admin/login?redirect=${encodeURIComponent(pathname || '/admin')}`);
        }
      } catch (err) {
        console.error('AdminAuthGuard verification error:', err);
        if (isSubscribed) {
          setIsAuthenticated(false);
          router.replace(`/admin/login?redirect=${encodeURIComponent(pathname || '/admin')}`);
        }
      }
    }

    verifyAdminAuth();

    // Listen for auth state changes (e.g. sign-out in another tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        router.replace('/admin/login');
      }
    });

    return () => {
      isSubscribed = false;
      subscription?.unsubscribe();
    };
  }, [pathname, isLoginPage, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  // Verifying Gatekeeper Screen
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#040810] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.15)] animate-pulse">
            <ShieldCheck className="w-8 h-8 text-amber-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest">
              Securing Enterprise Session
            </h3>
            <p className="text-xs font-mono text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              Validating Super Admin ECC JWT...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Unauthenticated fallback while redirecting
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
