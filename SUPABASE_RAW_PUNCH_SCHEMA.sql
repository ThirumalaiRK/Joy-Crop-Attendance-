-- ============================================================================
-- JRM HRMS — BIOMETRIC RAW PUNCH PRODUCTION SCHEMA
-- Run this ENTIRE script in your Supabase SQL Editor → Run
-- Safe to run multiple times (all statements use IF NOT EXISTS / DO NOTHING)
-- ============================================================================

-- ── 1. BIOMETRIC RAW PUNCHES (Immutable Source of Truth) ─────────────────────
-- machine_timestamp is TEXT intentionally — preserves exact device string
-- e.g. "2026-08-13 09:20:59" without any timezone reinterpretation.
-- event_time_utc is the canonical UTC equivalent for queries/ordering.
CREATE TABLE IF NOT EXISTS public.biometric_raw_punches (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            VARCHAR(50)  NOT NULL DEFAULT 'COMP-001',
  device_id             UUID         REFERENCES public.devices(id) ON DELETE SET NULL,
  device_ip             VARCHAR(50)  NOT NULL,
  device_serial_number  VARCHAR(100),
  device_user_id        VARCHAR(100) NOT NULL,
  employee_id           VARCHAR(100),     -- NULL if UNMAPPED
  mapping_status        VARCHAR(20)  NOT NULL DEFAULT 'MAPPED'
                          CHECK (mapping_status IN ('MAPPED','UNMAPPED','PENDING')),
  machine_log_id        VARCHAR(200),     -- device-native log sequence number
  -- CRITICAL: stored as TEXT to prevent any reinterpretation by DB or JS
  machine_timestamp     TEXT         NOT NULL,  -- e.g. "2026-08-13 09:20:59"
  machine_timezone      VARCHAR(50)  NOT NULL DEFAULT 'Asia/Kolkata',
  event_time_utc        TIMESTAMPTZ  NOT NULL,  -- Luxon-computed UTC equivalent
  event_type            VARCHAR(30)  NOT NULL DEFAULT 'UNKNOWN'
                          CHECK (event_type IN ('IN','OUT','UNKNOWN')),
  verification_type     VARCHAR(30)  NOT NULL DEFAULT 'FINGERPRINT'
                          CHECK (verification_type IN ('FINGERPRINT','CARD','PASSWORD','FACE','OTHER')),
  raw_payload           JSONB,            -- original device packet preserved for audit
  source                VARCHAR(30)  NOT NULL DEFAULT 'BIOMETRIC_MACHINE',
  received_at_utc       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  sync_batch_id         VARCHAR(100),
  notes                 TEXT,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- Primary dedup: same machine log cannot be inserted twice
  CONSTRAINT biometric_raw_punches_unique_log
    UNIQUE NULLS NOT DISTINCT (company_id, device_ip, machine_log_id),

  -- Fallback fingerprint dedup when machine_log_id is unavailable
  CONSTRAINT biometric_raw_punches_unique_fingerprint
    UNIQUE (company_id, device_ip, device_user_id, machine_timestamp, event_type)
);

CREATE INDEX IF NOT EXISTS idx_brp_employee_date
  ON public.biometric_raw_punches (employee_id, event_time_utc DESC);
CREATE INDEX IF NOT EXISTS idx_brp_device_date
  ON public.biometric_raw_punches (device_ip, event_time_utc DESC);
CREATE INDEX IF NOT EXISTS idx_brp_company_date
  ON public.biometric_raw_punches (company_id, event_time_utc DESC);
CREATE INDEX IF NOT EXISTS idx_brp_unmapped
  ON public.biometric_raw_punches (company_id, mapping_status)
  WHERE mapping_status = 'UNMAPPED';
CREATE INDEX IF NOT EXISTS idx_brp_log_id
  ON public.biometric_raw_punches (device_ip, machine_log_id);

ALTER TABLE public.biometric_raw_punches ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "brp_select_all" ON public.biometric_raw_punches FOR SELECT USING (TRUE);
CREATE POLICY IF NOT EXISTS "brp_insert_all" ON public.biometric_raw_punches FOR INSERT WITH CHECK (TRUE);
-- No UPDATE or DELETE policies — raw punches are immutable from the UI

COMMENT ON TABLE public.biometric_raw_punches IS
  'Immutable biometric machine punch records. machine_timestamp TEXT preserves exact device string. Never edit after insert.';
COMMENT ON COLUMN public.biometric_raw_punches.machine_timestamp IS
  'Exact string from device, e.g. "2026-08-13 09:20:59". TEXT prevents reinterpretation. Always display as Asia/Kolkata IST.';
