
CREATE OR REPLACE FUNCTION public.lock_journey_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role text;
BEGIN
  BEGIN
    jwt_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  EXCEPTION WHEN OTHERS THEN
    jwt_role := NULL;
  END;

  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.paid := false;
    NEW.paid_at := NULL;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.paid := OLD.paid;
    NEW.paid_at := OLD.paid_at;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS journey_progress_lock_paid ON public.journey_progress;
CREATE TRIGGER journey_progress_lock_paid
BEFORE INSERT OR UPDATE ON public.journey_progress
FOR EACH ROW EXECUTE FUNCTION public.lock_journey_paid();

-- Also make sure any existing self-marked rows are reset (safety):
UPDATE public.journey_progress SET paid = false, paid_at = NULL WHERE paid = true AND paid_at IS NULL;
