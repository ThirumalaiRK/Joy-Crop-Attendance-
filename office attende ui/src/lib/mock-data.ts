export type DeviceStatus = "online" | "offline" | "syncing";

export type Device = {
  id: string;
  name: string;
  model: string;
  serial: string;
  firmware: string;
  mac: string;
  ip: string;
  gateway: string;
  dhcp: boolean;
  port: number;
  algorithm: string;
  platform: string;
  branch: string;
  users: number;
  fingerprints: number;
  faces: number;
  attendanceLogs: number;
  storagePct: number;
  lastSync: string;
  latencyMs: number;
  packetLossPct: number;
  uptime: string;
  status: DeviceStatus;
  pendingSync: number;
};

export const devices: Device[] = [
  {
    id: "k90-hq-01",
    name: "HQ Main Entrance",
    model: "K90 Pro",
    serial: "CJXK194860233",
    firmware: "Ver 6.60 Aug 12 2024",
    mac: "00:17:61:12:9A:44",
    ip: "192.168.1.201",
    gateway: "192.168.1.1",
    dhcp: true,
    port: 4370,
    algorithm: "ZKFinger VX10.0",
    platform: "ZMM220_TFT",
    branch: "Head Office",
    users: 412,
    fingerprints: 806,
    faces: 122,
    attendanceLogs: 184203,
    storagePct: 46,
    lastSync: "12 seconds ago",
    latencyMs: 18,
    packetLossPct: 0,
    uptime: "14d 06h",
    status: "online",
    pendingSync: 0,
  },
  {
    id: "f18-plant-02",
    name: "Plant Gate B",
    model: "F18",
    serial: "AK9F203991774",
    firmware: "Ver 6.60 Mar 03 2023",
    mac: "00:17:61:08:22:71",
    ip: "192.168.4.32",
    gateway: "192.168.4.1",
    dhcp: false,
    port: 4370,
    algorithm: "ZKFinger VX9.0",
    platform: "ZEM560",
    branch: "Manufacturing Plant",
    users: 288,
    fingerprints: 562,
    faces: 0,
    attendanceLogs: 96110,
    storagePct: 71,
    lastSync: "1 minute ago",
    latencyMs: 42,
    packetLossPct: 1.2,
    uptime: "6d 21h",
    status: "syncing",
    pendingSync: 143,
  },
  {
    id: "iclock-wh-03",
    name: "Warehouse Turnstile",
    model: "iClock 680",
    serial: "IC6803399201",
    firmware: "Ver 6.21 Nov 09 2022",
    mac: "00:17:61:41:0D:19",
    ip: "192.168.9.14",
    gateway: "192.168.9.1",
    dhcp: true,
    port: 4370,
    algorithm: "ZKFinger VX9.0",
    platform: "ZEM800",
    branch: "Central Warehouse",
    users: 96,
    fingerprints: 188,
    faces: 0,
    attendanceLogs: 41229,
    storagePct: 33,
    lastSync: "42 minutes ago",
    latencyMs: 0,
    packetLossPct: 100,
    uptime: "—",
    status: "offline",
    pendingSync: 512,
  },
  {
    id: "k40-office-04",
    name: "Sales Floor 3",
    model: "K40",
    serial: "K40772109883",
    firmware: "Ver 6.60 Jan 28 2024",
    mac: "00:17:61:77:31:02",
    ip: "192.168.1.214",
    gateway: "192.168.1.1",
    dhcp: true,
    port: 4370,
    algorithm: "ZKFinger VX10.0",
    platform: "ZMM220",
    branch: "Head Office",
    users: 144,
    fingerprints: 291,
    faces: 41,
    attendanceLogs: 60712,
    storagePct: 28,
    lastSync: "30 seconds ago",
    latencyMs: 24,
    packetLossPct: 0,
    uptime: "22d 03h",
    status: "online",
    pendingSync: 0,
  },
];

export type Employee = {
  id: string;
  code: string;
  name: string;
  designation: string;
  department: string;
  branch: string;
  manager: string;
  shift: string;
  status: "Active" | "Probation" | "Notice";
  fingerprint: boolean;
  rfid: boolean;
  face: boolean;
  device: string;
  deviceUserId: number;
  todayIn: string | null;
  todayOut: string | null;
  state: "Present" | "Late" | "Absent" | "On Leave";
};

const first = [
  "Aarav",
  "Meera",
  "Rohan",
  "Sofia",
  "Daniel",
  "Ishita",
  "Kabir",
  "Elena",
  "Marcus",
  "Priya",
  "Noah",
  "Anika",
  "Victor",
  "Leila",
  "Samuel",
  "Divya",
];
const last = [
  "Sharma",
  "Iyer",
  "Whitfield",
  "Moreno",
  "Okafor",
  "Nakamura",
  "Verma",
  "Castellan",
  "Bergström",
  "Rao",
  "Lindqvist",
  "Fernandes",
  "Duarte",
  "Haddad",
  "Cole",
  "Menon",
];
const departments = ["Engineering", "Operations", "Finance", "People", "Sales", "Production"];
const designations = [
  "Shift Supervisor",
  "Senior Engineer",
  "Accounts Executive",
  "HR Partner",
  "Account Manager",
  "Machine Operator",
];
const branches = ["Head Office", "Manufacturing Plant", "Central Warehouse"];
const shifts = ["General 09:00–18:00", "Night 22:00–06:00", "Split 07:00–20:00", "Flexible"];
const states: Employee["state"][] = ["Present", "Present", "Present", "Late", "On Leave", "Absent"];

