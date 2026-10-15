-- Customer consent, transparent delivery pricing and manually controlled fulfilment.
-- Payment confirmation remains separate from placing an order.

CREATE TABLE IF NOT EXISTS public.consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  consent_type text NOT NULL CHECK (consent_type IN ('privacy', 'terms_registration', 'terms_checkout')),
  policy_version text NOT NULL,
  context text NOT NULL CHECK (context IN ('registration', 'checkout')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.consent_records FROM anon, authenticated;
GRANT SELECT ON public.consent_records TO authenticated;
GRANT ALL ON public.consent_records TO service_role;
DROP POLICY IF EXISTS "customer reads own consent" ON public.consent_records;
CREATE POLICY "customer reads own consent" ON public.consent_records FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS consent_records_user_created_idx ON public.consent_records(user_id, created_at DESC);

-- Registration consent is captured only from the trusted auth-user insert trigger.
CREATE OR REPLACE FUNCTION public.capture_registration_consent()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE((NEW.raw_user_meta_data->>'privacy_consent'), 'false') = 'true' THEN
    INSERT INTO public.consent_records(user_id, consent_type, policy_version, context)
    VALUES
      (NEW.id, 'privacy', COALESCE(NULLIF(NEW.raw_user_meta_data->>'privacy_version', ''), '2026-09'), 'registration'),
      (NEW.id, 'terms_registration', COALESCE(NULLIF(NEW.raw_user_meta_data->>'terms_version', ''), '2026-09'), 'registration');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_capture_registration_consent ON auth.users;
CREATE TRIGGER trg_capture_registration_consent AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.capture_registration_consent();

-- Supplier data never sits on public product/order rows. It is private CEO-only operational data.
CREATE TABLE IF NOT EXISTS public.product_supplier_sources (
  product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  source_url text NOT NULL DEFAULT '',
  original_price_zar numeric(10,2),
  supplier_name text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.product_supplier_sources ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_supplier_sources FROM anon, authenticated;
GRANT ALL ON public.product_supplier_sources TO service_role;
DROP POLICY IF EXISTS "ceo manages supplier sources" ON public.product_supplier_sources;
CREATE POLICY "ceo manages supplier sources" ON public.product_supplier_sources FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));

CREATE TABLE IF NOT EXISTS public.order_item_supplier_sources (
  order_item_id uuid PRIMARY KEY REFERENCES public.order_items(id) ON DELETE CASCADE,
  source_url text NOT NULL DEFAULT '',
  original_price_zar numeric(10,2),
  supplier_name text NOT NULL DEFAULT ''
);
ALTER TABLE public.order_item_supplier_sources ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_item_supplier_sources FROM anon, authenticated;
GRANT ALL ON public.order_item_supplier_sources TO service_role;
DROP POLICY IF EXISTS "ceo reads order supplier sources" ON public.order_item_supplier_sources;
CREATE POLICY "ceo reads order supplier sources" ON public.order_item_supplier_sources FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_tier text,
  ADD COLUMN IF NOT EXISTS paxi_pickup_point text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fulfilment_status text NOT NULL DEFAULT 'Pending Fulfilment',
  ADD COLUMN IF NOT EXISTS fulfilment_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS fulfilment_updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS shipping_discount_zar numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_promotion_status text NOT NULL DEFAULT 'not_applied',
  ADD COLUMN IF NOT EXISTS inventory_restocked_at timestamptz;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_fulfilment_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_fulfilment_status_check CHECK (fulfilment_status IN ('Pending Fulfilment', 'Placed with supplier', 'Fulfilled'));
CREATE INDEX IF NOT EXISTS orders_fulfilment_status_idx ON public.orders(fulfilment_status, created_at DESC);

-- Customer shipping information and money data are CEO-only. Operational admins receive no order access.
DROP POLICY IF EXISTS "staff read all NiberDealz orders" ON public.orders;
DROP POLICY IF EXISTS "ceo reads all NiberDealz orders" ON public.orders;
CREATE POLICY "ceo reads all NiberDealz orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'));
DROP POLICY IF EXISTS "staff read all order items" ON public.order_items;
DROP POLICY IF EXISTS "ceo reads all order items" ON public.order_items;
CREATE POLICY "ceo reads all order items" ON public.order_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'));

