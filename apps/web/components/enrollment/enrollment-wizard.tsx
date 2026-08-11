'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Users,
  ScanFace,
  Fingerprint,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  ShieldCheck,
  QrCode,
  UserCheck,
  Camera,
  Upload,
  Check,
  Smartphone,
  Radio,
  Cpu,
  FileCheck,
  Zap,
  RefreshCw,
  Server,
  Database,
  Lock,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { resetMantraScanner } from '../../lib/biometrics/mantra-rd';
import { useDeviceSocket } from '../../hooks/useDeviceSocket';
import { enrollFingerprintMXFace } from '../../lib/biometrics/mxface-api';
import {
  createEmployeeInSupabase,
  uploadEmployeeAvatarToSupabase,
  generateNextEmployeeCode,
  createEnrollmentSessionInDb,
  checkDuplicateFingerprintInDb,
  saveFingerprintTemplateInDb,
  enqueueDeviceCommand,
} from '../../lib/supabase';
import {
  registerEnrolledFingerprint,
  searchDuplicateFingerprint,
  clearFingerprintCache,
} from '../../lib/biometrics/fingerprint-store';
import { playSuccessChime } from '../../lib/audio';
import { compressImage, CompressionResult } from '../../lib/image-compressor';
import { Employee, FingerprintTemplate } from '../../types';
import { logger } from '../../lib/logger';

interface EnrollmentWizardProps {
  onEmployeeEnrolled?: (employee: Employee) => void;
}

