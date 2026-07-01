
-- 1. Vendor flags
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_official boolean NOT NULL DEFAULT false;

-- Make new stores start as pending (existing ones keep whatever they have)
ALTER TABLE public.vendors ALTER COLUMN status SET DEFAULT 'pending';

-- 2. Product stock
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock integer;

-- 3. Store reviews
CREATE TABLE IF NOT EXISTS public.store_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, user_id)
);
GRANT SELECT ON public.store_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_reviews TO authenticated;
GRANT ALL ON public.store_reviews TO service_role;
ALTER TABLE public.store_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store_reviews readable by all" ON public.store_reviews FOR SELECT USING (true);
CREATE POLICY "user manages own store review insert" ON public.store_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user manages own store review update" ON public.store_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user manages own store review delete" ON public.store_reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. Sale campaigns
CREATE TABLE IF NOT EXISTS public.sale_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  discount_pct integer NOT NULL CHECK (discount_pct BETWEEN 1 AND 90),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sale_campaigns TO anon, authenticated;
GRANT ALL ON public.sale_campaigns TO service_role;
ALTER TABLE public.sale_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns readable by all" ON public.sale_campaigns FOR SELECT USING (true);
CREATE POLICY "campaigns writable by staff" ON public.sale_campaigns FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- 5. Sale participants
CREATE TABLE IF NOT EXISTS public.sale_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.sale_campaigns(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','joined','declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, vendor_id)
);
GRANT SELECT ON public.sale_participants TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sale_participants TO authenticated;
GRANT ALL ON public.sale_participants TO service_role;
ALTER TABLE public.sale_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants readable by all" ON public.sale_participants FOR SELECT USING (true);
CREATE POLICY "staff manages participants" ON public.sale_participants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "vendor updates own participation" ON public.sale_participants FOR UPDATE TO authenticated
  USING (vendor_id = auth.uid()) WITH CHECK (vendor_id = auth.uid());
