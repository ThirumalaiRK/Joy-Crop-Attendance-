/**
 * AgencyOS Structured Logger
 * Centralized logging for enrollment, attendance, and system events.
 */

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' | 'DEBUG';
type LogDomain = 'ENROLL' | 'KIOSK' | 'DEVICE' | 'API' | 'DB' | 'AUTH' | 'SYSTEM';

function pad(s: string, len = 10) {
  return s.padEnd(len, ' ');
}

function timestamp() {
  return new Date().toLocaleTimeString('en-IN', { hour12: false });
}

function emit(level: LogLevel, domain: LogDomain, message: string, meta?: Record<string, any>) {
  const prefix = `[${timestamp()}] [${pad(domain, 6)}] [${level}]`;
  const metaStr = meta ? `  ${JSON.stringify(meta)}` : '';
  const full = `${prefix}  ${message}${metaStr}`;

  if (level === 'ERROR') {
    console.error(full);
  } else if (level === 'WARN') {
    console.warn(full);
  } else {
    console.log(full);
  }

  // Store last 200 logs in memory for Developer Console
  if (typeof window !== 'undefined') {
    try {
      const existing: string[] = JSON.parse(sessionStorage.getItem('agencyos_logs') || '[]');
      existing.unshift(full);
      sessionStorage.setItem('agencyos_logs', JSON.stringify(existing.slice(0, 200)));
    } catch (_) {}
  }
}

export const logger = {
  // Enrollment events
  enroll: {
    employeeCreated: (code: string, name: string) =>
      emit('SUCCESS', 'ENROLL', `Employee Created: ${code} | Name: ${name}`),
    sessionStarted: (sessionId: string, empCode: string) =>
      emit('INFO', 'ENROLL', `Session Started: ${sessionId} | Employee: ${empCode}`),
    scannerReset: () =>
      emit('INFO', 'ENROLL', 'Scanner Reset: Mantra MFS110 cleared'),
    captureStarted: (finger: string) =>
      emit('INFO', 'ENROLL', `Capture Started: ${finger}`),
    captureSuccess: (finger: string, quality: number) =>
      emit('SUCCESS', 'ENROLL', `Fingerprint Captured: ${finger} | Quality: ${quality}%`),
    captureFailed: (finger: string, reason: string) =>
      emit('WARN', 'ENROLL', `Capture Failed: ${finger} | Reason: ${reason}`),
    duplicateDetected: (finger: string, matchedCode: string) =>
      emit('WARN', 'ENROLL', `Duplicate Detected: ${finger} matches employee ${matchedCode}`),
    templateSaved: (finger: string, empCode: string) =>
      emit('SUCCESS', 'ENROLL', `Template Saved: ${finger} → fingerprint_templates | Employee: ${empCode}`),
    verificationPassed: (empCode: string) =>
      emit('SUCCESS', 'ENROLL', `Verification Passed: ${empCode} identified correctly`),
    complete: (empCode: string, name: string, fingers: number) =>
      emit('SUCCESS', 'ENROLL', `Enrollment Complete: ${name} (${empCode}) | ${fingers} finger(s) enrolled`),
    rollback: (empCode: string, reason: string) =>
      emit('ERROR', 'ENROLL', `Rollback: ${empCode} | Reason: ${reason}`),
  },

  // Kiosk / Attendance events
  kiosk: {
    captureStarted: () => emit('INFO', 'KIOSK', 'Capture Started: Waiting for finger...'),
    captured: (quality: number, len: number) =>
      emit('SUCCESS', 'KIOSK', `Captured: Quality ${quality}% | Template ${len} chars`),
    captureTimeout: () => emit('WARN', 'KIOSK', 'CAPTURE_TIMEOUT: No finger placed, returning IDLE'),
    searching: () => emit('INFO', 'KIOSK', 'Searching Supabase fingerprint_templates...'),
    matched: (empCode: string, name: string, method: string, diff: number) =>
      emit('SUCCESS', 'KIOSK', `Matched: ${name} (${empCode}) | Method: ${method} | Δlen=${diff}`),
    unknownFinger: () =>
      emit('WARN', 'KIOSK', 'UNKNOWN_FINGER: No matching record in Supabase DB → returning IDLE'),
    duplicate: (empCode: string) =>
      emit('WARN', 'KIOSK', `COOLDOWN_ACTIVE: Duplicate scan from ${empCode} within 5s → rejected`),
    checkIn: (empCode: string, name: string, time: string) =>
      emit('SUCCESS', 'KIOSK', `CHECK_IN Created: ${name} (${empCode}) @ ${time}`),
    checkOut: (empCode: string, name: string, time: string) =>
      emit('SUCCESS', 'KIOSK', `CHECK_OUT Created: ${name} (${empCode}) @ ${time}`),
    dbUpdated: (recordId: string) =>
      emit('SUCCESS', 'KIOSK', `Supabase Updated: attendance_records row ${recordId}`),
  },

  // Device events
  device: {
    online: (name: string, ip: string) => emit('SUCCESS', 'DEVICE', `Online: ${name} @ ${ip}`),
    offline: (name: string) => emit('ERROR', 'DEVICE', `Offline: ${name} not responding`),
    reset: (name: string) => emit('INFO', 'DEVICE', `Reset: ${name}`),
    sync: (name: string, count: number) => emit('INFO', 'DEVICE', `Sync: ${name} | ${count} records`),
  },

  // API events (MXFace)
  api: {
    enrollCall: (empCode: string) => emit('INFO', 'API', `MXFace Enroll: ${empCode}`),
    searchCall: (templateLen: number) => emit('INFO', 'API', `MXFace Search: template ${templateLen} chars`),
    verifyCall: (empCode: string) => emit('INFO', 'API', `MXFace Verify: ${empCode}`),
    success: (endpoint: string, ms: number) => emit('SUCCESS', 'API', `${endpoint} OK | ${ms}ms`),
    failed: (endpoint: string, status: number, reason: string) =>
      emit('ERROR', 'API', `${endpoint} FAILED | Status: ${status} | ${reason}`),
    timeout: (endpoint: string) => emit('ERROR', 'API', `${endpoint} TIMEOUT`),
  },

  // System events
  system: {
    dbConnected: () => emit('SUCCESS', 'SYSTEM', 'Supabase Database connected'),
    realtimeConnected: () => emit('SUCCESS', 'SYSTEM', 'Supabase Realtime subscribed'),
    error: (msg: string) => emit('ERROR', 'SYSTEM', msg),
  },

  // Generic
  info: (domain: LogDomain, msg: string, meta?: Record<string, any>) => emit('INFO', domain, msg, meta),
  warn: (domain: LogDomain, msg: string) => emit('WARN', domain, msg),
  error: (domain: LogDomain, msg: string) => emit('ERROR', domain, msg),
};

/** Get all stored logs (for Developer Console) */
export function getStoredLogs(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(sessionStorage.getItem('agencyos_logs') || '[]');
  } catch {
    return [];
  }
}
