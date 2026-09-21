-- NiberDealz single-owner ecommerce conversion
-- `owner` is the CEO / OWNER role. `admin` is operational staff.
-- Vendor tables are retained temporarily for historical foreign keys, but are no longer public/storefront entities.

-- Product catalog fields required by the single NiberDealz store.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS variations jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_new_arrival boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_best_seller boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_sold integer NOT NULL DEFAULT 0 CHECK (stock_sold >= 0),
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_stock_nonnegative,
  ADD CONSTRAINT products_stock_nonnegative CHECK (stock IS NULL OR stock >= 0),
  DROP CONSTRAINT IF EXISTS products_sale_price_valid,
  ADD CONSTRAINT products_sale_price_valid CHECK (sale_price_zar IS NULL OR (sale_price_zar >= 0 AND sale_price_zar <= price_zar)),
  DROP CONSTRAINT IF EXISTS products_sku_unique;
CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique_active ON public.products (lower(sku)) WHERE sku IS NOT NULL;

-- Customer delivery addresses. Customers can manage only their own address book.
CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Delivery address',
  recipient_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  address_line1 text NOT NULL,
  address_line2 text NOT NULL DEFAULT '',
  suburb text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  province text NOT NULL DEFAULT '',
  postal_code text NOT NULL DEFAULT '',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_addresses TO authenticated;
GRANT ALL ON public.customer_addresses TO service_role;
DROP POLICY IF EXISTS "customer manages own addresses" ON public.customer_addresses;
CREATE POLICY "customer manages own addresses" ON public.customer_addresses FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP TRIGGER IF EXISTS trg_customer_addresses_updated ON public.customer_addresses;
CREATE TRIGGER trg_customer_addresses_updated BEFORE UPDATE ON public.customer_addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- First-party discount codes; never affiliate/vendor coupons.
CREATE TABLE IF NOT EXISTS public.discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  kind text NOT NULL DEFAULT 'percentage' CHECK (kind IN ('percentage', 'fixed')),
  value numeric(10,2) NOT NULL CHECK (value > 0),
  min_order_zar numeric(10,2) NOT NULL DEFAULT 0 CHECK (min_order_zar >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  max_uses integer,
  uses_count integer NOT NULL DEFAULT 0 CHECK (uses_count >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.discount_codes TO authenticated;
GRANT ALL ON public.discount_codes TO service_role;
DROP POLICY IF EXISTS "staff manage discount codes" ON public.discount_codes;
CREATE POLICY "staff manage discount codes" ON public.discount_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
DROP TRIGGER IF EXISTS trg_discount_codes_updated ON public.discount_codes;
CREATE TRIGGER trg_discount_codes_updated BEFORE UPDATE ON public.discount_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Store settings contain public operational data only. Provider credentials remain server environment secrets.
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS store_name text NOT NULL DEFAULT 'NiberDealz',
  ADD COLUMN IF NOT EXISTS support_email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS delivery_note text NOT NULL DEFAULT 'Delivery options are confirmed at checkout.',
  ADD COLUMN IF NOT EXISTS default_delivery_fee_zar numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_provider text NOT NULL DEFAULT 'Not configured',
  ADD COLUMN IF NOT EXISTS payment_mode text NOT NULL DEFAULT 'pending' CHECK (payment_mode IN ('pending', 'live', 'test'));

-- Do not expose internal store configuration to the public client.
DROP POLICY IF EXISTS "store settings readable" ON public.store_settings;
CREATE POLICY "staff read store settings" ON public.store_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
DROP POLICY IF EXISTS "owner updates store settings" ON public.store_settings;
CREATE POLICY "ceo updates store settings" ON public.store_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- Public catalog access. Product writes use audited server functions/RPC only.
DROP POLICY IF EXISTS "Public views approved products" ON public.products;
DROP POLICY IF EXISTS "Vendor manages own products" ON public.products;
DROP POLICY IF EXISTS "Admins and owners can delete products" ON public.products;
DROP POLICY IF EXISTS "Owner and admin view all products" ON public.products;
CREATE POLICY "public reads active NiberDealz products" ON public.products FOR SELECT TO anon, authenticated
  USING (status = 'approved' AND is_active = true);

-- Staff need internal catalog visibility, but no direct mutations.
CREATE POLICY "staff reads all products" ON public.products FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
REVOKE INSERT, UPDATE, DELETE ON public.products FROM authenticated;

-- Retire public vendor/store access. Historical records remain available only to the service role.
DROP POLICY IF EXISTS "Public can view approved vendors" ON public.vendors;
DROP POLICY IF EXISTS "Vendor inserts own row" ON public.vendors;
DROP POLICY IF EXISTS "Vendor updates own profile" ON public.vendors;
DROP POLICY IF EXISTS "Owner can delete vendors" ON public.vendors;
DROP POLICY IF EXISTS "Owner and admin view all vendors" ON public.vendors;
REVOKE INSERT, UPDATE, DELETE ON public.vendors FROM authenticated;

-- Orders: customers can only read their own history; staff can read all. All writes are mediated by RPC/server functions.
DROP POLICY IF EXISTS "Buyers view own orders" ON public.orders;
DROP POLICY IF EXISTS "Vendors view their orders" ON public.orders;
DROP POLICY IF EXISTS "Staff view all orders" ON public.orders;
DROP POLICY IF EXISTS "Vendors update their orders" ON public.orders;
DROP POLICY IF EXISTS "Staff update all orders" ON public.orders;
CREATE POLICY "customers read own orders" ON public.orders FOR SELECT TO authenticated USING (buyer_id = auth.uid());
CREATE POLICY "staff read all NiberDealz orders" ON public.orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
REVOKE INSERT, UPDATE, DELETE ON public.orders FROM authenticated;
DROP POLICY IF EXISTS "Order parties view items" ON public.order_items;
CREATE POLICY "customers read own order items" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.buyer_id = auth.uid()));
CREATE POLICY "staff read all order items" ON public.order_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
REVOKE INSERT, UPDATE, DELETE ON public.order_items FROM authenticated;

