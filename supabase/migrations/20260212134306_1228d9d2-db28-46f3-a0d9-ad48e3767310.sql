
-- Create tax slabs table
CREATE TABLE public.tax_slabs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  min_salary NUMERIC NOT NULL DEFAULT 0,
  max_salary NUMERIC, -- NULL means no upper limit
  percentage NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tax_slabs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage tax slabs"
ON public.tax_slabs FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "HR can manage tax slabs"
ON public.tax_slabs FOR ALL
USING (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "Anyone authenticated can read tax slabs"
ON public.tax_slabs FOR SELECT
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_tax_slabs_updated_at
BEFORE UPDATE ON public.tax_slabs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default Pakistani tax slabs
INSERT INTO public.tax_slabs (min_salary, max_salary, percentage, description) VALUES
(0, 50000, 0, 'No tax'),
(50001, 100000, 2.5, 'Basic slab'),
(100001, 200000, 12.5, 'Middle slab'),
(200001, NULL, 22.5, 'Higher slab');
