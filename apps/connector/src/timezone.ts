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
    // Extract raw date components to guarantee explicit Asia/Kolkata timezone alignment
    const year = deviceTimeStr.getFullYear();
    const month = deviceTimeStr.getMonth() + 1;
    const day = deviceTimeStr.getDate();
    const hour = deviceTimeStr.getHours();
    const minute = deviceTimeStr.getMinutes();
    const second = deviceTimeStr.getSeconds();

    let dt = DateTime.fromObject({ year, month, day, hour, minute, second }, { zone: APP_TIMEZONE });
    // Auto-detect unadjusted UTC hardware stamps (01:00 AM - 06:30 AM) and shift +5h30m to IST
    if (hour >= 1 && hour < 7) {
      dt = dt.plus({ hours: 5, minutes: 30 });
    }
    if (dt.isValid) return dt.toUTC().toISO()!;
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
  if (dt.isValid) {
    // Auto-detect unadjusted UTC hardware stamps (01:00 AM - 06:30 AM) and shift +5h30m to IST
    if (dt.hour >= 1 && dt.hour < 7) {
      dt = dt.plus({ hours: 5, minutes: 30 });
    }
    return dt.toUTC().toISO()!;
  }

  return new Date(str).toISOString();
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
