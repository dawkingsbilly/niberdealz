-- Operational commerce expansion: CEO integrations, reviewed sourcing, payments, notifications and marketing.
-- Secrets are held in Supabase Vault; this schema stores metadata and the vault secret id only.

CREATE TABLE IF NOT EXISTS public.integration_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_key text NOT NULL UNIQUE CHECK (integration_key IN ('yoco','ai_catalogue','image_search','resend')),
  display_name text NOT NULL,
  provider text NOT NULL DEFAULT '',
  secret_id uuid NULL,
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'not_connected' CHECK (status IN ('connected','not_connected','error')),
  last_error text NULL,
  last_checked_at timestamptz NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.integration_settings FROM anon, authenticated;
GRANT ALL ON public.integration_settings TO service_role;

CREATE TABLE IF NOT EXISTS public.integration_permissions (
  integration_key text NOT NULL REFERENCES public.integration_settings(integration_key) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  can_manage boolean NOT NULL DEFAULT false,
  granted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (integration_key, user_id)
);
ALTER TABLE public.integration_permissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.integration_permissions FROM anon, authenticated;
GRANT ALL ON public.integration_permissions TO service_role;

INSERT INTO public.integration_settings (integration_key, display_name, provider)
VALUES ('yoco','Yoco card payments','Yoco'), ('ai_catalogue','AI catalogue assistant',''), ('image_search','Image search assistant',''), ('resend','Transactional and marketing email','Resend')
ON CONFLICT (integration_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.supplier_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('website','api_feed')),
  base_url text NOT NULL CHECK (base_url ~ '^https://'),
  secret_id uuid NULL,
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_enabled boolean NOT NULL DEFAULT true,
  connection_status text NOT NULL DEFAULT 'not_connected' CHECK (connection_status IN ('connected','not_connected','error')),
  last_error text NULL,
  last_checked_at timestamptz NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.supplier_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.supplier_connections FROM anon, authenticated;
GRANT ALL ON public.supplier_connections TO service_role;

CREATE TABLE IF NOT EXISTS public.catalogue_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('manual','website','api_feed')),
  source_url text NULL,
  supplier_connection_id uuid NULL REFERENCES public.supplier_connections(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processed','error')),
  item_count integer NOT NULL DEFAULT 0 CHECK (item_count >= 0),
  error_message text NULL,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL
);
ALTER TABLE public.catalogue_imports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.catalogue_imports FROM anon, authenticated;
GRANT ALL ON public.catalogue_imports TO service_role;

