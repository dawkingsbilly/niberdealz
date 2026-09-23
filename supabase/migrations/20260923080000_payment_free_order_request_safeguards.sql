-- Payment-free launch safeguards.
-- An order request is a reviewable request, not a completed sale, stock reservation,
-- or promotion redemption. Card-payment functions remain service-role-only and dormant.

-- Make the intended grant boundary explicit even if an older database was provisioned differently.
REVOKE ALL ON FUNCTION public.set_niberdealz_order_status(uuid,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_niberdealz_order_status(uuid,text,uuid) TO service_role;
REVOKE ALL ON FUNCTION public.confirm_yoco_payment(uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_yoco_payment(uuid,uuid,text,text) TO service_role;

-- Discount redemption needs a deliberate, audited fulfilment stage. It is not accepted at the
-- order-request stage, where an unactioned request could otherwise consume a finite promotion.
CREATE OR REPLACE FUNCTION public.create_niberdealz_order(
  p_items jsonb, p_buyer_name text, p_buyer_phone text, p_delivery_method text,
  p_delivery_address text, p_note text DEFAULT '', p_discount_code text DEFAULT '',
  p_delivery_tier text DEFAULT 'courier', p_paxi_pickup_point text DEFAULT '', p_terms_version text DEFAULT ''
) RETURNS TABLE(order_id uuid, reference text, total_zar numeric, payment_status text, delivery_fee_zar numeric, shipping_discount_zar numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_house_vendor uuid; v_product record; v_source record; v_item jsonb; v_qty integer; v_price numeric(10,2); v_order_item uuid;
  v_subtotal numeric(10,2) := 0; v_delivery numeric(10,2) := 0; v_total numeric(10,2); v_order uuid; v_reference text;
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
  v_total := v_subtotal + v_delivery;
  v_reference := 'ND' || to_char(now(),'YYMMDD') || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  INSERT INTO public.orders(reference,buyer_id,vendor_id,buyer_name,buyer_phone,delivery_method,delivery_tier,paxi_pickup_point,delivery_address,note,delivery_fee_zar,shipping_discount_zar,shipping_promotion_status,subtotal_zar,discount_zar,total_zar,coupon_code,status,payment_status,fulfilment_status)
  VALUES(v_reference,auth.uid(),v_house_vendor,trim(p_buyer_name),trim(p_buyer_phone),p_delivery_method,p_delivery_tier,coalesce(trim(p_paxi_pickup_point),''),coalesce(trim(p_delivery_address),''),coalesce(trim(p_note),''),v_delivery,0,CASE WHEN p_delivery_method='courier' THEN 'pending_payment_verification' ELSE 'not_applicable' END,v_subtotal,0,v_total,NULL,'pending','unpaid','Pending Fulfilment') RETURNING id INTO v_order;
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
  VALUES(auth.uid(),coalesce(auth.jwt()->>'email',''),'order_created','order',v_order::text,jsonb_build_object('reference',v_reference,'total_zar',v_total,'delivery_fee_zar',v_delivery));
  RETURN QUERY SELECT v_order,v_reference,v_total,'unpaid'::text,v_delivery,0::numeric;
END; $$;

REVOKE ALL ON FUNCTION public.create_niberdealz_order(jsonb,text,text,text,text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_niberdealz_order(jsonb,text,text,text,text,text,text,text,text,text) TO authenticated, service_role;
