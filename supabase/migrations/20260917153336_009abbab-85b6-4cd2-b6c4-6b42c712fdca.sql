-- ORDERS -------------------------------------------------------------
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference text NOT NULL UNIQUE,
  buyer_id uuid NOT NULL,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  buyer_name text NOT NULL DEFAULT '',
  buyer_phone text NOT NULL DEFAULT '',
  delivery_method text NOT NULL DEFAULT 'meetup',
  delivery_address text NOT NULL DEFAULT '',
  delivery_fee_zar numeric NOT NULL DEFAULT 0,
  delivery_days integer,
  note text NOT NULL DEFAULT '',
  subtotal_zar numeric NOT NULL DEFAULT 0,
  discount_zar numeric NOT NULL DEFAULT 0,
  total_zar numeric NOT NULL DEFAULT 0,
  coupon_code text,
  affiliate_id uuid,
  points_used integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  payment_status text NOT NULL DEFAULT 'unpaid',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.orders TO authenticated;
GRANT UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers view own orders" ON public.orders
  FOR SELECT TO authenticated USING (buyer_id = auth.uid());
CREATE POLICY "Vendors view their orders" ON public.orders
  FOR SELECT TO authenticated USING (vendor_id = auth.uid());
CREATE POLICY "Staff view all orders" ON public.orders
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Vendors update their orders" ON public.orders
  FOR UPDATE TO authenticated USING (vendor_id = auth.uid()) WITH CHECK (vendor_id = auth.uid());
CREATE POLICY "Staff update all orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ORDER ITEMS --------------------------------------------------------
CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  title text NOT NULL,
  unit_price_zar numeric NOT NULL,
  qty integer NOT NULL DEFAULT 1,
  size text,
  color text,
  comment text NOT NULL DEFAULT '',
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order parties view items" ON public.order_items
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (o.buyer_id = auth.uid() OR o.vendor_id = auth.uid()
             OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
    )
  );

-- AFFILIATES ---------------------------------------------------------
CREATE TABLE public.affiliates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  display_name text NOT NULL DEFAULT '',
  points integer NOT NULL DEFAULT 0,
  points_redeemed integer NOT NULL DEFAULT 0,
  paid_out_zar numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.affiliates TO authenticated;
GRANT SELECT ON public.affiliates TO anon;
GRANT ALL ON public.affiliates TO service_role;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates view own account" ON public.affiliates
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Staff view all affiliates" ON public.affiliates
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER trg_affiliates_updated BEFORE UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AFFILIATE REFERRALS ------------------------------------------------
CREATE TABLE public.affiliate_referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL,
  source text NOT NULL DEFAULT 'link',
  points_awarded integer NOT NULL DEFAULT 0,
  has_purchased boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referred_user_id)
);

GRANT SELECT ON public.affiliate_referrals TO authenticated;
GRANT ALL ON public.affiliate_referrals TO service_role;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates view own referrals" ON public.affiliate_referrals
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_referrals.affiliate_id AND a.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')
  );

-- POINTS LEDGER ------------------------------------------------------
CREATE TABLE public.affiliate_points_ledger (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  points integer NOT NULL,
  kind text NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.affiliate_points_ledger TO authenticated;
GRANT ALL ON public.affiliate_points_ledger TO service_role;
ALTER TABLE public.affiliate_points_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates view own points" ON public.affiliate_points_ledger
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_points_ledger.affiliate_id AND a.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')
  );

-- PAYOUTS ------------------------------------------------------------
CREATE TABLE public.affiliate_payouts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  points_spent integer NOT NULL,
  amount_zar numeric NOT NULL,
  method text NOT NULL DEFAULT '',
  details text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.affiliate_payouts TO authenticated;
GRANT UPDATE ON public.affiliate_payouts TO authenticated;
GRANT ALL ON public.affiliate_payouts TO service_role;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates view own payouts" ON public.affiliate_payouts
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_payouts.affiliate_id AND a.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')
  );
CREATE POLICY "Staff update payouts" ON public.affiliate_payouts
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER trg_affiliate_payouts_updated BEFORE UPDATE ON public.affiliate_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- DELIVERY OPTIONS ON PRODUCTS ---------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS delivery_options jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_orders_buyer ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_vendor ON public.orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
