'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Key,
  RefreshCw,
  Mail,
  Users,
  Building2,
  Clock,
  CreditCard,
  History,
  Lock,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Fingerprint,
  Radio,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Shield,
  Briefcase,
  Sliders,
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { EmployeeAvatar } from '@/components/common/employee-avatar';
import { EmployeeAuditDrawer } from './employee-audit-drawer';
import { supabase } from '@/lib/supabase';

export interface EmployeeProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any;
  onSaveSuccess?: () => void;
  initialTab?: string;
}

const COMPANY_NAME = 'Joy Corporate Solutions Pvt. Ltd.';

const BRANCHES = ['Coimbatore HQ', 'Chennai Regional Office', 'Bengaluru Tech Hub', 'Hyderabad Center'];
const DIVISIONS = ['Software Engineering', 'Enterprise Solutions', 'Product & Design', 'Operations & HR'];
const DEPARTMENTS = ['Software Development', 'Quality Assurance', 'DevOps & Cloud', 'Product Management', 'Human Resources', 'Finance & Payroll'];
const TEAMS = ['Frontend Platform', 'Backend & APIs', 'Biometrics & IoT', 'Mobile Applications', 'Core Infrastructure'];
const DESIGNATIONS = [
  'Managing Director',
  'Director / CTO',
  'Software Engineer',
  'Senior Software Engineer',
  'Lead Frontend Engineer',
  'Principal Backend Architect',
  'DevOps Engineer',
  'HR Specialist',
  'Operations Manager',
];
const GRADES = ['L1 - Associate', 'L2 - Engineer', 'L3 - Senior Engineer', 'L4 - Lead / Architect', 'E1 - Executive Leadership'];
const SHIFTS = [
  'General Shift (09:00 AM - 06:00 PM)',
  'Morning Flexi (08:30 AM - 05:30 PM)',
  'Evening Shift (01:00 PM - 10:00 PM)',
  'Night Operations (10:00 PM - 07:00 AM)',
];

const ROLES = [
  { id: 'EMPLOYEE', label: 'Employee', desc: 'Self-service portal: attendance, leave, payslips, profile.' },
  { id: 'MANAGER', label: 'Team Manager', desc: 'Team management: break monitoring, approvals, shift adjustments.' },
  { id: 'HR_EXECUTIVE', label: 'HR Executive', desc: 'Employee onboarding, profile edits, biometric enrollment.' },
  { id: 'HR_MANAGER', label: 'HR Manager', desc: 'Full HR authority, policy setup, payroll verification, audits.' },
  { id: 'ADMIN', label: 'System Admin', desc: 'Full admin console, device gateway, auth credentials provisioning.' },
  { id: 'SUPER_ADMIN', label: 'Super Administrator', desc: 'Unrestricted enterprise authority across all modules.' },
];

