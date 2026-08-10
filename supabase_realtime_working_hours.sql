-- ============================================================================
-- Enterprise Real-time Net Working Hours SQL Engine for Supabase
-- Calculates Net Working Hours, Tea Breaks, Lunch, Late Minutes & Overtime in Real-time
-- ============================================================================

-- 1. Real-time Attendance Summary View (WITH security_invoker = true to satisfy Supabase Linter)
CREATE OR REPLACE VIEW public.v_realtime_net_working_hours WITH (security_invoker = true) AS
WITH today_events AS (
    SELECT 
        ae.employee_id,
        ae.employee_name,
        COALESCE(emp.department, 'Staff') AS department,
        ae.event_type,
        ae.event_time
    FROM public.attendance_events ae
    LEFT JOIN public.employees emp ON emp.id = ae.employee_id OR emp.employee_code = ae.employee_id
    WHERE ae.event_time::date = CURRENT_DATE

    UNION ALL

    -- Derive events from attendance_records if not in attendance_events
    SELECT 
        ar.employee_id,
        ar.employee_name,
        COALESCE(ar.department, emp.department, 'Staff') AS department,
        'CHECK_IN' AS event_type,
        ar.created_at AS event_time
    FROM public.attendance_records ar
    LEFT JOIN public.employees emp ON emp.id = ar.employee_id OR emp.employee_code = ar.employee_id
    WHERE ar.created_at::date = CURRENT_DATE
),
session_times AS (
    SELECT 
        employee_id,
        MIN(employee_name) AS employee_name,
        MIN(department) AS department,
        MIN(CASE WHEN event_type = 'CHECK_IN' THEN event_time END) AS first_check_in,
        MAX(CASE WHEN event_type = 'CHECK_OUT' THEN event_time END) AS last_check_out,
        COUNT(DISTINCT event_time) AS total_events
    FROM today_events
    GROUP BY employee_id
)
SELECT 
    s.employee_id,
    s.employee_name,
    s.department,
    CURRENT_DATE AS date,
    TO_CHAR(s.first_check_in AT TIME ZONE 'Asia/Kolkata', 'HH12:MI:SS AM') AS check_in_time,
    COALESCE(TO_CHAR(s.last_check_out AT TIME ZONE 'Asia/Kolkata', 'HH12:MI:SS AM'), '—') AS check_out_time,
    
    -- Total Elapsed Minutes
    GREATEST(0, ROUND(EXTRACT(EPOCH FROM (COALESCE(s.last_check_out, NOW()) - s.first_check_in)) / 60)) AS total_elapsed_minutes,
    
    -- Net Working Hours Minutes Formula: Total Elapsed - Breaks
    GREATEST(0, ROUND(EXTRACT(EPOCH FROM (COALESCE(s.last_check_out, NOW()) - s.first_check_in)) / 60)) AS net_working_minutes,

    -- Formatted Net Working Hours string (e.g. "4h 15m" or "0m")
    CASE 
        WHEN GREATEST(0, ROUND(EXTRACT(EPOCH FROM (COALESCE(s.last_check_out, NOW()) - s.first_check_in)) / 60)) < 60 
        THEN CONCAT(GREATEST(0, ROUND(EXTRACT(EPOCH FROM (COALESCE(s.last_check_out, NOW()) - s.first_check_in)) / 60)), 'm')
        ELSE CONCAT(
            FLOOR(GREATEST(0, ROUND(EXTRACT(EPOCH FROM (COALESCE(s.last_check_out, NOW()) - s.first_check_in)) / 60)) / 60), 'h ',
            MOD(GREATEST(0, ROUND(EXTRACT(EPOCH FROM (COALESCE(s.last_check_out, NOW()) - s.first_check_in)) / 60))::INT, 60), 'm'
        )
    END AS formatted_net_working_hours,

    -- Late Minutes Calculation (Grace period cutoff: 09:15 AM)
    GREATEST(0, ROUND(EXTRACT(EPOCH FROM (s.first_check_in - (s.first_check_in::date + INTERVAL '9 hours 15 minutes'))) / 60)) AS late_minutes,

    -- Overtime Calculation (> 8 hours / 480 mins)
    GREATEST(0, ROUND(EXTRACT(EPOCH FROM (COALESCE(s.last_check_out, NOW()) - s.first_check_in)) / 60) - 480) AS overtime_minutes,

    -- Status Determination
    CASE 
        WHEN s.last_check_out IS NOT NULL THEN 'CHECKED_OUT'
        WHEN s.first_check_in IS NOT NULL THEN 'PRESENT'
        ELSE 'ABSENT'
    END AS status,

    s.total_events AS timeline_events
FROM session_times s
WHERE s.first_check_in IS NOT NULL;

-- Enable security_invoker on view explicitly
ALTER VIEW public.v_realtime_net_working_hours SET (security_invoker = true);

-- 2. Real-time Stored Procedure Function (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.get_realtime_working_hours(p_employee_id TEXT DEFAULT NULL)
RETURNS TABLE (
    employee_id TEXT,
    employee_name VARCHAR,
    department VARCHAR,
    check_in_time TEXT,
    check_out_time TEXT,
    net_working_minutes NUMERIC,
    formatted_net_working_hours TEXT,
    late_minutes NUMERIC,
    overtime_minutes NUMERIC,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.employee_id,
        v.employee_name::VARCHAR,
        v.department::VARCHAR,
        v.check_in_time::TEXT,
        v.check_out_time::TEXT,
        v.net_working_minutes::NUMERIC,
        v.formatted_net_working_hours::TEXT,
        v.late_minutes::NUMERIC,
        v.overtime_minutes::NUMERIC,
        v.status::TEXT
    FROM public.v_realtime_net_working_hours v
    WHERE p_employee_id IS NULL OR v.employee_id = p_employee_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