-- Protect staff roles. CEO is the only role manager; app-level functions use the service key after this policy check.
DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;
CREATE POLICY "users read own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "ceo reads all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'));
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;

-- Categories are public to browse and staff-managed only through server functions.
DROP POLICY IF EXISTS "categories readable" ON public.store_categories;
CREATE POLICY "public reads active categories" ON public.store_categories FOR SELECT USING (active = true);
CREATE POLICY "staff reads all categories" ON public.store_categories FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
REVOKE INSERT, UPDATE, DELETE ON public.store_categories FROM authenticated;

-- Activity logs are immutable. CEO sees all; operational admins may read their own actions.
DROP POLICY IF EXISTS "staff read activity log" ON public.activity_log;
CREATE POLICY "ceo reads all activity log" ON public.activity_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "admin reads own activity log" ON public.activity_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND actor_id = auth.uid());
REVOKE INSERT, UPDATE, DELETE ON public.activity_log FROM authenticated;

-- Product reviews stay customer-authored; staff moderation uses secure server functions.
DROP POLICY IF EXISTS "User deletes own review or moderator" ON public.product_reviews;
CREATE POLICY "user deletes own review" ON public.product_reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Inventory-safe single-store checkout. It locks every product row, calculates prices server-side,
-- applies a first-party code, decrements stock atomically, records the order and writes an audit event.
CREATE OR REPLACE FUNCTION public.create_niberdealz_order(
  p_items jsonb,
  p_buyer_name text,
  p_buyer_phone text,
  p_delivery_method text,
  p_delivery_address text,
  p_note text DEFAULT '',
  p_discount_code text DEFAULT ''
) RETURNS TABLE(order_id uuid, reference text, total_zar numeric, payment_status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_house_vendor uuid;
  v_product record;
  v_item jsonb;
  v_qty integer;
  v_price numeric(10,2);
  v_subtotal numeric(10,2) := 0;
  v_discount numeric(10,2) := 0;
  v_delivery numeric(10,2) := 0;
  v_total numeric(10,2);
  v_order uuid;
  v_reference text;
  v_code record;
  v_item_count integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 30 THEN
    RAISE EXCEPTION 'A valid cart is required';
  END IF;
  IF length(trim(p_buyer_name)) < 2 OR length(trim(p_buyer_phone)) < 9 THEN RAISE EXCEPTION 'Name and contact number are required'; END IF;
  IF p_delivery_method NOT IN ('courier','paxi','pickup') THEN RAISE EXCEPTION 'Invalid delivery method'; END IF;

  SELECT house_vendor_id, default_delivery_fee_zar INTO v_house_vendor, v_delivery FROM public.store_settings WHERE id = true;
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

  IF nullif(trim(p_discount_code), '') IS NOT NULL THEN
    SELECT * INTO v_code FROM public.discount_codes
      WHERE upper(code) = upper(trim(p_discount_code)) AND active = true
        AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now())
        AND (max_uses IS NULL OR uses_count < max_uses)
      FOR UPDATE;
    IF FOUND AND v_subtotal >= v_code.min_order_zar THEN
      v_discount := CASE WHEN v_code.kind = 'percentage' THEN round(v_subtotal * v_code.value / 100, 2) ELSE least(v_code.value, v_subtotal) END;
      UPDATE public.discount_codes SET uses_count = uses_count + 1 WHERE id = v_code.id;
    END IF;
  END IF;

  v_total := greatest(0, v_subtotal - v_discount + coalesce(v_delivery, 0));
  v_reference := 'ND' || to_char(now(), 'YYMMDD') || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  INSERT INTO public.orders (reference, buyer_id, vendor_id, buyer_name, buyer_phone, delivery_method, delivery_address, note, delivery_fee_zar, subtotal_zar, discount_zar, total_zar, coupon_code, status, payment_status)
  VALUES (v_reference, auth.uid(), v_house_vendor, trim(p_buyer_name), trim(p_buyer_phone), p_delivery_method, coalesce(trim(p_delivery_address), ''), coalesce(trim(p_note), ''), coalesce(v_delivery, 0), v_subtotal, v_discount, v_total, nullif(upper(trim(p_discount_code)), ''), 'pending', 'unpaid') RETURNING id INTO v_order;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_qty := (v_item->>'qty')::integer;
    SELECT * INTO v_product FROM public.products WHERE id = (v_item->>'product_id')::uuid FOR UPDATE;
    v_price := COALESCE(v_product.sale_price_zar, v_product.price_zar);
    INSERT INTO public.order_items (order_id, product_id, title, unit_price_zar, qty, size, color, comment, image_url)
    VALUES (v_order, v_product.id, v_product.title, v_price, v_qty, nullif(v_item->>'size',''), nullif(v_item->>'color',''), coalesce(v_item->>'comment',''), v_product.image_url);
    IF v_product.stock IS NOT NULL THEN UPDATE public.products SET stock = stock - v_qty, stock_sold = stock_sold + v_qty WHERE id = v_product.id; END IF;
  END LOOP;

  INSERT INTO public.activity_log (actor_id, actor_email, action, object_type, object_id, details)
  VALUES (auth.uid(), coalesce(auth.jwt()->>'email',''), 'order_created', 'order', v_order::text, jsonb_build_object('reference', v_reference, 'total_zar', v_total));
  RETURN QUERY SELECT v_order, v_reference, v_total, 'unpaid'::text;
END; $$;
REVOKE ALL ON FUNCTION public.create_niberdealz_order(jsonb,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_niberdealz_order(jsonb,text,text,text,text,text,text) TO authenticated, service_role;
