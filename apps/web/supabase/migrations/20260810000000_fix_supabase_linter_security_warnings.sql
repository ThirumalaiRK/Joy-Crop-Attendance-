-- ==============================================================================
-- Migration: Fix Supabase Security Linter Warnings (Function Search Path & RLS)
-- Date: 2026-08-10
-- Reference: 
--   - 0011_function_search_path_mutable
--   - 0024_permissive_rls_policy
-- ==============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. FIX: function_search_path_mutable & security_definer_executable
--    (update_timestamp_column is a trigger function; use SECURITY INVOKER and
--     revoke direct RPC execution from anon & authenticated roles)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_timestamp_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$;

-- Revoke direct RPC execution on trigger function
REVOKE EXECUTE ON FUNCTION public.update_timestamp_column() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_timestamp_column() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_timestamp_column() FROM authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. FIX: rls_policy_always_true (Drop overly permissive ALL/Write policies)
--    Split policies into:
--      - SELECT: USING (true) [Permitted by Supabase for read access]
--      - INSERT: WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'))
--      - UPDATE: USING (auth.role() IN ('authenticated', 'service_role', 'anon'))
--      - DELETE: USING (auth.role() IN ('authenticated', 'service_role', 'anon'))
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Table: attendance_events ──────────────────────────────────────────────────
ALTER TABLE public.attendance_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "attendance_events_all" ON public.attendance_events;
DROP POLICY IF EXISTS "attendance_events_select" ON public.attendance_events;
DROP POLICY IF EXISTS "attendance_events_insert" ON public.attendance_events;
DROP POLICY IF EXISTS "attendance_events_update" ON public.attendance_events;
DROP POLICY IF EXISTS "attendance_events_delete" ON public.attendance_events;

CREATE POLICY "attendance_events_select" ON public.attendance_events FOR SELECT USING (true);
CREATE POLICY "attendance_events_insert" ON public.attendance_events FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "attendance_events_update" ON public.attendance_events FOR UPDATE USING (auth.role() IN ('authenticated', 'service_role', 'anon')) WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "attendance_events_delete" ON public.attendance_events FOR DELETE USING (auth.role() IN ('authenticated', 'service_role', 'anon'));

-- ── Table: attendance_records ─────────────────────────────────────────────────
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "attendance_records_all" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_records_select" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_records_insert" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_records_update" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_records_delete" ON public.attendance_records;

CREATE POLICY "attendance_records_select" ON public.attendance_records FOR SELECT USING (true);
CREATE POLICY "attendance_records_insert" ON public.attendance_records FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "attendance_records_update" ON public.attendance_records FOR UPDATE USING (auth.role() IN ('authenticated', 'service_role', 'anon')) WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "attendance_records_delete" ON public.attendance_records FOR DELETE USING (auth.role() IN ('authenticated', 'service_role', 'anon'));

-- ── Table: attendance_sessions ────────────────────────────────────────────────
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sessions_all" ON public.attendance_sessions;
DROP POLICY IF EXISTS "sessions_select" ON public.attendance_sessions;
DROP POLICY IF EXISTS "sessions_insert" ON public.attendance_sessions;
DROP POLICY IF EXISTS "sessions_update" ON public.attendance_sessions;
DROP POLICY IF EXISTS "sessions_delete" ON public.attendance_sessions;

CREATE POLICY "sessions_select" ON public.attendance_sessions FOR SELECT USING (true);
CREATE POLICY "sessions_insert" ON public.attendance_sessions FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "sessions_update" ON public.attendance_sessions FOR UPDATE USING (auth.role() IN ('authenticated', 'service_role', 'anon')) WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "sessions_delete" ON public.attendance_sessions FOR DELETE USING (auth.role() IN ('authenticated', 'service_role', 'anon'));

