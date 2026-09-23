-- First-order shipping offer for the payment-free order-request release.
-- The checkout RPC remains the only customer-write path. It calculates the offer and stores an
-- auditable claim atomically, never changes stock, and releases the claim if the request is cancelled.
--
-- Business rule: the first non-cancelled order request using courier or PAXI is eligible. The
-- offer is free shipping through the first 48 hours after account creation (inclusive), otherwise
-- 25% off shipping. Pickup does not qualify. All timestamps are timestamptz, so the 48-hour window
-- is absolute rather than dependent on a browser or local timezone.

-- A cancelled request releases the one-time offer. This is deliberately before the row update so
-- the amended promotion status is saved with the cancellation transition.
CREATE OR REPLACE FUNCTION public.release_shipping_promotion_on_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('cancelled', 'refunded')
    AND OLD.status IS DISTINCT FROM NEW.status THEN
    DELETE FROM public.shipping_promotion_claims WHERE order_id = NEW.id;
    IF OLD.shipping_discount_zar > 0 THEN
      NEW.shipping_promotion_status := 'released_on_cancellation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_release_shipping_promotion_on_cancel ON public.orders;
CREATE TRIGGER trg_release_shipping_promotion_on_cancel
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.release_shipping_promotion_on_cancel();

-- A request can receive the offer only when it is the customer's first non-cancelled order
-- request, uses courier or PAXI, and has not already used the account/contact/address signal.
-- Account creation is read server-side from auth.users. The 48-hour boundary is inclusive.
CREATE OR REPLACE FUNCTION public.create_niberdealz_order(
  p_items jsonb, p_buyer_name text, p_buyer_phone text, p_delivery_method text,
  p_delivery_address text, p_note text DEFAULT '', p_discount_code text DEFAULT '',
  p_delivery_tier text DEFAULT 'courier', p_paxi_pickup_point text DEFAULT '', p_terms_version text DEFAULT ''
) RETURNS TABLE(order_id uuid, reference text, total_zar numeric, payment_status text, delivery_fee_zar numeric, shipping_discount_zar numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_house_vendor uuid; v_product record; v_source record; v_item jsonb; v_qty integer; v_price numeric(10,2); v_order_item uuid;
  v_subtotal numeric(10,2) := 0; v_delivery numeric(10,2) := 0; v_shipping_discount numeric(10,2) := 0;
  v_total numeric(10,2); v_order uuid; v_reference text; v_account_created timestamptz; v_identity text;
  v_promotion_kind text := 'not_eligible'; v_is_first_request boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) BETWEEN 0 AND 30 IS FALSE THEN RAISE EXCEPTION 'A valid cart is required'; END IF;
  IF length(trim(p_buyer_name)) < 2 OR length(trim(p_buyer_phone)) < 9 THEN RAISE EXCEPTION 'Name and contact number are required'; END IF;
  IF p_delivery_method NOT IN ('courier','paxi','pickup') THEN RAISE EXCEPTION 'Invalid delivery method'; END IF;
  IF nullif(trim(p_terms_version), '') IS NULL THEN RAISE EXCEPTION 'Please accept the Terms and Privacy Policy'; END IF;
  IF nullif(trim(p_discount_code), '') IS NOT NULL THEN RAISE EXCEPTION 'Discount codes are not available while order requests are being reviewed'; END IF;
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
    v_price := COALESCE(v_product.sale_price_zar, v_product.price_zar);
    v_subtotal := v_subtotal + (v_price * v_qty);
  END LOOP;

  v_delivery := CASE p_delivery_tier
    WHEN 'courier' THEN 150 WHEN 'paxi_standard_5kg' THEN 59.95 WHEN 'paxi_express_5kg' THEN 109.95
    WHEN 'paxi_standard_10kg' THEN 109.95 WHEN 'paxi_express_10kg' THEN 139.95 ELSE 0 END;

  -- Serialize every request from the same account, including pickup, so a concurrent pickup
  -- request cannot be bypassed when determining whether this is the first request.
  PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text));

  IF p_delivery_method IN ('courier', 'paxi') THEN
    -- Serialize matching contact/address signals across different accounts as well.
    v_identity := md5(
      lower(regexp_replace(trim(p_buyer_phone), '[^0-9]', '', 'g')) || '|' ||
      lower(regexp_replace(trim(p_delivery_address), '\s+', ' ', 'g'))
    );
    PERFORM pg_advisory_xact_lock(hashtext(v_identity));

    SELECT created_at INTO v_account_created FROM auth.users WHERE id = auth.uid();
    SELECT NOT EXISTS (
      SELECT 1 FROM public.orders
      WHERE buyer_id = auth.uid()
        AND status NOT IN ('cancelled', 'refunded')
    ) INTO v_is_first_request;

    IF v_is_first_request
      AND NOT EXISTS (
        SELECT 1 FROM public.shipping_promotion_claims
        WHERE user_id = auth.uid() OR identity_key = v_identity
      ) THEN
      IF now() <= v_account_created + interval '48 hours' THEN
        v_shipping_discount := v_delivery;
        v_promotion_kind := 'first_order_free';
      ELSE
        v_shipping_discount := round(v_delivery * 0.25, 2);
        v_promotion_kind := 'first_order_discount';
      END IF;
    END IF;
  END IF;

  v_total := greatest(0, v_subtotal + v_delivery - v_shipping_discount);
  v_reference := 'ND' || to_char(now(),'YYMMDD') || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  INSERT INTO public.orders(reference,buyer_id,vendor_id,buyer_name,buyer_phone,delivery_method,delivery_tier,paxi_pickup_point,delivery_address,note,delivery_fee_zar,shipping_discount_zar,shipping_promotion_status,subtotal_zar,discount_zar,total_zar,coupon_code,status,payment_status,fulfilment_status)
  VALUES(v_reference,auth.uid(),v_house_vendor,trim(p_buyer_name),trim(p_buyer_phone),p_delivery_method,p_delivery_tier,coalesce(trim(p_paxi_pickup_point),''),coalesce(trim(p_delivery_address),''),coalesce(trim(p_note),''),v_delivery,v_shipping_discount,CASE WHEN v_shipping_discount > 0 THEN v_promotion_kind WHEN p_delivery_method = 'pickup' THEN 'not_applicable' ELSE 'not_eligible' END,v_subtotal,0,v_total,NULL,'pending','unpaid','Pending Fulfilment')
  RETURNING id INTO v_order;

  IF v_shipping_discount > 0 THEN
    INSERT INTO public.shipping_promotion_claims(user_id,identity_key,order_id,promotion_kind)
    VALUES(auth.uid(), v_identity, v_order, v_promotion_kind);
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_qty := (v_item->>'qty')::integer;
    SELECT * INTO v_product FROM public.products WHERE id=(v_item->>'product_id')::uuid FOR UPDATE;
    v_price:=COALESCE(v_product.sale_price_zar,v_product.price_zar);
    INSERT INTO public.order_items(order_id,product_id,title,unit_price_zar,qty,size,color,comment,image_url)
    VALUES(v_order,v_product.id,v_product.title,v_price,v_qty,nullif(v_item->>'size',''),nullif(v_item->>'color',''),coalesce(v_item->>'comment',''),v_product.image_url)
    RETURNING id INTO v_order_item;
    SELECT * INTO v_source FROM public.product_supplier_sources WHERE product_id=v_product.id;
    IF FOUND THEN
      INSERT INTO public.order_item_supplier_sources(order_item_id,source_url,original_price_zar,supplier_name)
      VALUES(v_order_item,v_source.source_url,v_source.original_price_zar,v_source.supplier_name);
    END IF;
  END LOOP;

  INSERT INTO public.consent_records(user_id,order_id,consent_type,policy_version,context)
  VALUES(auth.uid(),v_order,'terms_checkout',p_terms_version,'checkout'),(auth.uid(),v_order,'privacy',p_terms_version,'checkout');
  INSERT INTO public.activity_log(actor_id,actor_email,action,object_type,object_id,details)
  VALUES(auth.uid(),coalesce(auth.jwt()->>'email',''),'order_created','order',v_order::text,jsonb_build_object('reference',v_reference,'total_zar',v_total,'delivery_fee_zar',v_delivery,'shipping_discount_zar',v_shipping_discount,'shipping_promotion_status',v_promotion_kind));
  RETURN QUERY SELECT v_order,v_reference,v_total,'unpaid'::text,v_delivery,v_shipping_discount;
END; $$;

REVOKE ALL ON FUNCTION public.create_niberdealz_order(jsonb,text,text,text,text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_niberdealz_order(jsonb,text,text,text,text,text,text,text,text,text) TO authenticated, service_role;
