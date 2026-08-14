"use client";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

import { getConnectorUrl } from "../lib/utils";
import { supabase } from "../lib/supabase";

export interface DeviceStatusState {
  ip: string;
  port?: number;
  name?: string;
  status: "ONLINE" | "CONNECTING" | "SYNCING" | "OFFLINE" | "ERROR" | "RECONNECTING";
  latency_ms?: number;
  lastHeartbeat?: string;
}

export function useDeviceSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastAttendance, setLastAttendance] = useState<any>(null);
  const [attendanceStream, setAttendanceStream] = useState<any[]>([]);
  const [enrollmentStatus, setEnrollmentStatus] = useState<any>(null);
  const [deviceStatuses, setDeviceStatuses] = useState<Record<string, DeviceStatusState>>({});
  // Ref to avoid stale closures in heartbeat comparison
  const deviceStatusesRef = useRef<Record<string, DeviceStatusState>>({});

  useEffect(() => {
    const isBrowser = typeof window !== 'undefined';
    const connectorUrl = getConnectorUrl();
    const isLocalhostConnector = connectorUrl.includes('localhost') || connectorUrl.includes('127.0.0.1');
    const isCloud = isBrowser && window.location.hostname.includes('vercel.app');

    const updateDevice = (patch: Partial<DeviceStatusState> & { ip: string }) => {
      setDeviceStatuses((prev) => {
        const next = { ...prev, [patch.ip]: { ...prev[patch.ip], ...patch } };
        deviceStatusesRef.current = next;
        return next;
      });
    };

    // Always subscribe to Supabase Realtime for biometric_raw_punches & device_status as primary/fallback cloud layer
    const realtimeChannel = supabase
      .channel('cloud-device-punch-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'device_status' }, (payload: any) => {
        const d = payload.new;
        if (d && d.device_ip) {
          const lastPingMs = d.last_ping ? new Date(d.last_ping).getTime() : 0;
          const isFresh = Date.now() - lastPingMs < 300_000;
          updateDevice({
            ip: d.device_ip,
            name: d.device_name || 'Identix K90 Pro Terminal',
            status: isFresh && (d.status === 'online' || d.status === 'ONLINE') ? 'ONLINE' : 'OFFLINE',
            latency_ms: d.latency_ms || 12,
            lastHeartbeat: d.last_ping || new Date().toISOString(),
          });
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'biometric_raw_punches' }, (payload: any) => {
        const raw = payload.new;
        if (raw) {
          const punch = {
            employeeId: raw.device_user_id || raw.employee_id || 'UNKNOWN',
            employeeName: raw.employee_name || `User ${raw.device_user_id || ''}`,
            type: raw.event_type || 'RAW_PUNCH',
            time: raw.machine_timestamp || raw.event_time_utc || new Date().toISOString(),
            device: raw.device_name || 'Identix K90 Pro',
            deviceIp: raw.device_ip || '192.168.1.56',
            verificationType: raw.verification_type || 'FINGERPRINT',
          };
          setLastAttendance(punch);
          setAttendanceStream((prev) => [punch, ...prev.slice(0, 49)]);
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendance_events' }, (payload: any) => {
        const evt = payload.new;
        if (evt) {
          const punch = {
            employeeId: evt.employee_id,
            employeeName: evt.employee_name,
            type: evt.event_type || 'CHECK_IN',
            time: evt.event_time || new Date().toISOString(),
            device: evt.device || 'Identix K90 Pro',
          };
          setLastAttendance(punch);
          setAttendanceStream((prev) => [punch, ...prev.slice(0, 49)]);
        }
      })
      .subscribe();

    // On cloud Vercel deployments without direct local tunnel, use Supabase Realtime Cloud Sync
    if (isCloud && isLocalhostConnector) {
      setIsConnected(true);
      setConnectionError(null);

      // Load initial device state from Supabase DB
      supabase.from('device_status').select('*').then(({ data }) => {
        if (data && data.length > 0) {
          const map: Record<string, DeviceStatusState> = {};
          data.forEach((d: any) => {
            const lastPingMs = d.last_ping ? new Date(d.last_ping).getTime() : 0;
            const isFresh = Date.now() - lastPingMs < 300_000;
            map[d.device_ip] = {
              ip: d.device_ip,
              name: d.device_name || 'Identix K90 Pro Terminal',
              status: isFresh && (d.status === 'online' || d.status === 'ONLINE') ? 'ONLINE' : 'OFFLINE',
              latency_ms: d.latency_ms || 12,
              lastHeartbeat: d.last_ping || new Date().toISOString(),
            };
          });
          deviceStatusesRef.current = map;
          setDeviceStatuses(map);
        }
      });

      return () => {
        supabase.removeChannel(realtimeChannel);
      };
    }

    const socketInstance = io(connectorUrl, {
      transports: ['polling', 'websocket'],
      extraHeaders: {
        'ngrok-skip-browser-warning': 'true',
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
      reconnectionDelayMax: 30_000,
      timeout: 4000,
    });

    socketInstance.on("connect", () => {
      setIsConnected(true);
      setConnectionError(null);
      console.log("[Socket] Connected to TCP Connector via Socket.IO");
    });

    socketInstance.on("disconnect", (reason) => {
      setIsConnected(false);
      console.log("[Socket] Disconnected from Socket.IO:", reason);
    });

    socketInstance.on("connect_error", (err) => {
      setConnectionError(`Connector socket offline: ${err.message}`);
    });

    // ── Attendance events ───────────────────────────────────────────────────
    const handleNewPunch = (data: any) => {
      setLastAttendance(data);
      setAttendanceStream((prev) => [data, ...prev.slice(0, 49)]);
    };
    socketInstance.on("attendance:new", handleNewPunch);
    socketInstance.on("attendance_received", handleNewPunch);

    // ── State restore: bulk device states on connect (from connector) ───────
    socketInstance.on("devices:state", (devices: DeviceStatusState[]) => {
      const map: Record<string, DeviceStatusState> = {};
      for (const d of devices) { map[d.ip] = d; }
      deviceStatusesRef.current = map;
      setDeviceStatuses(map);
    });

    socketInstance.on("device:online", (data: any) =>
      updateDevice({ ip: data.ip, name: data.name, status: "ONLINE", latency_ms: data.latency_ms, lastHeartbeat: data.lastHeartbeat }));

    socketInstance.on("device:offline", (data: any) =>
      updateDevice({ ip: data.ip, status: "OFFLINE" }));

    socketInstance.on("device:reconnecting", (data: any) =>
      updateDevice({ ip: data.ip, status: "RECONNECTING" }));

    socketInstance.on("device:connecting", (data: any) =>
      updateDevice({ ip: data.ip, status: "CONNECTING" }));

    // ── Heartbeat: only re-render if something meaningful changed ───────────
    socketInstance.on("heartbeat", (data: any) => {
      const existing = deviceStatusesRef.current[data.ip];
      const latencyDelta = Math.abs((existing?.latency_ms ?? 0) - (data.latency_ms ?? 0));
      const statusChanged = existing?.status !== "ONLINE";
      if (statusChanged || latencyDelta > 5) {
        updateDevice({ ip: data.ip, status: "ONLINE", latency_ms: data.latency_ms, lastHeartbeat: data.lastHeartbeat });
      } else {
        deviceStatusesRef.current = {
          ...deviceStatusesRef.current,
          [data.ip]: { ...deviceStatusesRef.current[data.ip], lastHeartbeat: data.lastHeartbeat },
        };
      }
    });

    // ── Enrollment lifecycle ────────────────────────────────────────────────
    socketInstance.on("enrollment_started", (data) => setEnrollmentStatus(data));
    socketInstance.on("enrollment_success", (data) => setEnrollmentStatus(data));
    socketInstance.on("enrollment_failed", (data) => setEnrollmentStatus(data));

    setSocket(socketInstance);
    return () => {
      socketInstance.disconnect();
      supabase.removeChannel(realtimeChannel);
    };
  }, []);

  return {
    socket,
    isConnected,
    connectionError,
    lastAttendance,
    attendanceStream,
    enrollmentStatus,
    deviceStatuses,
  };
}
