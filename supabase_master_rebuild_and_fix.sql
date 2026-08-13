-- ============================================================================
-- JRM HRMS — BIOMETRIC DEVICE CENTER & RAW PUNCH MASTER MIGRATION
-- Run this ENTIRE script in your Supabase SQL Editor → Run
-- Safe to run multiple times (idempotent, uses IF NOT EXISTS / DO NOTHING)
-- ============================================================================

-- ── 1. BIOMETRIC RAW PUNCHES (Immutable Source of Truth) ─────────────────────
CREATE TABLE IF NOT EXISTS public.biometric_raw_punches (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            VARCHAR(50)  NOT NULL DEFAULT 'COMP-001',
  device_id             UUID         REFERENCES public.devices(id) ON DELETE SET NULL,
  device_ip             VARCHAR(50)  NOT NULL,
  device_port           INT          DEFAULT 4370,
  device_serial_number  VARCHAR(100),
  device_user_id        VARCHAR(100) NOT NULL,
  employee_id           VARCHAR(100),     -- NULL if UNMAPPED
  machine_log_id        VARCHAR(200),     -- device-native log sequence number
  machine_timestamp     TEXT         NOT NULL,  -- e.g. "2026-08-13 09:17:50"
  machine_timezone      VARCHAR(50)  NOT NULL DEFAULT 'Asia/Kolkata',
  event_time_utc        TIMESTAMPTZ  NOT NULL,  -- canonical UTC equivalent
  event_type            VARCHAR(30)  NOT NULL DEFAULT 'RAW_PUNCH',
  verification_type     VARCHAR(30)  NOT NULL DEFAULT 'FINGERPRINT',
  raw_payload           JSONB,            -- original device packet preserved for audit
  received_at_utc       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  sync_batch_id         VARCHAR(100),
  mapping_status        VARCHAR(20)  NOT NULL DEFAULT 'MAPPED'
                          CHECK (mapping_status IN ('MAPPED','UNMAPPED','PENDING')),
  sync_status           VARCHAR(20)  NOT NULL DEFAULT 'SUCCESS',
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- Dedup constraint: same machine log cannot be inserted twice
  CONSTRAINT biometric_raw_punches_unique_log
    UNIQUE NULLS NOT DISTINCT (company_id, device_ip, machine_log_id),

  -- Fallback dedup when machine_log_id is unavailable
  CONSTRAINT biometric_raw_punches_unique_fingerprint
    UNIQUE (company_id, device_ip, device_user_id, machine_timestamp, event_type)
);

CREATE INDEX IF NOT EXISTS idx_brp_emp_utc ON public.biometric_raw_punches (employee_id, event_time_utc DESC);
CREATE INDEX IF NOT EXISTS idx_brp_device_utc ON public.biometric_raw_punches (device_ip, event_time_utc DESC);
CREATE INDEX IF NOT EXISTS idx_brp_unmapped ON public.biometric_raw_punches (company_id, mapping_status) WHERE mapping_status = 'UNMAPPED';

ALTER TABLE public.biometric_raw_punches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "brp_select_all" ON public.biometric_raw_punches;
DROP POLICY IF EXISTS "brp_insert_all" ON public.biometric_raw_punches;
CREATE POLICY "brp_select_all" ON public.biometric_raw_punches FOR SELECT USING (TRUE);
CREATE POLICY "brp_insert_all" ON public.biometric_raw_punches FOR INSERT WITH CHECK (TRUE);


-- ── 2. BIOMETRIC SYNC STATE (Per-Device Cursor) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.biometric_sync_state (
  id                          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                  VARCHAR(50)  NOT NULL DEFAULT 'COMP-001',
  device_id                   UUID         REFERENCES public.devices(id) ON DELETE CASCADE,
  device_ip                   VARCHAR(50)  NOT NULL,
  last_machine_log_id         VARCHAR(200),
  last_machine_timestamp      TEXT,
  last_successful_sync_at_utc TIMESTAMPTZ,
  last_sync_status            VARCHAR(30)  DEFAULT 'NEVER'
                                CHECK (last_sync_status IN ('NEVER','SUCCESS','FAILED','IN_PROGRESS','NO_NEW_LOGS','DEVICE_OFFLINE')),
  last_error                  TEXT,
  records_fetched             INT          DEFAULT 0,
  records_inserted            INT          DEFAULT 0,
  records_duplicate           INT          DEFAULT 0,
  records_unmapped            INT          DEFAULT 0,
  sync_latency_ms             INT,
  created_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),

  UNIQUE (company_id, device_ip)
);

ALTER TABLE public.biometric_sync_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sync_state_all" ON public.biometric_sync_state;
CREATE POLICY "sync_state_all" ON public.biometric_sync_state FOR ALL USING (TRUE);


-- ── 3. EMPLOYEE BIOMETRIC MAPPINGS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employee_biometric_mappings (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      VARCHAR(50)  NOT NULL DEFAULT 'COMP-001',
  employee_id     VARCHAR(100) NOT NULL,
  device_id       UUID         REFERENCES public.devices(id) ON DELETE CASCADE,
  device_ip       VARCHAR(50),
  device_user_id  VARCHAR(100) NOT NULL,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  mapped_by       VARCHAR(100),
  notes           TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

  UNIQUE (company_id, device_ip, device_user_id)
);

