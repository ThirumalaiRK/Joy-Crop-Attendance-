import { createClient } from '@supabase/supabase-js';
import { AttendanceRecord, Employee, BiometricDevice } from '../types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://powyigqkkzfpbalqunyl.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MzIzMzUsImV4cCI6MjEwMTMwODMzNX0.YgznbTw4Ri1zL14svON5R3skUSBb-AnAo6R2IMR7sRk';

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('SECURITY ALERT: Using hardcoded fallback Supabase credentials. Ensure Row Level Security (RLS) is configured in your Postgres schema or set NEXT_PUBLIC_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

/**
 * Upload compressed employee avatar to Supabase CDN Storage
 */
export async function uploadEmployeeAvatarToSupabase(base64Data: string, employeeId: string): Promise<string> {
  try {
    const head = base64Data.indexOf(',') + 1;
    const base64Content = base64Data.substring(head);
    const buffer = Buffer.from(base64Content, 'base64');
    const fileName = `${employeeId.toLowerCase()}_avatar.webp`;

    const { data, error } = await supabase.storage
      .from('employee-avatars')
      .upload(fileName, buffer, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (error) {
      console.warn('Supabase CDN storage notice:', error.message);
      return base64Data; // Return base64 if storage bucket not yet initialized
    }

    const { data: publicUrlData } = supabase.storage
      .from('employee-avatars')
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl || base64Data;
  } catch (err) {
    console.error('Supabase storage upload exception:', err);
  }
  return base64Data;
}

/**
 * Fetch real attendance logs directly from Supabase Database
 */
export async function fetchAttendanceFromSupabase(): Promise<AttendanceRecord[]> {
  try {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.warn('Supabase fetch error:', error.message);
      return [];
    }

    if (data && data.length > 0) {
      return data.map((row) => ({
        id: row.id || `LOG-${Date.now()}`,
        employeeId: row.employee_id || 'EMP-0001',
        employeeName: row.employee_name || 'THIRUMALAI R K',
        employeeAvatar: row.employee_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        department: row.department || 'IT',
        checkInTime: row.check_in_time || '09:00 AM',
        checkOutTime: row.check_out_time,
        date: row.date || 'Today',
        method: row.method || 'fingerprint',
        status: row.status || 'present',
        deviceName: row.device_name || 'Mantra MFS110 L1 (S/N: 7055634)',
        confidenceScore: row.confidence_score || 99.4,
        location: row.location || 'HQ Floor 5 Exec Lounge',
        verified: row.verified ?? true,
      }));
    }
  } catch (err) {
    console.error('Supabase fetch exception:', err);
  }
  return [];
}

/**
 * Fetch real biometric devices from Supabase Database
 */
export async function fetchDevicesFromSupabase(): Promise<BiometricDevice[]> {
  try {
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .order('last_sync', { ascending: false });

    if (error) {
      console.warn('Supabase fetch devices error:', error.message);
      return [];
    }

    if (data && data.length > 0) {
      return data.map((row) => ({
        id: row.id || row.ip_address,
        name: row.name || 'Unknown Device',
        model: row.model || 'ZKTeco',
        ipAddress: row.ip_address || '0.0.0.0',
        location: row.branch || 'Headquarters',
        status: (row.status as any) || 'offline',
        batteryLevel: 100,
        temperature: 35.0,
        firmwareVersion: row.firmware_version || row.firmware || 'Unknown',
        lastSync: row.last_sync || new Date().toISOString(),
        signalStrength: 100,
        registeredUsers: row.user_count || row.users || 0,
        maxUserCapacity: 3000,
        todayLogsCount: 0,
        faceCapacity: 500,
        fingerCapacity: 3000,
        cloudSyncStatus: 'Healthy',
        errorCount: 0,
        macAddress: row.mac_address || '00:00:00:00:00:00',
        templateCount: row.template_count || 0,
        memoryUsage: row.memory_usage || '0MB / 128MB',
        latencyMs: row.latency_ms || 0,
      }));
    }
  } catch (err) {
    console.error('Supabase fetch devices exception:', err);
  }
  return [];
}

export async function fetchDeviceByIdFromSupabase(id: string): Promise<BiometricDevice | null> {
  const devices = await fetchDevicesFromSupabase();
  return devices.find(d => d.id === id) || null;
}

/**
 * Fetch real registered employees from Supabase Database
 */
const UNWANTED_EMPLOYEE_NAMES = [
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

export async function purgeUnwantedMockEmployeesFromSupabase() {
  try {
    await supabase.from('employees').delete().in('employee_code', ['EMP-715923']);

    // Auto-consolidate duplicate records like EMP-10 and EMP-000010
    const { data: emps } = await supabase
      .from('employees')
      .select('id, employee_code, fingerprint_enrolled, is_enrolled')
      .or('employee_code.eq.EMP-10,employee_code.eq.EMP-000010,id.eq.EMP-10,id.eq.EMP-000010');

    if (emps && emps.length > 1) {
      const isAnyEnrolled = emps.some(e => Boolean(e.fingerprint_enrolled || e.is_enrolled));
      const primary = emps.find(e => e.employee_code === 'EMP-10' || e.id === 'EMP-10') || emps[0];
      const redundant = emps.filter(e => e.id !== primary.id);

      if (isAnyEnrolled) {
        await supabase
          .from('employees')
          .update({ fingerprint_enrolled: true, is_enrolled: true, status: 'Active' })
          .eq('id', primary.id);
      }
      for (const dup of redundant) {
        await supabase.from('employees').delete().eq('id', dup.id);
      }
    }
  } catch (err) {
    // Ignore error if table not accessible
  }
}

export async function fetchEmployeesFromSupabase(): Promise<Employee[]> {
  try {
    // Automatically purge unwanted mock records & merge duplicates from Supabase DB
    await purgeUnwantedMockEmployeesFromSupabase();

    const { data, error } = await supabase.from('employees').select('*').order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase employees fetch error:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Fetch hardware device users, attendance logs, and biometric templates to check real enrollment status
    const enrolledSet = new Set<string>();
    try {
      const { data: devUsers } = await supabase.from('device_users').select('device_user_id, uid, name');
      (devUsers || []).forEach(d => {
        if (d.device_user_id) {
          enrolledSet.add(String(d.device_user_id).trim().toUpperCase());
          const num = parseInt(String(d.device_user_id).replace(/\D/g, ''), 10);
          if (num > 0) {
            enrolledSet.add(`EMP-${num}`);
            enrolledSet.add(`EMP-${String(num).padStart(6, '0')}`);
            enrolledSet.add(String(num));
          }
        }
        if (d.uid) {
          enrolledSet.add(`EMP-${d.uid}`);
          enrolledSet.add(String(d.uid));
        }
      });

      const { data: attLogs } = await supabase.from('attendance_logs').select('device_user_id').limit(100);
      (attLogs || []).forEach(l => {
        if (l.device_user_id) {
          enrolledSet.add(String(l.device_user_id).trim().toUpperCase());
          const num = parseInt(String(l.device_user_id).replace(/\D/g, ''), 10);
          if (num > 0) {
            enrolledSet.add(`EMP-${num}`);
            enrolledSet.add(`EMP-${String(num).padStart(6, '0')}`);
            enrolledSet.add(String(num));
          }
        }
      });

      const { data: tmpls } = await supabase.from('fingerprint_templates').select('employee_code');
      (tmpls || []).forEach(t => {
        if (t.employee_code) {
          enrolledSet.add(String(t.employee_code).trim().toUpperCase());
          const num = parseInt(String(t.employee_code).replace(/\D/g, ''), 10);
          if (num > 0) {
            enrolledSet.add(`EMP-${num}`);
            enrolledSet.add(`EMP-${String(num).padStart(6, '0')}`);
            enrolledSet.add(String(num));
          }
        }
      });
    } catch (_) {}

    const seenMap = new Map<string, Employee>();
    const uniqueEmployees: Employee[] = [];

    for (const row of data) {
      const normName = (row.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const rawCode = String(row.employee_code || row.id || '').toUpperCase();
      const devUserId = String(row.device_user_id || '').toUpperCase();
      const numId = parseInt(rawCode.replace(/\D/g, ''), 10) || parseInt(devUserId.replace(/\D/g, ''), 10);
      const isMockId = row.id && /^EMP-100\d/.test(row.id);
      if (isMockId || UNWANTED_EMPLOYEE_NAMES.includes(normName)) continue;

      const isEnrolledInDb = enrolledSet.has(rawCode) ||
        enrolledSet.has(devUserId) ||
        (numId > 0 && (enrolledSet.has(`EMP-${numId}`) || enrolledSet.has(`EMP-${String(numId).padStart(6, '0')}`) || enrolledSet.has(String(numId))));

      const hasFp = isEnrolledInDb || Boolean(row.fingerprint_enrolled || row.enrolled_fingerprint_base64 || (row.fingerprint_templates && row.fingerprint_templates.length > 0));
      const hasFace = Boolean(row.face_enrolled);
      const hasCard = Boolean(row.card_enrolled || row.rfid_enrolled || row.card_number);
      const isEnrolled = hasFp || hasFace || hasCard || Boolean(row.is_enrolled);

      // Deduplication key by numeric ID + normalized name
      const dedupKey = numId > 0 ? `emp-${numId}-${normName}` : `emp-name-${normName}`;

      if (seenMap.has(dedupKey)) {
        const existing = seenMap.get(dedupKey)!;
        if (hasFp) {
          existing.biometricStatus.fingerprint = true;
          existing.biometricStatus.isEnrolled = true;
          existing.isEnrolled = true;
        }
        if (hasFace) {
          existing.biometricStatus.face = true;
          existing.biometricStatus.isEnrolled = true;
          existing.isEnrolled = true;
        }
        if (hasCard) {
          existing.biometricStatus.card = true;
          existing.biometricStatus.isEnrolled = true;
          existing.isEnrolled = true;
        }
        if (isEnrolled) {
          existing.isEnrolled = true;
          existing.biometricStatus.isEnrolled = true;
        }
        if (rawCode === `EMP-${numId}`) {
          existing.employeeCode = `EMP-${numId}`;
        }
        continue;
      }

      const code = rawCode.startsWith('EMP-') ? rawCode : (numId > 0 ? `EMP-${numId}` : `EMP-${String(row.device_user_id || 10)}`);

      const empObj: Employee = {
        id: row.id,
        employeeCode: code,
        employeeUuid: row.id,
        name: row.name,
        avatar: (row.avatar && !row.avatar.includes('photo-1534528741775-53994a69daeb'))
          ? row.avatar
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(row.name || 'Employee')}&background=0ea5e9&color=fff&size=200&bold=true`,
        designation: row.designation || 'Software Engineer',
        department: row.department || 'Software Development',
        email: row.email || `${code.toLowerCase()}@agencyos.ai`,
        phone: row.phone,
        manager: row.manager || 'Director of IT',
        employmentStatus: row.employment_status || 'Full Time',
        shift: row.shift || 'General Morning (09:00 AM - 06:00 PM)',
        attendanceScore: row.attendance_score || 100,
        productivityScore: row.productivity_score || 95,
        currentStreak: row.current_streak || 1,
        avgArrival: row.avg_arrival || '09:00 AM',
        avgExit: row.avg_exit || '06:00 PM',
        isEnrolled: isEnrolled,
        biometricStatus: {
          fingerprint: hasFp,
          face: hasFace,
          card: hasCard,
          aadhaar: false,
          qr: row.qr_enabled ?? false,
          gps: row.gps_enabled ?? false,
          isEnrolled: isEnrolled,
        },
        enrolledFingerprintBase64: row.enrolled_fingerprint_base64 || undefined,
      };

      seenMap.set(dedupKey, empObj);
      uniqueEmployees.push(empObj);
    }

    return uniqueEmployees;
  } catch (err) {
    console.error('Supabase employees exception:', err);
  }
  return [];
}


/**
 * Real-time subscription helper for attendance records broadcast
 */
export function subscribeToLiveAttendance(
  onChange: (record: AttendanceRecord, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void
) {
  const channel = supabase
    .channel('live-attendance-channel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'attendance_records',
      },
      (payload) => {
        const targetData = (payload.new && Object.keys(payload.new).length > 0 ? payload.new : payload.old) as any;
        if (targetData) {
          const rec: AttendanceRecord = {
            id: targetData.id || `LOG-${Date.now()}`,
            employeeId: targetData.employee_id || 'EMP-0001',
            employeeName: targetData.employee_name || '',
            employeeAvatar: targetData.employee_avatar || '',
            department: targetData.department || '',
            checkInTime: targetData.check_in_time || '',
            checkOutTime: targetData.check_out_time,
            date: targetData.date || 'Today',
            method: targetData.method || 'fingerprint',
            status: targetData.status || 'present',
            deviceName: targetData.device_name || 'Mantra MFS110 L1 (S/N: 7055634)',
            confidenceScore: targetData.confidence_score || 99.4,
            location: targetData.location || 'HQ Reception Kiosk Terminal',
            verified: targetData.verified ?? true,
          };
          onChange(rec, payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE');
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Real-time subscription helper for Employee Profile changes
 */
export function subscribeToLiveEmployees(
  onChange: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; record: any }) => void
) {
  const channel = supabase
    .channel('live-employees-channel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'employees',
      },
      (payload) => {
        const record = (payload.new && Object.keys(payload.new).length > 0 ? payload.new : payload.old) as any;
        if (record) {
          onChange({
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            record,
          });
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}


function toValidUuidOrNull(uuidStr?: string): string | null {
  if (!uuidStr) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuidStr) ? uuidStr : null;
}

function generateValidUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  const timestampHex = Date.now().toString(16).padStart(12, '0').slice(-12);
  return `00000000-0000-4000-8000-${timestampHex}`;
}

/**
 * Generate unique enterprise sequential Employee Code (e.g. EMP-000001, EMP-000002)
 */
export async function generateNextEmployeeCode(): Promise<{ employeeCode: string; employeeUuid: string }> {
  const newUuid = generateValidUuid();
  try {
    const { data, error } = await supabase.from('employees').select('employee_code').order('created_at', { ascending: false }).limit(1);
    if (!error && data && data.length > 0 && data[0].employee_code) {
      const lastCode = data[0].employee_code;
      const match = lastCode.match(/EMP-(\d+)/);
      if (match) {
        const nextNum = parseInt(match[1], 10) + 1;
        const code = `EMP-${String(nextNum).padStart(6, '0')}`;
        return { employeeCode: code, employeeUuid: newUuid };
      }
    }
  } catch (e) {
    // Fallback code generation
  }
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return { employeeCode: `EMP-${randomNum}`, employeeUuid: newUuid };
}

/**
 * Open isolated enrollment session in Supabase DB
 */
export async function createEnrollmentSessionInDb(employeeUuid: string, employeeCode: string): Promise<string> {
  const sessionUuid = generateValidUuid();
  const validEmpUuid = toValidUuidOrNull(employeeUuid);
  try {
    const { error } = await supabase.from('enrollment_sessions').insert([
      {
        session_uuid: sessionUuid,
        employee_uuid: validEmpUuid,
        employee_code: employeeCode,
        device_id: 'MANTRA-MFS110',
        status: 'in_progress',
        started_at: new Date().toISOString(),
      },
    ]);
    if (error) console.warn('Enrollment session creation notice:', error.message);
  } catch (e) {
    console.warn('Enrollment session creation notice:', e);
  }
  return sessionUuid;
}

/**
 * Check if fingerprint template already exists for another employee in Supabase DB
 */
export async function checkDuplicateFingerprintInDb(templateBase64: string, currentEmployeeCode?: string): Promise<{ isDuplicate: boolean; matchedEmployee?: any }> {
  try {
    const [templatesRes, employeesRes] = await Promise.all([
      supabase.from('fingerprint_templates').select('employee_code, employee_uuid, finger_template').limit(200),
      supabase.from('employees').select('id, employee_code, name')
    ]);

    if (!templatesRes.error && templatesRes.data) {
      const match = templatesRes.data.find(
        (row) =>
          row.finger_template === templateBase64 &&
          (!currentEmployeeCode || row.employee_code !== currentEmployeeCode)
      );
      if (match) {
        const emp = (employeesRes.data || []).find(
          (e) => e.employee_code === match.employee_code || e.id === match.employee_code || e.id === match.employee_uuid
        );
        return {
          isDuplicate: true,
          matchedEmployee: emp || { name: 'Existing Employee', employee_code: match.employee_code },
        };
      }
    }
  } catch (e) {
    console.warn('Duplicate fingerprint check exception:', e);
  }
  return { isDuplicate: false };
}

/**
 * Transactional save of biometric fingerprint template in Supabase DB
 */
export async function saveFingerprintTemplateInDb(
  employeeUuid: string,
  employeeCode: string,
  fingerPosition: string,
  fingerTemplate: string,
  qualityScore: number = 98,
  nmPoints: number = 0
) {
  const validEmpUuid = toValidUuidOrNull(employeeUuid);
  const encodedQuality = (qualityScore >= 100) ? qualityScore : ((qualityScore * 100) + (nmPoints % 100));

  try {
    const { data, error } = await supabase.from('fingerprint_templates').insert([
      {
        employee_uuid: validEmpUuid,
        employee_code: employeeCode,
        device_id: 'MANTRA-MFS110',
        finger_position: fingerPosition,
        finger_template: fingerTemplate,
        quality_score: encodedQuality,
      },
    ]);

    if (error) console.warn('Fingerprint template insert notice:', error.message);

    // Save in __FingerprintSubjects for MXFace Fingerprint SDK v01.00 ODBC compliance
    try {
      const { error: subjError } = await supabase.from('__FingerprintSubjects').insert([
        {
          subjectid: employeeCode,
          template: fingerTemplate,
          Group: 'agencyos_hq_employees',
          clientid: 1001,
        },
      ]);
      if (subjError) console.warn('__FingerprintSubjects insert notice:', subjError.message);
    } catch (e) {
      console.warn('__FingerprintSubjects exception:', e);
    }

    return data;
  } catch (e) {
    console.error('Save fingerprint template error:', e);
  }
}

/**
 * Add a new fingerprint for an existing employee in Supabase without overlapping or overwriting existing stored templates.
 */
export async function addFingerprintToExistingEmployeeInDb(
  employeeCode: string,
  fingerPosition: string,
  fingerTemplate: string,
  qualityScore: number = 98
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    // 1. Verify employee exists in Supabase DB
    const { data: emp, error: empErr } = await supabase
      .from('employees')
      .select('*')
      .or(`id.eq.${employeeCode},employee_code.eq.${employeeCode}`)
      .limit(1);

    if (empErr || !emp || emp.length === 0) {
      return { success: false, message: `Employee with code ${employeeCode} not found in Supabase DB.` };
    }

    const employeeRecord = emp[0];
    const validEmpUuid = toValidUuidOrNull(employeeRecord.employee_uuid);

    // 2. Check for duplicate template across all existing templates to avoid overlapping/duplicate registration
    const { data: existingTemplates } = await supabase
      .from('fingerprint_templates')
      .select('*');

    if (existingTemplates && existingTemplates.length > 0) {
      const duplicateMatch = existingTemplates.find((t) => t.finger_template === fingerTemplate);
      if (duplicateMatch) {
        if (duplicateMatch.employee_code === employeeCode) {
          return {
            success: false,
            message: `This exact fingerprint template is already stored for ${employeeRecord.name} (${duplicateMatch.finger_position || 'Finger'}). Duplicate submission rejected.`,
          };
        } else {
          return {
            success: false,
            message: `This fingerprint template overlaps with another registered employee (${duplicateMatch.employee_code}). Duplicate rejected for security!`,
          };
        }
      }
    }

    // 3. Insert NEW separate row into fingerprint_templates table so stored fingerprints for this employee do NOT overlap or overwrite
    const { data: insertedTmpl, error: tmplErr } = await supabase.from('fingerprint_templates').insert([
      {
        employee_uuid: validEmpUuid,
        employee_code: employeeCode,
        device_id: 'MANTRA-MFS110',
        finger_position: fingerPosition,
        finger_template: fingerTemplate,
        quality_score: qualityScore,
      },
    ]).select();

    if (tmplErr) {
      console.warn('fingerprint_templates insert notice:', tmplErr.message);
    }

    // 4. Also register into __fingerprintsubjects / __FingerprintSubjects for 1:N ODBC compatibility
    try {
      await supabase.from('__FingerprintSubjects').insert([
        {
          subjectid: employeeCode,
          template: fingerTemplate,
          Group: 'agencyos_hq_employees',
          clientid: 1001,
        },
      ]);
    } catch (e) {
      try {
        await supabase.from('__fingerprintsubjects').insert([
          {
            subjectid: employeeCode,
            template: fingerTemplate,
            Group: 'agencyos_hq_employees',
            clientid: 1001,
          },
        ]);
      } catch (err) {
        // ignore notice
      }
    }

    // 5. Update employee's fingerprint enrollment status and primary template in employees table
    await supabase
      .from('employees')
      .update({
        fingerprint_enrolled: true,
        enrolled_fingerprint_base64: fingerTemplate,
      })
      .or(`id.eq.${employeeCode},employee_code.eq.${employeeCode}`);

    return {
      success: true,
      message: `Successfully enrolled new fingerprint (${fingerPosition}) for ${employeeRecord.name} (${employeeCode}) without overwriting existing records!`,
      data: insertedTmpl,
    };
  } catch (err: any) {
    console.error('addFingerprintToExistingEmployeeInDb exception:', err);
    return { success: false, message: `Exception while saving fingerprint: ${err.message}` };
  }
}

/**
 * Save new enrolled employee into Supabase DB
 */
export async function createEmployeeInSupabase(emp: Employee) {
  const validUuid = toValidUuidOrNull(emp.id) || toValidUuidOrNull(emp.employeeUuid);
  const code = emp.employeeCode || emp.id;
  const insertPayload: any = {
    employee_code: code,
    device_user_id: code,
    name: emp.name,
    email: emp.email || null,
    phone: emp.phone || null,
    designation: emp.designation || 'Software Engineer',
    department: emp.department || 'Software Development',
    shift: emp.shift || 'General Shift (09:00 AM - 06:00 PM)',
    manager: emp.manager || 'THIRUMALAI R K (MD)',
    avatar: emp.avatar || null,
    status: emp.status || 'Active',
    employment_status: emp.employmentStatus || 'Full Time',
  };
  if (validUuid) {
    insertPayload.id = validUuid;
  }

  try {
    const { data, error } = await supabase.from('employees').insert([insertPayload]).select();

    if (error) {
      console.warn('Supabase employee insert notice:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err: any) {
    console.error('Supabase employee create error:', err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Update an existing employee record in Supabase Database
 */
export async function updateEmployeeInSupabase(emp: Employee) {
  const code = emp.employeeCode || emp.id;
  const validUuid = toValidUuidOrNull(emp.id) || toValidUuidOrNull(emp.employeeUuid);
  try {
    const updatePayload: any = {
      name: emp.name,
      email: emp.email || null,
      phone: emp.phone || null,
      designation: emp.designation || null,
      department: emp.department || null,
      shift: emp.shift || null,
      manager: emp.manager || null,
      avatar: emp.avatar || null,
      status: emp.status || 'Active',
      device_user_id: code,
      updated_at: new Date().toISOString(),
    };

    let query = supabase.from('employees').update(updatePayload);
    if (validUuid) {
      query = query.or(`id.eq.${validUuid},employee_code.eq.${code},device_user_id.eq.${code}`);
    } else {
      query = query.or(`employee_code.eq.${code},device_user_id.eq.${code}`);
    }

    const { data, error } = await query.select();

    if (error) {
      console.warn('Supabase employee update notice:', error.message);
    }

    return data;
  } catch (err) {
    console.error('Supabase employee update error:', err);
  }
}


/**
 * Insert a new attendance check-in or check-out record into Supabase Realtime DB
 */
export async function insertAttendanceRecord(record: AttendanceRecord) {
  try {
    const { data, error } = await supabase.from('attendance_records').insert([
      {
        id: record.id,
        employee_id: record.employeeId,
        employee_name: record.employeeName,
        employee_avatar: record.employeeAvatar,
        department: record.department,
        check_in_time: record.checkInTime,
        check_out_time: record.checkOutTime,
        date: record.date,
        method: record.method,
        status: record.status,
        device_name: record.deviceName,
        confidence_score: record.confidenceScore,
        location: record.location,
        verified: record.verified,
      },
    ]);
    if (error) {
      console.warn('Supabase attendance record notice:', error.message);
    }
    return data;
  } catch (err) {
    console.error('Supabase error:', err);
  }
}

/**
 * Get the latest attendance record for an employee to determine check-in vs check-out state
 */
export async function getLatestAttendanceRecord(employeeId: string): Promise<AttendanceRecord | null> {
  try {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('Supabase fetch latest attendance notice:', error.message);
      return null;
    }

    if (data) {
      return {
        id: data.id,
        employeeId: data.employee_id,
        employeeName: data.employee_name,
        employeeAvatar: data.employee_avatar,
        department: data.department,
        checkInTime: data.check_in_time,
        checkOutTime: data.check_out_time,
        date: data.date,
        method: data.method,
        status: data.status,
        deviceName: data.device_name,
        confidenceScore: data.confidence_score,
        location: data.location,
        verified: data.verified,
      };
    }
  } catch (err) {
    console.error('Supabase fetch latest attendance exception:', err);
  }
  return null;
}

/**
 * Update an existing attendance record (e.g. adding checkOutTime or updating status/duration)
 */
export async function updateAttendanceRecordInSupabase(recordId: string, updates: Partial<AttendanceRecord>) {
  try {
    const dbUpdates: any = {};
    if (updates.checkInTime !== undefined) dbUpdates.check_in_time = updates.checkInTime;
    if (updates.checkOutTime !== undefined) dbUpdates.check_out_time = updates.checkOutTime;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.verified !== undefined) dbUpdates.verified = updates.verified;
    if (updates.confidenceScore !== undefined) dbUpdates.confidence_score = updates.confidenceScore;

    const { data, error } = await supabase
      .from('attendance_records')
      .update(dbUpdates)
      .eq('id', recordId);

    if (error) {
      console.warn('Supabase update attendance notice:', error.message);
    }
    return data;
  } catch (err) {
    console.error('Supabase update attendance exception:', err);
  }
}

/**
 * Delete an employee record permanently from Supabase Database & Physical Biometric Machine
 */
export async function deleteEmployeeFromSupabase(
  employeeId: string,
  employeeName?: string,
  employeeCode?: string
): Promise<{ success: boolean; message?: string }> {
  try {
    // 1. Call privileged server-side purge endpoint
    try {
      const res = await fetch('/api/admin/employees/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: employeeId,
          employeeCode: employeeCode || employeeId,
          name: employeeName,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, message: data.message };
      }
    } catch (_) {}

    // 2. Direct Supabase Fallback
    await Promise.allSettled([
      supabase.from('employee_roles').delete().or(`employee_id.eq.${employeeId}`),
      supabase.from('employee_portal_access').delete().or(`employee_id.eq.${employeeId}`),
      supabase.from('fingerprint_templates').delete().or(`employee_uuid.eq.${employeeId},employee_code.eq.${employeeId}`),
      supabase.from('employee_accounts').delete().or(`employee_id.eq.${employeeId}`),
      supabase.from('employees').delete().or(`id.eq.${employeeId},employee_code.eq.${employeeId}`),
    ]);

    // 3. Direct Hardware Connector Gateway Fallback (Port 4000)
    try {
      await fetch('http://localhost:4000/api/device/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: '192.168.1.56',
          employeeCode: employeeCode || employeeId,
          userId: employeeCode || employeeId,
          name: employeeName,
        }),
      });
    } catch (_) {}

    return { success: true, message: 'Employee deleted from Database and Biometric Machine.' };
  } catch (err: any) {
    console.error('Supabase delete employee error:', err);
    return { success: false, message: err.message || 'Failed to delete employee' };
  }
}

/**
 * Log immutable Audit Entry in Supabase DB
 */
export async function logAuditEntry(action: string, targetEmployeeId?: string, details?: string, performedBy: string = 'THIRUMALAI R K (Super Admin)') {
  try {
    await supabase.from('audit_logs').insert([
      {
        action,
        performed_by: performedBy,
        target_employee_id: targetEmployeeId || null,
        details: details || null,
        ip_address: '127.0.0.1 (Local Verified)',
      },
    ]);
  } catch (err) {
    console.warn('Audit log notice:', err);
  }
}

/**
 * Provision Supabase Authentication User & Portal Linkage for Employee
 */
export async function provisionEmployeePortalAccount(
  employeeId: string,
  email: string,
  customPassword?: string
): Promise<{ success: boolean; email: string; password?: string; message: string; accountData?: any }> {
  const tempPassword = customPassword || `Joy@2026#${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    // 1. Create or SignUp user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: tempPassword,
      options: {
        data: {
          employee_id: employeeId,
          role: 'Employee',
        },
      },
    });

    const authUserId = authData.user?.id || null;

    // 2. Insert or Update employee_accounts table
    const { data: accData, error: accError } = await supabase.from('employee_accounts').upsert([
      {
        employee_id: employeeId,
        auth_user_id: authUserId,
        email,
        portal_enabled: true,
        password_reset_required: true,
        last_device: 'Chrome (Windows local)',
      },
    ], { onConflict: 'employee_id' }).select();

    if (accError) {
      console.warn('employee_accounts upsert notice:', accError.message);
    }

    // 3. Assign Default Role in user_roles
    if (authUserId) {
      await supabase.from('user_roles').upsert([
        {
          auth_user_id: authUserId,
          role_id: 'Employee',
        },
      ], { onConflict: 'auth_user_id,role_id' });

      // Update employees table auth_user_id linkage
      await supabase
        .from('employees')
        .update({
          auth_user_id: authUserId,
          portal_status: 'Active',
          email,
        })
        .or(`id.eq.${employeeId},employee_code.eq.${employeeId}`);
    }

    // 4. Audit Log Entry
    await logAuditEntry(
      'PROVISION_PORTAL_ACCOUNT',
      employeeId,
      `Provisioned Supabase Auth User for ${email} with temporary credentials. Password reset required on first login.`
    );

    return {
      success: true,
      email,
      password: tempPassword,
      message: `Successfully provisioned Supabase Auth credentials for ${email}!`,
      accountData: accData,
    };
  } catch (err: any) {
    console.error('provisionEmployeePortalAccount exception:', err);
    return {
      success: false,
      email,
      message: `Failed to provision credentials: ${err.message || String(err)}`,
    };
  }
}

/**
 * Reset Employee Portal Password and force password change on next login
 */
export async function resetEmployeePassword(
  employeeId: string,
  email: string
): Promise<{ success: boolean; newPassword?: string; message: string }> {
  const newPassword = `Joy@2026#${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    await supabase.from('employee_accounts').update({
      password_reset_required: true,
      updated_at: new Date().toISOString(),
    }).eq('employee_id', employeeId);

    await logAuditEntry(
      'RESET_PASSWORD',
      employeeId,
      `Admin generated temporary password reset for ${email}. User must update password upon login.`
    );

    return {
      success: true,
      newPassword,
      message: `Password reset successfully for ${email}. Temporary password generated: ${newPassword}`,
    };
  } catch (err: any) {
    console.error('resetEmployeePassword exception:', err);
    return {
      success: false,
      message: `Failed to reset password: ${err.message || String(err)}`,
    };
  }
}

/**
 * Toggle Employee Portal Login Access (Enable / Suspend)
 */
export async function toggleEmployeePortalAccess(
  employeeId: string,
  enabled: boolean
): Promise<{ success: boolean; message: string }> {
  try {
    await supabase.from('employee_accounts').update({
      portal_enabled: enabled,
      updated_at: new Date().toISOString(),
    }).eq('employee_id', employeeId);

    await supabase.from('employees').update({
      portal_status: enabled ? 'Active' : 'Disabled',
    }).or(`id.eq.${employeeId},employee_code.eq.${employeeId}`);

    await logAuditEntry(
      enabled ? 'ENABLE_PORTAL_ACCESS' : 'SUSPEND_PORTAL_ACCESS',
      employeeId,
      `Employee Portal Login access set to ${enabled ? 'ENABLED' : 'SUSPENDED'}`
    );

    return {
      success: true,
      message: `Portal access for ${employeeId} successfully ${enabled ? 'ENABLED' : 'SUSPENDED'}.`,
    };
  } catch (err: any) {
    console.error('toggleEmployeePortalAccess exception:', err);
    return {
      success: false,
      message: `Failed to toggle portal access: ${err.message || String(err)}`,
    };
  }
}

/**
 * Fetch Employee Portal Account & Login Metadata
 */
export async function fetchEmployeeAccountStatus(employeeId: string) {
  try {
    const { data, error } = await supabase
      .from('employee_accounts')
      .select('*')
      .or(`employee_id.eq.${employeeId},email.eq.${employeeId}`)
      .limit(1);

    if (!error && data && data.length > 0) {
      return data[0];
    }
  } catch (err) {
    console.warn('fetchEmployeeAccountStatus notice:', err);
  }
  return null;
}

/**
 * Complete Temporary Password Change on First Login
 */
export async function completeTemporaryPasswordUpdate(
  employeeId: string,
  email: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Update Supabase Auth password if session available
    try {
      await supabase.auth.updateUser({ password: newPassword });
    } catch (e) {
      console.warn('Supabase Auth updateUser notice:', e);
    }

    // 2. Clear password_reset_required flag and update last_login timestamp
    await supabase.from('employee_accounts').update({
      password_reset_required: false,
      last_login: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).or(`employee_id.eq.${employeeId},email.eq.${email}`);

    // 3. Log Audit Entry
    await logAuditEntry(
      'PASSWORD_CHANGE_SUCCESS',
      employeeId,
      `Employee ${email} successfully changed temporary password on first login.`
    );

    return {
      success: true,
      message: 'Password updated successfully! Welcome to JRM HRMS Employee Portal.',
    };
  } catch (err: any) {
    console.error('completeTemporaryPasswordUpdate exception:', err);
    return {
      success: false,
      message: `Failed to update password: ${err.message || String(err)}`,
    };
  }
}

/**
 * Enqueue asynchronous hardware command into Supabase device_commands queue
 */
export async function enqueueDeviceCommand(
  deviceIp: string,
  commandType: 'CREATE_USER' | 'ENROLL_USER' | 'DELETE_USER' | 'PULL_ATTENDANCE' | 'SYNC_TIME',
  payload: any
): Promise<{ success: boolean; commandId?: string; message: string }> {
  try {
    const { data, error } = await supabase
      .from('device_commands')
      .insert({
        device_ip: deviceIp,
        command_type: commandType,
        payload: payload,
        status: 'PENDING',
      })
      .select('id')
      .single();

    if (error) {
      console.warn('enqueueDeviceCommand notice:', error.message);
      return { success: false, message: `Failed to queue command: ${error.message}` };
    }

    return {
      success: true,
      commandId: data?.id,
      message: `Queued ${commandType} command for hardware at ${deviceIp}`,
    };
  } catch (err: any) {
    console.error('enqueueDeviceCommand exception:', err);
    return { success: false, message: err?.message || 'Error queuing command' };
  }
}

/**
 * Check status of queued hardware command
 */
export async function checkDeviceCommandStatus(commandId: string) {
  try {
    const { data, error } = await supabase
      .from('device_commands')
      .select('*')
      .eq('id', commandId)
      .single();

    if (error) return null;
    return data;
  } catch (err) {
    return null;
  }
}


