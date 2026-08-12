"use client";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

import { getConnectorUrl } from "../lib/utils";

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

    // On cloud Vercel deployments without an active public tunnel, skip direct localhost socket
    if (isCloud && isLocalhostConnector) {
      return;
    }

    const socketInstance = io(connectorUrl, {
      transports: ['polling', 'websocket'],
      extraHeaders: {
        'ngrok-skip-browser-warning': 'true',
      },
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 5000,
      reconnectionDelayMax: 30_000,
      timeout: 4000,
    });

    socketInstance.on("connect", () => {
      setIsConnected(true);
      setConnectionError(null);
      console.log("[Socket] Connected to TCP Connector");
    });

    socketInstance.on("disconnect", (reason) => {
      setIsConnected(false);
      console.log("[Socket] Disconnected:", reason);
    });

    socketInstance.on("connect_error", (err) => {
      setConnectionError(`Connector offline: ${err.message}`);
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

    // ── Shared helper to patch a single device without full object spread ───
    const updateDevice = (patch: Partial<DeviceStatusState> & { ip: string }) => {
      setDeviceStatuses((prev) => {
        const next = { ...prev, [patch.ip]: { ...prev[patch.ip], ...patch } };
        deviceStatusesRef.current = next;
        return next;
      });
    };

    socketInstance.on("device:online", (data: any) =>
      updateDevice({ ip: data.ip, name: data.name, status: "ONLINE", latency_ms: data.latency_ms, lastHeartbeat: data.lastHeartbeat }));

    socketInstance.on("device:offline", (data: any) =>
      updateDevice({ ip: data.ip, status: "OFFLINE" }));

    socketInstance.on("device:reconnecting", (data: any) =>
      updateDevice({ ip: data.ip, status: "RECONNECTING" }));

    socketInstance.on("device:connecting", (data: any) =>
      updateDevice({ ip: data.ip, status: "CONNECTING" }));

    // ── Heartbeat: only re-render if something meaningful changed ───────────
    // Connector already throttles this to 30s. We guard further:
    // skip setState if latency change is <5ms AND status was already ONLINE.
    socketInstance.on("heartbeat", (data: any) => {
      const existing = deviceStatusesRef.current[data.ip];
      const latencyDelta = Math.abs((existing?.latency_ms ?? 0) - (data.latency_ms ?? 0));
      const statusChanged = existing?.status !== "ONLINE";
      if (statusChanged || latencyDelta > 5) {
        updateDevice({ ip: data.ip, status: "ONLINE", latency_ms: data.latency_ms, lastHeartbeat: data.lastHeartbeat });
      } else {
        // Silent ref update — no React re-render
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
    return () => { socketInstance.disconnect(); };
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
