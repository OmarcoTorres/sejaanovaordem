-- Journey progress (per authenticated user, including anonymous sessions)
CREATE TABLE public.journey_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  whatsapp text,
  intention text,
  profile text,
  stage text NOT NULL DEFAULT 'welcome',
  day integer NOT NULL DEFAULT 1,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.journey_progress TO authenticated;
GRANT ALL ON public.journey_progress TO service_role;

ALTER TABLE public.journey_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own progress select" ON public.journey_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own progress insert" ON public.journey_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own progress update" ON public.journey_progress
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own progress delete" ON public.journey_progress
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER journey_progress_updated_at
BEFORE UPDATE ON public.journey_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Harden existing leads table: attach to user, restrict reads to owner
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Allow authenticated users to insert their own lead and read/update it
GRANT SELECT, INSERT, UPDATE ON public.leads TO authenticated;

CREATE POLICY "own lead select" ON public.leads
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own lead update" ON public.leads
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own lead insert authenticated" ON public.leads
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR user_id IS NULL);