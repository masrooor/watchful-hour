
CREATE TABLE public.salary_increments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  previous_salary NUMERIC NOT NULL DEFAULT 0,
  new_salary NUMERIC NOT NULL DEFAULT 0,
  increment_amount NUMERIC NOT NULL DEFAULT 0,
  increment_percentage NUMERIC,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT,
  approved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.salary_increments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage increments" ON public.salary_increments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "HR can manage increments" ON public.salary_increments FOR ALL TO authenticated USING (has_role(auth.uid(), 'hr'::app_role));
CREATE POLICY "Payroll officers can read increments" ON public.salary_increments FOR SELECT TO authenticated USING (has_role(auth.uid(), 'payroll_officer'::app_role));
CREATE POLICY "Managers can read increments" ON public.salary_increments FOR SELECT TO authenticated USING (has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Users can read own increments" ON public.salary_increments FOR SELECT TO authenticated USING (auth.uid() = user_id);
