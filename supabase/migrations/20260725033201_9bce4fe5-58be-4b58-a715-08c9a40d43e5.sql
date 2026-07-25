ALTER TABLE public.journey_progress
  ADD COLUMN IF NOT EXISTS paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

DROP TRIGGER IF EXISTS update_journey_progress_updated_at ON public.journey_progress;
CREATE TRIGGER update_journey_progress_updated_at
BEFORE UPDATE ON public.journey_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();