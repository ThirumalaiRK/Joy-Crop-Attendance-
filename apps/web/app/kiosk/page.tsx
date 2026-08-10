'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ReceptionKiosk } from '../../components/kiosk/reception-kiosk';

export default function KioskPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <ReceptionKiosk isOpen={true} onClose={() => router.push('/')} />
    </div>
  );
}
