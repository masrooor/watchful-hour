
-- Add employee_id column
ALTER TABLE public.profiles ADD COLUMN employee_id text UNIQUE;

-- Create a sequence for auto-incrementing employee IDs
CREATE SEQUENCE public.employee_id_seq START 1;

-- Create a function to auto-assign employee_id on insert
CREATE OR REPLACE FUNCTION public.assign_employee_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.employee_id IS NULL THEN
    NEW.employee_id := 'EMP-' || LPAD(nextval('public.employee_id_seq')::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_employee_id
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_employee_id();

-- Backfill existing profiles that don't have an employee_id
UPDATE public.profiles
SET employee_id = 'EMP-' || LPAD(nextval('public.employee_id_seq')::text, 3, '0')
WHERE employee_id IS NULL;
