
-- Create employee_loans table for tracking loans and monthly deductions
CREATE TABLE public.employee_loans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  description TEXT NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  monthly_deduction NUMERIC NOT NULL DEFAULT 0,
  total_deducted NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage loans" ON public.employee_loans FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "HR can manage loans" ON public.employee_loans FOR ALL USING (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Users can read own loans" ON public.employee_loans FOR SELECT USING (auth.uid() = user_id);

CREATE TRIGGER update_employee_loans_updated_at
  BEFORE UPDATE ON public.employee_loans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