ALTER TABLE public.employee_biometric_mappings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ebm_all" ON public.employee_biometric_mappings;
CREATE POLICY "ebm_all" ON public.employee_biometric_mappings FOR ALL USING (TRUE);


-- ── 4. EMPLOYEE BIOMETRIC ENROLLMENTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employee_biometric_enrollments (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          VARCHAR(50)  NOT NULL DEFAULT 'COMP-001',
  employee_id         VARCHAR(100) NOT NULL,
  device_id           UUID         REFERENCES public.devices(id) ON DELETE CASCADE,
  device_user_id      VARCHAR(100) NOT NULL,
  finger_index        INT          NOT NULL DEFAULT 0,
  template_type       VARCHAR(50)  NOT NULL DEFAULT 'ZKFINGER_V10',
  template_version    VARCHAR(20)  DEFAULT '10.0',
  quality_score       INT          DEFAULT 100,
  enrollment_status   VARCHAR(30)  NOT NULL DEFAULT 'ENROLLED'
                        CHECK (enrollment_status IN ('ENROLLED','PENDING','FAILED','REVOKED')),
  device_template_id  VARCHAR(100),
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),

  UNIQUE (company_id, employee_id, finger_index)
);

ALTER TABLE public.employee_biometric_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ebe_all" ON public.employee_biometric_enrollments;
CREATE POLICY "ebe_all" ON public.employee_biometric_enrollments FOR ALL USING (TRUE);


-- ── 5. DEVICE CONNECTION LOGS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.device_connection_logs (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      VARCHAR(50)  NOT NULL DEFAULT 'COMP-001',
  device_id       UUID         REFERENCES public.devices(id) ON DELETE CASCADE,
  device_ip       VARCHAR(50)  NOT NULL,
  event_type      VARCHAR(50)  NOT NULL, -- 'DEVICE_CONNECTED', 'DEVICE_HEARTBEAT', 'RAW_PUNCH', 'SYNC_COMPLETE', etc.
  severity        VARCHAR(20)  NOT NULL DEFAULT 'INFO'
                    CHECK (severity IN ('INFO','SUCCESS','WARNING','ERROR','CRITICAL')),
  message         TEXT         NOT NULL,
  metadata        JSONB,
  occurred_at_utc TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dcl_device_utc ON public.device_connection_logs (device_ip, occurred_at_utc DESC);

ALTER TABLE public.device_connection_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dcl_all" ON public.device_connection_logs;
CREATE POLICY "dcl_all" ON public.device_connection_logs FOR ALL USING (TRUE);


-- ── 6. DEVICE CONNECTOR LEASES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.device_connector_leases (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       VARCHAR(50)  NOT NULL DEFAULT 'COMP-001',
  device_id        UUID         REFERENCES public.devices(id) ON DELETE CASCADE,
  device_ip        VARCHAR(50)  NOT NULL UNIQUE,
  agent_id         VARCHAR(100) NOT NULL,
  lease_expires_at TIMESTAMPTZ  NOT NULL,
  heartbeat_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE public.device_connector_leases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dcl_lease_all" ON public.device_connector_leases;
CREATE POLICY "dcl_lease_all" ON public.device_connector_leases FOR ALL USING (TRUE);


-- ── 7. ATTENDANCE DAILY SUMMARY (Payroll-Ready Derived Totals) ────────────────
CREATE TABLE IF NOT EXISTS public.attendance_daily_summary (
  id                          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                  VARCHAR(50)  NOT NULL DEFAULT 'COMP-001',
  employee_id                 VARCHAR(100) NOT NULL,
  employee_name               VARCHAR(150),
  department                  VARCHAR(100),
  attendance_date             DATE         NOT NULL,
  shift_id                    VARCHAR(100),

  -- Source punch references for full audit traceability
  first_punch_id              UUID         REFERENCES public.biometric_raw_punches(id) ON DELETE SET NULL,
  last_punch_id               UUID         REFERENCES public.biometric_raw_punches(id) ON DELETE SET NULL,
  source_punch_ids            UUID[],

  -- UTC & Machine timestamps
  first_check_in_utc          TIMESTAMPTZ,
  first_check_in_machine_ts   TEXT,
  last_check_out_utc          TIMESTAMPTZ,
  last_check_out_machine_ts   TEXT,

  -- Calculated metrics
  gross_working_minutes       INT          DEFAULT 0,
  break_minutes               INT          DEFAULT 0,
  lunch_minutes               INT          DEFAULT 0,
  net_working_minutes         INT          DEFAULT 0,
  late_minutes                INT          DEFAULT 0,
  early_out_minutes           INT          DEFAULT 0,
  overtime_minutes            INT          DEFAULT 0,
  payable_hours               NUMERIC(5,2) DEFAULT 0.00,

  attendance_status           VARCHAR(30)  NOT NULL DEFAULT 'WORKING'
                                CHECK (attendance_status IN ('WORKING','CHECKED OUT','ABSENT','HALF_DAY','ON_LEAVE')),
  total_punches               INT          DEFAULT 1,
  created_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),

  UNIQUE (company_id, employee_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_ads_date ON public.attendance_daily_summary (attendance_date, employee_id);

ALTER TABLE public.attendance_daily_summary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ads_all" ON public.attendance_daily_summary;
CREATE POLICY "ads_all" ON public.attendance_daily_summary FOR ALL USING (TRUE);
