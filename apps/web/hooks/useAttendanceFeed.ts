"use client";
/**
 * useAttendanceFeed
 *
 * Lightweight hook that ONLY subscribes to attendance stream events.
 * Components that use this hook will NOT re-render on device heartbeats,
 * device status changes, or enrollment events — only on new punches.
 *
 * Use this in:  Dashboard attendance table, Live timeline, Toast notifications.
 * Use useDeviceSocket for: Device status cards, Admin device panel.
 */
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const CONNECTOR_URL = process.env.NEXT_PUBLIC_CONNECTOR_URL || "http://localhost:4000";

export interface AttendanceEvent {
  employeeId: string;
  employeeName?: string;
  type: string;          // CHECK_IN | CHECK_OUT | etc.
  time: string;          // ISO timestamp
  device?: string;
  deviceIp?: string;
  location?: string;
  confidence?: number;
}

// Shared singleton socket — avoids multiple connections if multiple
// components use useAttendanceFeed on the same page.
let sharedSocket: Socket | null = null;
let refCount = 0;

function getSharedSocket(): Socket {
  if (!sharedSocket || !sharedSocket.connected) {
    sharedSocket = io(CONNECTOR_URL, {
      transports: ['websocket', 'polling'],
      extraHeaders: {
        'ngrok-skip-browser-warning': 'true',
      },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30_000,
      randomizationFactor: 0.3,
    });
  }
  return sharedSocket;
}

export function useAttendanceFeed(maxEvents = 50) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [feed, setFeed] = useState<AttendanceEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<AttendanceEvent | null>(null);
  const [todayCount, setTodayCount] = useState(0);

  useEffect(() => {
    const socket = getSharedSocket();
    refCount++;

    const normalize = (data: any): AttendanceEvent => ({
      employeeId: data.employeeId ?? data.employee_id ?? data.device_user_id ?? "unknown",
      employeeName: data.employeeName ?? data.employee_name ?? data.name,
      type: data.type ?? data.event_type ?? data.eventType ?? "PUNCH",
      time: data.time ?? data.event_time ?? data.recordTime ?? new Date().toISOString(),
      device: data.device ?? data.device_name,
      deviceIp: data.deviceIp ?? data.device_ip,
      location: data.location,
      confidence: data.confidence ?? data.confidence_score,
    });

    const handlePunch = (data: any) => {
      const evt = normalize(data);
      setLastEvent(evt);
      setFeed((prev) => [evt, ...prev.slice(0, maxEvents - 1)]);
      setTodayCount((n) => n + 1);
    };

    socket.on("connect", () => setIsStreaming(true));
    socket.on("disconnect", () => setIsStreaming(false));
    socket.on("attendance:new", handlePunch);
    socket.on("attendance_received", handlePunch);

    // Replay last event from state restore
    if (socket.connected) setIsStreaming(true);

    return () => {
      socket.off("attendance:new", handlePunch);
      socket.off("attendance_received", handlePunch);
      refCount--;
      // Don't disconnect shared socket — other components may still need it
    };
  }, [maxEvents]);

  return { feed, lastEvent, todayCount, isStreaming };
}