function pick<T>(arr: T[], i: number): T {
  return arr[((i % arr.length) + arr.length) % arr.length] as T;
}

export const employees: Employee[] = Array.from({ length: 32 }, (_, i) => {
  const name = `${pick(first, i)} ${pick(last, i * 7)}`;
  const state = pick(states, i);
  return {
    id: `emp-${1000 + i}`,
    code: `PH-${(1042 + i * 3).toString().padStart(4, "0")}`,
    name,
    designation: pick(designations, i),
    department: pick(departments, i),
    branch: pick(branches, i),
    manager: `${pick(first, i + 5)} ${pick(last, i + 2)}`,
    shift: pick(shifts, i),
    status: i % 11 === 0 ? "Probation" : i % 17 === 0 ? "Notice" : "Active",
    fingerprint: i % 9 !== 0,
    rfid: i % 3 === 0,
    face: i % 4 === 0,
    device: pick(devices, i).name,
    deviceUserId: 100 + i,
    todayIn: state === "Absent" || state === "On Leave" ? null : state === "Late" ? "09:41" : "08:52",
    todayOut: state === "Absent" || state === "On Leave" ? null : i % 5 === 0 ? null : "18:07",
    state,
  };
});

export type Punch = {
  id: string;
  employee: string;
  code: string;
  time: string;
  type: "IN" | "OUT" | "BREAK IN" | "BREAK OUT" | "OVERTIME";
  device: string;
  method: "Fingerprint" | "Face" | "RFID" | "Password";
  branch: string;
};

const punchTypes: Punch["type"][] = ["IN", "OUT", "BREAK OUT", "BREAK IN", "OVERTIME"];
const methods: Punch["method"][] = ["Fingerprint", "Face", "RFID", "Password"];

export const punches: Punch[] = Array.from({ length: 24 }, (_, i) => {
  const e = pick(employees, i * 3);
  const minute = 59 - i * 2;
  return {
    id: `punch-${i}`,
    employee: e.name,
    code: e.code,
    time: `${(13 - Math.floor(i / 6)).toString().padStart(2, "0")}:${Math.abs(minute)
      .toString()
      .padStart(2, "0")}`,
    type: pick(punchTypes, i),
    device: pick(devices, i).name,
    method: pick(methods, i),
    branch: pick(branches, i),
  };
});

export const attendanceTrend = [
  { day: "Mon", present: 388, late: 34, absent: 22 },
  { day: "Tue", present: 402, late: 28, absent: 14 },
  { day: "Wed", present: 396, late: 41, absent: 17 },
  { day: "Thu", present: 411, late: 22, absent: 11 },
  { day: "Fri", present: 379, late: 46, absent: 19 },
  { day: "Sat", present: 214, late: 12, absent: 8 },
  { day: "Sun", present: 96, late: 4, absent: 3 },
];

export const departmentAttendance = [
  { department: "Engineering", present: 96, capacity: 104 },
  { department: "Operations", present: 121, capacity: 134 },
  { department: "Finance", present: 38, capacity: 41 },
  { department: "People", present: 22, capacity: 24 },
  { department: "Sales", present: 64, capacity: 78 },
  { department: "Production", present: 70, capacity: 88 },
];

export const lateAnalysis = [
  { window: "0–5 min", count: 42 },
  { window: "5–15 min", count: 27 },
  { window: "15–30 min", count: 14 },
  { window: "30–60 min", count: 6 },
  { window: "60+ min", count: 3 },
];

export const hoursTrend = [
  { hour: "07", hours: 22 },
  { hour: "08", hours: 168 },
  { hour: "09", hours: 302 },
  { hour: "10", hours: 356 },
  { hour: "12", hours: 341 },
  { hour: "14", hours: 359 },
  { hour: "16", hours: 348 },
  { hour: "18", hours: 141 },
  { hour: "20", hours: 62 },
];

export const activity = [
  { time: "13:58", text: "Plant Gate B pushed 143 logs to cloud queue", kind: "sync" },
  { time: "13:41", text: "Meera Iyer leave request approved by Kabir Verma", kind: "leave" },
  { time: "13:12", text: "Fingerprint template enrolled for PH-1090 on HQ Main Entrance", kind: "enroll" },
  { time: "12:36", text: "Warehouse Turnstile lost heartbeat — auto reconnect scheduled", kind: "alert" },
  { time: "11:58", text: "Manual punch correction approved for PH-1054", kind: "approval" },
  { time: "10:04", text: "Monthly attendance report exported by admin@pulsehr.io", kind: "report" },
];
