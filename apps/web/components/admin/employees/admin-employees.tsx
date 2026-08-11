'use client';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Users,
  Search,
  Download,
  Upload,
  Trash2,
  Eye,
  Edit2,
  Fingerprint,
  RefreshCw,
  Plus,
  X,
  CheckCircle,
  ShieldCheck,
  UserCheck,
  Building,
  Building2,
  Briefcase,
  Mail,
  Phone,
  Clock,
  UserPlus,
  Lock,
  MapPin,
  CreditCard,
  Award,
  FileText,
  Sparkles,
  Sliders,
  Calendar,
  BadgeCheck,
  Activity,
  Check,
  ChevronRight,
  Shield,
  Radio,
  Key,
  ShieldAlert,
} from 'lucide-react';
import {
  supabase,
  fetchEmployeesFromSupabase,
  createEmployeeInSupabase,
  updateEmployeeInSupabase,
  deleteEmployeeFromSupabase,
  generateNextEmployeeCode,
  provisionEmployeePortalAccount,
  resetEmployeePassword,
  toggleEmployeePortalAccess,
} from '../../../lib/supabase';
import { Employee } from '../../../types';
import { clsx } from 'clsx';
import { useDeviceSocket } from '../../../hooks/useDeviceSocket';
import { EmployeeAvatar } from '@/components/common/employee-avatar';
import { EmployeeProfileModal } from './employee-profile-modal';

// Enterprise Dropdown Data Lists for Joy Corporate Solutions Pvt. Ltd.
const COMPANY_NAME = 'Joy Corporate Solutions Pvt. Ltd.';

const BRANCHES = [
  'Coimbatore Head Office',
  'Chennai Regional Office',
  'Bangalore Tech Park',
  'Mumbai Corporate Office',
];

const DIVISIONS = [
  'Technology Division',
  'Corporate Office',
  'Operations Division',
  'Human Resources Division',
  'Finance & Accounts Division',
  'Sales & Marketing Division',
  'Administration Division',
];

const DEPARTMENTS = [
  'Board of Directors',
  'Corporate Office',
  'Administration',
  'Human Resources',
  'Finance & Accounts',
  'Sales',
  'Marketing',
  'Operations',
  'Software Development',
  'UI UX Design',
  'Quality Assurance',
  'Customer Success',
  'Technical Support',
  'DevOps',
  'Infrastructure',
  'Cloud Engineering',
  'Security',
  'Procurement',
  'Legal',
  'Business Development',
  'Projects',
  'Training',
  'Research & Development',
  'Reception',
  'Facilities',
  'IT Support',
];

const TEAMS = [
  'AgencyOS Core Team',
  'Biometrics Engine Team',
  'Mobile Engineering',
  'AI Solutions',
  'Cloud Infrastructure',
  'Enterprise Sales',
  'Corporate Operations',
  'HR & Talent Acquisition',
];

const DESIGNATIONS = [
  'Managing Director (MD)',
  'Executive Assistant',
  'Director – Operations',
  'Director – Technology',
  'Director – Human Resources',
  'Director – Finance',
  'Director – Sales & Marketing',
  'Director – Administration',
  'Engineering Manager',
  'Team Lead',
  'Senior Software Engineer',
  'Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Mobile Developer',
  'UI UX Designer',
  'QA Engineer',
  'DevOps Engineer',
  'Cloud Engineer',
  'AI Engineer',
  'Technical Architect',
  'CTO',
  'HR Manager',
  'HR Executive',
  'HR Business Partner',
  'Talent Acquisition',
  'Finance Manager',
  'Accountant',
  'Accounts Executive',
  'Sales Manager',
  'Business Development Executive',
  'Marketing Executive',
  'Customer Success Lead',
  'Admin Executive',
  'Procurement Specialist',
  'Security Supervisor',
  'Facility Officer',
];

const GRADES = [
  'L1 – Executive',
  'L2 – Senior Executive',
  'L3 – Team Lead',
  'L4 – Manager',
  'L5 – Director / C-Level',
];

const SHIFTS = [
  'General Shift (09:00 AM - 06:00 PM)',
  'Night Shift (09:00 PM - 06:00 AM)',
  'Flexible Shift (08:00 AM - 05:00 PM)',
];