COMMENT ON COLUMN public.biometric_raw_punches.received_at_utc IS
  'When the sync agent received this packet — NOT the punch time. Separate field from event_time_utc.';


-- ── 2. BIOMETRIC SYNC STATE (Per-Device Cursor) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.biometric_sync_state (
  id                          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                  VARCHAR(50)  NOT NULL DEFAULT 'COMP-001',
  device_id                   UUID         REFERENCES public.devices(id) ON DELETE CASCADE,
  device_ip                   VARCHAR(50)  NOT NULL,
  last_machine_log_id         VARCHAR(200),
  last_machine_timestamp      TEXT,
  last_successful_sync_at_utc TIMESTAMPTZ,
  last_sync_started_at_utc    TIMESTAMPTZ,
  last_sync_completed_at_utc  TIMESTAMPTZ,
  last_sync_status            VARCHAR(30)  DEFAULT 'NEVER'
                                CHECK (last_sync_status IN ('NEVER','SUCCESS','FAILED','IN_PROGRESS','NO_NEW_LOGS','DEVICE_OFFLINE')),
  last_error_code             VARCHAR(50),
  last_error_message          TEXT,
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
CREATE POLICY IF NOT EXISTS "sync_state_all" ON public.biometric_sync_state FOR ALL USING (TRUE);

COMMENT ON TABLE public.biometric_sync_state IS
  'Per-device sync cursor. Updated ONLY after successful ingestion. Never advance cursor before DB write succeeds.';


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

CREATE INDEX IF NOT EXISTS idx_ebm_lookup
  ON public.employee_biometric_mappings (company_id, device_ip, device_user_id)
  WHERE is_active = TRUE;

ALTER TABLE public.employee_biometric_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "ebm_all" ON public.employee_biometric_mappings FOR ALL USING (TRUE);

COMMENT ON TABLE public.employee_biometric_mappings IS
  'Maps device user IDs to HRMS employees. Device user ID "10" on 192.168.1.56 → employee_id. No fuzzy matching.';


-- ── 4. ATTENDANCE DAILY SUMMARY (Payroll-Ready Calculated Totals) ─────────────
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

  -- Times (UTC for storage, display layer converts to IST)
  first_check_in_utc          TIMESTAMPTZ,
  first_check_in_machine_ts   TEXT,        -- exact machine timestamp string for display
  last_check_out_utc          TIMESTAMPTZ,
  last_check_out_machine_ts   TEXT,

  -- Durations in minutes
  gross_working_minutes       INT          NOT NULL DEFAULT 0,
  break_minutes               INT          NOT NULL DEFAULT 0,
  lunch_minutes               INT          NOT NULL DEFAULT 0,
  net_working_minutes         INT          NOT NULL DEFAULT 0,
  late_minutes                INT          NOT NULL DEFAULT 0,
  early_out_minutes           INT          NOT NULL DEFAULT 0,
  overtime_minutes            INT          NOT NULL DEFAULT 0,
  payable_hours               NUMERIC(6,2) NOT NULL DEFAULT 0,

  attendance_status           VARCHAR(30)  NOT NULL DEFAULT 'PENDING'
                                CHECK (attendance_status IN ('PRESENT','LATE','ABSENT','HALF_DAY','HOLIDAY','LEAVE','PENDING','WORKING')),
  is_finalized                BOOLEAN      NOT NULL DEFAULT FALSE,
  finalized_at                TIMESTAMPTZ,
  finalized_by                VARCHAR(100),

  total_punches               INT          DEFAULT 0,
  punch_count_in              INT          DEFAULT 0,
  punch_count_out             INT          DEFAULT 0,
  auto_lunch_deducted         BOOLEAN      DEFAULT FALSE,
  notes                       TEXT,
  created_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),

  UNIQUE (company_id, employee_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_ads_employee_date
  ON public.attendance_daily_summary (employee_id, attendance_date DESC);
CREATE INDEX IF NOT EXISTS idx_ads_company_date
  ON public.attendance_daily_summary (company_id, attendance_date DESC);

ALTER TABLE public.attendance_daily_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "ads_all" ON public.attendance_daily_summary FOR ALL USING (TRUE);

COMMENT ON TABLE public.attendance_daily_summary IS
  'Payroll-ready daily summary derived from biometric_raw_punches. first_punch_id enables click-to-audit-trail.';
COMMENT ON COLUMN public.attendance_daily_summary.first_check_in_machine_ts IS
  'Exact machine timestamp string of first punch. Display as-is (Asia/Kolkata) — do not re-convert.';


-- ── 5. ATTENDANCE ADJUSTMENTS (Immutable Correction Audit Trail) ───────────────
CREATE TABLE IF NOT EXISTS public.attendance_adjustments (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          VARCHAR(50)  NOT NULL DEFAULT 'COMP-001',
  employee_id         VARCHAR(100) NOT NULL,
  attendance_date     DATE         NOT NULL,
  original_punch_id   UUID         REFERENCES public.biometric_raw_punches(id) ON DELETE SET NULL,
  adjustment_type     VARCHAR(50)  NOT NULL
                        CHECK (adjustment_type IN (
                          'MANUAL_CHECK_IN','MANUAL_CHECK_OUT','OVERRIDE_STATUS',
                          'WAIVE_LATE','ADD_PUNCH','REMOVE_PUNCH','SHIFT_CHANGE'
                        )),
  old_value           JSONB,
  new_value           JSONB,
  reason              TEXT         NOT NULL,
  requested_by        VARCHAR(100) NOT NULL,
  approved_by         VARCHAR(100),
  approval_status     VARCHAR(30)  NOT NULL DEFAULT 'PENDING'
                        CHECK (approval_status IN ('PENDING','APPROVED','REJECTED')),
  applied_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aa_employee_date
  ON public.attendance_adjustments (employee_id, attendance_date DESC);
CREATE INDEX IF NOT EXISTS idx_aa_pending
  ON public.attendance_adjustments (company_id, approval_status)
  WHERE approval_status = 'PENDING';

ALTER TABLE public.attendance_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "aa_all" ON public.attendance_adjustments FOR ALL USING (TRUE);

COMMENT ON TABLE public.attendance_adjustments IS
  'HR correction records. The raw biometric_raw_punches record is NEVER modified.';


-- ── 6. ALTER attendance_records — Add UTC + machine timestamp columns ──────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attendance_records' AND column_name = 'check_in_utc'
  ) THEN
    ALTER TABLE public.attendance_records
      ADD COLUMN check_in_utc          TIMESTAMPTZ,
      ADD COLUMN check_out_utc         TIMESTAMPTZ,
      ADD COLUMN first_punch_id        UUID REFERENCES public.biometric_raw_punches(id) ON DELETE SET NULL,
      ADD COLUMN last_punch_id         UUID REFERENCES public.biometric_raw_punches(id) ON DELETE SET NULL,
      ADD COLUMN machine_check_in_ts   TEXT,
      ADD COLUMN machine_check_out_ts  TEXT;
    RAISE NOTICE 'attendance_records: added UTC + machine timestamp columns';
  ELSE
    RAISE NOTICE 'attendance_records: new columns already exist, skipping';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'device_user_id'
  ) THEN
    ALTER TABLE public.employees ADD COLUMN device_user_id VARCHAR(100);
    RAISE NOTICE 'employees: added device_user_id column';
  ELSE
    RAISE NOTICE 'employees: device_user_id already exists';
  END IF;
