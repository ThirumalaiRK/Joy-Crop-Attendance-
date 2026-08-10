'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar, NavTab } from '../components/sidebar';
import { Header } from '../components/header';
import { CommandPalette } from '../components/command-palette';
import { AiAssistantDrawer } from '../components/ai-assistant-drawer';
import { ReceptionKiosk } from '../components/kiosk/reception-kiosk';

// Dashboard View Components
import { HeroStats } from '../components/dashboard/hero-stats';
import { AttendanceHeatmap } from '../components/dashboard/attendance-heatmap';
import { LiveFeedPreview } from '../components/dashboard/live-feed-preview';
import { DepartmentBreakdown } from '../components/dashboard/department-breakdown';
import { DeviceHealthWidget } from '../components/dashboard/device-health-widget';
import { BiometricTelemetryCard } from '../components/dashboard/biometric-telemetry-card';

// Views
import { LiveMonitoring } from '../components/live-attendance/live-monitoring';
import { ModeSelector, ActiveMode } from '../components/attendance-modes/mode-selector';
import { LiveFloorMap } from '../components/floor-map/live-floor-map';
import { EmployeeProfile } from '../components/profile/employee-profile';
import { EmployeeDirectory } from '../components/crm/employee-directory';
import { DeviceGrid } from '../components/devices/device-grid';
import { EnrollmentWizard } from '../components/enrollment/enrollment-wizard';
import { ShiftManager } from '../components/shifts/shift-manager';
import { VisitorManager } from '../components/visitors/visitor-manager';
import { ReportsAnalytics } from '../components/reports/reports-analytics';
import { SecuritySettings } from '../components/settings/security-settings';
import { NotificationsPanel } from '../components/notifications/notifications-panel';

// Biometric Modals
import { FaceRecModal } from '../components/attendance-modes/face-rec-modal';
import { FingerprintModal } from '../components/attendance-modes/fingerprint-modal';
import { AadhaarModal } from '../components/attendance-modes/aadhaar-modal';
import { QrModal } from '../components/attendance-modes/qr-modal';
import { GpsModal } from '../components/attendance-modes/gps-modal';

import {
  subscribeToLiveAttendance,
  insertAttendanceRecord,
  fetchAttendanceFromSupabase,
  fetchEmployeesFromSupabase,
  deleteEmployeeFromSupabase,
  updateEmployeeInSupabase,
  supabase,
} from '../lib/supabase';
import { Employee, AttendanceRecord } from '../types';

const UNWANTED_NAMES = [
  'sarahjenkins',
  'vikramadityasharma',
  'elenarostova',
  'marcuschen',
  'aanyapatel',
  'davidvance',
  'priyasundaram',
  'lucasdupont',
  'sophiamartinez',
];

