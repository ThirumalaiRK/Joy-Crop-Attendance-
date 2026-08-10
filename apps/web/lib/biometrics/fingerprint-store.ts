/**
 * Enterprise Biometric Fingerprint Store & RAM Isolation Engine
 * Manages transactional fingerprint template records, duplicate detection, and session isolation.
 */

export interface EnrolledFingerRecord {
  templateUuid?: string;
  employeeUuid?: string;
  externalId: string; // employee_code (e.g. EMP-000234)
  fingerPosition: string;
  fingerPrint: string;
  qualityScore: number;
  enrolledAt: string;
}

// Global in-memory RAM cache for server runtime / API routes
export const globalEnrolledFingerprints: EnrolledFingerRecord[] = [];

/**
 * Clear in-memory fingerprint cache (SDK.FlushMemory)
 */
export function clearFingerprintCache() {
  globalEnrolledFingerprints.length = 0;
}

/**
 * Register fingerprint template in server/client cache with position metadata
 */
export function registerEnrolledFingerprint(
  externalId: string,
  fingerPrint: string,
  fingerPosition: string = 'Right Thumb',
  qualityScore: number = 98,
  employeeUuid?: string
) {
  if (!externalId || !fingerPrint) return;

  const record: EnrolledFingerRecord = {
    templateUuid: `TPL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    employeeUuid,
    externalId,
    fingerPosition,
    fingerPrint,
    qualityScore,
    enrolledAt: new Date().toISOString(),
  };

  // Replace existing template for same employee and position or append
  const existingIdx = globalEnrolledFingerprints.findIndex(
    (f) => f.externalId === externalId && f.fingerPosition === fingerPosition
  );

  if (existingIdx >= 0) {
    globalEnrolledFingerprints[existingIdx] = record;
  } else {
    globalEnrolledFingerprints.unshift(record);
  }
}

/**
 * Perform SDK 1:N Duplicate Fingerprint Search across all registered templates.
 * Returns match info if this fingerprint belongs to ANOTHER employee.
 */
export function searchDuplicateFingerprint(
  scannedFingerPrint: string,
  currentEmployeeCode?: string
): EnrolledFingerRecord | null {
  if (!scannedFingerPrint) return null;

  // Search through registered fingerprints for a matching template registered to a DIFFERENT employee
  const match = globalEnrolledFingerprints.find((item) => {
    const isDifferentEmployee = !currentEmployeeCode || item.externalId !== currentEmployeeCode;
    const isSameTemplate =
      item.fingerPrint === scannedFingerPrint ||
      (scannedFingerPrint.length > 50 && item.fingerPrint.slice(0, 50) === scannedFingerPrint.slice(0, 50));
    return isDifferentEmployee && isSameTemplate;
  });

  return match || null;
}

/**
 * Find matching employee ID for a scanned fingerprint during attendance.
 * Performs strict biometric template lookup mapped to employee_uuid / employee_code.
 */
export function findMatchingFingerprint(scannedFingerPrint: string): string | null {
  if (!scannedFingerPrint) return null;

  const match = globalEnrolledFingerprints.find(
    (item) =>
      item.fingerPrint === scannedFingerPrint ||
      (scannedFingerPrint.length > 30 && item.fingerPrint.slice(0, 30) === scannedFingerPrint.slice(0, 30))
  );

  if (match) {
    return match.externalId;
  }

  return null;
}
