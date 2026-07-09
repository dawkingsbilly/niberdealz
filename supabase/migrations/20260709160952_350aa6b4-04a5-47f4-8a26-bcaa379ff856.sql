CREATE TABLE public.site_themes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  theme_key TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_at TIMESTAMPTZ NOT NULL,
  activated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX site_themes_window_idx ON public.site_themes (start_at, end_at);

GRANT SELECT ON public.site_themes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_themes TO authenticated;
GRANT ALL ON public.site_themes TO service_role;

ALTER TABLE public.site_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view scheduled themes"
  ON public.site_themes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Owners can insert themes"
  ON public.site_themes FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can update themes"
  ON public.site_themes FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can delete themes"
  ON public.site_themes FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));