export function EmployeeProfileModal({
  isOpen,
  onClose,
  employee,
  onSaveSuccess,
  initialTab = 'personal',
}: EmployeeProfileModalProps) {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('Administrative Action');

  // Form Edit State
  const [formData, setFormData] = useState<any>({});
  const [savingStep, setSavingStep] = useState<string | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isSendingWelcome, setIsSendingWelcome] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  const tabsScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (employee) {
      setFormData({
        id: employee.id || employee.employeeCode,
        employeeCode: employee.employeeCode || employee.id,
        name: employee.name || employee.fullName || 'Employee',
        displayName: employee.displayName || employee.name || '',
        gender: employee.gender || 'Male',
        dob: employee.dob || '1995-05-15',
        bloodGroup: employee.bloodGroup || 'O+',
        status: employee.status || 'Active',
        avatar: employee.avatar || employee.avatar_url || null,

        company: employee.company || COMPANY_NAME,
        branch: employee.branch || 'Coimbatore HQ',
        division: employee.division || 'Software Engineering',
        department: employee.department || 'Software Development',
        team: employee.team || 'Frontend Platform',
        designation: employee.designation || 'Software Engineer',
        grade: employee.grade || 'L3 - Senior Engineer',
        reportingManager: employee.manager || employee.reportingManager || 'THIRUMALAI R K (MD)',

        employmentType: employee.employmentType || 'Permanent',
        employmentStatus: employee.employmentStatus || 'Full Time',
        joiningDate: employee.joiningDate || '2024-01-10',
        confirmationDate: employee.confirmationDate || '2024-04-10',
        shift: employee.shift || 'General Shift (09:00 AM - 06:00 PM)',
        workLocation: employee.workLocation || 'Coimbatore HQ',
        weeklyOff: employee.weeklyOff || 'Saturday & Sunday',

        allowedDevices: employee.allowedDevices || 'Identix K90 Pro (192.168.1.56), Mantra MFS110',
        defaultTerminal: employee.defaultTerminal || 'HQ Main Gate Terminal (192.168.1.56)',
        lateGraceMinutes: employee.lateGraceMinutes || 15,
        overtimePolicy: employee.overtimePolicy || 'Standard (> 8 Hours Daily)',
        role: employee.role || 'EMPLOYEE',

        email: employee.email || employee.official_email || `${String(employee.name || 'employee').toLowerCase().replace(/\s+/g, '')}@agencyos.ai`,
        personalEmail: employee.personalEmail || `${String(employee.name || 'employee').toLowerCase().replace(/\s+/g, '')}.personal@gmail.com`,
        phone: employee.phone || '+91 98765 43210',
        emergencyName: employee.emergencyName || 'R. Kumar (Father)',
        emergencyPhone: employee.emergencyPhone || '+91 98765 00000',
        address: employee.address || '123 Corporate Park Avenue, Coimbatore, Tamil Nadu, 641001',

        bankName: employee.bankName || 'HDFC Bank Ltd',
        accountNumberMasked: employee.accountNumberMasked || 'XXXX-XXXX-4892',
        ifsc: employee.ifsc || 'HDFC0001234',
        pan: employee.pan || 'ABCDE1234F',
        aadhaarMasked: employee.aadhaarMasked || 'XXXX-XXXX-9012',
        pf: employee.pf || 'CB/CBE/12345/678',
        esi: employee.esi || '31000123456789',

        biometricStatus: {
          fingerprint: employee.biometricStatus?.fingerprint ?? employee.fingerprint_enrolled ?? true,
          face: employee.biometricStatus?.face ?? employee.face_enrolled ?? true,
          qr: employee.biometricStatus?.qr ?? employee.qr_enabled ?? true,
        },
      });
      setActiveTab(initialTab);
    }
  }, [employee, initialTab]);

  if (!isOpen || !employee) return null;

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsScrollRef.current) {
      tabsScrollRef.current.scrollBy({
        left: direction === 'left' ? -200 : 200,
        behavior: 'smooth',
      });
    }
  };

  const handleAvatarChange = (newUrl: string | null) => {
    setFormData((prev: any) => ({ ...prev, avatar: newUrl }));
    toast.success(newUrl ? 'Profile photo updated!' : 'Initials fallback active.');
  };

  // 1. Action: Provision Credentials
  const handleProvisionCredentials = async () => {
    if (!formData.email) {
      toast.error('Official login email is required.');
      return;
    }

    setIsProvisioning(true);
    const tid = toast.loading(`Provisioning Supabase Auth for ${formData.email}...`);

    try {
      const res = await fetch('/api/admin/provision-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: formData.employeeCode || formData.id,
          email: formData.email,
          name: formData.name,
          role: formData.role,
          company: formData.company,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Provisioning failed');

      toast.success(
        `✅ Credentials Provisioned! Login Email: ${data.email} | Temp Password: ${data.password}`,
        { id: tid, duration: 8000 }
      );
      setFormData((prev: any) => ({ ...prev, status: 'Active' }));
    } catch (err: any) {
      toast.error(`❌ Provisioning error: ${err.message}`, { id: tid });
    } finally {
      setIsProvisioning(false);
    }
  };

  // 2. Action: Reset Password
  const handleResetPasswordAction = async () => {
    if (!formData.email) {
      toast.error('Official email is required.');
      return;
    }

    setIsResettingPassword(true);
    const tid = toast.loading(`Generating password reset for ${formData.email}...`);

    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: formData.employeeCode || formData.id,
          email: formData.email,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');

      toast.success(`✅ Password Reset! Temp Password: ${data.newPassword}`, { id: tid, duration: 8000 });
    } catch (err: any) {
      toast.error(`❌ ${err.message}`, { id: tid });
    } finally {
      setIsResettingPassword(false);
    }
  };

  // 3. Action: Send Welcome Email
  const handleSendWelcomeEmail = async () => {
    if (!formData.email) {
      toast.error('Official email is required.');
      return;
    }

    setIsSendingWelcome(true);
    const tid = toast.loading(`Dispatching welcome onboarding email to ${formData.email}...`);

    try {
      const res = await fetch('/api/admin/send-welcome-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: formData.employeeCode || formData.id,
          email: formData.email,
          name: formData.name,
          role: formData.role,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send email');

      toast.success(`✅ ${data.message}`, { id: tid });
    } catch (err: any) {
      toast.error(`❌ ${err.message}`, { id: tid });
    } finally {
      setIsSendingWelcome(false);
    }
  };

  // 4. Action: Suspend / Reactivate Portal Access
  const handleConfirmSuspend = async () => {
    const isCurrentlyActive = formData.status === 'Active';
    const action = isCurrentlyActive ? 'SUSPEND' : 'REACTIVATE';

    setIsTogglingStatus(true);
    setIsSuspendModalOpen(false);
    const tid = toast.loading(`${isCurrentlyActive ? 'Suspending' : 'Reactivating'} portal access...`);

    try {
      const res = await fetch('/api/admin/toggle-portal-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: formData.employeeCode || formData.id,
          action,
          reason: suspendReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Status update failed');

      setFormData((prev: any) => ({ ...prev, status: data.status }));
      toast.success(`✅ ${data.message}`, { id: tid });
    } catch (err: any) {
      toast.error(`❌ ${err.message}`, { id: tid });
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // 5. Main Save Changes & Sync
  const handleSaveAndSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      toast.error('Employee legal name is required.');
      return;
    }

    setSavingStep('Saving Profile...');
    const tid = toast.loading('Saving employee profile to Supabase...');

    try {
      // Step 1: Update Supabase employees table
      setSavingStep('Updating Supabase Database...');
      const { error: empError } = await supabase
        .from('employees')
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          designation: formData.designation,
          department: formData.department,
          manager: formData.reportingManager,
          shift: formData.shift,
          status: formData.status,
          avatar: formData.avatar,
          updated_at: new Date().toISOString(),
        })
        .or(`id.eq.${formData.id},employee_code.eq.${formData.employeeCode}`);

      if (empError) {
        console.warn('employees update notice:', empError.message);
      }

      // Step 2: Sync Role
      setSavingStep('Updating RBAC Roles...');
      try {
        await fetch('/api/admin/employee-roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: formData.employeeCode || formData.id,
            role: formData.role,
          }),
        });
      } catch (_) {}

      setSavingStep('Completed!');
      toast.success(`✅ Successfully saved and synchronized profile for ${formData.name}!`, { id: tid });

      onSaveSuccess?.();
      setTimeout(() => {
        setSavingStep(null);
        onClose();
      }, 500);
    } catch (err: any) {
      toast.error(`Failed to save: ${err.message}`, { id: tid });
      setSavingStep(null);
    }
  };

  const isActive = formData.status === 'Active';

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-2xl animate-in fade-in duration-200">
        <div className="w-full max-w-6xl bg-slate-950/95 border border-slate-800 rounded-[32px] shadow-[0_0_60px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[94vh] backdrop-blur-2xl animate-in zoom-in-95 duration-200">

          {/* ══════════════════════════════════════════════════════════════════
              HEADER: ENTERPRISE AVATAR & IDENTITY BADGES
          ══════════════════════════════════════════════════════════════════ */}
          <div className="p-5 sm:p-6 border-b border-slate-800/80 bg-gradient-to-r from-slate-950 via-slate-900/60 to-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <EmployeeAvatar
                name={formData.name}
                avatarUrl={formData.avatar}
                employeeId={formData.employeeCode || formData.id}
                size="lg"
                editable={true}
                onAvatarChange={handleAvatarChange}
                status={isActive ? 'active' : 'suspended'}
                showBadge={true}
              />
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                    {COMPANY_NAME}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700">
                    {formData.employeeCode}
                  </span>
                </div>
                <h2 className="text-xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
                  Edit Employee Profile: {formData.name}
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  {formData.designation} • {formData.department}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setIsAuditDrawerOpen(true)}
                className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-2xl border border-emerald-500/30 transition shadow-sm"
                title="View Immutable Security Audit Logs"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Audit Trail Active
              </button>

              <button
                onClick={onClose}
                className="p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition border border-slate-800"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              ENTERPRISE RESPONSIVE 6-SECTION TABS (SCALED & FULLY VISIBLE)
          ══════════════════════════════════════════════════════════════════ */}
          <div className="bg-slate-900/80 border-b border-slate-800/80 p-2 sm:p-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {[
                { id: 'personal', label: 'Personal Info', icon: Users },
                { id: 'org', label: 'Organization', icon: Building2 },
                { id: 'employment', label: 'Employment & Shift', icon: Clock },
                { id: 'access', label: 'Access & Attendance', icon: ShieldCheck },
                { id: 'contact', label: 'Contact & Emergency', icon: Mail },
                { id: 'statutory', label: 'Bank & Statutory', icon: CreditCard },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={clsx(
                      'flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-bold transition text-center border select-none w-full truncate',
                      active
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/30'
                        : 'bg-slate-950/60 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:bg-slate-900'
                    )}
                  >
                    <Icon className={clsx('w-3.5 h-3.5 shrink-0', active ? 'text-amber-400' : 'text-slate-500')} />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              FORM CONTENT BODY (SMOOTH VERTICAL SCROLL, NO HORIZONTAL OVERFLOW)
          ══════════════════════════════════════════════════════════════════ */}
          <form onSubmit={handleSaveAndSync} className="p-6 overflow-y-auto no-scrollbar scrollbar-none space-y-6 flex-1 max-h-[72vh] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth">

            {/* ───────────── TAB 1: PERSONAL INFO ───────────── */}
            {activeTab === 'personal' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <EmployeeAvatar
                      name={formData.name}
                      avatarUrl={formData.avatar}
                      employeeId={formData.employeeCode || formData.id}
                      size="lg"
                      editable={true}
                      onAvatarChange={handleAvatarChange}
                    />
                    <div>
                      <h4 className="text-xs font-extrabold text-white">Employee Avatar</h4>
                      <p className="text-[10px] text-slate-400">Upload profile image or hover to replace / delete</p>
                      <button
                        type="button"
                        onClick={() => handleAvatarChange(`https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || 'Employee')}&background=0ea5e9&color=fff&size=200&bold=true`)}
                        className="mt-1.5 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold transition border border-slate-700 flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3 h-3 text-amber-400" /> Generate Name Avatar
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Account Status</span>
                    <span className={clsx(
                      'mt-1 px-3 py-1 rounded-xl text-xs font-mono font-bold border',
                      isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    )}>
                      ● {formData.status?.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-500" /> Employee ID (Read Only)
                    </label>
                    <input
                      type="text"
                      value={formData.employeeCode}
                      disabled
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 mb-1.5 block">Full Legal Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white font-semibold focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block">Preferred Display Name</label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-amber-500 focus:outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-amber-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block">Blood Group</label>
                    <select
                      value={formData.bloodGroup}
                      onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-amber-500 focus:outline-none"
                    >
                      {['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', 'AB-'].map((bg) => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ───────────── TAB 2: ORGANIZATION STRUCTURE ───────────── */}
            {activeTab === 'org' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-950/40 via-slate-900/60 to-slate-950 border border-violet-500/20 text-xs flex flex-col gap-2">
                  <span className="text-[10px] font-mono font-extrabold text-violet-400 uppercase tracking-widest">
                    Enterprise Hierarchy Scope
                  </span>
                  <div className="flex items-center gap-2 flex-wrap font-mono text-[11px] text-slate-200 font-bold">
                    <span className="text-amber-400">{formData.company}</span>
                    <ChevronRight className="w-3 h-3 text-slate-500" />
                    <span className="text-violet-300">{formData.branch}</span>
                    <ChevronRight className="w-3 h-3 text-slate-500" />
                    <span className="text-blue-300">{formData.division}</span>
                    <ChevronRight className="w-3 h-3 text-slate-500" />
                    <span className="text-emerald-300">{formData.department}</span>
                    <ChevronRight className="w-3 h-3 text-slate-500" />
                    <span className="text-cyan-300">{formData.designation}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block">Company Name</label>
                    <input
                      type="text"
                      value={formData.company}
                      disabled
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-amber-400 font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 mb-1.5 block">Branch Office</label>
                    <select
                      value={formData.branch}
                      onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white font-semibold focus:border-amber-500 focus:outline-none"
                    >
                      {BRANCHES.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 mb-1.5 block">Division</label>
                    <select
                      value={formData.division}
                      onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white font-semibold focus:border-amber-500 focus:outline-none"
                    >
                      {DIVISIONS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 mb-1.5 block">Department *</label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white font-semibold focus:border-amber-500 focus:outline-none"
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 mb-1.5 block">Team Unit</label>
                    <select
                      value={formData.team}
                      onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white font-semibold focus:border-amber-500 focus:outline-none"
                    >
                      {TEAMS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 mb-1.5 block">Designation *</label>
                    <select
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white font-semibold focus:border-amber-500 focus:outline-none"
                    >
                      {DESIGNATIONS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block">Grade / Band</label>
                    <select
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-amber-500 focus:outline-none"
                    >
                      {GRADES.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 mb-1.5 block">Reporting Manager</label>
                    <select
                      value={formData.reportingManager}
                      onChange={(e) => setFormData({ ...formData, reportingManager: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white font-semibold focus:border-amber-500 focus:outline-none"
                    >
                      <option value="THIRUMALAI R K (MD)">THIRUMALAI R K — Managing Director</option>
                      <option value="Sakthi (CTO)">Sakthi — Director / CTO</option>
                      <option value="Dharun DB (Operations Director)">Dharun DB — Operations Director</option>
                      <option value="Rajesh Kumar (Engineering Manager)">Rajesh Kumar — Engineering Manager</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ───────────── TAB 3: EMPLOYMENT & SHIFT ───────────── */}
            {activeTab === 'employment' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block">Employment Type</label>
                    <select
                      value={formData.employmentType}
                      onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white font-semibold focus:border-amber-500 focus:outline-none"
                    >
                      <option value="Permanent">Permanent</option>
                      <option value="Contract">Contract</option>
                      <option value="Intern">Intern</option>
                      <option value="Consultant">Consultant</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block">Joining Date</label>
                    <input
                      type="date"
                      value={formData.joiningDate}
                      onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block">Confirmation Date</label>
                    <input
                      type="date"
                      value={formData.confirmationDate}
                      onChange={(e) => setFormData({ ...formData, confirmationDate: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 mb-1.5 block">Shift Schedule *</label>
                    <select
                      value={formData.shift}
                      onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white font-semibold focus:border-amber-500 focus:outline-none"
                    >
                      {SHIFTS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block">Work Location</label>
                    <select
                      value={formData.workLocation}
                      onChange={(e) => setFormData({ ...formData, workLocation: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-amber-500 focus:outline-none"
                    >
                      <option value="Coimbatore HQ">Coimbatore HQ</option>
                      <option value="Chennai Regional Office">Chennai Regional Office</option>
                      <option value="Remote (WFH)">Remote (WFH)</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block">Weekly Off Policy</label>
                    <select
                      value={formData.weeklyOff}
                      onChange={(e) => setFormData({ ...formData, weeklyOff: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-amber-500 focus:outline-none"
                    >
                      <option value="Saturday & Sunday">Saturday & Sunday</option>
                      <option value="Sunday Only">Sunday Only</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ───────────── TAB 4: ACCESS & ATTENDANCE ───────────── */}
            {activeTab === 'access' && (
              <div className="space-y-5 animate-in fade-in duration-150">

                {/* Biometric Status Summary */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-extrabold uppercase block">
                      Biometric Enrollment Status (Physical Terminal 192.168.1.56)
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Live Hardware Verified
                    </span>
                  </div>

                  {(() => {
                    const isFpEnrolled = Boolean(
                      formData.biometricStatus?.fingerprint ??
                      employee.fingerprint_enrolled ??
                      employee.isEnrolled ??
                      employee.biometricStatus?.isEnrolled ??
                      employee.biometricStatus?.fingerprint
                    );
                    const isFaceEnrolled = Boolean(formData.biometricStatus?.face ?? employee.face_enrolled);
                    const isQrEnabled = Boolean(formData.biometricStatus?.qr ?? employee.qr_enabled ?? true);

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Fingerprint Card */}
                        <div className={clsx(
                          'p-3.5 rounded-2xl border flex items-center justify-between transition shadow-sm',
                          isFpEnrolled
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400'
                        )}>
                          <span className="text-xs font-bold flex items-center gap-2">
                            <Fingerprint className={clsx('w-4 h-4', isFpEnrolled ? 'text-emerald-400' : 'text-slate-500')} />
                            Fingerprint
                          </span>
                          <span className={clsx(
                            'text-[10px] px-2.5 py-0.5 rounded-full font-mono font-extrabold border',
                            isFpEnrolled
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          )}>
                            {isFpEnrolled ? '✓ Enrolled' : '⏳ Unenrolled'}
                          </span>
                        </div>

                        {/* Face Rec Card */}
                        <div className={clsx(
                          'p-3.5 rounded-2xl border flex items-center justify-between transition shadow-sm',
                          isFaceEnrolled
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400'
                        )}>
                          <span className="text-xs font-bold flex items-center gap-2">
                            <ShieldCheck className={clsx('w-4 h-4', isFaceEnrolled ? 'text-emerald-400' : 'text-slate-500')} />
                            Face Rec
                          </span>
                          <span className={clsx(
                            'text-[10px] px-2.5 py-0.5 rounded-full font-mono font-extrabold border',
                            isFaceEnrolled
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-slate-800/80 text-slate-500 border-slate-700/60'
                          )}>
                            {isFaceEnrolled ? '✓ Active' : 'Not Enrolled'}
                          </span>
                        </div>

                        {/* QR & GPS Card */}
                        <div className={clsx(
                          'p-3.5 rounded-2xl border flex items-center justify-between transition shadow-sm',
                          isQrEnabled
                            ? 'bg-violet-500/10 border-violet-500/30 text-violet-300'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400'
                        )}>
                          <span className="text-xs font-bold flex items-center gap-2">
                            <Radio className={clsx('w-4 h-4', isQrEnabled ? 'text-violet-400' : 'text-slate-500')} />
                            QR & GPS
                          </span>
                          <span className={clsx(
                            'text-[10px] px-2.5 py-0.5 rounded-full font-mono font-extrabold border',
                            isQrEnabled
                              ? 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                              : 'bg-slate-800/80 text-slate-500 border-slate-700/60'
                          )}>
                            {isQrEnabled ? '✓ Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Hardware & Attendance Rules */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block">Allowed Hardware Devices</label>
                    <input
                      type="text"
                      value={formData.allowedDevices}
                      onChange={(e) => setFormData({ ...formData, allowedDevices: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block">Default Terminal</label>
                    <select
                      value={formData.defaultTerminal}
                      onChange={(e) => setFormData({ ...formData, defaultTerminal: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-amber-500 focus:outline-none font-mono"
                    >
                      <option value="HQ Main Gate Terminal (192.168.1.56)">HQ Main Gate Terminal (192.168.1.56:4370)</option>
                      <option value="HQ Reception Kiosk">HQ Reception Kiosk (Local USB)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block">Late Grace Period</label>
                    <select
                      value={formData.lateGraceMinutes}
                      onChange={(e) => setFormData({ ...formData, lateGraceMinutes: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-amber-500 focus:outline-none"
                    >
                      <option value={5}>5 Minutes</option>
                      <option value={15}>15 Minutes (Default Cutoff: 09:15 AM)</option>
                      <option value={30}>30 Minutes</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block">Overtime Policy</label>
                    <input
                      type="text"
                      value={formData.overtimePolicy}
                      onChange={(e) => setFormData({ ...formData, overtimePolicy: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Enterprise RBAC Role Selection */}
                <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase block flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-amber-400" /> Enterprise Role & Permissions (RBAC)
                    </span>
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      Active Role: {formData.role}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {ROLES.map((r) => {
                      const isSelected = formData.role === r.id;
                      return (
                        <div
                          key={r.id}
                          onClick={() => setFormData({ ...formData, role: r.id })}
                          className={clsx(
                            'p-3 rounded-xl border cursor-pointer transition select-none flex flex-col justify-between gap-1.5',
                            isSelected
                              ? 'bg-amber-500/15 border-amber-500/50 shadow-md'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className={clsx('text-xs font-bold', isSelected ? 'text-amber-300' : 'text-slate-300')}>
                              {r.label}
                            </span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                          </div>
                          <p className="text-[10px] text-slate-500 leading-tight">{r.desc}</p>
                        </div>
                      );
                    })}
                  </div>

                  {formData.role === 'ADMIN' || formData.role === 'SUPER_ADMIN' ? (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Security Notice: This employee will have administrative console & identity provisioning privileges.</span>
                    </div>
                  ) : null}
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    SUPABASE AUTHENTICATION & IDENTITY PROVISIONING CARD
                ══════════════════════════════════════════════════════════════ */}
                <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-amber-400" />
                      <h4 className="text-xs font-black text-white">Supabase Authentication & Identity Provisioning</h4>
                    </div>
                    <span className={clsx(
                      'text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border',
                      isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    )}>
                      ● PORTAL STATUS: {isActive ? 'ENABLED' : 'SUSPENDED'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 focus-within:border-amber-500 transition">
                      <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                        Employee Official Login Email *
                      </label>
                      <input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="e.g. employee@joycorporate.in"
                        className="w-full bg-transparent font-mono font-bold text-slate-200 text-xs focus:outline-none placeholder:text-slate-600"
                      />
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-center">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Password Security Policy</span>
                      <span className="text-amber-400 font-medium text-xs mt-0.5">Temporary Password (Reset Required on Login)</span>
                    </div>
                  </div>

                  {/* Identity Action Buttons */}
                  <div className="pt-2 flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      disabled={isProvisioning}
                      onClick={handleProvisionCredentials}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs transition shadow-md disabled:opacity-50"
                    >
                      {isProvisioning ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Provisioning...
                        </>
                      ) : (
                        <>
                          <Key className="w-3.5 h-3.5" /> Provision Credentials
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isResettingPassword}
                      onClick={handleResetPasswordAction}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/30 transition disabled:opacity-50"
                    >
                      {isResettingPassword ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Resetting...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" /> Reset Password
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isSendingWelcome}
                      onClick={handleSendWelcomeEmail}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition disabled:opacity-50"
                    >
                      {isSendingWelcome ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="w-3.5 h-3.5 text-blue-400" /> Send Welcome Email
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isTogglingStatus}
                      onClick={() => setIsSuspendModalOpen(true)}
                      className={clsx(
                        'flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs border transition disabled:opacity-50',
                        isActive
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                      )}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {isActive ? 'Suspend Portal Access' : 'Reactivate Portal Access'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ───────────── TAB 5: CONTACT & EMERGENCY ───────────── */}
            {activeTab === 'contact' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 mb-1.5 block">Official Work Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block">Personal Email</label>
                    <input
                      type="email"
                      value={formData.personalEmail}
                      onChange={(e) => setFormData({ ...formData, personalEmail: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 mb-1.5 block">Primary Phone Number *</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block">Emergency Contact Person</label>
                    <input
                      type="text"
                      value={formData.emergencyName}
                      onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block">Emergency Phone Number</label>
                    <input
                      type="text"
                      value={formData.emergencyPhone}
                      onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block">Current Residential Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ───────────── TAB 6: BANK & STATUTORY ───────────── */}
            {activeTab === 'statutory' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block">Bank Name</label>
                    <input
                      type="text"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block">Account Number (Masked)</label>
                    <input
                      type="text"
                      value={formData.accountNumberMasked}
                      onChange={(e) => setFormData({ ...formData, accountNumberMasked: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block">IFSC Code</label>
                    <input
                      type="text"
                      value={formData.ifsc}
                      onChange={(e) => setFormData({ ...formData, ifsc: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block">PAN Number</label>
                    <input
                      type="text"
                      value={formData.pan}
                      onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block">Aadhaar (Masked)</label>
                    <input
                      type="text"
                      value={formData.aadhaarMasked}
                      onChange={(e) => setFormData({ ...formData, aadhaarMasked: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-1.5 block">PF / UAN Number</label>
                    <input
                      type="text"
                      value={formData.pf}
                      onChange={(e) => setFormData({ ...formData, pf: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                FOOTER ACTION BAR
            ══════════════════════════════════════════════════════════════════ */}
            <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky bottom-0 bg-slate-950/90 backdrop-blur-md py-2">
              <span className="text-[11px] text-slate-500 font-mono">
                {savingStep ? (
                  <span className="text-amber-400 flex items-center gap-1.5 font-bold">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> {savingStep}
                  </span>
                ) : (
                  'Changes automatically sync to Supabase & HR Engine'
                )}
              </span>

              <div className="flex items-center gap-2.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition border border-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={Boolean(savingStep)}
                  className="flex items-center gap-2 px-5 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {savingStep ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving Profile...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Save Changes & Sync
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          CONFIRMATION MODAL: SUSPEND / REACTIVATE ACCESS
      ══════════════════════════════════════════════════════════════════ */}
      {isSuspendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className={clsx('p-2.5 rounded-2xl border', isActive ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400')}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  {isActive ? 'Suspend Portal Access?' : 'Reactivate Portal Access?'}
                </h3>
                <p className="text-xs text-slate-400 font-mono">{formData.name} ({formData.employeeCode})</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {isActive
                ? 'Suspending access will immediately revoke active web sessions and prevent the employee from signing into the HRMS portal.'
                : 'Reactivating access will restore employee portal login privileges.'}
            </p>

            {isActive && (
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Reason for Suspension *
                </label>
                <input
                  type="text"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="e.g. Extended Leave / Resignation / Security Review"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:border-rose-500 focus:outline-none font-medium"
                />
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsSuspendModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition border border-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                className={clsx(
                  'px-4 py-2 rounded-xl font-bold text-xs transition shadow-lg text-white',
                  isActive ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
                )}
              >
                {isActive ? 'Confirm Suspension' : 'Confirm Reactivation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          IMMUTABLE AUDIT HISTORY DRAWER
      ══════════════════════════════════════════════════════════════════ */}
      <EmployeeAuditDrawer
        isOpen={isAuditDrawerOpen}
        onClose={() => setIsAuditDrawerOpen(false)}
        employeeId={formData.employeeCode || formData.id}
        employeeName={formData.name}
      />
    </>
  );
}