export function AdminEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Permanent Delete Modal State
  const [employeeToDelete, setEmployeeToDelete] = useState<{
    id: string;
    name: string;
    employeeCode: string;
    department?: string;
    avatar?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Credential Provisioning Modal State
  const [credentialModalData, setCredentialModalData] = useState<{
    email: string;
    password?: string;
    employeeId: string;
    employeeName: string;
    actionType: 'PROVISION' | 'RESET';
  } | null>(null);

  const handleProvisionCredentials = async () => {
    if (!editData.email) {
      setFormError('An official email address is required to provision Supabase Auth credentials.');
      return;
    }
    setSaving(true);
    const res = await provisionEmployeePortalAccount(editData.employeeCode, editData.email);
    setSaving(false);
    if (res.success) {
      setCredentialModalData({
        email: res.email,
        password: res.password,
        employeeId: editData.employeeCode,
        employeeName: editData.name,
        actionType: 'PROVISION',
      });
      setAuditNotification(`✓ Provisioned Supabase Auth User for ${res.email} • Temp Password: ${res.password}`);
    } else {
      setFormError(res.message);
    }
  };

  const handleResetPasswordAction = async () => {
    if (!editData.email) return;
    setSaving(true);
    const res = await resetEmployeePassword(editData.employeeCode, editData.email);
    setSaving(false);
    if (res.success) {
      setCredentialModalData({
        email: editData.email,
        password: res.newPassword,
        employeeId: editData.employeeCode,
        employeeName: editData.name,
        actionType: 'RESET',
      });
      setAuditNotification(`✓ Password reset for ${editData.email} • Temp Password: ${res.newPassword}`);
    } else {
      setFormError(res.message);
    }
  };

  const handleTogglePortalAccessAction = async () => {
    const nextStatus = editData.status !== 'Active';
    const res = await toggleEmployeePortalAccess(editData.employeeCode, nextStatus);
    if (res.success) {
      setEditData({ ...editData, status: nextStatus ? 'Active' : 'Inactive' });
      setAuditNotification(`✓ Portal access set to ${nextStatus ? 'ENABLED' : 'SUSPENDED'}`);
    }
  };

  // Form State for Add
  const [formData, setFormData] = useState({
    id: '',
    employeeCode: '',
    name: '',
    department: 'Software Development',
    designation: 'Software Engineer',
    email: '',
    phone: '',
    manager: 'THIRUMALAI R K (MD)',
    shift: 'General Shift (09:00 AM - 06:00 PM)',
    status: 'Active' as 'Active' | 'Inactive',
    avatar: '',
  });

  // Master Enterprise Edit Form State (v2 - Joy Corporate Solutions Pvt. Ltd.)
  const [editTab, setEditTab] = useState<'personal' | 'org' | 'employment' | 'access' | 'contact' | 'statutory'>('personal');
  
  const [editData, setEditData] = useState({
    id: '',
    employeeCode: '',
    name: '',
    displayName: '',
    gender: 'Male',
    dob: '1995-05-15',
    bloodGroup: 'O+',
    status: 'Active',

    // Organization Structure
    company: COMPANY_NAME,
    branch: 'Coimbatore Head Office',
    division: 'Technology Division',
    department: 'Software Development',
    team: 'AgencyOS Core Team',
    designation: 'Senior Software Engineer',
    grade: 'L2 – Senior Executive',
    employmentType: 'Permanent',
    reportingManager: 'THIRUMALAI R K (MD)',
    deptHead: 'THIRUMALAI R K (Director - Technology)',

    // Employment
    joiningDate: '2024-01-15',
    confirmationDate: '2024-07-15',
    shift: 'General Shift (09:00 AM - 06:00 PM)',
    workLocation: 'Coimbatore HQ',
    weeklyOff: 'Saturday & Sunday',

    // Access & Attendance
    attendanceModes: {
      fingerprint: true,
      face: true,
      qr: true,
      gps: true,
      aadhaar: false,
    },
    allowedDevices: 'Mantra MFS110 L1, MBAS40 Terminal',
    defaultTerminal: 'HQ Main Gate',
    lateGraceMinutes: 15,
    overtimePolicy: 'Standard (> 8 Hours Daily)',
    portalAccess: {
      employee: true,
      manager: false,
      admin: false,
    },
    biometricStatus: {
      fingerprint: true,
      face: true,
      qr: true,
    },

    // Contact
    email: '',
    personalEmail: '',
    phone: '',
    emergencyName: '',
    emergencyPhone: '',
    address: '123 Corporate Park Avenue, Coimbatore, Tamil Nadu',

    // Bank & Statutory
    bankName: 'HDFC Bank Ltd',
    accountNumberMasked: 'XXXX-XXXX-4892',
    ifsc: 'HDFC0001234',
    pan: 'ABCDE1234F',
    aadhaarMasked: 'XXXX-XXXX-9012',
    pf: 'CB/CBE/12345/678',
    esi: '31000123456789',

    avatar: '',
  });

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [auditNotification, setAuditNotification] = useState<string | null>(null);

  // Live Hardware Biometric Enrollment State
  const { enrollmentStatus } = useDeviceSocket();
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollEmp, setEnrollEmp] = useState<Employee | null>(null);
  const [selectedFinger, setSelectedFinger] = useState<number>(0);
  const [enrollStatus, setEnrollStatus] = useState<'idle' | 'starting' | 'waiting' | 'success' | 'error'>('idle');
  const [enrollMsg, setEnrollMsg] = useState('');

  // Real-time socket event listener from hardware connector
  useEffect(() => {
    if (!enrollmentStatus || !enrollModalOpen) return;
    const st = String(enrollmentStatus.status || '').toLowerCase();
    
    if (st.includes('saved') || st.includes('success')) {
      setEnrollStatus('success');
      setEnrollMsg(`✅ Fingerprint template for ${enrollEmp?.name || 'employee'} successfully enrolled & saved to Identix K90 Pro terminal memory!`);
      toast.success(`🎉 Fingerprint enrolled for ${enrollEmp?.name}!`);
      load(); // Refresh table so FP status icon turns green
    } else if (st.includes('waiting') || st.includes('place finger')) {
      setEnrollStatus('waiting');
      setEnrollMsg(enrollmentStatus.status);
    } else if (st.includes('failed') || st.includes('timeout') || st.includes('error')) {
      setEnrollStatus('error');
      setEnrollMsg(`❌ ${enrollmentStatus.status}`);
    }
  }, [enrollmentStatus, enrollModalOpen]);

  const handleStartHardwareEnrollment = async (overrideEmp?: any, overrideFinger?: number) => {
    const emp = overrideEmp || enrollEmp;
    const fingerIdx = overrideFinger !== undefined ? overrideFinger : selectedFinger;
    if (!emp) return;

    setEnrollStatus('starting');
    setEnrollMsg('Connecting to Identix K90 Pro Terminal (192.168.1.56:4370)...');

    const code = emp.employeeCode || emp.id;
    const numericUid = parseInt(String(code).replace(/\D/g, ''), 10) || 10;

    try {
      // Use same-origin Next.js server route (eliminates Mixed-Content / CORS blocks in production Vercel)
      const res = await fetch('/api/admin/device/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: '192.168.1.56',
          port: 4370,
          uid: numericUid,
          userId: code,
          userName: emp.name,
          fingerIndex: fingerIdx,
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch (_) {}

      if (!res.ok || data.status === 'error') {
        throw new Error(
          data.error ||
          (res.status === 400
            ? 'Terminal hardware unreachable (192.168.1.56:4370). Ensure device connector service is running and terminal is connected to LAN.'
            : 'Enrollment request failed (Status ' + res.status + ')')
        );
      }

      setEnrollStatus('waiting');
      setEnrollMsg(data.message || '👉 Place ' + emp.name + '\'s finger on the hardware scanner terminal now! (3 scans on Identix K90 Pro)');

      // Update Supabase to mark fingerprint_enrolled = true
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(code));
        const q = supabase
          .from('employees')
          .update({ fingerprint_enrolled: true, is_enrolled: true, status: 'Active' });
        if (isUuid) {
          await q.or(`id.eq.${code},employee_code.eq.${code}`);
        } else {
          await q.eq('employee_code', code);
        }
      } catch (_) {}

    } catch (err: any) {
      setEnrollStatus('error');
      setEnrollMsg(err.message || 'Could not communicate with hardware device over TCP socket.');
    }
  };

  const openEnrollModal = (emp: any) => {
    setEnrollEmp(emp);
    setSelectedFinger(0);
    setEnrollStatus('idle');
    setEnrollMsg('');
    setEnrollModalOpen(true);
    // Auto-trigger hardware TCP enrollment command immediately on modal open!
    handleStartHardwareEnrollment(emp, 0);
  };

  const handleOpenEnrollModal = openEnrollModal;

  const handleSelectFinger = (fingerIdx: number) => {
    setSelectedFinger(fingerIdx);
    if (enrollEmp) {
      handleStartHardwareEnrollment(enrollEmp, fingerIdx);
    }
  };

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    const data = await fetchEmployeesFromSupabase();
    setEmployees(data);
    if (!silent) setLoading(false);
  };

  useEffect(() => {
    load(false);

    const empChannel = supabase
      .channel('admin-employees-realtime-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => {
        load(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(empChannel);
    };
  }, []);

  const openAddModal = async () => {
    const { employeeCode } = await generateNextEmployeeCode();
    setFormData({
      id: employeeCode,
      employeeCode: employeeCode,
      name: '',
      department: 'Software Development',
      designation: 'Software Engineer',
      email: '',
      phone: '',
      manager: 'THIRUMALAI R K (MD)',
      shift: 'General Shift (09:00 AM - 06:00 PM)',
      status: 'Active',
      avatar: `https://ui-avatars.com/api/?name=New+Employee&background=0ea5e9&color=fff&size=200&bold=true`,
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setSelectedEmployee(emp);
    setEditTab('personal');
    setEditData({
      id: emp.id,
      employeeCode: emp.employeeCode || emp.id,
      name: emp.name,
      displayName: emp.name.split(' ')[0],
      gender: 'Male',
      dob: '1995-05-15',
      bloodGroup: 'O+',
      status: emp.status || 'Active',

      company: COMPANY_NAME,
      branch: 'Coimbatore Head Office',
      division: 'Technology Division',
      department: emp.department || 'Software Development',
      team: 'AgencyOS Core Team',
      designation: emp.designation || 'Senior Software Engineer',
      grade: 'L2 – Senior Executive',
      employmentType: 'Permanent',
      reportingManager: emp.manager || 'THIRUMALAI R K (MD)',
      deptHead: 'THIRUMALAI R K (Director - Technology)',

      joiningDate: '2024-01-15',
      confirmationDate: '2024-07-15',
      shift: emp.shift || 'General Shift (09:00 AM - 06:00 PM)',
      workLocation: 'Coimbatore HQ',
      weeklyOff: 'Saturday & Sunday',

      attendanceModes: {
        fingerprint: true,
        face: true,
        qr: true,
        gps: true,
        aadhaar: false,
      },
      allowedDevices: 'Mantra MFS110 L1, MBAS40 Terminal',
      defaultTerminal: 'HQ Main Gate',
      lateGraceMinutes: 15,
      overtimePolicy: 'Standard (> 8 Hours Daily)',
      portalAccess: {
        employee: true,
        manager: false,
        admin: false,
      },
      biometricStatus: {
        fingerprint: emp.biometricStatus?.fingerprint ?? true,
        face: emp.biometricStatus?.face ?? true,
        qr: emp.biometricStatus?.qr ?? true,
      },

      email: emp.email || `${emp.name.toLowerCase().replace(/\s+/g, '')}@agencyos.ai`,
      personalEmail: `${emp.name.toLowerCase().replace(/\s+/g, '')}.personal@gmail.com`,
      phone: emp.phone || '+91 98765 43210',
      emergencyName: 'R. Kumar (Father)',
      emergencyPhone: '+91 98765 00000',
      address: '123 Corporate Park Avenue, Coimbatore, Tamil Nadu, 641001',

      bankName: 'HDFC Bank Ltd',
      accountNumberMasked: 'XXXX-XXXX-4892',
      ifsc: 'HDFC0001234',
      pan: 'ABCDE1234F',
      aadhaarMasked: 'XXXX-XXXX-9012',
      pf: 'CB/CBE/12345/678',
      esi: '31000123456789',

      avatar: emp.avatar || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const openViewModal = (emp: Employee) => {
    setSelectedEmployee(emp);
    setIsViewModalOpen(true);
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Employee name is required.');
      return;
    }
    setSaving(true);
    setFormError(null);

    const newEmp: Employee = {
      id: formData.employeeCode,
      employeeCode: formData.employeeCode,
      name: formData.name,
      fullName: formData.name,
      avatar: formData.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      designation: formData.designation,
      department: formData.department,
      email: formData.email,
      phone: formData.phone,
      manager: formData.manager,
      employmentStatus: 'Full Time',
      shift: formData.shift,
      status: formData.status,
      attendanceScore: 98,
      productivityScore: 95,
      currentStreak: 12,
      avgArrival: '09:00 AM',
      avgExit: '06:00 PM',
      biometricStatus: { fingerprint: true, face: true, aadhaar: false, qr: true, gps: true },
    };

    setEmployees((prev) => [newEmp, ...prev]);
    setIsAddModalOpen(false);

    const res = await createEmployeeInSupabase(newEmp);
    setSaving(false);

    if (res.success) {
      load(true);
    } else {
      setFormError(res.error || 'Failed to create employee in Supabase DB.');
      setEmployees((prev) => prev.filter((e) => e.id !== newEmp.id && e.employeeCode !== newEmp.employeeCode));
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    if (!editData.name.trim()) {
      setFormError('Employee Full Name is required.');
      return;
    }
    setSaving(true);
    setFormError(null);

    const updatedEmp: Employee = {
      ...selectedEmployee,
      name: editData.name,
      designation: editData.designation,
      department: editData.department,
      email: editData.email,
      phone: editData.phone,
      manager: editData.reportingManager,
      shift: editData.shift,
      status: editData.status as 'Active' | 'Inactive',
      avatar: editData.avatar || selectedEmployee.avatar,
    };

    // Instant local optimistic state update (Zero latency!)
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === updatedEmp.id || emp.employeeCode === updatedEmp.employeeCode ? updatedEmp : emp
      )
    );

    await updateEmployeeInSupabase(updatedEmp);
    setSaving(false);
    setIsEditModalOpen(false);

    // Show Audit Broadcast Toast
    setAuditNotification(`✓ Edited By THIRUMALAI R K • Designation: ${editData.designation} • Realtime Broadcast Completed`);
    setTimeout(() => setAuditNotification(null), 4000);

    load(true);
  };

  const confirmDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteEmployeeFromSupabase(
        employeeToDelete.id,
        employeeToDelete.name,
        employeeToDelete.employeeCode
      );
      if (res.success) {
        toast.success(res.message || `Deleted ${employeeToDelete.name} from Cloud DB & Biometric Device!`);
        setEmployees((prev) =>
          prev.filter((e) => e.id !== employeeToDelete.id && e.employeeCode !== employeeToDelete.employeeCode)
        );
        setAuditNotification(`✓ Permanently Deleted ${employeeToDelete.name} (${employeeToDelete.employeeCode}) from DB & Hardware Device (192.168.1.56)`);
        setTimeout(() => setAuditNotification(null), 5000);
        setEmployeeToDelete(null);
        load(true);
      } else {
        toast.error(res.message || 'Failed to delete employee');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error deleting employee');
    } finally {
      setIsDeleting(false);
    }
  };

  const exportEmployeesCSV = () => {
    const headers = ['Employee Code', 'Name', 'Company', 'Department', 'Designation', 'Email', 'Phone', 'Shift', 'Status'];
    const rows = employees.map((e) => [
      e.employeeCode || e.id,
      `"${e.name}"`,
      `"${COMPANY_NAME}"`,
      `"${e.department}"`,
      `"${e.designation}"`,
      e.email,
      e.phone,
      `"${e.shift}"`,
      e.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Joy_Corporate_Employees_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      e.name?.toLowerCase().includes(q) ||
      e.department?.toLowerCase().includes(q) ||
      e.id?.toLowerCase().includes(q) ||
      e.employeeCode?.toLowerCase().includes(q);
    const matchFilter = filter === 'all' || (filter === 'active' ? e.status === 'Active' : e.status !== 'Active');
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-10">

      {/* Audit Notification Toast */}
      {auditNotification && (
        <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-2xl animate-in slide-in-from-top duration-200">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{auditNotification}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-violet-500/15 text-violet-300 border border-violet-500/30">
              {COMPANY_NAME}
            </span>
            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Realtime HR Engine
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2 mt-1">
            <Users className="w-6 h-6 text-violet-400" /> Enterprise Employee Management
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {employees.length} Active Employees • Joy Corporate Solutions Pvt. Ltd. Hierarchy
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              if (employees.length > 0) {
                openEditModal(employees[0]);
                setEditTab('access');
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30 transition shadow-lg"
            title="Manage Supabase Auth Credentials & Portal Access"
          >
            <Key className="w-4 h-4 text-amber-400" /> Auth & Portal Provisioning
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-lg transition"
          >
            <UserPlus className="w-4 h-4" /> Add Employee
          </button>
          <button
            onClick={() => load()}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition border border-slate-700"
            title="Refresh from Supabase DB"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={exportEmployeesCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition border border-slate-700"
          >
            <Download className="w-3.5 h-3.5" /> Export Directory
          </button>
        </div>
      </div>

      {/* Search & Status Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by employee name, code, department, designation..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 transition"
          />
        </div>
        {(['all', 'active', 'inactive'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              'px-3.5 py-2 rounded-xl text-xs font-semibold transition border capitalize',
              filter === f
                ? 'bg-violet-600/20 text-violet-300 border-violet-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
            )}
          >
            {f} ({f === 'all' ? employees.length : employees.filter((e) => (f === 'active' ? (e.status || 'Active').toLowerCase() === 'active' : (e.status || 'Active').toLowerCase() !== 'active')).length})
          </button>
        ))}
      </div>

      {/* Employee List Table */}
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 overflow-x-auto no-scrollbar scrollbar-none shadow-xl">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800/60 bg-slate-950/50">
              {['Employee', 'ID', 'Department', 'Designation', 'Shift', 'Biometrics', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-slate-800/60 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-500 font-medium">
                  No employee records match your query.
                </td>
              </tr>
            ) : (
              filtered.map((emp) => (
                <tr key={emp.id} className="border-b border-slate-800/30 hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <EmployeeAvatar
                        name={emp.name}
                        avatarUrl={emp.avatar}
                        employeeId={emp.employeeCode || emp.id}
                        size="sm"
                      />
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-100">{emp.name}</span>
                        <span className="text-[10px] text-slate-500">{emp.email || `${(emp.employeeCode || emp.id).toLowerCase()}@agencyos.ai`}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-400 font-semibold">{emp.employeeCode || emp.id}</td>
                  <td className="px-4 py-3 text-slate-300 font-medium">{emp.department || 'Software Development'}</td>
                  <td className="px-4 py-3 text-slate-400">{emp.designation || 'Software Engineer'}</td>
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{emp.shift || 'General Shift'}</td>
                  <td className="px-4 py-3">
                    {(() => {
                      const isFp = emp.biometricStatus?.fingerprint === true;
                      const isFace = emp.biometricStatus?.face === true;
                      const isCard = emp.biometricStatus?.card === true;
                      const isQr = emp.biometricStatus?.qr === true;
                      const enrolled = emp.isEnrolled || emp.biometricStatus?.isEnrolled || isFp || isFace || isCard;

                      return (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              title={isFp ? 'Fingerprint Enrolled' : 'Fingerprint Not Enrolled'}
                              className={clsx(
                                'w-5 h-5 rounded flex items-center justify-center',
                                isFp ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-600'
                              )}
                            >
                              <Fingerprint className="w-3 h-3" />
                            </span>
                            <span
                              title={isFace ? 'Face Enrolled' : 'Face Not Enrolled'}
                              className={clsx(
                                'w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold',
                                isFace ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-600'
                              )}
                            >
                              F
                            </span>
                            <span
                              title={isCard ? 'RFID Card Enrolled' : 'RFID Card Not Enrolled'}
                              className={clsx(
                                'w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold',
                                isCard ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-600'
                              )}
                            >
                              C
                            </span>
                            <span
                              title={isQr ? 'QR Enabled' : 'QR Disabled'}
                              className={clsx(
                                'w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold',
                                isQr ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-600'
                              )}
                            >
                              Q
                            </span>
                          </div>
                          <span
                            className={clsx(
                              'text-[9px] font-extrabold px-1.5 py-0.5 rounded w-fit uppercase tracking-wider border',
                              enrolled
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            )}
                          >
                            {enrolled ? '✓ Enrolled' : '⏳ Unenrolled'}
                          </span>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        'px-2.5 py-0.5 rounded-full text-[10px] font-bold border',
                        (emp.status || 'Active').toLowerCase() === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      )}
                    >
                      {emp.status || 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEnrollModal(emp)}
                        className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 hover:text-indigo-200 transition border border-indigo-500/30 flex items-center gap-1 text-[11px] font-semibold"
                        title="Enroll Fingerprint on Physical Hardware Scanner (Identix K90 Pro)"
                      >
                        <Fingerprint className="w-3.5 h-3.5" />
                        <span>Enroll</span>
                      </button>
                      <button
                        onClick={() => openViewModal(emp)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-600/20 text-slate-400 hover:text-blue-400 transition border border-slate-700"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openEditModal(emp)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-600/20 text-slate-400 hover:text-amber-400 transition border border-slate-700"
                        title="Edit Employee (Enterprise Profile Editor)"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          openEditModal(emp);
                          setEditTab('access');
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-violet-600/20 text-slate-400 hover:text-violet-400 transition border border-slate-700"
                        title="Provision Supabase Auth Credentials & Portal Access"
                      >
                        <Key className="w-3.5 h-3.5 text-amber-400" />
                      </button>
                      <button
                        onClick={() =>
                          setEmployeeToDelete({
                            id: emp.id,
                            name: emp.name,
                            employeeCode: emp.employeeCode || emp.id,
                            department: emp.department,
                            avatar: emp.avatar,
                          })
                        }
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600/20 text-slate-400 hover:text-rose-400 transition border border-slate-700"
                        title="Permanently Delete Employee from Cloud Database & Hardware Machine"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL 1: ADD EMPLOYEE
      ════════════════════════════════════════════════════════════════════════ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/80">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5 text-violet-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Add New Employee</h3>
                  <p className="text-[10px] text-slate-400">{COMPANY_NAME}</p>
                </div>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Employee Code / ID</label>
                  <input
                    type="text"
                    value={formData.employeeCode}
                    onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:border-violet-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Full Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g. Dharun DB"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-violet-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-violet-500 focus:outline-none"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Designation</label>
                  <select
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-violet-500 focus:outline-none"
                  >
                    {DESIGNATIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Work Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@agencyos.ai"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-violet-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-violet-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Shift</label>
                  <select
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-violet-500 focus:outline-none"
                  >
                    {SHIFTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Account Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-violet-500 focus:outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition shadow-lg disabled:opacity-50"
                >
                  {saving ? 'Saving to Supabase...' : 'Save Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL 2: MASTER ENTERPRISE EDIT EMPLOYEE PROFILE EDITOR & IDENTITY PROVISIONING
      ════════════════════════════════════════════════════════════════════════ */}
      <EmployeeProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        employee={selectedEmployee}
        initialTab={editTab}
        onSaveSuccess={() => load(true)}
      />

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL 3: VIEW PROFILE
      ════════════════════════════════════════════════════════════════════════ */}
      {isViewModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 bg-slate-950/70 border-b border-slate-800 flex flex-col items-center text-center relative">
              <button onClick={() => setIsViewModalOpen(false)} className="absolute right-4 top-4 p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
              <EmployeeAvatar
                name={selectedEmployee.name}
                avatarUrl={selectedEmployee.avatar}
                employeeId={selectedEmployee.employeeCode || selectedEmployee.id}
                size="xl"
                className="mb-3"
              />
              <h3 className="text-lg font-bold text-white">{selectedEmployee.name}</h3>
              <p className="text-xs text-violet-400 font-semibold mt-0.5">{selectedEmployee.designation}</p>
              <span className="mt-2 px-3 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-300 border border-violet-500/20 font-mono">
                {selectedEmployee.employeeCode || selectedEmployee.id}
              </span>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Company</span>
                  <span className="text-amber-400 font-semibold text-[11px] truncate block">{COMPANY_NAME}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Status</span>
                  <span className="text-emerald-400 font-bold">{selectedEmployee.status || 'Active'}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-2 text-slate-400"><Mail className="w-3.5 h-3.5" /> Email:</span>
                  <span className="font-mono text-slate-200">{selectedEmployee.email || '—'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-2 text-slate-400"><Phone className="w-3.5 h-3.5" /> Phone:</span>
                  <span className="font-mono text-slate-200">{selectedEmployee.phone || '—'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-2 text-slate-400"><Clock className="w-3.5 h-3.5" /> Shift:</span>
                  <span className="text-slate-200">{selectedEmployee.shift}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold block mb-2">Biometric Enrollment Status</span>
                <div className="grid grid-cols-3 gap-2">
                  <div className={clsx('p-2 rounded-xl border text-center font-bold text-[10px]', selectedEmployee.biometricStatus?.fingerprint !== false ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-900 text-slate-600 border-slate-800')}>
                    Fingerprint
                  </div>
                  <div className={clsx('p-2 rounded-xl border text-center font-bold text-[10px]', selectedEmployee.biometricStatus?.face !== false ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-900 text-slate-600 border-slate-800')}>
                    Face
                  </div>
                  <div className={clsx('p-2 rounded-xl border text-center font-bold text-[10px]', selectedEmployee.biometricStatus?.qr !== false ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-900 text-slate-600 border-slate-800')}>
                    QR
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL 4: ENTERPRISE CREDENTIAL CARD POPUP (PROVISION / RESET)
      ════════════════════════════════════════════════════════════════════════ */}
      {credentialModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-2xl animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-950 border border-violet-500/40 rounded-[32px] shadow-2xl overflow-hidden flex flex-col p-6 space-y-5 animate-in zoom-in-95 duration-200 relative">
            <button
              onClick={() => setCredentialModalData(null)}
              className="absolute right-4 top-4 p-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition border border-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
                <Key className="w-6 h-6" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-mono font-bold text-violet-400 uppercase tracking-widest">
                  {COMPANY_NAME} • IDENTITY PROVISIONED
                </span>
                <h3 className="text-lg font-black text-white">
                  {credentialModalData.actionType === 'PROVISION' ? 'Portal Credentials Generated' : 'Password Reset Successful'}
                </h3>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 uppercase text-[10px] font-bold">Portal Access URL:</span>
                <span className="text-emerald-400 font-bold">http://localhost:3000/portal</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 uppercase text-[10px] font-bold">Employee Name & ID:</span>
                <span className="text-white font-bold">{credentialModalData.employeeName} ({credentialModalData.employeeId})</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 uppercase text-[10px] font-bold">Official Login Email:</span>
                <span className="text-amber-400 font-bold">{credentialModalData.email}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/30">
                <span className="text-violet-300 uppercase text-[10px] font-bold">Temporary Password:</span>
                <span className="text-violet-300 font-black text-sm tracking-wider">{credentialModalData.password}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Employee must change this temporary password upon first login to access their dashboard.</span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`Employee Portal: http://localhost:3000/portal\nEmail: ${credentialModalData.email}\nTemporary Password: ${credentialModalData.password}\nEmployee ID: ${credentialModalData.employeeId}`);
                  setAuditNotification('✓ Copied credentials to clipboard!');
                }}
                className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-slate-800 transition"
              >
                Copy Credential Card
              </button>
              <button
                onClick={() => setCredentialModalData(null)}
                className="px-5 py-2.5 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-black text-xs shadow-lg transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL 4: HARDWARE BIOMETRIC FINGERPRINT ENROLLMENT (TCP/IP)
         ════════════════════════════════════════════════════════════════════════ */}
      {enrollModalOpen && enrollEmp && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl border border-indigo-500/30 bg-slate-900 shadow-2xl p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Fingerprint className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Live Hardware Fingerprint Enrollment</h3>
                  <p className="text-xs text-slate-400">Identix K90 Pro Terminal • TCP Port 4370</p>
                </div>
              </div>
              <button
                onClick={() => setEnrollModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-5 space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300 font-bold text-lg">
                  {enrollEmp.name[0]}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{enrollEmp.name}</h4>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 font-mono">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-bold">{enrollEmp.employeeCode || enrollEmp.id}</span>
                    <span>• {enrollEmp.department || 'Software Development'}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Select Finger Position</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { idx: 0, label: 'Right Thumb' },
                    { idx: 1, label: 'Right Index' },
                    { idx: 5, label: 'Left Thumb' },
                    { idx: 6, label: 'Left Index' },
                  ].map((f) => (
                    <button
                      key={f.idx}
                      onClick={() => handleSelectFinger(f.idx)}
                      className={clsx(
                        'px-3 py-2 rounded-xl text-xs font-semibold border transition text-left flex items-center justify-between',
                        selectedFinger === f.idx
                          ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50 shadow-md shadow-indigo-500/10'
                          : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:border-slate-700'
                      )}
                    >
                      <span>{f.label}</span>
                      {selectedFinger === f.idx && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </button>
                  ))}
                </div>
              </div>

              {enrollMsg && (
                <div className={clsx(
                  'p-3.5 rounded-2xl text-xs font-mono leading-relaxed border',
                  enrollStatus === 'starting' && 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300',
                  enrollStatus === 'waiting' && 'bg-amber-950/40 border-amber-500/30 text-amber-300 animate-pulse',
                  enrollStatus === 'success' && 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300',
                  enrollStatus === 'error' && 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                )}>
                  {enrollMsg}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setEnrollModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs border border-slate-700 hover:bg-slate-700 transition"
              >
                Close
              </button>
              {enrollStatus === 'success' ? (
                <button
                  onClick={() => {
                    load();
                    setEnrollModalOpen(false);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition flex items-center gap-2 animate-in zoom-in-95 duration-150"
                >
                  <Check className="w-4 h-4" />
                  <span>Save & Close</span>
                </button>
              ) : (
                <button
                  onClick={handleStartHardwareEnrollment}
                  disabled={enrollStatus === 'starting'}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
                >
                  <Fingerprint className="w-4 h-4" />
                  <span>
                    {enrollStatus === 'starting'
                      ? 'Triggering Hardware...'
                      : enrollStatus === 'waiting'
                      ? 'Resend Command'
                      : 'Start Scanner Enrollment'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL 5: ENTERPRISE PERMANENT DELETE & MACHINE PURGE CONFIRMATION
      ════════════════════════════════════════════════════════════════════════ */}
      {employeeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-950 border border-rose-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 bg-gradient-to-b from-rose-950/40 via-slate-950 to-slate-950 border-b border-rose-500/20 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 shadow-lg shadow-rose-500/10">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20 uppercase tracking-wider">
                    Super Admin Action Required
                  </span>
                </div>
                <h3 className="text-lg font-black text-white tracking-tight mt-1">
                  Permanently Delete Employee & Purge Hardware
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  This action is irreversible and permanently purges records from all databases and the physical biometric machine.
                </p>
              </div>
            </div>

            {/* Target Employee Summary Card */}
            <div className="p-6 space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <EmployeeAvatar
                    name={employeeToDelete.name}
                    avatarUrl={employeeToDelete.avatar}
                    employeeId={employeeToDelete.employeeCode}
                    size="md"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-white">{employeeToDelete.name}</h4>
                    <p className="text-xs text-slate-400">{employeeToDelete.department || 'Department'}</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-700 font-mono text-xs font-bold text-amber-400">
                  {employeeToDelete.employeeCode}
                </span>
              </div>

              {/* What will be purged checklist */}
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2.5">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                  Systems Purge Execution Checklist
                </span>
                
                <div className="flex items-start gap-2.5 text-xs text-slate-300">
                  <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">✓</span>
                  <span><strong>Supabase Cloud Database:</strong> Permanent deletion of employee profile, roles, portal records, and template references.</span>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-slate-300">
                  <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">✓</span>
                  <span><strong>Supabase Auth Identity:</strong> Deletion of login user account, credentials, and revocation of all portal tokens.</span>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-slate-300">
                  <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">✓</span>
                  <span><strong>Physical Biometric Machine (192.168.1.56):</strong> Sends hardware TCP command to completely delete user pin & all enrolled fingerprint biometric templates from hardware chip memory.</span>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-slate-300">
                  <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">✓</span>
                  <span><strong>Immutable Audit Log:</strong> Logs permanent purge action in security audit trail under THIRUMALAI R K.</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 pt-0 flex items-center justify-end gap-3 border-t border-slate-800/80 mt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setEmployeeToDelete(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-slate-800 transition disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteEmployee}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 transition flex items-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Purging from Database & Hardware...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Permanent Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>

  );
}