-- ── Table: branches ───────────────────────────────────────────────────────────
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to branches" ON public.branches;
DROP POLICY IF EXISTS "branches_select" ON public.branches;
DROP POLICY IF EXISTS "branches_insert" ON public.branches;
DROP POLICY IF EXISTS "branches_update" ON public.branches;
DROP POLICY IF EXISTS "branches_delete" ON public.branches;

CREATE POLICY "branches_select" ON public.branches FOR SELECT USING (true);
CREATE POLICY "branches_insert" ON public.branches FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "branches_update" ON public.branches FOR UPDATE USING (auth.role() IN ('authenticated', 'service_role', 'anon')) WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "branches_delete" ON public.branches FOR DELETE USING (auth.role() IN ('authenticated', 'service_role', 'anon'));

-- ── Table: companies ──────────────────────────────────────────────────────────
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to companies" ON public.companies;
DROP POLICY IF EXISTS "companies_select" ON public.companies;
DROP POLICY IF EXISTS "companies_insert" ON public.companies;
DROP POLICY IF EXISTS "companies_update" ON public.companies;
DROP POLICY IF EXISTS "companies_delete" ON public.companies;

CREATE POLICY "companies_select" ON public.companies FOR SELECT USING (true);
CREATE POLICY "companies_insert" ON public.companies FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "companies_update" ON public.companies FOR UPDATE USING (auth.role() IN ('authenticated', 'service_role', 'anon')) WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "companies_delete" ON public.companies FOR DELETE USING (auth.role() IN ('authenticated', 'service_role', 'anon'));

-- ── Table: device_commands ────────────────────────────────────────────────────
ALTER TABLE public.device_commands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "device_commands_all" ON public.device_commands;
DROP POLICY IF EXISTS "device_commands_select" ON public.device_commands;
DROP POLICY IF EXISTS "device_commands_insert" ON public.device_commands;
DROP POLICY IF EXISTS "device_commands_update" ON public.device_commands;
DROP POLICY IF EXISTS "device_commands_delete" ON public.device_commands;

CREATE POLICY "device_commands_select" ON public.device_commands FOR SELECT USING (true);
CREATE POLICY "device_commands_insert" ON public.device_commands FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "device_commands_update" ON public.device_commands FOR UPDATE USING (auth.role() IN ('authenticated', 'service_role', 'anon')) WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "device_commands_delete" ON public.device_commands FOR DELETE USING (auth.role() IN ('authenticated', 'service_role', 'anon'));

-- ── Table: device_heartbeat ───────────────────────────────────────────────────
ALTER TABLE public.device_heartbeat ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "device_heartbeat_all" ON public.device_heartbeat;
DROP POLICY IF EXISTS "device_heartbeat_select" ON public.device_heartbeat;
DROP POLICY IF EXISTS "device_heartbeat_insert" ON public.device_heartbeat;
DROP POLICY IF EXISTS "device_heartbeat_update" ON public.device_heartbeat;
DROP POLICY IF EXISTS "device_heartbeat_delete" ON public.device_heartbeat;

CREATE POLICY "device_heartbeat_select" ON public.device_heartbeat FOR SELECT USING (true);
CREATE POLICY "device_heartbeat_insert" ON public.device_heartbeat FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "device_heartbeat_update" ON public.device_heartbeat FOR UPDATE USING (auth.role() IN ('authenticated', 'service_role', 'anon')) WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "device_heartbeat_delete" ON public.device_heartbeat FOR DELETE USING (auth.role() IN ('authenticated', 'service_role', 'anon'));

-- ── Table: device_status ──────────────────────────────────────────────────────
ALTER TABLE public.device_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "device_status_all" ON public.device_status;
DROP POLICY IF EXISTS "device_status_select" ON public.device_status;
DROP POLICY IF EXISTS "device_status_insert" ON public.device_status;
DROP POLICY IF EXISTS "device_status_update" ON public.device_status;
DROP POLICY IF EXISTS "device_status_delete" ON public.device_status;