CREATE TABLE IF NOT EXISTS public.product_source_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  catalogue_import_id uuid NULL REFERENCES public.catalogue_imports(id) ON DELETE SET NULL,
  source_type text NOT NULL CHECK (source_type IN ('manual','website','api_feed')),
  source_url text NULL,
  supplier_connection_id uuid NULL REFERENCES public.supplier_connections(id) ON DELETE SET NULL,
  supplier_sku text NULL,
  original_price_zar numeric(12,2) NULL CHECK (original_price_zar >= 0),
  marked_up_price_zar numeric(12,2) NOT NULL CHECK (marked_up_price_zar >= 0),
  markup_percent numeric(6,2) NOT NULL DEFAULT 40 CHECK (markup_percent >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.product_source_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_source_audit FROM anon, authenticated;
GRANT ALL ON public.product_source_audit TO service_role;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS listing_source text NOT NULL DEFAULT 'manual' CHECK (listing_source IN ('manual','website','api_feed'));
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS catalogue_import_id uuid NULL REFERENCES public.catalogue_imports(id) ON DELETE SET NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'approved' CHECK (review_status IN ('pending_review','approved','rejected'));
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS reviewed_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS reviewed_at timestamptz NULL;
CREATE INDEX IF NOT EXISTS products_review_queue_idx ON public.products(review_status, created_at DESC);

-- A payment attempt is private accounting data. Card data is never stored here.
CREATE TABLE IF NOT EXISTS public.payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  provider text NOT NULL DEFAULT 'yoco',
  provider_checkout_id text NULL UNIQUE,
  provider_payment_id text NULL UNIQUE,
  idempotency_key uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'ZAR' CHECK (currency = 'ZAR'),
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created','pending','succeeded','failed','refunding','refunded','error')),
  failure_code text NULL,
  failure_message text NULL,
  checkout_url text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_attempts FROM anon, authenticated;
GRANT ALL ON public.payment_attempts TO service_role;
CREATE INDEX IF NOT EXISTS payment_attempts_order_idx ON public.payment_attempts(order_id, created_at DESC);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_number text NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_url text NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status_changed_at timestamptz NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status_changed_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS exchange_requested_at timestamptz NULL;

CREATE TABLE IF NOT EXISTS public.order_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  previous_status text NULL,
  next_status text NOT NULL,
  tracking_number text NULL,
  note text NULL,
  actor_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.order_status_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_status_events FROM anon, authenticated;
GRANT ALL ON public.order_status_events TO service_role;

CREATE TABLE IF NOT EXISTS public.customer_notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NULL,
  channel text NOT NULL CHECK (channel IN ('email','push','admin_push')),
  kind text NOT NULL,
  subject text NOT NULL DEFAULT '',
  body text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed','suppressed')),
  attempts integer NOT NULL DEFAULT 0,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz NULL,
  last_error text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_notification_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.customer_notification_outbox FROM anon, authenticated;
GRANT ALL ON public.customer_notification_outbox TO service_role;
CREATE INDEX IF NOT EXISTS notification_outbox_pending_idx ON public.customer_notification_outbox(status, scheduled_for);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marketing_opt_in boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marketing_opted_out_at timestamptz NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS welcome_email_enabled boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.marketing_automation_settings (
  automation_key text PRIMARY KEY CHECK (automation_key IN ('welcome','new_arrivals','sale','abandoned_cart')),
  enabled boolean NOT NULL DEFAULT true,
  subject_template text NOT NULL,
  body_template text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.marketing_automation_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketing_automation_settings FROM anon, authenticated;
GRANT ALL ON public.marketing_automation_settings TO service_role;
INSERT INTO public.marketing_automation_settings(automation_key, subject_template, body_template) VALUES
('welcome','Welcome to NiberDealz','Welcome to NiberDealz. Browse new finds whenever you are ready.'),
('new_arrivals','New at NiberDealz','New arrivals are now available to browse.'),
('sale','A NiberDealz offer for you','A new sale or special offer is live.'),
('abandoned_cart','Your NiberDealz cart is waiting','Your saved items are still in your cart.')
ON CONFLICT (automation_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  body text NOT NULL,
  channels text[] NOT NULL DEFAULT ARRAY['email']::text[] CHECK (channels <@ ARRAY['email','push']::text[]),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','queued','sent','failed')),
  sent_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketing_campaigns FROM anon, authenticated;
GRANT ALL ON public.marketing_campaigns TO service_role;

CREATE TABLE IF NOT EXISTS public.abandoned_cart_candidates (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cart_snapshot jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  reminder_sent_at timestamptz NULL
);
ALTER TABLE public.abandoned_cart_candidates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.abandoned_cart_candidates FROM anon, authenticated;
GRANT ALL ON public.abandoned_cart_candidates TO service_role;

-- Only prior paid buyers may write a review; review text is public only after moderation.
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true;
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS moderated_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS moderated_at timestamptz NULL;
DROP POLICY IF EXISTS "Anyone can read reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "public reads published reviews" ON public.product_reviews;
CREATE POLICY "public reads published reviews" ON public.product_reviews FOR SELECT TO anon, authenticated USING (is_published = true);
DROP POLICY IF EXISTS "User writes own review" ON public.product_reviews;
DROP POLICY IF EXISTS "paid buyer writes one review" ON public.product_reviews;
CREATE POLICY "paid buyer writes one review" ON public.product_reviews FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.product_id = product_reviews.product_id
      AND o.buyer_id = auth.uid()
      AND o.payment_status = 'paid'
  )
);
DROP POLICY IF EXISTS "User updates own review" ON public.product_reviews;
DROP POLICY IF EXISTS "user deletes own review" ON public.product_reviews;

-- All direct client writes to payment/order operational state remain blocked. Server functions use service-role access.
DROP POLICY IF EXISTS "Staff update all orders" ON public.orders;
DROP POLICY IF EXISTS "Vendors update their orders" ON public.orders;

-- Atomic payment confirmation from a verified gateway webhook only.
CREATE OR REPLACE FUNCTION public.confirm_yoco_payment(
  p_order_id uuid, p_attempt_id uuid, p_checkout_id text, p_payment_id text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order public.orders%ROWTYPE; v_attempt public.payment_attempts%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  SELECT * INTO v_attempt FROM public.payment_attempts WHERE id = p_attempt_id AND order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment attempt not found'; END IF;
  IF v_attempt.status = 'succeeded' THEN RETURN; END IF;
  IF v_order.payment_status = 'paid' THEN RAISE EXCEPTION 'Order is already paid'; END IF;
  UPDATE public.payment_attempts SET status='succeeded', provider_checkout_id=coalesce(p_checkout_id,provider_checkout_id), provider_payment_id=coalesce(p_payment_id,provider_payment_id), completed_at=now(), updated_at=now() WHERE id=p_attempt_id;
  UPDATE public.orders SET payment_status='paid', status='paid', status_changed_at=now() WHERE id=p_order_id;
  INSERT INTO public.order_status_events(order_id,previous_status,next_status,note) VALUES(p_order_id, v_order.status, 'paid', 'Verified Yoco payment');
END; $$;
REVOKE ALL ON FUNCTION public.confirm_yoco_payment(uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_yoco_payment(uuid,uuid,text,text) TO service_role;
