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
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

import { getConnectorUrl } from "../lib/utils";
import { supabase } from "../lib/supabase";

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

function getSharedSocket(): Socket {
  if (!sharedSocket || !sharedSocket.connected) {
    sharedSocket = io(getConnectorUrl(), {
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

    const normalize = (data: any): AttendanceEvent => ({
      employeeId: data.employeeId ?? data.employee_id ?? data.device_user_id ?? "unknown",
      employeeName: data.employeeName ?? data.employee_name ?? data.name,
      type: data.type ?? data.event_type ?? data.eventType ?? "PUNCH",
      time: data.time ?? data.machine_timestamp ?? data.event_time ?? data.recordTime ?? new Date().toISOString(),
      device: data.device ?? data.device_name ?? "Identix K90 Pro",
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
    socket.on("disconnect", () => {});
    socket.on("attendance:new", handlePunch);
    socket.on("attendance_received", handlePunch);

    if (socket.connected) setIsStreaming(true);

    // Supabase Realtime channel subscription for cloud Vercel deployments & fallback
    const supabaseChannel = supabase
      .channel('feed-biometric-punches')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'biometric_raw_punches' }, (payload: any) => {
        setIsStreaming(true);
        if (payload.new) {
          handlePunch(payload.new);
        }
      })
      .subscribe();

    return () => {
      socket.off("attendance:new", handlePunch);
      socket.off("attendance_received", handlePunch);
      supabase.removeChannel(supabaseChannel);
    };
  }, [maxEvents]);

  return { feed, lastEvent, todayCount, isStreaming };
}