-- A promotion claim is transactionally bound to account + normalized contact/address signal.
-- A future verified phone/payment identity can strengthen this record without any browser-based trust.
CREATE TABLE IF NOT EXISTS public.shipping_promotion_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT UNIQUE,
  identity_key text NOT NULL UNIQUE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT UNIQUE,
  promotion_kind text NOT NULL CHECK (promotion_kind IN ('first_order_free', 'first_order_discount', 'returning_courier_free')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shipping_promotion_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shipping_promotion_claims FROM anon, authenticated;
GRANT ALL ON public.shipping_promotion_claims TO service_role;

-- Retire the earlier seven-argument checkout RPC so no caller can bypass delivery and consent controls.
DROP FUNCTION IF EXISTS public.create_niberdealz_order(jsonb,text,text,text,text,text,text);

-- Server-authoritative checkout calculates delivery and records consent.
-- Inventory is reduced only after a verified payment webhook confirms the order.
CREATE OR REPLACE FUNCTION public.create_niberdealz_order(
  p_items jsonb, p_buyer_name text, p_buyer_phone text, p_delivery_method text,
  p_delivery_address text, p_note text DEFAULT '', p_discount_code text DEFAULT '',
  p_delivery_tier text DEFAULT 'courier', p_paxi_pickup_point text DEFAULT '', p_terms_version text DEFAULT ''
) RETURNS TABLE(order_id uuid, reference text, total_zar numeric, payment_status text, delivery_fee_zar numeric, shipping_discount_zar numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_house_vendor uuid; v_product record; v_source record; v_item jsonb; v_qty integer; v_price numeric(10,2); v_order_item uuid;
  v_subtotal numeric(10,2) := 0; v_discount numeric(10,2) := 0; v_delivery numeric(10,2) := 0;
  v_total numeric(10,2); v_order uuid; v_reference text; v_code record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) BETWEEN 0 AND 30 IS FALSE THEN RAISE EXCEPTION 'A valid cart is required'; END IF;
  IF length(trim(p_buyer_name)) < 2 OR length(trim(p_buyer_phone)) < 9 THEN RAISE EXCEPTION 'Name and contact number are required'; END IF;
  IF p_delivery_method NOT IN ('courier','paxi','pickup') THEN RAISE EXCEPTION 'Invalid delivery method'; END IF;
  IF nullif(trim(p_terms_version), '') IS NULL THEN RAISE EXCEPTION 'Please accept the Terms and Privacy Policy'; END IF;
  IF p_delivery_method = 'courier' AND (p_delivery_tier <> 'courier' OR length(trim(p_delivery_address)) < 8) THEN RAISE EXCEPTION 'A complete courier address is required'; END IF;
  IF p_delivery_method = 'paxi' AND (p_delivery_tier NOT IN ('paxi_standard_5kg','paxi_express_5kg','paxi_standard_10kg','paxi_express_10kg') OR length(trim(p_paxi_pickup_point)) < 3 OR length(trim(p_delivery_address)) < 8) THEN RAISE EXCEPTION 'Choose a PAXI service, pickup point and address'; END IF;
  IF p_delivery_method = 'pickup' AND p_delivery_tier <> 'pickup' THEN RAISE EXCEPTION 'Invalid collection option'; END IF;

  SELECT house_vendor_id INTO v_house_vendor FROM public.store_settings WHERE id = true;
  IF v_house_vendor IS NULL THEN RAISE EXCEPTION 'Store is not configured'; END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_qty := (v_item->>'qty')::integer;
    IF v_qty IS NULL OR v_qty < 1 OR v_qty > 50 OR (v_item->>'product_id') IS NULL THEN RAISE EXCEPTION 'Invalid cart item'; END IF;
    SELECT * INTO v_product FROM public.products WHERE id = (v_item->>'product_id')::uuid FOR UPDATE;
    IF NOT FOUND OR v_product.status <> 'approved' OR NOT v_product.is_active OR v_product.is_sold THEN RAISE EXCEPTION 'A product in your cart is no longer available'; END IF;
    IF v_product.stock IS NOT NULL AND v_product.stock < v_qty THEN RAISE EXCEPTION 'Insufficient stock for %', v_product.title; END IF;
    v_price := COALESCE(v_product.sale_price_zar, v_product.price_zar); v_subtotal := v_subtotal + (v_price * v_qty);
  END LOOP;
  v_delivery := CASE p_delivery_tier
    WHEN 'courier' THEN 150 WHEN 'paxi_standard_5kg' THEN 59.95 WHEN 'paxi_express_5kg' THEN 109.95
    WHEN 'paxi_standard_10kg' THEN 109.95 WHEN 'paxi_express_10kg' THEN 139.95 ELSE 0 END;
  IF nullif(trim(p_discount_code), '') IS NOT NULL THEN
    SELECT * INTO v_code FROM public.discount_codes WHERE upper(code)=upper(trim(p_discount_code)) AND active=true AND (starts_at IS NULL OR starts_at<=now()) AND (ends_at IS NULL OR ends_at>=now()) AND (max_uses IS NULL OR uses_count < max_uses) FOR UPDATE;
    IF FOUND AND v_subtotal >= v_code.min_order_zar THEN v_discount := CASE WHEN v_code.kind='percentage' THEN round(v_subtotal*v_code.value/100,2) ELSE least(v_code.value,v_subtotal) END; UPDATE public.discount_codes SET uses_count=uses_count+1 WHERE id=v_code.id; END IF;
  END IF;
  v_total := greatest(0, v_subtotal - v_discount + v_delivery);
  v_reference := 'ND' || to_char(now(),'YYMMDD') || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  INSERT INTO public.orders(reference,buyer_id,vendor_id,buyer_name,buyer_phone,delivery_method,delivery_tier,paxi_pickup_point,delivery_address,note,delivery_fee_zar,shipping_discount_zar,shipping_promotion_status,subtotal_zar,discount_zar,total_zar,coupon_code,status,payment_status,fulfilment_status)
  VALUES(v_reference,auth.uid(),v_house_vendor,trim(p_buyer_name),trim(p_buyer_phone),p_delivery_method,p_delivery_tier,coalesce(trim(p_paxi_pickup_point),''),coalesce(trim(p_delivery_address),''),coalesce(trim(p_note),''),v_delivery,0,CASE WHEN p_delivery_method='courier' THEN 'pending_payment_verification' ELSE 'not_applicable' END,v_subtotal,v_discount,v_total,nullif(upper(trim(p_discount_code)),''),'pending','unpaid','Pending Fulfilment') RETURNING id INTO v_order;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_qty := (v_item->>'qty')::integer; SELECT * INTO v_product FROM public.products WHERE id=(v_item->>'product_id')::uuid FOR UPDATE; v_price:=COALESCE(v_product.sale_price_zar,v_product.price_zar);
    INSERT INTO public.order_items(order_id,product_id,title,unit_price_zar,qty,size,color,comment,image_url) VALUES(v_order,v_product.id,v_product.title,v_price,v_qty,nullif(v_item->>'size',''),nullif(v_item->>'color',''),coalesce(v_item->>'comment',''),v_product.image_url) RETURNING id INTO v_order_item;
    SELECT * INTO v_source FROM public.product_supplier_sources WHERE product_id=v_product.id;
    IF FOUND THEN INSERT INTO public.order_item_supplier_sources(order_item_id,source_url,original_price_zar,supplier_name) VALUES(v_order_item,v_source.source_url,v_source.original_price_zar,v_source.supplier_name); END IF;
  END LOOP;
  INSERT INTO public.consent_records(user_id,order_id,consent_type,policy_version,context) VALUES(auth.uid(),v_order,'terms_checkout',p_terms_version,'checkout'),(auth.uid(),v_order,'privacy',p_terms_version,'checkout');
  INSERT INTO public.activity_log(actor_id,actor_email,action,object_type,object_id,details) VALUES(auth.uid(),coalesce(auth.jwt()->>'email',''),'order_created','order',v_order::text,jsonb_build_object('reference',v_reference,'total_zar',v_total,'delivery_fee_zar',v_delivery));
  RETURN QUERY SELECT v_order,v_reference,v_total,'unpaid'::text,v_delivery,0::numeric;
END; $$;

-- This is invoked only by the CEO-authorized server function after payment is independently confirmed.
CREATE OR REPLACE FUNCTION public.set_niberdealz_order_status(p_order_id uuid, p_status text, p_actor_id uuid)
RETURNS TABLE(total_zar numeric, shipping_discount_zar numeric, promotion_status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order record; v_account_created timestamptz; v_prior_paid integer; v_discount numeric(10,2):=0; v_kind text; v_identity text;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF p_status NOT IN ('pending','paid','processing','shipped','delivered','cancelled','refunded') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  IF p_status IN ('cancelled','refunded') AND v_order.inventory_restocked_at IS NULL THEN
    UPDATE public.products p SET stock=p.stock+i.qty, stock_sold=greatest(0,p.stock_sold-i.qty) FROM public.order_items i WHERE i.order_id=v_order.id AND i.product_id=p.id AND p.stock IS NOT NULL;
    UPDATE public.orders SET inventory_restocked_at=now() WHERE id=v_order.id;
  END IF;
  IF p_status='paid' AND v_order.payment_status <> 'paid' AND v_order.delivery_method='courier' THEN
    SELECT created_at INTO v_account_created FROM auth.users WHERE id=v_order.buyer_id;
    SELECT count(*) INTO v_prior_paid FROM public.orders WHERE buyer_id=v_order.buyer_id AND id<>v_order.id AND payment_status='paid' AND status NOT IN ('cancelled','refunded');
    v_identity := md5(lower(regexp_replace(v_order.buyer_phone,'[^0-9]','','g')) || '|' || lower(regexp_replace(v_order.delivery_address,'\s+',' ','g')));
    IF NOT EXISTS (SELECT 1 FROM public.shipping_promotion_claims WHERE user_id=v_order.buyer_id OR identity_key=v_identity) THEN
      IF v_prior_paid=0 THEN
        IF now() <= v_account_created + interval '48 hours' THEN v_discount:=v_order.delivery_fee_zar; v_kind:='first_order_free';
        ELSE v_discount:=round(v_order.delivery_fee_zar*.25,2); v_kind:='first_order_discount'; END IF;
      ELSIF v_order.subtotal_zar>1000 THEN v_discount:=v_order.delivery_fee_zar; v_kind:='returning_courier_free'; END IF;
      IF v_discount>0 THEN INSERT INTO public.shipping_promotion_claims(user_id,identity_key,order_id,promotion_kind) VALUES(v_order.buyer_id,v_identity,v_order.id,v_kind); END IF;
    END IF;
    UPDATE public.orders SET shipping_discount_zar=v_discount, shipping_promotion_status=CASE WHEN v_discount>0 THEN 'applied_after_payment_verification' ELSE 'not_eligible' END, total_zar=greatest(0,subtotal_zar-discount_zar+delivery_fee_zar-v_discount) WHERE id=v_order.id;
  END IF;
  UPDATE public.orders SET status=p_status,payment_status=CASE WHEN p_status='paid' THEN 'paid' ELSE payment_status END WHERE id=v_order.id;
  INSERT INTO public.activity_log(actor_id,action,object_type,object_id,details) VALUES(p_actor_id,'order_status_changed','order',p_order_id::text,jsonb_build_object('to',p_status));
  RETURN QUERY SELECT o.total_zar,o.shipping_discount_zar,o.shipping_promotion_status FROM public.orders o WHERE o.id=p_order_id;
END; $$;
REVOKE ALL ON FUNCTION public.create_niberdealz_order(jsonb,text,text,text,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_niberdealz_order(jsonb,text,text,text,text,text,text,text,text,text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.set_niberdealz_order_status(uuid,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_niberdealz_order_status(uuid,text,uuid) TO service_role;
