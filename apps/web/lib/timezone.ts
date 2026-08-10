import { DateTime } from 'luxon';

export const APP_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns current DateTime object explicitly set to Asia/Kolkata (IST)
 */
export function nowIST(): DateTime {
  return DateTime.now().setZone(APP_TIMEZONE);
}

/**
 * Converts a UTC Date object, string, or timestamp to Luxon DateTime in Asia/Kolkata (IST)
 */
export function utcToIST(value: string | Date | number): DateTime {
  if (value instanceof Date) {
    return DateTime.fromJSDate(value, { zone: 'utc' }).setZone(APP_TIMEZONE);
  }
  if (typeof value === 'number') {
    return DateTime.fromMillis(value, { zone: 'utc' }).setZone(APP_TIMEZONE);
  }
  if (typeof value === 'string') {
    // If string already has offset or ISO Z
    const dt = DateTime.fromISO(value, { zone: 'utc' });
    if (dt.isValid) {
      return dt.setZone(APP_TIMEZONE);
    }
    // Fallback: JS Date parse
    return DateTime.fromJSDate(new Date(value), { zone: 'utc' }).setZone(APP_TIMEZONE);
  }
  return DateTime.now().setZone(APP_TIMEZONE);
}

/**
 * Converts an IST ISO string or formatted string to UTC ISO string
 */
export function istToUTC(value: string): string {
  const dt = DateTime.fromISO(value, { zone: APP_TIMEZONE });
  if (dt.isValid) {
    return dt.toUTC().toISO()!;
  }
  return new Date(value).toISOString();
}

/**
 * Parses raw un-timezoned biometric hardware device time (e.g. "2026-08-10 09:20:30" or ISO string)
 * explicitly as Asia/Kolkata local time and converts to canonical UTC ISO string.
 *
 * Example:
 *   "2026-08-10 09:20:30" IST -> "2026-08-10T03:50:30.000Z" UTC
 */
export function parseDeviceTimeToUTC(deviceTimeStr: string | Date): string {
  if (deviceTimeStr instanceof Date) {
    return deviceTimeStr.toISOString();
  }

  const str = String(deviceTimeStr).trim();

  // Try standard hardware format: YYYY-MM-DD HH:mm:ss
  let dt = DateTime.fromFormat(str, 'yyyy-MM-dd HH:mm:ss', { zone: APP_TIMEZONE });

  if (!dt.isValid) {
    // Try YYYY-MM-DDTHH:mm:ss
    dt = DateTime.fromFormat(str, "yyyy-MM-dd'T'HH:mm:ss", { zone: APP_TIMEZONE });
  }

  if (!dt.isValid) {
    // Try ISO string
    dt = DateTime.fromISO(str, { zone: APP_TIMEZONE });
  }

  if (!dt.isValid) {
    // Fallback to JS Date
    return new Date(str).toISOString();
  }

  return dt.toUTC().toISO()!;
}

/**
 * Calculates start and end of business day in IST and returns both IST & UTC bounds.
 *
 * CRITICAL ARCHITECTURAL GUARANTEE:
 *   IST Start of Day:  2026-08-10 00:00:00.000+05:30
 *   UTC Query Equivalent: 2026-08-09T18:30:00.000Z (Previous calendar date UTC)
 *
 * This ensures biometric logs between 12:00 AM and 05:30 AM IST are NEVER missed!
 */
export function getAttendanceDayRange(dateISTStr?: string) {
  let baseIST: DateTime;

  if (dateISTStr) {
    baseIST = DateTime.fromISO(dateISTStr, { zone: APP_TIMEZONE });
    if (!baseIST.isValid) {
      baseIST = DateTime.fromFormat(dateISTStr, 'yyyy-MM-dd', { zone: APP_TIMEZONE });
    }
  } else {
    baseIST = DateTime.now().setZone(APP_TIMEZONE);
  }

  if (!baseIST || !baseIST.isValid) {
    baseIST = DateTime.now().setZone(APP_TIMEZONE);
  }

  const startIST = baseIST.startOf('day');
  const endIST = baseIST.endOf('day');

  const startUTC = startIST.toUTC().toISO()!;
  const endUTC = endIST.toUTC().toISO()!;

  return {
    dateIST: startIST.toFormat('yyyy-MM-dd'),
    startIST,
    endIST,
    startUTC,
    endUTC,
  };
}

/**
 * Formats a UTC string or Date object into human-readable IST display string.
 * Example: "10 Aug 2026 • 09:20:30 AM IST"
 */
export function formatDisplayIST(utcValue: string | Date | number, formatStr: string = 'dd MMM yyyy • hh:mm:ss a'): string {
  const dt = utcToIST(utcValue);
  return dt.toFormat(formatStr);
}
