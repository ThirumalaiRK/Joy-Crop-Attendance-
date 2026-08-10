'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar, AdminTab } from '../../components/admin/admin-sidebar';
import { ExecDashboard } from '../../components/admin/dashboard/exec-dashboard';
import { AdminEmployees } from '../../components/admin/employees/admin-employees';
import { ReceptionKiosk } from '../../components/kiosk/reception-kiosk';
import { AttendanceCommandCenter } from '../../components/admin/attendance/attendance-command-center';
import { UnknownFingerprintsPanel } from '../../components/admin/unknown-fingerprints/unknown-fp-panel';
import { ApiMonitor } from '../../components/admin/api-monitor/api-monitor';
import { AuditLogs } from '../../components/admin/audit-logs/audit-logs';
import { SystemHealth } from '../../components/admin/system-health/system-health';
import { DeveloperConsole } from '../../components/admin/developer/developer-console';
import { CompanyManagement } from '../../components/admin/companies/company-management';
import { BranchManagement } from '../../components/admin/branches/branch-management';
import { LiveActivityFeed } from '../../components/admin/live-activity/live-activity-feed';
import { SecurityCenter } from '../../components/admin/security/security-center';
import { AdminCopilot } from '../../components/admin/ai-copilot/admin-copilot';
import { AdminReports } from '../../components/admin/reports/admin-reports';
import { SubscriptionMgmt } from '../../components/admin/subscriptions/subscription-mgmt';
import { IntegrationCenter } from '../../components/admin/integrations/integration-center';
import { EnterpriseSettings } from '../../components/admin/settings/enterprise-settings';
import { AdminNotifications } from '../../components/admin/notifications/admin-notifications';
import { AdminVisitors } from '../../components/admin/visitors/admin-visitors';
import { AttendanceCorrections } from '../../components/admin/corrections/attendance-corrections';
import { EnrollmentQueue } from '../../components/admin/enrollment-queue/enrollment-queue';
import { DeviceDiagnostics } from '../../components/admin/device-diagnostics/device-diagnostics';
import { AdminHelpdeskControlCenter } from '../../components/admin/helpdesk/admin-helpdesk';
import { supabase, fetchEmployeesFromSupabase } from '../../lib/supabase';
import { Menu, X } from 'lucide-react';
import { GlobalSearchCommand } from '../../components/ui/global-search-command';

// Aligned views
import { ModeSelector } from '../../components/attendance-modes/mode-selector';
import { LiveFloorMap } from '../../components/floor-map/live-floor-map';
import { EnrollmentWizard } from '../../components/enrollment/enrollment-wizard';
import { ShiftManager } from '../../components/shifts/shift-manager';
import { VisitorManager } from '../../components/visitors/visitor-manager';
import { SecuritySettings } from '../../components/settings/security-settings';
import { EmployeePortal } from '../../components/employee/employee-portal';
import { TeamBreakDashboard } from '../../components/manager/team-break-dashboard';

// Biometric Modals and types
import { FaceRecModal } from '../../components/attendance-modes/face-rec-modal';
import { FingerprintModal } from '../../components/attendance-modes/fingerprint-modal';
import { AadhaarModal } from '../../components/attendance-modes/aadhaar-modal';
import { QrModal } from '../../components/attendance-modes/qr-modal';
import { GpsModal } from '../../components/attendance-modes/gps-modal';
import { ActiveMode } from '../../components/attendance-modes/mode-selector';
import { AttendanceRecord } from '../../types';
import { DeviceCenterPanel } from '../../components/admin/device-diagnostics/device-center-panel';
import { ConnectorStatusPanel } from '../../components/admin/settings/connector-status-panel';