const normalize = (n: string) => (n || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export default function Home() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [mounted, setMounted] = useState(false);
  const [prevTab, setPrevTab] = useState<NavTab>('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState('Global HQ - Floor 4 & 5');

  // Modals
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [isKioskOpen, setIsKioskOpen] = useState(false);
  const [activeBiometricModal, setActiveBiometricModal] = useState<ActiveMode>(null);
  const [kioskMode, setKioskMode] = useState<'check_in' | 'check_out' | 'auto'>('auto');

  // Data
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as NavTab | null;
      const storedTab = localStorage.getItem('agencyos_active_tab') as NavTab | null;
      if (tabParam) {
        setActiveTab(tabParam);
      } else if (storedTab) {
        setActiveTab(storedTab);
      }
    }
  }, []);

  // ─── Tab change with smooth transition ───────────────────────────────────────
  const handleSetActiveTab = useCallback((tab: NavTab) => {
    setPrevTab(activeTab);
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem('agencyos_active_tab', tab);
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  }, [activeTab]);

  // ─── Fetch + subscribe on mount ──────────────────────────────────────────────
  const loadEmployees = useCallback(async () => {
    const dbEmps = await fetchEmployeesFromSupabase();

    let localEnrolled: any[] = [];
    try {
      const localStr = localStorage.getItem('agencyos_enrolled_employees');
      if (localStr) localEnrolled = JSON.parse(localStr);
    } catch (e) {}

    const cleanedLocal = localEnrolled.filter((emp) => {
      const normKey = normalize(emp.name);
      const isMockId = emp.id && /^EMP-100\d/.test(emp.id);
      return !isMockId && !UNWANTED_NAMES.includes(normKey);
    });
    try {
      localStorage.setItem('agencyos_enrolled_employees', JSON.stringify(cleanedLocal));
    } catch (e) {}

    const rawList = [...cleanedLocal, ...(dbEmps || [])];
    const uniqueEmps: Employee[] = [];
    const seenIds = new Set<string>();

    for (const emp of rawList) {
      const normKey = normalize(emp.name);
      const isMockId = emp.id && /^EMP-100\d/.test(emp.id);
      if (emp.id && !isMockId && !UNWANTED_NAMES.includes(normKey) && !seenIds.has(emp.id)) {
        seenIds.add(emp.id);
        uniqueEmps.push(emp);
      }
    }

    setEmployees(uniqueEmps.length > 0 ? uniqueEmps : []);
  }, []);

  useEffect(() => {
    // Load attendance
    fetchAttendanceFromSupabase().then((dbRecords) => {
      if (dbRecords && dbRecords.length > 0) setRecords(dbRecords);
    });

    // Load employees
    loadEmployees().finally(() => setIsDataLoading(false));

    // Supabase realtime — attendance inserts, updates, and deletes
    const unsubAttendance = subscribeToLiveAttendance((record, eventType) => {
      setRecords((prev) => {
        if (eventType === 'INSERT') {
          if (prev.some((r) => r.id === record.id)) return prev;
          return [record, ...prev];
        }
        if (eventType === 'UPDATE') {
          return prev.map((r) => (r.id === record.id ? record : r));
        }
        if (eventType === 'DELETE') {
          return prev.filter((r) => r.id !== record.id);
        }
        return prev;
      });

      // Bump unread notifications for late/unknown events
      if (eventType === 'INSERT' && record.status === 'late') {
        setUnreadNotifications((n) => n + 1);
      }
    });

    // Supabase realtime — employee inserts, updates, and deletes
    const empChannel = supabase
      .channel('employees-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'employees' }, () => {
        loadEmployees();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'employees' }, () => {
        loadEmployees();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'employees' }, () => {
        loadEmployees();
      })
      .subscribe();

    return () => {
      unsubAttendance();
      supabase.removeChannel(empChannel);
    };
  }, [loadEmployees]);

  // Clear notification badge when user visits notifications tab
  useEffect(() => {
    if (activeTab === 'notifications') {
      setUnreadNotifications(0);
    }
  }, [activeTab]);

  const handleDeleteEmployee = (empId: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== empId));
    try {
      const localStr = localStorage.getItem('agencyos_enrolled_employees');
      if (localStr) {
        const localList: any[] = JSON.parse(localStr);
        localStorage.setItem('agencyos_enrolled_employees', JSON.stringify(localList.filter((e) => e.id !== empId)));
      }
    } catch (e) {}
    deleteEmployeeFromSupabase(empId);
  };

  const handleEditEmployee = (updatedEmp: Employee) => {
    setEmployees((prev) => prev.map((e) => e.id === updatedEmp.id ? updatedEmp : e));
    try {
      const localStr = localStorage.getItem('agencyos_enrolled_employees');
      if (localStr) {
        const localList: any[] = JSON.parse(localStr);
        localStorage.setItem(
          'agencyos_enrolled_employees',
          JSON.stringify(localList.map((e) => e.id === updatedEmp.id ? updatedEmp : e))
        );
      }
    } catch (e) {}
    updateEmployeeInSupabase(updatedEmp);
  };


  const handleBiometricSuccess = (newRecord: AttendanceRecord) => {
    setRecords((prev) => [newRecord, ...prev]);
    insertAttendanceRecord(newRecord);
  };

  const handleEmployeeEnrolled = useCallback((newEmp: Employee) => {
    setEmployees((prev) => {
      if (prev.some((e) => e.id === newEmp.id)) return prev;
      return [newEmp, ...prev];
    });
    // Also persist to localStorage
    try {
      const localStr = localStorage.getItem('agencyos_enrolled_employees');
      const localList: any[] = localStr ? JSON.parse(localStr) : [];
      if (!localList.some((e: any) => e.id === newEmp.id)) {
        localStorage.setItem('agencyos_enrolled_employees', JSON.stringify([newEmp, ...localList]));
      }
    } catch (e) {}
  }, []);

  // Live device count (active devices)
  const liveDeviceCount = devices.filter((d: any) => d.status === 'online' || d.status === 'active').length || devices.length;

  if (!mounted) {
    return <div className="min-h-screen bg-slate-950" />;
  }

  return (
    <div className={darkMode ? 'dark bg-slate-950 text-slate-100 font-sans' : 'bg-slate-50 text-slate-900 font-sans'}>
      <div className="flex min-h-screen">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleSetActiveTab}
          openKiosk={() => {}}
          openAiAssistant={() => setIsAiAssistantOpen(true)}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          liveEmployeeCount={isDataLoading ? undefined : employees.length}
          liveDeviceCount={liveDeviceCount}
          unreadNotifications={unreadNotifications}
        />

        {/* Main Content Workspace Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header Bar */}
          <Header
            openCommandPalette={() => setIsCommandPaletteOpen(true)}
            openAiAssistant={() => setIsAiAssistantOpen(true)}
            openKiosk={() => {}}
            openEnrollment={() => handleSetActiveTab('enrollment')}
            onOpenAdminProfile={() => {
              // Use the first employee in the list as the admin profile
              const admin = employees[0] || null;
              if (admin) {
                setSelectedEmployee(admin);
                handleSetActiveTab('profile');
              }
            }}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            selectedLocation={selectedLocation}
            setSelectedLocation={setSelectedLocation}
            unreadNotifications={unreadNotifications}
          />

          {/* Body Views Switcher — animated per tab */}
          <main
            key={activeTab}
            className="flex-1 p-4 md:p-8 space-y-6 overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            {/* Loading Skeleton */}
            {isDataLoading && activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-24 rounded-2xl bg-slate-800/60 animate-pulse" />
                  ))}
                </div>
                <div className="h-64 rounded-2xl bg-slate-800/60 animate-pulse" />
              </div>
            )}

            {/* Dashboard */}
            {!isDataLoading && activeTab === 'dashboard' && (
              <div className="space-y-6">
                <HeroStats
                  presentCount={records.filter((r) => !r.checkOutTime).length || 1}
                  currentlyInsideCount={records.filter((r) => !r.checkOutTime).length || 1}
                  absentCount={Math.max(0, employees.length - records.filter((r) => !r.checkOutTime).length)}
                  lateCount={records.filter((r) => r.status === 'late').length}
                  wfhCount={0}
                  onLeaveCount={0}
                  overtimeHours={records.filter((r) => r.status === 'overtime').length * 1.5}
                  avgCheckIn={records[0]?.checkInTime || '09:00 AM'}
                  avgCheckOut={records[0]?.checkOutTime || '06:00 PM'}
                  attendancePercent={
                    employees.length > 0
                      ? Math.round((records.filter((r) => !r.checkOutTime).length / employees.length) * 100)
                      : 100
                  }
                />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <AttendanceHeatmap />
                  </div>
                  <div className="lg:col-span-1">
                    <LiveFeedPreview
                      records={records}
                      onViewAll={() => handleSetActiveTab('live-attendance')}
                    />
                  </div>
                </div>
                <BiometricTelemetryCard searchCount={28} storageCount={16} verifyCount={12} />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <DepartmentBreakdown />
                  </div>
                  <div className="lg:col-span-1">
                    <DeviceHealthWidget
                      devices={devices}
                      onManageDevices={() => handleSetActiveTab('devices')}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'live-attendance' && (
              <LiveMonitoring records={records} setRecords={setRecords} />
            )}

            {activeTab === 'checkin-modes' && (
              <ModeSelector onSelectMode={(mode) => setActiveBiometricModal(mode)} />
            )}

            {activeTab === 'floor-map' && <LiveFloorMap />}

            {activeTab === 'employees' && (
              <EmployeeDirectory
                employees={employees}
                onSelectEmployee={(emp) => {
                  setSelectedEmployee(emp);
                  handleSetActiveTab('profile');
                }}
                onAddEmployee={() => handleSetActiveTab('enrollment')}
                onDeleteEmployee={handleDeleteEmployee}
                onEditEmployee={handleEditEmployee}
              />
            )}

            {activeTab === 'profile' && (
              <EmployeeProfile
                employee={selectedEmployee || employees[0]}
                todayLog={records[0]}
                onBackToDirectory={() => handleSetActiveTab('employees')}
              />
            )}

            {activeTab === 'devices' && (
              <DeviceGrid devices={devices} setDevices={setDevices} />
            )}

            {activeTab === 'enrollment' && (
              <EnrollmentWizard
                onEmployeeEnrolled={(newEmp) => {
                  handleEmployeeEnrolled(newEmp);
                }}
              />
            )}

            {activeTab === 'shifts' && <ShiftManager />}

            {activeTab === 'visitors' && <VisitorManager />}

            {(activeTab === 'reports' || activeTab === 'analytics') && <ReportsAnalytics />}

            {/* Notifications — dedicated panel, NOT settings */}
            {activeTab === 'notifications' && <NotificationsPanel />}

            {activeTab === 'settings' && <SecuritySettings />}
          </main>
        </div>
      </div>

      {/* Command Palette (Cmd+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        setActiveTab={handleSetActiveTab}
        openKiosk={() => {}}
        openAiAssistant={() => setIsAiAssistantOpen(true)}
      />

      {/* AI Assistant Drawer */}
      <AiAssistantDrawer
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
      />

      {/* Biometric Interactive Modals */}
      <FaceRecModal
        isOpen={activeBiometricModal === 'face'}
        onClose={() => setActiveBiometricModal(null)}
        onSuccess={handleBiometricSuccess}
      />
      <FingerprintModal
        isOpen={activeBiometricModal === 'fingerprint'}
        onClose={() => setActiveBiometricModal(null)}
        onSuccess={handleBiometricSuccess}
      />
      <AadhaarModal
        isOpen={activeBiometricModal === 'aadhaar'}
        onClose={() => setActiveBiometricModal(null)}
        onSuccess={handleBiometricSuccess}
      />
      <QrModal
        isOpen={activeBiometricModal === 'qr'}
        onClose={() => setActiveBiometricModal(null)}
        onSuccess={handleBiometricSuccess}
      />
      <GpsModal
        isOpen={activeBiometricModal === 'gps' || activeBiometricModal === 'selfie_gps'}
        onClose={() => setActiveBiometricModal(null)}
        onSuccess={handleBiometricSuccess}
      />
    </div>
  );
}
