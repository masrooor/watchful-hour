
-- Leave balances table for tracking quotas per employee per year
CREATE TABLE public.leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  year integer NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  casual_total integer NOT NULL DEFAULT 10,
  casual_used integer NOT NULL DEFAULT 0,
  sick_total integer NOT NULL DEFAULT 8,
  sick_used integer NOT NULL DEFAULT 0,
  annual_total integer NOT NULL DEFAULT 14,
  annual_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, year)
);

ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own balances" ON public.leave_balances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all balances" ON public.leave_balances FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "HR can read all balances" ON public.leave_balances FOR SELECT USING (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Admins can manage balances" ON public.leave_balances FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "HR can manage balances" ON public.leave_balances FOR ALL USING (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "System can insert balances" ON public.leave_balances FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_leave_balances_updated_at
  BEFORE UPDATE ON public.leave_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-create balance record for current year when needed
CREATE OR REPLACE FUNCTION public.ensure_leave_balance(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.leave_balances (user_id, year)
  VALUES (_user_id, EXTRACT(YEAR FROM now())::integer)
  ON CONFLICT (user_id, year) DO NOTHING;
END;
$$;

-- Function to update used count when leave is approved
CREATE OR REPLACE FUNCTION public.update_leave_balance_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _days integer;
  _col_used text;
BEGIN
  -- Only act when status changes to approved
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    _days := (NEW.end_date - NEW.start_date) + 1;
    
    -- Ensure balance record exists
    PERFORM public.ensure_leave_balance(NEW.user_id);
    
    IF NEW.leave_type IN ('casual', 'sick', 'annual') THEN
      EXECUTE format(
        'UPDATE public.leave_balances SET %I = %I + $1 WHERE user_id = $2 AND year = EXTRACT(YEAR FROM now())::integer',
        NEW.leave_type || '_used', NEW.leave_type || '_used'
      ) USING _days, NEW.user_id;
    END IF;
  END IF;
  
  -- If changing from approved to something else, reverse
  IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    _days := (NEW.end_date - NEW.start_date) + 1;
    
    IF NEW.leave_type IN ('casual', 'sick', 'annual') THEN
      EXECUTE format(
        'UPDATE public.leave_balances SET %I = GREATEST(%I - $1, 0) WHERE user_id = $2 AND year = EXTRACT(YEAR FROM now())::integer',
        NEW.leave_type || '_used', NEW.leave_type || '_used'
      ) USING _days, NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_leave_balance
  AFTER UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_leave_balance_on_approval();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_balances;