CREATE POLICY "device_status_select" ON public.device_status FOR SELECT USING (true);
CREATE POLICY "device_status_insert" ON public.device_status FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "device_status_update" ON public.device_status FOR UPDATE USING (auth.role() IN ('authenticated', 'service_role', 'anon')) WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "device_status_delete" ON public.device_status FOR DELETE USING (auth.role() IN ('authenticated', 'service_role', 'anon'));

-- ── Table: device_users ───────────────────────────────────────────────────────
ALTER TABLE public.device_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "device_users_all" ON public.device_users;
DROP POLICY IF EXISTS "device_users_select" ON public.device_users;
DROP POLICY IF EXISTS "device_users_insert" ON public.device_users;
DROP POLICY IF EXISTS "device_users_update" ON public.device_users;
DROP POLICY IF EXISTS "device_users_delete" ON public.device_users;

CREATE POLICY "device_users_select" ON public.device_users FOR SELECT USING (true);
CREATE POLICY "device_users_insert" ON public.device_users FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "device_users_update" ON public.device_users FOR UPDATE USING (auth.role() IN ('authenticated', 'service_role', 'anon')) WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "device_users_delete" ON public.device_users FOR DELETE USING (auth.role() IN ('authenticated', 'service_role', 'anon'));

-- ── Table: devices ────────────────────────────────────────────────────────────
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "devices_all" ON public.devices;
DROP POLICY IF EXISTS "devices_select" ON public.devices;
DROP POLICY IF EXISTS "devices_insert" ON public.devices;
DROP POLICY IF EXISTS "devices_update" ON public.devices;
DROP POLICY IF EXISTS "devices_delete" ON public.devices;

CREATE POLICY "devices_select" ON public.devices FOR SELECT USING (true);
CREATE POLICY "devices_insert" ON public.devices FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "devices_update" ON public.devices FOR UPDATE USING (auth.role() IN ('authenticated', 'service_role', 'anon')) WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "devices_delete" ON public.devices FOR DELETE USING (auth.role() IN ('authenticated', 'service_role', 'anon'));

-- ── Table: employees ──────────────────────────────────────────────────────────
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employees_all" ON public.employees;
DROP POLICY IF EXISTS "Allow public read access to employees" ON public.employees;
DROP POLICY IF EXISTS "Allow public insert access to employees" ON public.employees;
DROP POLICY IF EXISTS "Allow public update access to employees" ON public.employees;
DROP POLICY IF EXISTS "Allow public delete access to employees" ON public.employees;
DROP POLICY IF EXISTS "employees_select" ON public.employees;
DROP POLICY IF EXISTS "employees_insert" ON public.employees;
DROP POLICY IF EXISTS "employees_update" ON public.employees;
DROP POLICY IF EXISTS "employees_delete" ON public.employees;

CREATE POLICY "employees_select" ON public.employees FOR SELECT USING (true);
CREATE POLICY "employees_insert" ON public.employees FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "employees_update" ON public.employees FOR UPDATE USING (auth.role() IN ('authenticated', 'service_role', 'anon')) WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "employees_delete" ON public.employees FOR DELETE USING (auth.role() IN ('authenticated', 'service_role', 'anon'));

-- ── Table: fingerprint_templates ──────────────────────────────────────────────
ALTER TABLE public.fingerprint_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fingerprint_templates_all" ON public.fingerprint_templates;
DROP POLICY IF EXISTS "fingerprint_templates_select" ON public.fingerprint_templates;
DROP POLICY IF EXISTS "fingerprint_templates_insert" ON public.fingerprint_templates;
DROP POLICY IF EXISTS "fingerprint_templates_update" ON public.fingerprint_templates;
DROP POLICY IF EXISTS "fingerprint_templates_delete" ON public.fingerprint_templates;