export function EnrollmentWizard({ onEmployeeEnrolled }: EnrollmentWizardProps) {
  const [step, setStep] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Enterprise Transaction Identifiers
  const [employeeUuid, setEmployeeUuid] = useState<string>('');
  const [employeeCode, setEmployeeCode] = useState<string>('EMP-000234');
  const [sessionUuid, setSessionUuid] = useState<string>('');
  const [companyId] = useState<string>('COMP-001');

  const [compressionBadge, setCompressionBadge] = useState<CompressionResult | null>(null);

  // Form Details
  const [formData, setFormData] = useState({
    photo: '',
    name: '',
    designation: '',
    department: '',
    branch: 'Global HQ - Floor 5',
    email: '',
    phone: '',
    manager: '',
    joiningDate: new Date().toISOString().split('T')[0],
    shift: '09:00 AM - 06:00 PM',
  });

  const [authMethods, setAuthMethods] = useState({
    fingerprint: true,
    face: true,
    aadhaar: true,
    qr: false,
    mobile: false,
    rfid: false,
  });

  // Multi-Finger States across 6 positions
  const [fingerProgress, setFingerProgress] = useState<Record<string, { status: string; quality: number; template?: string; message?: string }>>({
    rightThumb: { status: 'idle', quality: 0 },
    rightIndex: { status: 'idle', quality: 0 },
    leftThumb: { status: 'idle', quality: 0 },
    leftIndex: { status: 'idle', quality: 0 },
    rightMiddle: { status: 'idle', quality: 0 },
    leftMiddle: { status: 'idle', quality: 0 },
  });

  // Duplicate Fingerprint Modal State
  const [duplicateModal, setDuplicateModal] = useState<{
    isOpen: boolean;
    fingerName?: string;
    matchedEmployeeName?: string;
    matchedEmployeeCode?: string;
    registeredOn?: string;
  }>({ isOpen: false });

  const [lastCapturedTemplate, setLastCapturedTemplate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');

  const { socket, isConnected, enrollmentStatus } = useDeviceSocket();
  const [deviceIp, setDeviceIp] = useState('192.168.1.56');
  const [activeFingerKey, setActiveFingerKey] = useState<string | null>(null);

  useEffect(() => {
    if (!enrollmentStatus || !activeFingerKey) return;
    
    // Filter by userId only if present AND numeric part doesn't match this employee
    // (prevents strict string mismatch like "EMP-154" vs "EMP-000154" blocking all messages)
    if (enrollmentStatus.userId) {
      const evtNum = parseInt(String(enrollmentStatus.userId).replace(/\D/g, ''), 10);
      const myNum  = parseInt(String(employeeCode).replace(/\D/g, ''), 10);
      if (!isNaN(evtNum) && !isNaN(myNum) && evtNum !== myNum) return;
    }

    const status: string = enrollmentStatus.status || '';
    const stLower = status.toLowerCase();

    if (stLower.includes('saved') || stLower.includes('success')) {
      // Real finger captured and saved on device
      playSuccessChime();
      setFingerProgress((prev) => ({
        ...prev,
        [activeFingerKey]: { status: 'saved', quality: 98, template: 'ZKTeco-Template', message: 'Completed ✓' }
      }));
      setActiveFingerKey(null);
    } else if (
      stLower.includes('fail') ||
      stLower.includes('reject') ||
      stLower.includes('error') ||
      stLower.includes('timeout')
    ) {
      // Device rejected or error — reset so user can retry
      setFingerProgress((prev) => ({
        ...prev,
        [activeFingerKey]: { status: 'idle', quality: 0, message: `⚠ ${status}` }
      }));
      setActiveFingerKey(null);
    } else {
      // Progress: "Place finger on device terminal", "Waiting for scan...", etc.
      setFingerProgress((prev) => ({
        ...prev,
        [activeFingerKey]: { ...prev[activeFingerKey], status: 'scanning', message: status }
      }));
    }
  }, [enrollmentStatus]);

  // Generate backend Employee Code & UUID on Mount / Initial load
  useEffect(() => {
    generateNextEmployeeCode().then(({ employeeCode: code, employeeUuid: uuid }) => {
      setEmployeeCode(code);
      setEmployeeUuid(uuid);
    });
  }, []);

  // Initialize Session & Reset Scanner RAM Cache when entering Step 3 (Biometric Enrollment)
  useEffect(() => {
    if (step === 3) {
      // 1. Reset SDK Scanner Hardware & Flush Memory
      resetMantraScanner();
      clearFingerprintCache();
      logger.enroll.scannerReset();

      // 2. Create Enrollment Session
      createEnrollmentSessionInDb(employeeUuid, employeeCode).then((sUuid) => {
        setSessionUuid(sUuid || `ES_${Date.now()}`);
        logger.enroll.sessionStarted(sUuid || `ES_${Date.now()}`, employeeCode);
      });
    }
  }, [step, employeeUuid, employeeCode]);

  // Handle Photo File Select & WebP Compression (<40KB)
  const handlePhotoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const compressed = await compressImage(file, 400, 400, 0.85);
        setCompressionBadge(compressed);
        setFormData((prev) => ({ ...prev, photo: compressed.base64 }));
      } catch (err) {
        console.error('Image compression failed:', err);
      }
    }
  };

  // Multi-Finger Session Scanning — Correct Flow:
  // 1. setUser() on device (UID + EmpCode + Name + Privilege)
  // 2. startEnrollment() on device
  // 3. Connector polls until template saved
  const FINGER_INDEX_MAP: Record<string, number> = {
    rightThumb: 0,
    rightIndex: 1,
    leftThumb: 5,
    leftIndex: 6,
    rightMiddle: 2,
    leftMiddle: 7,
  };

  const scanFingerPosition = async (
    fingerKey: 'rightThumb' | 'rightIndex' | 'leftThumb' | 'leftIndex' | 'rightMiddle' | 'leftMiddle',
    fingerLabel: string
  ) => {
    setActiveFingerKey(fingerKey);
    setFingerProgress((prev) => ({
      ...prev,
      [fingerKey]: { status: 'scanning', quality: 0, message: 'Sending to device...' },
    }));

    // Derive a reliable numeric UID from the employee code sequence number
    // e.g. "EMP-987230" → 987230, capped at 65535 (ZKTeco max UID)
    const numericUid = Math.abs(parseInt(employeeCode.replace(/\D/g, ''), 10) % 65535) || 1;
    const fingerIndex = FINGER_INDEX_MAP[fingerKey] ?? 0;

    try {
      const res = await fetch('/api/admin/device/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: deviceIp || '192.168.1.56',
          port: 4370,
          uid: numericUid,          // numeric device UID
          userId: employeeCode,     // employee code stored as device UserID
          userName: formData.name,  // shown on device display
          fingerIndex,              // which finger slot (0=right thumb, etc.)
          privilege: 0,             // 0=User, 14=Admin
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Enrollment request failed');
      }
    } catch (err: any) {
      setFingerProgress((prev) => ({
        ...prev,
        [fingerKey]: { status: 'idle', quality: 0, message: `⚠ ${err?.message || 'Failed to start enrollment'}` },
      }));
      setActiveFingerKey(null);
      return;
    }
  };

  // Transactional Finish Handler: Create Employee -> Save Biometrics -> Sync Device -> Verify
  const handleFinishWizard = async () => {
    setIsSubmitting(true);

    // Upload compressed avatar to Supabase CDN Storage bucket
    const cdnAvatarUrl = await uploadEmployeeAvatarToSupabase(formData.photo, employeeCode);

    const newEmp: Employee = {
      id: employeeCode,
      employeeUuid,
      employeeCode,
      companyId,
      name: formData.name,
      fullName: formData.name,
      avatar: cdnAvatarUrl,
      designation: formData.designation,
      department: formData.department,
      email: formData.email,
      phone: formData.phone,
      manager: formData.manager,
      employmentStatus: 'Full Time',
      status: 'Active',
      shift: formData.shift,
      attendanceScore: 100,
      productivityScore: 98,
      currentStreak: 1,
      avgArrival: '09:01 AM',
      avgExit: '06:00 PM',
      biometricStatus: {
        fingerprint: authMethods.fingerprint,
        face: authMethods.face,
        aadhaar: authMethods.aadhaar,
        qr: authMethods.qr,
        gps: authMethods.mobile,
      },
      enrolledFingerprintBase64: lastCapturedTemplate,
    };

    logger.enroll.employeeCreated(employeeCode, formData.name);

    setSubmitError('');
    // Save Employee in Supabase Database
    const result = await createEmployeeInSupabase(newEmp);
    if (result && !result.success) {
      setSubmitError(result.error || 'Failed to save employee record in database.');
      setIsSubmitting(false);
      return;
    }

    // Save in LocalStorage for instant offline/kiosk matching
    try {
      const existingStr = localStorage.getItem('agencyos_enrolled_employees');
      const existingList: Employee[] = existingStr ? JSON.parse(existingStr) : [];
      const updatedList = [newEmp, ...existingList.filter((e) => e.id !== newEmp.id)];
      localStorage.setItem('agencyos_enrolled_employees', JSON.stringify(updatedList));
      localStorage.setItem('agencyos_last_enrolled_emp', JSON.stringify(newEmp));
    } catch (e) {
      logger.warn('ENROLL', 'LocalStorage save error');
    }

    const enrolledFingers = Object.values(fingerProgress).filter((f) => f.status === 'saved').length;
    logger.enroll.complete(employeeCode, formData.name, enrolledFingers);

    if (onEmployeeEnrolled) onEmployeeEnrolled(newEmp);
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    setIsSubmitting(false);
    setStep(5);
  };

  const savedFingersCount = Object.values(fingerProgress).filter((f) => f.status === 'saved').length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <UserCheck className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-100">Enterprise Employee Enrollment Wizard</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {employeeCode}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Transactional Session: <span className="font-mono text-emerald-400">{sessionUuid || 'ES_INIT'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-3.5 py-1.5 rounded-xl border border-blue-500/30">
          <span>Step {step} of 5</span>
        </div>
      </div>

      {/* 5-Step Progress Steps Indicator */}
      <div className="grid grid-cols-5 gap-2 text-xs font-semibold">
        {[
          '1. Details',
          '2. Auth Methods',
          '3. Fingerprint Scan',
          '4. Verification',
          '5. Complete & Sync',
        ].map((title, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-xl border flex items-center gap-2 transition ${
              step === idx + 1
                ? 'bg-blue-600/20 border-blue-500/40 text-blue-300 shadow-lg shadow-blue-500/10'
                : step > idx + 1
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] shrink-0 font-bold">
              {idx + 1}
            </span>
            <span className="truncate">{title}</span>
          </div>
        ))}
      </div>

      {/* STEP 1: EMPLOYEE DETAILS */}
      {step === 1 && (
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-100">Step 1: Employee Personal & Organizational Details</h3>
              <p className="text-xs text-slate-400">Backend auto-generates Unique Primary Key UUID and Employee Code</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span>UUID:</span>
              <span className="text-purple-400 font-bold">{employeeUuid ? `${employeeUuid.slice(0, 8)}...` : 'Generating...'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Photo Upload Box with Live Compressor */}
            <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-4">
              <div className="relative group">
                {formData.photo ? (
                  <img
                    src={formData.photo}
                    alt="Employee Avatar"
                    className="w-32 h-32 rounded-2xl object-cover ring-2 ring-blue-500/40 shadow-xl"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-slate-500 ring-2 ring-slate-800">
                    <User className="w-10 h-10 mb-1 text-slate-600" />
                    <span className="text-[10px] text-slate-500 font-medium">No Photo</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-2xl bg-slate-950/75 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition font-semibold text-xs gap-1.5 backdrop-blur-xs"
                >
                  <Camera className="w-4 h-4" /> {formData.photo ? 'Change Photo' : 'Upload Photo'}
                </button>
              </div>

              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoFileSelect} className="hidden" />

              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-200">WebP Compressed Avatar</span>
                <p className="text-[11px] text-slate-400">Target size: &lt;40KB for high-speed CDN delivery</p>
              </div>

              {compressionBadge && (
                <div className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono font-bold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {compressionBadge.sizeKb < 40 ? `${compressionBadge.sizeKb.toFixed(1)}KB (Optimized)` : `${compressionBadge.sizeKb.toFixed(1)}KB`}
                  </span>
                </div>
              )}
            </div>

            {/* Form Fields */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold">Full Employee Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    const emailUsername = newName.toLowerCase().trim().replace(/\s+/g, '.');
                    const calculatedEmail = emailUsername ? `${emailUsername}@agencyos.ai` : '';
                    setFormData((prev) => ({
                      ...prev,
                      name: newName,
                      email: prev.email === '' || prev.email.endsWith('@agencyos.ai') ? calculatedEmail : prev.email
                    }));
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold">Generated Employee Code (Read-only)</label>
                <input
                  type="text"
                  disabled
                  value={employeeCode}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-blue-400 font-mono font-bold cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold">Department *</label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:border-blue-500 focus:outline-none"
                >
                  <option value="Product">Product & Design</option>
                  <option value="Engineering">Software Engineering</option>
                  <option value="Executive">Executive Leadership</option>
                  <option value="Operations">Operations & HR</option>
                  <option value="Sales">Sales & Marketing</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold">Designation Title *</label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold">Corporate Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold">Contact Phone Number</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-slate-400 font-semibold">Assigned Work Shift Rule</label>
                <select
                  value={formData.shift}
                  onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:border-blue-500 focus:outline-none"
                >
                  <option value="09:00 AM - 06:00 PM">General Morning (09:00 AM - 06:00 PM • Grace: 15 mins)</option>
                  <option value="02:00 PM - 11:00 PM">Evening Shift (02:00 PM - 11:00 PM)</option>
                  <option value="10:00 PM - 07:00 AM">Night Shift (10:00 PM - 07:00 AM)</option>
                  <option value="Flexible Shift">Flexible Hours (8 Hours / Day)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: AUTHENTICATION METHODS */}
      {step === 2 && (
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-6 animate-in fade-in">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-base font-bold text-slate-100">Step 2: Select Active Biometric & Credential Passports</h3>
            <p className="text-xs text-slate-400">Configure allowed attendance check-in verification channels</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: 'fingerprint', label: 'Fingerprint Hardware Scanner', icon: Fingerprint, desc: 'Mantra MFS110 L1 / ZKTeco Biometric' },
              { id: 'face', label: 'MXFace 3D Liveness AI', icon: ScanFace, desc: 'Face Recognition Camera Terminal' },
              { id: 'aadhaar', label: 'Aadhaar RD Service', icon: CreditCard, desc: 'UIDAI Government Biometric Verification' },
              { id: 'qr', label: 'Dynamic Encrypted QR Pass', icon: QrCode, desc: 'Mobile App QR Scanner' },
              { id: 'mobile', label: 'Mobile Geofence GPS Radius', icon: Smartphone, desc: 'Selfie + GPS Location Tagging' },
              { id: 'rfid', label: 'NFC Smart Card / Badge', icon: Radio, desc: '13.56MHz RFID Card Tap' },
            ].map((item) => {
              const Icon = item.icon;
              const isChecked = (authMethods as any)[item.id];
              return (
                <div
                  key={item.id}
                  onClick={() => setAuthMethods({ ...authMethods, [item.id]: !isChecked })}
                  className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                    isChecked
                      ? 'bg-blue-600/20 border-blue-500/50 text-blue-200 shadow-lg shadow-blue-500/10'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isChecked ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-900 text-slate-500'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-100">{item.label}</span>
                      <span className="text-[10px] text-slate-400">{item.desc}</span>
                    </div>
                  </div>
                  <input type="checkbox" checked={isChecked} onChange={() => {}} className="accent-blue-500 w-4 h-4" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 3: MULTI-FINGER BIOMETRIC REGISTRATION */}
      {step === 3 && (
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-100">Step 3: Multi-Finger Biometric Registration & RAM Purge</h3>
              <p className="text-xs text-slate-400">
                Session Isolated: <span className="font-mono text-purple-400">{sessionUuid}</span> • RAM Cache Cleared ✓
              </p>
            </div>

            <button
              onClick={() => {
                resetMantraScanner();
                clearFingerprintCache();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" /> Reset Scanner RAM
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'rightThumb', label: 'Right Thumb' },
              { key: 'rightIndex', label: 'Right Index' },
              { key: 'leftThumb', label: 'Left Thumb' },
              { key: 'leftIndex', label: 'Left Index' },
              { key: 'rightMiddle', label: 'Right Middle' },
              { key: 'leftMiddle', label: 'Left Middle' },
            ].map((finger) => {
              const item = fingerProgress[finger.key] || { status: 'idle', quality: 0 };
              const isScanning = item.status === 'scanning';
              const isSaved = item.status === 'saved';
              const isRejected = item.status === 'rejected';

              return (
                <div
                  key={finger.key}
                  className={`p-4 rounded-2xl border transition flex flex-col justify-between space-y-3 ${
                    isSaved
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                      : isRejected
                      ? 'bg-rose-500/10 border-rose-500/40 text-rose-200'
                      : isScanning
                      ? 'bg-purple-500/10 border-purple-500/50 text-purple-200 animate-pulse'
                      : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-3 rounded-xl border ${
                          isSaved
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                            : isRejected
                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                            : 'bg-slate-900 border-slate-800 text-purple-400'
                        }`}
                      >
                        <Fingerprint className="w-5 h-5" />
                      </div>

                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-100">{finger.label}</span>
                          {isSaved && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Quality {item.quality}%
                            </span>
                          )}
                        </div>

                        <span className="text-xs text-slate-400 font-mono mt-0.5">
                          {item.message || (isSaved ? 'Enrolled & Verified ✓' : '○ Waiting for finger scan')}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => scanFingerPosition(finger.key as any, finger.label)}
                      disabled={isScanning}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        isSaved
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
                      }`}
                    >
                      {isSaved ? '✓ Saved' : isScanning ? 'Scanning...' : 'Place Finger'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 4: VERIFICATION & TRANSACTION payload */}
      {step === 4 && (
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-6 animate-in fade-in">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-base font-bold text-slate-100">Step 4: Database Transaction Verification</h3>
            <p className="text-xs text-slate-400">Review atomic payload parameters before committing to Database & Hardware CDN</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Employee Code</span>
                <span className="font-bold text-blue-400">{employeeCode}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Primary Key (UUID)</span>
                <span className="font-bold text-purple-400 truncate max-w-[180px]">{employeeUuid}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Full Name</span>
                <span className="font-bold text-white">{formData.name}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Department</span>
                <span className="font-bold text-slate-300">{formData.department}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Session UUID</span>
                <span className="font-bold text-emerald-400">{sessionUuid}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Enrolled Fingerprints</span>
                <span className="font-bold text-emerald-400">{savedFingersCount} Position(s)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Device Hardware Sync</span>
                <span className="font-bold text-blue-400">Mantra MFS110 / ZKTeco MBAS40</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Transaction Status</span>
                <span className="font-bold text-amber-400">Pending Commit</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: COMPLETE & SYNC */}
      {step === 5 && (
        <div className="p-8 rounded-3xl bg-slate-900/90 border border-emerald-500/40 space-y-6 animate-in zoom-in-95 duration-300 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center animate-bounce shadow-xl shadow-emerald-500/20">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <h3 className="text-2xl font-black text-white">✓ Employee Successfully Enrolled!</h3>
            <p className="text-xs text-slate-400">Biometric template linked & synchronized to hardware terminals</p>
          </div>

          {/* Enrolled Employee Summary Card */}
          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 w-full max-w-lg space-y-4 text-xs">
            <div className="flex items-center gap-4">
              {formData.photo ? (
                <img src={formData.photo} alt={formData.name} className="w-20 h-20 rounded-2xl object-cover ring-2 ring-emerald-500/50" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-slate-500 ring-2 ring-emerald-500/30">
                  <User className="w-8 h-8 text-slate-600" />
                </div>
              )}
              <div className="flex flex-col text-left space-y-1">
                <h4 className="text-base font-bold text-white">{formData.name}</h4>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {employeeCode}
                  </span>
                  <span className="text-slate-400">{formData.designation}</span>
                </div>
                <span className="text-slate-400">Department: <strong className="text-slate-200">{formData.department}</strong></span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-left pt-2 border-t border-slate-800">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Fingerprint Template</span>
                <span className="text-emerald-400 font-bold">Registered ✓</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Device Sync Status</span>
                <span className="text-emerald-400 font-bold">MBAS40 Ready</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {submitError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/35 text-rose-400 text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Footer Navigation */}
      <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
        <button
          onClick={() => {
            setStep(Math.max(1, step - 1));
            setSubmitError('');
          }}
          disabled={step === 1 || step === 5}
          className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 disabled:opacity-50 transition"
        >
          Back
        </button>

        {step < 4 ? (
          <button
            onClick={() => {
              if (step === 1) {
                if (!formData.name.trim()) {
                  setSubmitError('Employee Name is required.');
                  return;
                }
                if (!formData.designation.trim()) {
                  setSubmitError('Designation Title is required.');
                  return;
                }
              }
              setSubmitError('');
              setStep(step + 1);
            }}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-xl shadow-blue-600/20 flex items-center gap-2 transition"
          >
            <span>Next Step</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : step === 4 ? (
          <button
            onClick={handleFinishWizard}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-xl shadow-emerald-600/20 flex items-center gap-2 transition"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Committing Transaction...' : 'Commit & Finish Enrollment'}</span>
          </button>
        ) : (
          <button
            onClick={() => {
              setStep(1);
              generateNextEmployeeCode().then(({ employeeCode: code, employeeUuid: uuid }) => {
                setEmployeeCode(code);
                setEmployeeUuid(uuid);
              });
            }}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-xl shadow-blue-600/20 flex items-center gap-2 transition"
          >
            <span>Enroll Next Employee</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* DUPLICATE FINGERPRINT REJECTION MODAL */}
      {duplicateModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-base font-bold text-white">Fingerprint Already Exists!</h3>
                <span className="text-xs text-rose-400">Duplicate Scan Rejected by Security Policy</span>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              This fingerprint impression for <strong className="text-white">{duplicateModal.fingerName}</strong> matches an existing employee already registered in the system:
            </p>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Registered Employee</span>
                <span className="font-bold text-white">{duplicateModal.matchedEmployeeName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Employee Code</span>
                <span className="font-bold text-blue-400">{duplicateModal.matchedEmployeeCode}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Registered On</span>
                <span className="font-bold text-emerald-400">{duplicateModal.registeredOn}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDuplicateModal({ isOpen: false })}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition"
              >
                Cancel Scan
              </button>
              <button
                onClick={() => setDuplicateModal({ isOpen: false })}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition shadow-lg shadow-rose-600/20"
              >
                Dismiss & Retry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
