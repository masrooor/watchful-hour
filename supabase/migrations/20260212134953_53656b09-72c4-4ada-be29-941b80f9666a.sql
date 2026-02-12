
-- Add job status and shift timing columns to profiles
ALTER TABLE public.profiles
ADD COLUMN job_status TEXT NOT NULL DEFAULT 'probation',
ADD COLUMN shift_start TIME,
ADD COLUMN shift_end TIME;
