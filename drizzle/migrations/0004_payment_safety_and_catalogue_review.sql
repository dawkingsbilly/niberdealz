-- Final operational safeguards: payment-gated inventory, idempotent webhooks,
-- CEO-reviewed catalogue records, and customer-visible payment status only.

-- Incoming catalogue records are private until explicitly approved by the CEO.
CREATE TABLE IF NOT EXISTS public.catalogue_review_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalogue_import_id uuid NULL REFERENCES public.catalogue_imports(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Uncategorised',
  image_url text NULL,
  source_url text NULL,
  supplier_name text NULL,
  supplier_sku text NULL,
  original_price_zar numeric(12,2) NULL CHECK (original_price_zar >= 0),
  proposed_price_zar numeric(12,2) NULL CHECK (proposed_price_zar >= 0),
  markup_percent numeric(6,2) NOT NULL DEFAULT 40 CHECK (markup_percent = 40),
  status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review','approved','rejected')),
  reviewed_at timestamptz NULL,
  reviewed_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.catalogue_review_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.catalogue_review_items FROM anon, authenticated;
GRANT ALL ON public.catalogue_review_items TO service_role;
CREATE INDEX IF NOT EXISTS catalogue_review_items_queue_idx ON public.catalogue_review_items(status, created_at DESC);

-- Provider events are retained by their webhook id, making retries safe to process.
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  provider text NOT NULL DEFAULT 'yoco',
  provider_event_id text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz NULL,
  outcome text NOT NULL DEFAULT 'received' CHECK (outcome IN ('received','processed','ignored','failed')),
  attempt_id uuid NULL REFERENCES public.payment_attempts(id) ON DELETE SET NULL,
  PRIMARY KEY (provider, provider_event_id)
);
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_webhook_events FROM anon, authenticated;
GRANT ALL ON public.payment_webhook_events TO service_role;

-- Pending checkout orders do not consume inventory. The verified payment transition does.
CREATE OR REPLACE FUNCTION public.confirm_yoco_payment(
  p_order_id uuid, p_attempt_id uuid, p_checkout_id text, p_payment_id text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_attempt public.payment_attempts%ROWTYPE;
  v_item record;
  v_account_created timestamptz;
  v_prior_paid integer;
  v_discount numeric(10,2) := 0;
  v_kind text;
  v_identity text;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  SELECT * INTO v_attempt FROM public.payment_attempts WHERE id = p_attempt_id AND order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment attempt not found'; END IF;
  IF v_attempt.status = 'succeeded' THEN RETURN; END IF;
  IF v_order.payment_status = 'paid' THEN RAISE EXCEPTION 'Order is already paid'; END IF;
  IF v_attempt.amount_cents <> round(v_order.total_zar * 100)::integer THEN RAISE EXCEPTION 'Payment amount mismatch'; END IF;

  FOR v_item IN SELECT product_id, qty, title FROM public.order_items WHERE order_id = p_order_id LOOP
    UPDATE public.products
      SET stock = stock - v_item.qty, stock_sold = stock_sold + v_item.qty
      WHERE id = v_item.product_id
        AND (stock IS NULL OR stock >= v_item.qty)
        AND is_active = true AND status = 'approved' AND is_sold = false;
    IF NOT FOUND THEN RAISE EXCEPTION 'Stock is no longer available for %', v_item.title; END IF;
  END LOOP;

  IF v_order.delivery_method = 'courier' THEN
    SELECT created_at INTO v_account_created FROM auth.users WHERE id = v_order.buyer_id;
    SELECT count(*) INTO v_prior_paid FROM public.orders
      WHERE buyer_id = v_order.buyer_id AND id <> v_order.id
        AND payment_status = 'paid' AND status NOT IN ('cancelled','refunded');
    v_identity := md5(lower(regexp_replace(v_order.buyer_phone, '[^0-9]', '', 'g')) || '|' || lower(regexp_replace(v_order.delivery_address, '\s+', ' ', 'g')));
    IF NOT EXISTS (SELECT 1 FROM public.shipping_promotion_claims WHERE user_id = v_order.buyer_id OR identity_key = v_identity) THEN
      IF v_prior_paid = 0 THEN
        IF now() <= v_account_created + interval '48 hours' THEN v_discount := v_order.delivery_fee_zar; v_kind := 'first_order_free';
        ELSE v_discount := round(v_order.delivery_fee_zar * .25, 2); v_kind := 'first_order_discount'; END IF;
      ELSIF v_order.subtotal_zar > 1000 THEN v_discount := v_order.delivery_fee_zar; v_kind := 'returning_courier_free';
      END IF;
      IF v_discount > 0 THEN
        INSERT INTO public.shipping_promotion_claims(user_id, identity_key, order_id, promotion_kind)
          VALUES(v_order.buyer_id, v_identity, v_order.id, v_kind);
      END IF;
    END IF;
  END IF;

  UPDATE public.payment_attempts
    SET status = 'succeeded', provider_checkout_id = coalesce(p_checkout_id, provider_checkout_id),
        provider_payment_id = coalesce(p_payment_id, provider_payment_id), completed_at = now(), updated_at = now()
    WHERE id = p_attempt_id;
  UPDATE public.orders
    SET payment_status = 'paid', status = 'paid', status_changed_at = now(),
        shipping_discount_zar = v_discount,
        shipping_promotion_status = CASE WHEN v_discount > 0 THEN 'applied_after_payment_verification' ELSE 'not_eligible' END,
        total_zar = greatest(0, subtotal_zar - discount_zar + delivery_fee_zar - v_discount)
    WHERE id = p_order_id;
  INSERT INTO public.order_status_events(order_id, previous_status, next_status, note)
    VALUES(p_order_id, v_order.status, 'paid', 'Verified Yoco payment');
  INSERT INTO public.customer_notification_outbox(user_id, channel, kind, subject, body, metadata)
    VALUES(v_order.buyer_id, 'email', 'payment_verified', 'Payment received', 'Your NiberDealz payment has been verified. We will begin fulfilment shortly.', jsonb_build_object('order_id', p_order_id));
END; $$;
REVOKE ALL ON FUNCTION public.confirm_yoco_payment(uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_yoco_payment(uuid,uuid,text,text) TO service_role;
