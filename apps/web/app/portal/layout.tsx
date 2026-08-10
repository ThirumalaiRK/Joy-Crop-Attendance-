import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AgencyOS — Employee Self-Service Portal (ESS)',
  description: 'Personal Employee Portal for attendance tracking, break management, leave requests, and document downloads.',
};

export default function ESSLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#060c14] text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
      {children}
    </div>
  );
}
