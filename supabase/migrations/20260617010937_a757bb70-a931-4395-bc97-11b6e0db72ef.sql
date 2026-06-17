
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS size TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS is_sold BOOLEAN NOT NULL DEFAULT false;

UPDATE public.vendors SET status = 'approved' WHERE status = 'pending';

DROP POLICY IF EXISTS "Public can view approved vendors" ON public.vendors;
CREATE POLICY "Public can view approved vendors" ON public.vendors
  FOR SELECT TO anon, authenticated USING (status = 'approved');

DROP POLICY IF EXISTS "Public can view approved products" ON public.products;
CREATE POLICY "Public can view approved products" ON public.products
  FOR SELECT TO anon, authenticated USING (status = 'approved');

GRANT SELECT ON public.vendors TO anon;
GRANT SELECT ON public.products TO anon;

DROP POLICY IF EXISTS "Admins and owners can delete products" ON public.products;
CREATE POLICY "Admins and owners can delete products" ON public.products
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS "Owner can delete vendors" ON public.vendors;
CREATE POLICY "Owner can delete vendors" ON public.vendors
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS "Owner and admin view all vendors" ON public.vendors;
CREATE POLICY "Owner and admin view all vendors" ON public.vendors
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Owner and admin view all products" ON public.products;
CREATE POLICY "Owner and admin view all products" ON public.products
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'));
