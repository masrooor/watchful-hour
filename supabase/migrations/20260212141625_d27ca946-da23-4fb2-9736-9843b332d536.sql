
-- Employee allowances (per-employee, configurable by admin)
CREATE TABLE public.employee_allowances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  allowance_type TEXT NOT NULL, -- 'housing', 'transport', 'medical', 'custom'
  label TEXT NOT NULL, -- display name
  amount NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_allowances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage allowances" ON public.employee_allowances FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "HR can manage allowances" ON public.employee_allowances FOR ALL USING (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Users can read own allowances" ON public.employee_allowances FOR SELECT USING (auth.uid() = user_id);

-- Employee custom deductions (per-employee, configurable by admin)
CREATE TABLE public.employee_deductions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  deduction_type TEXT NOT NULL, -- 'provident_fund', 'eobi', 'insurance', 'custom'
  label TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  is_percentage BOOLEAN NOT NULL DEFAULT false, -- if true, amount is % of gross
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_deductions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage deductions" ON public.employee_deductions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "HR can manage deductions" ON public.employee_deductions FOR ALL USING (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Users can read own deductions" ON public.employee_deductions FOR SELECT USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_employee_allowances_updated_at BEFORE UPDATE ON public.employee_allowances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_employee_deductions_updated_at BEFORE UPDATE ON public.employee_deductions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
