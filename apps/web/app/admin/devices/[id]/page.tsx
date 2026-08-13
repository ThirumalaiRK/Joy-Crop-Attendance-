"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, StopCircle, Loader2 } from 'lucide-react';
import { AppShell } from '@/components/dashboard/app-shell';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { fetchDeviceByIdFromSupabase } from '@/lib/supabase';
import { BiometricDevice } from '@/types';

// Import our new Device Center tabs
import { OverviewTab } from '@/components/device-center/overview-tab';
import { EmployeesTab } from '@/components/device-center/employees-tab';
import { EnrollmentTab } from '@/components/device-center/enrollment-tab';
import { AttendanceTab } from '@/components/device-center/attendance-tab';
import { NetworkTab } from '@/components/device-center/network-tab';
import { MaintenanceTab } from '@/components/device-center/maintenance-tab';
import { MonitoringTab } from '@/components/device-center/monitoring-tab';

export default function DeviceCenterPage({ params }: { params: { id: string } }) {
  const [device, setDevice] = useState<BiometricDevice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchDeviceByIdFromSupabase(params.id);
        setDevice(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  if (loading) {
    return (
      <AppShell title="Loading Device..." subtitle="Please wait">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      </AppShell>
    );
  }

  if (!device) {
    return (
      <AppShell title="Device Not Found" subtitle="The device you are looking for does not exist.">
        <div className="p-6">
          <Link href="/admin/devices">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Devices
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={
        <div className="flex items-center gap-3">
          <Link href="/admin/devices">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <span>{device.name}</span>
        </div>
      }
      subtitle={`IP: ${device.ipAddress} | Model: ${device.model} | ZKTime.Net Replacement Center`}
      actions={
        <div className="flex items-center gap-2">
          {device.status === 'online' ? (
            <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Online
            </span>
          ) : (
            <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-wider">
              <StopCircle className="w-3 h-3" /> Offline
            </span>
          )}
          <Button variant="outline" size="sm" className="ml-2 bg-slate-900 border-slate-700 hover:bg-slate-800">
            <RefreshCw className="w-4 h-4 mr-2" /> Sync All
          </Button>
        </div>
      }
    >
      <div className="mt-2">
        <Tabs defaultValue="overview" className="w-full flex flex-col gap-6">
          <div className="bg-slate-900/50 p-1.5 rounded-xl border border-slate-800 inline-block w-fit max-w-full overflow-x-auto">
            <TabsList variant="line" className="gap-2 h-auto flex-nowrap">
              <TabsTrigger value="overview" className="px-4 py-2 rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-slate-800">Overview</TabsTrigger>
              <TabsTrigger value="employees" className="px-4 py-2 rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-slate-800">Employees</TabsTrigger>
              <TabsTrigger value="enrollment" className="px-4 py-2 rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-slate-800">Enrollment</TabsTrigger>
              <TabsTrigger value="attendance" className="px-4 py-2 rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-slate-800">Attendance</TabsTrigger>
              <TabsTrigger value="network" className="px-4 py-2 rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-slate-800">Network</TabsTrigger>
              <TabsTrigger value="maintenance" className="px-4 py-2 rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-slate-800">Maintenance</TabsTrigger>
              <TabsTrigger value="monitoring" className="px-4 py-2 rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-slate-800">Monitoring</TabsTrigger>
            </TabsList>
          </div>

          <div className="pb-20">
            <TabsContent value="overview" className="m-0 focus-visible:outline-none">
              <OverviewTab />
            </TabsContent>
            <TabsContent value="employees" className="m-0 focus-visible:outline-none">
              <EmployeesTab />
            </TabsContent>
            <TabsContent value="enrollment" className="m-0 focus-visible:outline-none -mx-8 -mt-8">
              {/* Enrollment tab has its own padding in the page component, we negative margin it to fit nicely */}
              <EnrollmentTab />
            </TabsContent>
            <TabsContent value="attendance" className="m-0 focus-visible:outline-none">
              <AttendanceTab />
            </TabsContent>
            <TabsContent value="network" className="m-0 focus-visible:outline-none">
              <NetworkTab />
            </TabsContent>
            <TabsContent value="maintenance" className="m-0 focus-visible:outline-none">
              <MaintenanceTab />
            </TabsContent>
            <TabsContent value="monitoring" className="m-0 focus-visible:outline-none">
              <MonitoringTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </AppShell>
  );
}