// PulseHR Master components imports
import { AdminLeaves } from '../../components/admin/leaves/admin-leaves';
import { PayCodes } from '../../components/admin/payroll/pay-codes';
import { PayPeriods } from '../../components/admin/payroll/pay-periods';
import { PayrollProcessing } from '../../components/admin/payroll/payroll-processing';
import { PayrollReports } from '../../components/admin/payroll/payroll-reports';
import { AccessControl } from '../../components/admin/access/access-control';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeBiometricModal, setActiveBiometricModal] = useState<ActiveMode>(null);
  const [isKioskOpen, setIsKioskOpen] = useState(false);
  const [kioskMode, setKioskMode] = useState<'check_in' | 'check_out'>('check_in');

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as AdminTab | null;
      const storedTab = localStorage.getItem('admin_active_tab') as AdminTab | null;
      if (tabParam) {
        setActiveTab(tabParam);
      } else if (storedTab) {
        setActiveTab(storedTab);
      }
    }
  }, []);

  // Live badge counts
  const [empCount, setEmpCount] = useState<number | undefined>(undefined);
  const [attCount, setAttCount] = useState<number | undefined>(undefined);
  const [unknownFpCount, setUnknownFpCount] = useState(0);
  const [systemAlerts, setSystemAlerts] = useState(0);

  useEffect(() => {
    // Load initial counts
    const load = async () => {
      const TODAY_STR = new Date().toISOString().split('T')[0];
      const [emps, { data: recs }] = await Promise.all([
        fetchEmployeesFromSupabase(),
        supabase
          .from('attendance_records')
          .select('employee_id, employee_name')
          .or(`date.eq.${TODAY_STR},created_at.gte.${TODAY_STR}T00:00:00.000Z`),
      ]);

      const uniquePresent = new Set((recs || []).map((r: any) => {
        const raw = (r.employee_id || r.employee_name || '').trim();
        const num = parseInt(raw.replace(/\D/g, ''), 10);
        return !isNaN(num) ? `EMP-${num}` : raw;
      }));

      setEmpCount(emps.length);
      setAttCount(uniquePresent.size);
    };
    load();

    // Realtime updates
    const ch = supabase.channel('admin-page-counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, async () => {
        const emps = await fetchEmployeesFromSupabase();
        setEmpCount(emps.length);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendance_records' }, (payload) => {
        setAttCount((p) => (p ?? 0) + 1);
        if ((payload.new as any)?.status === 'late') {
          setSystemAlerts((p) => p + 1);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, []);

  // Clear alerts when visiting notifications
  useEffect(() => {
    if (activeTab === 'notifications') setSystemAlerts(0);
  }, [activeTab]);

  const handleSetTab = (tab: AdminTab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_active_tab', tab);
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  };

  if (!mounted) {
    return <div className="min-h-screen bg-[#060c14]" />;
  }

  return (
    <div className="flex min-h-screen bg-[#060c14] text-slate-200 font-sans">
      {/* Global Command Palette — Ctrl+K */}
      <GlobalSearchCommand />

      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400"
      >
        {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'block' : 'hidden'} md:block`}>
        <AdminSidebar
          activeTab={activeTab}
          setActiveTab={handleSetTab}
          openKiosk={() => {}}
          liveAttendanceCount={attCount}
          employeeCount={empCount}
          unknownFpCount={unknownFpCount}
          systemAlerts={systemAlerts}
        />
      </div>

      {/* Main Content */}
      <main
        key={activeTab}
        className="flex-1 min-w-0 p-6 md:p-10 overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-200"
      >
        {activeTab === 'dashboard' && <ExecDashboard />}
        {activeTab === 'live-attendance' && <AttendanceCommandCenter />}
        {activeTab === 'team-breaks' && <TeamBreakDashboard />}
        {activeTab === 'employees' && <AdminEmployees />}
        {activeTab === 'enrollment-queue' && <EnrollmentQueue />}
        {activeTab === 'devices' && <DeviceCenterPanel />}
        {activeTab === 'connector-status' && <ConnectorStatusPanel />}
        {activeTab === 'companies' && <CompanyManagement />}
        {activeTab === 'branches' && <BranchManagement />}
        {activeTab === 'visitors' && <AdminVisitors />}
        {activeTab === 'corrections' && <AttendanceCorrections />}
        {activeTab === 'reports' && <AdminReports />}
        {activeTab === 'ai-copilot' && <AdminCopilot />}
        {activeTab === 'subscriptions' && <SubscriptionMgmt />}
        {activeTab === 'integrations' && <IntegrationCenter />}
        {activeTab === 'notifications' && <AdminNotifications />}
        {activeTab === 'support' && <AdminHelpdeskControlCenter />}
        {activeTab === 'audit-logs' && <AuditLogs />}
        {activeTab === 'security' && <SecurityCenter />}
        {activeTab === 'developer' && <DeveloperConsole />}
        {activeTab === 'system-health' && <SystemHealth />}
        {activeTab === 'unknown-fingerprints' && <UnknownFingerprintsPanel />}
        {activeTab === 'device-diagnostics' && <DeviceDiagnostics />}
        {activeTab === 'settings' && <EnterpriseSettings />}

        {/* PulseHR tabs */}
        {activeTab === 'leave-management' && <AdminLeaves />}
        {activeTab === 'pay-codes' && <PayCodes />}
        {activeTab === 'pay-periods' && <PayPeriods />}
        {activeTab === 'payroll-processing' && <PayrollProcessing />}
        {activeTab === 'payroll-reports' && <PayrollReports />}
        {activeTab === 'access-control' && <AccessControl />}

        {/* Aligned Employee/Kiosk views */}
        {activeTab === 'checkin-modes' && (
          <ModeSelector onSelectMode={(mode) => setActiveBiometricModal(mode)} />
        )}
        {activeTab === 'floor-map' && <LiveFloorMap />}
        {activeTab === 'enrollment' && (
          <EnrollmentWizard
            onEmployeeEnrolled={() => setActiveTab('employees')}
          />
        )}
        {activeTab === 'shifts' && <ShiftManager />}
        {(activeTab === 'visitors' || activeTab === 'visitors-passes') && <VisitorManager />}
        {activeTab === 'user-settings' && <SecuritySettings />}
      </main>

      {/* Biometric Interactive Modals */}
      <FaceRecModal
        isOpen={activeBiometricModal === 'face'}
        onClose={() => setActiveBiometricModal(null)}
        onSuccess={() => setActiveBiometricModal(null)}
      />

      <FingerprintModal
        isOpen={activeBiometricModal === 'fingerprint'}
        onClose={() => setActiveBiometricModal(null)}
        onSuccess={() => setActiveBiometricModal(null)}
      />

      <AadhaarModal
        isOpen={activeBiometricModal === 'aadhaar'}
        onClose={() => setActiveBiometricModal(null)}
        onSuccess={() => setActiveBiometricModal(null)}
      />

      <QrModal
        isOpen={activeBiometricModal === 'qr'}
        onClose={() => setActiveBiometricModal(null)}
        onSuccess={() => setActiveBiometricModal(null)}
      />

      <GpsModal
        isOpen={activeBiometricModal === 'gps'}
        onClose={() => setActiveBiometricModal(null)}
        onSuccess={() => setActiveBiometricModal(null)}
      />
    </div>
  );
}
