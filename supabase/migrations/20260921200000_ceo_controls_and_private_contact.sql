-- CEO-only operations and private contact requests.
CREATE UNIQUE INDEX IF NOT EXISTS one_owner_only ON public.user_roles (role) WHERE role = 'owner';

DROP POLICY IF EXISTS "staff read all NiberDealz orders" ON public.orders;
DROP POLICY IF EXISTS "ceo reads all orders" ON public.orders;
DROP POLICY IF EXISTS "staff read all order items" ON public.order_items;
DROP POLICY IF EXISTS "ceo reads all order items" ON public.order_items;
DROP POLICY IF EXISTS "customers read own order items" ON public.order_items;
DROP POLICY IF EXISTS "Order parties view items" ON public.order_items;
CREATE POLICY "ceo reads all orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "ceo reads all order items" ON public.order_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "customers read own order items" ON public.order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.buyer_id = auth.uid()));

DROP POLICY IF EXISTS "staff read store settings" ON public.store_settings;
CREATE POLICY "ceo reads store settings" ON public.store_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'));
DROP POLICY IF EXISTS "staff manage discount codes" ON public.discount_codes;
CREATE POLICY "ceo manages discount codes" ON public.discount_codes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- Visitor metrics are an owner-only business signal, not a staff report.
DROP POLICY IF EXISTS "Owner and admin can read all events" ON public.product_events;
DROP POLICY IF EXISTS "Vendor can read own events" ON public.product_events;
CREATE POLICY "ceo reads visitor events" ON public.product_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'));
REVOKE SELECT ON public.product_events FROM anon;

-- Retired marketplace and affiliate records can contain sensitive business data.
-- They are not part of the single-owner retail operation and are CEO-only.
DROP POLICY IF EXISTS "Vendor sees own payments" ON public.payments;
DROP POLICY IF EXISTS "Vendor submits own payment" ON public.payments;
DROP POLICY IF EXISTS "Admin updates payments" ON public.payments;
REVOKE ALL ON public.payments FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
CREATE POLICY "ceo manages legacy payments" ON public.payments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS "Staff view all affiliates" ON public.affiliates;
DROP POLICY IF EXISTS "Affiliates view own account" ON public.affiliates;
REVOKE ALL ON public.affiliates FROM anon, authenticated;
GRANT SELECT ON public.affiliates TO authenticated;
CREATE POLICY "ceo reads retired affiliates" ON public.affiliates FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS "Affiliates view own referrals" ON public.affiliate_referrals;
REVOKE ALL ON public.affiliate_referrals FROM authenticated;
GRANT SELECT ON public.affiliate_referrals TO authenticated;
CREATE POLICY "ceo reads retired affiliate referrals" ON public.affiliate_referrals FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS "Affiliates view own points" ON public.affiliate_points_ledger;
REVOKE ALL ON public.affiliate_points_ledger FROM authenticated;
GRANT SELECT ON public.affiliate_points_ledger TO authenticated;
CREATE POLICY "ceo reads retired affiliate points" ON public.affiliate_points_ledger FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS "Affiliates view own payouts" ON public.affiliate_payouts;
DROP POLICY IF EXISTS "Staff update payouts" ON public.affiliate_payouts;
REVOKE ALL ON public.affiliate_payouts FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_payouts TO authenticated;
CREATE POLICY "ceo manages retired affiliate payouts" ON public.affiliate_payouts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS "Moderators read reports" ON public.reports;
DROP POLICY IF EXISTS "Moderators update reports" ON public.reports;
REVOKE UPDATE, DELETE ON public.reports FROM authenticated;
GRANT UPDATE, DELETE ON public.reports TO authenticated;
CREATE POLICY "ceo manages reports" ON public.reports FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS "Vendor reads own warnings" ON public.vendor_warnings;
DROP POLICY IF EXISTS "Vendor acks own warning" ON public.vendor_warnings;
REVOKE ALL ON public.vendor_warnings FROM authenticated;
GRANT SELECT ON public.vendor_warnings TO authenticated;
CREATE POLICY "ceo reads retired vendor warnings" ON public.vendor_warnings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'));

CREATE TABLE IF NOT EXISTS public.contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  email text NOT NULL CHECK (char_length(email) <= 254),
  topic text NOT NULL CHECK (topic IN ('order','product','delivery','return','privacy','other')),
  message text NOT NULL CHECK (char_length(message) BETWEEN 10 AND 3000),
  preferred_contact text NOT NULL CHECK (preferred_contact IN ('email','whatsapp','call')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contact_requests FROM anon, authenticated;
GRANT ALL ON public.contact_requests TO service_role;
