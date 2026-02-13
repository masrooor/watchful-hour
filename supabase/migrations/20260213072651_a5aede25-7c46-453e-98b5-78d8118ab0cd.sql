ALTER TABLE public.attendance_settings
ADD COLUMN probation_period_days integer NOT NULL DEFAULT 90;