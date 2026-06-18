CREATE TABLE IF NOT EXISTS public.product_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('view','whatsapp_click')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_events_created_at_idx ON public.product_events (created_at DESC);
CREATE INDEX IF NOT EXISTS product_events_product_idx ON public.product_events (product_id);
CREATE INDEX IF NOT EXISTS product_events_vendor_idx ON public.product_events (vendor_id);

GRANT SELECT, INSERT ON public.product_events TO anon;
GRANT SELECT, INSERT ON public.product_events TO authenticated;
GRANT ALL ON public.product_events TO service_role;

ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record an event"
  ON public.product_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (event_type IN ('view','whatsapp_click'));

CREATE POLICY "Owner and admin can read all events"
  ON public.product_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Vendor can read own events"
  ON public.product_events FOR SELECT
  TO authenticated
  USING (vendor_id = auth.uid());