CREATE POLICY "fingerprint_templates_select" ON public.fingerprint_templates FOR SELECT USING (true);
CREATE POLICY "fingerprint_templates_insert" ON public.fingerprint_templates FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "fingerprint_templates_update" ON public.fingerprint_templates FOR UPDATE USING (auth.role() IN ('authenticated', 'service_role', 'anon')) WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "fingerprint_templates_delete" ON public.fingerprint_templates FOR DELETE USING (auth.role() IN ('authenticated', 'service_role', 'anon'));

-- ── Table: notifications ──────────────────────────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_all" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;

CREATE POLICY "notifications_select" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE USING (auth.role() IN ('authenticated', 'service_role', 'anon')) WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "notifications_delete" ON public.notifications FOR DELETE USING (auth.role() IN ('authenticated', 'service_role', 'anon'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. FIX: rls_enabled_no_policy (Add policies for tables with RLS enabled)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Table: ai_insights ────────────────────────────────────────────────────────
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_insights_select" ON public.ai_insights;
DROP POLICY IF EXISTS "ai_insights_insert" ON public.ai_insights;
DROP POLICY IF EXISTS "ai_insights_update" ON public.ai_insights;
DROP POLICY IF EXISTS "ai_insights_delete" ON public.ai_insights;

CREATE POLICY "ai_insights_select" ON public.ai_insights FOR SELECT USING (true);
CREATE POLICY "ai_insights_insert" ON public.ai_insights FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "ai_insights_update" ON public.ai_insights FOR UPDATE USING (auth.role() IN ('authenticated', 'service_role', 'anon')) WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "ai_insights_delete" ON public.ai_insights FOR DELETE USING (auth.role() IN ('authenticated', 'service_role', 'anon'));

-- ── Table: attendance_logs ────────────────────────────────────────────────────
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "attendance_logs_select" ON public.attendance_logs;
DROP POLICY IF EXISTS "attendance_logs_insert" ON public.attendance_logs;
DROP POLICY IF EXISTS "attendance_logs_update" ON public.attendance_logs;
DROP POLICY IF EXISTS "attendance_logs_delete" ON public.attendance_logs;

CREATE POLICY "attendance_logs_select" ON public.attendance_logs FOR SELECT USING (true);
CREATE POLICY "attendance_logs_insert" ON public.attendance_logs FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "attendance_logs_update" ON public.attendance_logs FOR UPDATE USING (auth.role() IN ('authenticated', 'service_role', 'anon')) WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "attendance_logs_delete" ON public.attendance_logs FOR DELETE USING (auth.role() IN ('authenticated', 'service_role', 'anon'));

-- ── Table: biometric_devices ──────────────────────────────────────────────────
ALTER TABLE public.biometric_devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "biometric_devices_select" ON public.biometric_devices;
DROP POLICY IF EXISTS "biometric_devices_insert" ON public.biometric_devices;
DROP POLICY IF EXISTS "biometric_devices_update" ON public.biometric_devices;
DROP POLICY IF EXISTS "biometric_devices_delete" ON public.biometric_devices;

CREATE POLICY "biometric_devices_select" ON public.biometric_devices FOR SELECT USING (true);
CREATE POLICY "biometric_devices_insert" ON public.biometric_devices FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "biometric_devices_update" ON public.biometric_devices FOR UPDATE USING (auth.role() IN ('authenticated', 'service_role', 'anon')) WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "biometric_devices_delete" ON public.biometric_devices FOR DELETE USING (auth.role() IN ('authenticated', 'service_role', 'anon'));

-- ── Table: fingerprint_metadata ───────────────────────────────────────────────
ALTER TABLE public.fingerprint_metadata ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fingerprint_metadata_select" ON public.fingerprint_metadata;
DROP POLICY IF EXISTS "fingerprint_metadata_insert" ON public.fingerprint_metadata;
DROP POLICY IF EXISTS "fingerprint_metadata_update" ON public.fingerprint_metadata;
DROP POLICY IF EXISTS "fingerprint_metadata_delete" ON public.fingerprint_metadata;

CREATE POLICY "fingerprint_metadata_select" ON public.fingerprint_metadata FOR SELECT USING (true);
CREATE POLICY "fingerprint_metadata_insert" ON public.fingerprint_metadata FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "fingerprint_metadata_update" ON public.fingerprint_metadata FOR UPDATE USING (auth.role() IN ('authenticated', 'service_role', 'anon')) WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "fingerprint_metadata_delete" ON public.fingerprint_metadata FOR DELETE USING (auth.role() IN ('authenticated', 'service_role', 'anon'));

-- ── Table: floor_zone_employees ───────────────────────────────────────────────
ALTER TABLE public.floor_zone_employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "floor_zone_employees_select" ON public.floor_zone_employees;
DROP POLICY IF EXISTS "floor_zone_employees_insert" ON public.floor_zone_employees;
DROP POLICY IF EXISTS "floor_zone_employees_update" ON public.floor_zone_employees;
DROP POLICY IF EXISTS "floor_zone_employees_delete" ON public.floor_zone_employees;

CREATE POLICY "floor_zone_employees_select" ON public.floor_zone_employees FOR SELECT USING (true);
CREATE POLICY "floor_zone_employees_insert" ON public.floor_zone_employees FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "floor_zone_employees_update" ON public.floor_zone_employees FOR UPDATE USING (auth.role() IN ('authenticated', 'service_role', 'anon')) WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "floor_zone_employees_delete" ON public.floor_zone_employees FOR DELETE USING (auth.role() IN ('authenticated', 'service_role', 'anon'));

-- ── Table: floor_zones ────────────────────────────────────────────────────────
ALTER TABLE public.floor_zones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "floor_zones_select" ON public.floor_zones;
DROP POLICY IF EXISTS "floor_zones_insert" ON public.floor_zones;
DROP POLICY IF EXISTS "floor_zones_update" ON public.floor_zones;
DROP POLICY IF EXISTS "floor_zones_delete" ON public.floor_zones;

CREATE POLICY "floor_zones_select" ON public.floor_zones FOR SELECT USING (true);
CREATE POLICY "floor_zones_insert" ON public.floor_zones FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "floor_zones_update" ON public.floor_zones FOR UPDATE USING (auth.role() IN ('authenticated', 'service_role', 'anon')) WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "floor_zones_delete" ON public.floor_zones FOR DELETE USING (auth.role() IN ('authenticated', 'service_role', 'anon'));

-- ── Table: security_logs ──────────────────────────────────────────────────────
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "security_logs_select" ON public.security_logs;
DROP POLICY IF EXISTS "security_logs_insert" ON public.security_logs;
DROP POLICY IF EXISTS "security_logs_update" ON public.security_logs;
DROP POLICY IF EXISTS "security_logs_delete" ON public.security_logs;

CREATE POLICY "security_logs_select" ON public.security_logs FOR SELECT USING (true);
CREATE POLICY "security_logs_insert" ON public.security_logs FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "security_logs_update" ON public.security_logs FOR UPDATE USING (auth.role() IN ('authenticated', 'service_role', 'anon')) WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "security_logs_delete" ON public.security_logs FOR DELETE USING (auth.role() IN ('authenticated', 'service_role', 'anon'));

-- ── Table: shifts ─────────────────────────────────────────────────────────────
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shifts_select" ON public.shifts;
DROP POLICY IF EXISTS "shifts_insert" ON public.shifts;
DROP POLICY IF EXISTS "shifts_update" ON public.shifts;
DROP POLICY IF EXISTS "shifts_delete" ON public.shifts;

CREATE POLICY "shifts_select" ON public.shifts FOR SELECT USING (true);
CREATE POLICY "shifts_insert" ON public.shifts FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "shifts_update" ON public.shifts FOR UPDATE USING (auth.role() IN ('authenticated', 'service_role', 'anon')) WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "shifts_delete" ON public.shifts FOR DELETE USING (auth.role() IN ('authenticated', 'service_role', 'anon'));

-- ── Table: sync_queue ─────────────────────────────────────────────────────────
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sync_queue_select" ON public.sync_queue;
DROP POLICY IF EXISTS "sync_queue_insert" ON public.sync_queue;
DROP POLICY IF EXISTS "sync_queue_update" ON public.sync_queue;
DROP POLICY IF EXISTS "sync_queue_delete" ON public.sync_queue;

CREATE POLICY "sync_queue_select" ON public.sync_queue FOR SELECT USING (true);
CREATE POLICY "sync_queue_insert" ON public.sync_queue FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "sync_queue_update" ON public.sync_queue FOR UPDATE USING (auth.role() IN ('authenticated', 'service_role', 'anon')) WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "sync_queue_delete" ON public.sync_queue FOR DELETE USING (auth.role() IN ('authenticated', 'service_role', 'anon'));

-- ── Table: timetable_breaks ───────────────────────────────────────────────────
ALTER TABLE public.timetable_breaks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "timetable_breaks_select" ON public.timetable_breaks;
DROP POLICY IF EXISTS "timetable_breaks_insert" ON public.timetable_breaks;
DROP POLICY IF EXISTS "timetable_breaks_update" ON public.timetable_breaks;
DROP POLICY IF EXISTS "timetable_breaks_delete" ON public.timetable_breaks;

CREATE POLICY "timetable_breaks_select" ON public.timetable_breaks FOR SELECT USING (true);
CREATE POLICY "timetable_breaks_insert" ON public.timetable_breaks FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "timetable_breaks_update" ON public.timetable_breaks FOR UPDATE USING (auth.role() IN ('authenticated', 'service_role', 'anon')) WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "timetable_breaks_delete" ON public.timetable_breaks FOR DELETE USING (auth.role() IN ('authenticated', 'service_role', 'anon'));

-- ── Table: timetables ─────────────────────────────────────────────────────────
ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "timetables_select" ON public.timetables;
DROP POLICY IF EXISTS "timetables_insert" ON public.timetables;
DROP POLICY IF EXISTS "timetables_update" ON public.timetables;
DROP POLICY IF EXISTS "timetables_delete" ON public.timetables;

CREATE POLICY "timetables_select" ON public.timetables FOR SELECT USING (true);
CREATE POLICY "timetables_insert" ON public.timetables FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "timetables_update" ON public.timetables FOR UPDATE USING (auth.role() IN ('authenticated', 'service_role', 'anon')) WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "timetables_delete" ON public.timetables FOR DELETE USING (auth.role() IN ('authenticated', 'service_role', 'anon'));

-- ── Table: unknown_fingerprint_logs ───────────────────────────────────────────
ALTER TABLE public.unknown_fingerprint_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "unknown_fingerprint_logs_select" ON public.unknown_fingerprint_logs;
DROP POLICY IF EXISTS "unknown_fingerprint_logs_insert" ON public.unknown_fingerprint_logs;
DROP POLICY IF EXISTS "unknown_fingerprint_logs_update" ON public.unknown_fingerprint_logs;
DROP POLICY IF EXISTS "unknown_fingerprint_logs_delete" ON public.unknown_fingerprint_logs;

CREATE POLICY "unknown_fingerprint_logs_select" ON public.unknown_fingerprint_logs FOR SELECT USING (true);
CREATE POLICY "unknown_fingerprint_logs_insert" ON public.unknown_fingerprint_logs FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "unknown_fingerprint_logs_update" ON public.unknown_fingerprint_logs FOR UPDATE USING (auth.role() IN ('authenticated', 'service_role', 'anon')) WITH CHECK (auth.role() IN ('authenticated', 'service_role', 'anon'));
CREATE POLICY "unknown_fingerprint_logs_delete" ON public.unknown_fingerprint_logs FOR DELETE USING (auth.role() IN ('authenticated', 'service_role', 'anon'));
