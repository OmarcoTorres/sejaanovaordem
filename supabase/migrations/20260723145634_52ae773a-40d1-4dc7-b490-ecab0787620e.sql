
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  whatsapp text NOT NULL,
  intention text,
  profile text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.leads TO anon, authenticated;
GRANT ALL ON public.leads TO service_role;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can insert leads"
ON public.leads FOR INSERT
TO anon, authenticated
WITH CHECK (true);
