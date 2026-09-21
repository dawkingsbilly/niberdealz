-- 1. Single store: product fields
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sale_price_zar numeric,
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Absorb every listing into the house store
UPDATE public.products SET vendor_id = '5946b1f2-5f63-4bfe-a508-d9126ac2a152'
WHERE vendor_id <> '5946b1f2-5f63-4bfe-a508-d9126ac2a152';

-- 2. Store settings (single row)
CREATE TABLE IF NOT EXISTS public.store_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  house_vendor_id uuid NOT NULL,
  support_whatsapp text NOT NULL DEFAULT '27687510600',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_settings TO anon, authenticated;
GRANT ALL ON public.store_settings TO service_role;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "store settings readable" ON public.store_settings;
CREATE POLICY "store settings readable" ON public.store_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "owner updates store settings" ON public.store_settings;
CREATE POLICY "owner updates store settings" ON public.store_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));
INSERT INTO public.store_settings (id, house_vendor_id)
VALUES (true, '5946b1f2-5f63-4bfe-a508-d9126ac2a152')
ON CONFLICT (id) DO NOTHING;
CREATE TRIGGER trg_store_settings_updated BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Categories managed by staff
CREATE TABLE IF NOT EXISTS public.store_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_categories TO anon, authenticated;
GRANT ALL ON public.store_categories TO service_role;
ALTER TABLE public.store_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categories readable" ON public.store_categories;
CREATE POLICY "categories readable" ON public.store_categories FOR SELECT USING (true);
CREATE TRIGGER trg_store_categories_updated BEFORE UPDATE ON public.store_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.store_categories (name, sort_order) VALUES
  ('Fashion', 1), ('Shoes', 2), ('Beauty', 3), ('Phone Accessories', 4),
  ('Home Essentials', 5), ('Health and Fitness', 6)
ON CONFLICT (name) DO NOTHING;

-- 4. Activity log: staff readable, never editable
CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text NOT NULL DEFAULT '',
  action text NOT NULL,
  object_type text NOT NULL DEFAULT '',
  object_id text NOT NULL DEFAULT '',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff read activity log" ON public.activity_log;
CREATE POLICY "staff read activity log" ON public.activity_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON public.activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products (is_active, status);