END $$;


-- ── 7. ENABLE REALTIME ────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'biometric_raw_punches') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.biometric_raw_punches;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'biometric_sync_state') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.biometric_sync_state;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'attendance_daily_summary') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_daily_summary;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'employee_biometric_mappings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_biometric_mappings;
  END IF;
END $$;


-- ── 8. SEED: Known device mappings (safe upsert) ───────────────────────────────
-- Seeds mapping for device 192.168.1.56, user IDs from the employees table.
-- Only inserts if employee exists and mapping does not yet exist.
INSERT INTO public.employee_biometric_mappings
  (company_id, employee_id, device_ip, device_user_id, mapped_by, notes)
SELECT
  'COMP-001',
  e.id,
  '192.168.1.56',
  COALESCE(e.device_user_id, REGEXP_REPLACE(e.employee_code, '\D', '', 'g')),
  'SYSTEM_MIGRATION',
  'Auto-seeded from employees.device_user_id / employee_code'
FROM public.employees e
WHERE e.device_user_id IS NOT NULL
   OR e.employee_code ~ '^\d+$'
   OR e.employee_code ~ '^EMP-\d+'
ON CONFLICT (company_id, device_ip, device_user_id) DO NOTHING;


-- ── 9. VERIFICATION QUERY ─────────────────────────────────────────────────────
SELECT
  t.table_name,
  (SELECT COUNT(*) FROM information_schema.columns c
   WHERE c.table_name = t.table_name AND c.table_schema = 'public') AS column_count
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_name IN (
    'biometric_raw_punches', 'biometric_sync_state',
    'employee_biometric_mappings', 'attendance_daily_summary', 'attendance_adjustments'
  )
ORDER BY t.table_name;

-- ============================================================================
-- SUCCESS: Raw Punch Production Schema installed.
-- Next step: Run the updated apps/connector to start ingesting into biometric_raw_punches.
-- ============================================================================
