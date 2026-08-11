import { DateTime } from 'luxon';

export const APP_TIMEZONE = 'Asia/Kolkata';

export function nowIST(): DateTime {
  return DateTime.now().setZone(APP_TIMEZONE);
}

export function utcToIST(value: string | Date | number): DateTime {
  if (value instanceof Date) {
    return DateTime.fromJSDate(value, { zone: 'utc' }).setZone(APP_TIMEZONE);
  }
  if (typeof value === 'number') {
    return DateTime.fromMillis(value, { zone: 'utc' }).setZone(APP_TIMEZONE);
  }
  if (typeof value === 'string') {
    const dt = DateTime.fromISO(value, { zone: 'utc' });
    if (dt.isValid) return dt.setZone(APP_TIMEZONE);
    return DateTime.fromJSDate(new Date(value), { zone: 'utc' }).setZone(APP_TIMEZONE);
  }
  return DateTime.now().setZone(APP_TIMEZONE);
}

export function istToUTC(value: string): string {
  const dt = DateTime.fromISO(value, { zone: APP_TIMEZONE });
  if (dt.isValid) return dt.toUTC().toISO()!;
  return new Date(value).toISOString();
}

/**
 * Parses raw un-timezoned biometric hardware device time (e.g. "2026-08-10 09:20:30")
 * explicitly as Asia/Kolkata local time and converts to canonical UTC ISO string.
 */
export function parseDeviceTimeToUTC(deviceTimeStr: string | Date): string {
  if (deviceTimeStr instanceof Date) {
    if (!isNaN(deviceTimeStr.getTime())) {
      return deviceTimeStr.toISOString();
    }
    return new Date().toISOString();
  }

  const str = String(deviceTimeStr).trim();
  if (!str) return new Date().toISOString();

  // If input string is ALREADY a valid ISO string (e.g. '2026-08-11T11:35:52.000Z')
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/i.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // Parse raw un-timezoned hardware string e.g. "2026-08-11 17:35:52" explicitly as Asia/Kolkata local time
  let dt = DateTime.fromFormat(str, 'yyyy-MM-dd HH:mm:ss', { zone: APP_TIMEZONE });
  if (!dt.isValid) {
    dt = DateTime.fromFormat(str, "yyyy-MM-dd'T'HH:mm:ss", { zone: APP_TIMEZONE });
  }
  if (dt.isValid) {
    return dt.toUTC().toISO()!;
  }

  const fallbackDate = new Date(str);
  return !isNaN(fallbackDate.getTime()) ? fallbackDate.toISOString() : new Date().toISOString();
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
