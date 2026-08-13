import { DateTime } from 'luxon';

export const APP_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns current DateTime object explicitly set to Asia/Kolkata (IST)
 */
export function nowIST(): DateTime {
  return DateTime.now().setZone(APP_TIMEZONE);
}

/**
 * Returns current business date string in IST ("YYYY-MM-DD")
 * Single source of truth for "today's date" across the web app.
 * Replaces new Date().toISOString().slice(0, 10) which returns UTC date!
 */
export function getISTDateStr(dateInput?: string | Date): string {
  if (!dateInput) {
    return DateTime.now().setZone(APP_TIMEZONE).toFormat('yyyy-MM-dd');
  }
  if (dateInput instanceof Date) {
    return DateTime.fromJSDate(dateInput, { zone: 'utc' }).setZone(APP_TIMEZONE).toFormat('yyyy-MM-dd');
  }
  const dt = DateTime.fromISO(dateInput, { zone: APP_TIMEZONE });
  if (dt.isValid) return dt.toFormat('yyyy-MM-dd');
  return DateTime.now().setZone(APP_TIMEZONE).toFormat('yyyy-MM-dd');
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
    const dt = DateTime.fromISO(value, { zone: 'utc' });
    if (dt.isValid) {
      return dt.setZone(APP_TIMEZONE);
    }
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
 */
export function parseDeviceTimeToUTC(deviceTimeStr: string | Date): string {
  if (deviceTimeStr instanceof Date) {
    return deviceTimeStr.toISOString();
  }

  const str = String(deviceTimeStr).trim();

  let dt = DateTime.fromFormat(str, 'yyyy-MM-dd HH:mm:ss', { zone: APP_TIMEZONE });

  if (!dt.isValid) {
    dt = DateTime.fromFormat(str, "yyyy-MM-dd'T'HH:mm:ss", { zone: APP_TIMEZONE });
  }

  if (!dt.isValid) {
    dt = DateTime.fromISO(str, { zone: APP_TIMEZONE });
  }

  if (!dt.isValid) {
    return new Date(str).toISOString();
  }

  return dt.toUTC().toISO()!;
}

/**
 * Formats a raw machine timestamp string (e.g. "2026-08-13 09:20:59")
 * explicitly parsed in Asia/Kolkata timezone.
 * Returns: "13 Aug 2026 · 09:20:59 AM IST" or "09:20:59 AM"
 */
export function formatMachineTimeIST(machineTimestampStr: string, timeOnly: boolean = false): string {
  if (!machineTimestampStr) return '—';
  const str = String(machineTimestampStr).trim();

  let dt = DateTime.fromFormat(str, 'yyyy-MM-dd HH:mm:ss', { zone: APP_TIMEZONE });
  if (!dt.isValid) {
    dt = DateTime.fromFormat(str, "yyyy-MM-dd'T'HH:mm:ss", { zone: APP_TIMEZONE });
  }
  if (!dt.isValid) {
    dt = DateTime.fromISO(str, { zone: APP_TIMEZONE });
  }

  if (dt.isValid) {
    return timeOnly
      ? dt.toFormat('hh:mm:ss a')
      : `${dt.toFormat('dd MMM yyyy · hh:mm:ss a')} IST`;
  }
  return str;
}

/**
 * Calculates start and end of business day in IST and returns both IST & UTC bounds.
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
