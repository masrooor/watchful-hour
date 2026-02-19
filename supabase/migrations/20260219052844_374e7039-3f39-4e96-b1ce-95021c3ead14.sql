
-- Drop the unique constraint on user_id + date to allow multiple check-ins per day
ALTER TABLE public.attendance_records DROP CONSTRAINT IF EXISTS attendance_records_user_id_date_key;
