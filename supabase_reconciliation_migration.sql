-- ============================================================================
-- JRM HRMS — BIOMETRIC ATTENDANCE RECONCILIATION & MIGRATION SCRIPT
-- Corrects historical UTC/IST timestamp bugs and updates daily summaries from raw punches
-- Safe to run directly in Supabase SQL Editor (Self-Contained Execution)
-- ============================================================================

-- 0. Ensure base tables exist before running reconciliation logic
CREATE TABLE IF NOT EXISTS public.biometric_raw_punches (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            VARCHAR(50)  NOT NULL DEFAULT 'COMP-001',
  device_id             UUID,
  device_ip             VARCHAR(50)  NOT NULL,
  device_serial_number  VARCHAR(100),
  device_user_id        VARCHAR(100) NOT NULL,
  employee_id           VARCHAR(100),
  mapping_status        VARCHAR(20)  NOT NULL DEFAULT 'MAPPED'
                          CHECK (mapping_status IN ('MAPPED','UNMAPPED','PENDING')),
  machine_log_id        VARCHAR(200),
  machine_timestamp     TEXT         NOT NULL,
  machine_timezone      VARCHAR(50)  NOT NULL DEFAULT 'Asia/Kolkata',
  event_time_utc        TIMESTAMPTZ  NOT NULL,
  event_type            VARCHAR(30)  NOT NULL DEFAULT 'UNKNOWN'
                          CHECK (event_type IN ('IN','OUT','UNKNOWN')),
  verification_type     VARCHAR(30)  NOT NULL DEFAULT 'FINGERPRINT'
                          CHECK (verification_type IN ('FINGERPRINT','CARD','PASSWORD','FACE','OTHER')),
  raw_payload           JSONB,
  source                VARCHAR(30)  NOT NULL DEFAULT 'BIOMETRIC_MACHINE',
  received_at_utc       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  sync_batch_id         VARCHAR(100),
  notes                 TEXT,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.attendance_daily_summary (
  id                          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                  VARCHAR(50)  NOT NULL DEFAULT 'COMP-001',
  employee_id                 VARCHAR(100) NOT NULL,
  employee_name               VARCHAR(150),
  department                  VARCHAR(100),
  attendance_date             DATE         NOT NULL,
  shift_id                    VARCHAR(100),
  first_punch_id              UUID         REFERENCES public.biometric_raw_punches(id) ON DELETE SET NULL,
  last_punch_id               UUID         REFERENCES public.biometric_raw_punches(id) ON DELETE SET NULL,
  source_punch_ids            UUID[],
  first_check_in_utc          TIMESTAMPTZ,
  first_check_in_machine_ts   TEXT,
  last_check_out_utc          TIMESTAMPTZ,
  last_check_out_machine_ts   TEXT,
  gross_working_minutes       INT          NOT NULL DEFAULT 0,
  break_minutes               INT          NOT NULL DEFAULT 0,
  lunch_minutes               INT          NOT NULL DEFAULT 0,
  net_working_minutes         INT          NOT NULL DEFAULT 0,
  late_minutes                INT          NOT NULL DEFAULT 0,
  early_out_minutes           INT          NOT NULL DEFAULT 0,
  overtime_minutes            INT          NOT NULL DEFAULT 0,
  payable_hours               NUMERIC(6,2) NOT NULL DEFAULT 0,
  attendance_status           VARCHAR(30)  NOT NULL DEFAULT 'PENDING'
                                CHECK (attendance_status IN ('PRESENT','LATE','ABSENT','HALF_DAY','HOLIDAY','LEAVE','PENDING','WORKING','NEEDS_RECONCILIATION','CHECKED OUT')),
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

-- 1. Create audit table for historical adjustments if it doesn't exist
CREATE TABLE IF NOT EXISTS public.attendance_reconciliation_log (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           VARCHAR(50) NOT NULL DEFAULT 'COMP-001',
  employee_id          VARCHAR(100) NOT NULL,
  attendance_date      DATE NOT NULL,
  old_check_in_time    TEXT,
  old_check_out_time   TEXT,
  new_check_in_time    TEXT,
  new_check_out_time   TEXT,
  raw_punch_count      INT DEFAULT 0,
  reconciliation_status VARCHAR(50) NOT NULL DEFAULT 'RECONCILED',
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Function to recalculate attendance daily summary from raw punches for employee & date
CREATE OR REPLACE FUNCTION public.recalculate_attendance_daily_summary(
  p_company_id VARCHAR(50),
  p_employee_id VARCHAR(100),
  p_attendance_date DATE
)
RETURNS VOID AS $$
DECLARE
  v_first_punch RECORD;
  v_last_punch RECORD;
  v_punch_count INT;
  v_all_punch_ids UUID[];
  v_status VARCHAR(30);
  v_gross_mins INT := 0;
  v_net_mins INT := 0;
  v_payable_hrs NUMERIC(6,2) := 0.00;
BEGIN
  -- Get all valid raw punches for this employee & date range in Asia/Kolkata
  WITH day_punches AS (
    SELECT id, machine_timestamp, event_time_utc
    FROM public.biometric_raw_punches
    WHERE company_id = p_company_id
      AND employee_id = p_employee_id
      AND (event_time_utc AT TIME ZONE 'Asia/Kolkata')::DATE = p_attendance_date
    ORDER BY event_time_utc ASC
  )
  SELECT COUNT(*), ARRAY_AGG(id)
  INTO v_punch_count, v_all_punch_ids
  FROM day_punches;

  IF v_punch_count IS NULL OR v_punch_count = 0 THEN
    -- No raw punches exist: mark session or summary as NEEDS_RECONCILIATION if record exists
    UPDATE public.attendance_daily_summary
    SET attendance_status = 'NEEDS_RECONCILIATION',
        notes = 'No verified raw biometric punch found in database.'
    WHERE company_id = p_company_id
      AND employee_id = p_employee_id
      AND attendance_date = p_attendance_date;
    RETURN;
  END IF;

  -- Select first raw punch
  SELECT id, machine_timestamp, event_time_utc INTO v_first_punch
  FROM public.biometric_raw_punches
  WHERE id = v_all_punch_ids[1];

  -- If only 1 punch
  IF v_punch_count = 1 THEN
    v_status := 'WORKING';
    
    INSERT INTO public.attendance_daily_summary (
      company_id, employee_id, attendance_date,
      first_punch_id, last_punch_id, source_punch_ids,
      first_check_in_utc, first_check_in_machine_ts,
      last_check_out_utc, last_check_out_machine_ts,
      gross_working_minutes, net_working_minutes, payable_hours,
      attendance_status, total_punches, updated_at
    ) VALUES (
      p_company_id, p_employee_id, p_attendance_date,
      v_first_punch.id, NULL, v_all_punch_ids,
      v_first_punch.event_time_utc, v_first_punch.machine_timestamp,
      NULL, NULL,
      0, 0, 0.00,
      v_status, 1, now()
    )
    ON CONFLICT (company_id, employee_id, attendance_date) DO UPDATE SET
      first_punch_id = EXCLUDED.first_punch_id,
      last_punch_id = NULL,
      source_punch_ids = EXCLUDED.source_punch_ids,
      first_check_in_utc = EXCLUDED.first_check_in_utc,
      first_check_in_machine_ts = EXCLUDED.first_check_in_machine_ts,
      last_check_out_utc = NULL,
      last_check_out_machine_ts = NULL,
      gross_working_minutes = 0,
      net_working_minutes = 0,
      payable_hours = 0.00,
      attendance_status = 'WORKING',
      total_punches = EXCLUDED.total_punches,
      updated_at = now();

  ELSE
    -- 2 or more punches
    SELECT id, machine_timestamp, event_time_utc INTO v_last_punch
    FROM public.biometric_raw_punches
    WHERE id = v_all_punch_ids[v_punch_count];

    v_gross_mins := GREATEST(0, ROUND(EXTRACT(EPOCH FROM (v_last_punch.event_time_utc - v_first_punch.event_time_utc)) / 60)::INT);
    v_net_mins := GREATEST(0, v_gross_mins - 60); -- 1 hour lunch deduction
    v_payable_hrs := ROUND((v_net_mins::NUMERIC / 60.0), 2);
    v_status := 'CHECKED OUT';

    INSERT INTO public.attendance_daily_summary (
      company_id, employee_id, attendance_date,
      first_punch_id, last_punch_id, source_punch_ids,
      first_check_in_utc, first_check_in_machine_ts,
      last_check_out_utc, last_check_out_machine_ts,
      gross_working_minutes, net_working_minutes, payable_hours,
      attendance_status, total_punches, updated_at
    ) VALUES (
      p_company_id, p_employee_id, p_attendance_date,
      v_first_punch.id, v_last_punch.id, v_all_punch_ids,
      v_first_punch.event_time_utc, v_first_punch.machine_timestamp,
      v_last_punch.event_time_utc, v_last_punch.machine_timestamp,
      v_gross_mins, v_net_mins, v_payable_hrs,
      v_status, v_punch_count, now()
    )
    ON CONFLICT (company_id, employee_id, attendance_date) DO UPDATE SET
      first_punch_id = EXCLUDED.first_punch_id,
      last_punch_id = EXCLUDED.last_punch_id,
      source_punch_ids = EXCLUDED.source_punch_ids,
      first_check_in_utc = EXCLUDED.first_check_in_utc,
      first_check_in_machine_ts = EXCLUDED.first_check_in_machine_ts,
      last_check_out_utc = EXCLUDED.last_check_out_utc,
      last_check_out_machine_ts = EXCLUDED.last_check_out_machine_ts,
      gross_working_minutes = EXCLUDED.gross_working_minutes,
      net_working_minutes = EXCLUDED.net_working_minutes,
      payable_hours = EXCLUDED.payable_hours,
      attendance_status = EXCLUDED.attendance_status,
      total_punches = EXCLUDED.total_punches,
      updated_at = now();

  END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Execute reconciliation for all existing employee-date combinations
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN (
    SELECT DISTINCT company_id, employee_id, (event_time_utc AT TIME ZONE 'Asia/Kolkata')::DATE AS att_date
    FROM public.biometric_raw_punches
    WHERE employee_id IS NOT NULL
  ) LOOP
    PERFORM public.recalculate_attendance_daily_summary(rec.company_id, rec.employee_id, rec.att_date);
  END LOOP;
END $$;
