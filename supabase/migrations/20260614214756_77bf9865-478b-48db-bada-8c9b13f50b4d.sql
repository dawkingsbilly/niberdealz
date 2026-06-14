
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'vendor');
CREATE TYPE public.vendor_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.product_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.plan_tier AS ENUM ('none', 'starter', 'growth', 'unlimited');
CREATE TYPE public.payment_status AS ENUM ('pending', 'approved', 'rejected');

-- updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- VENDORS
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  business_description TEXT NOT NULL,
  category TEXT NOT NULL,
  status public.vendor_status NOT NULL DEFAULT 'pending',
  ai_risk_score INT,
  ai_review_notes TEXT,
  rejection_reason TEXT,
  plan public.plan_tier NOT NULL DEFAULT 'none',
  plan_active_until TIMESTAMPTZ,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vendors TO anon;
GRANT SELECT, INSERT, UPDATE ON public.vendors TO authenticated;
GRANT ALL ON public.vendors TO service_role;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view approved vendors" ON public.vendors FOR SELECT TO anon, authenticated
  USING (status = 'approved' OR auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Vendor inserts own row" ON public.vendors FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY "Vendor updates own profile" ON public.vendors FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_vendors_updated BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create vendor role on signup
CREATE OR REPLACE FUNCTION public.handle_new_vendor_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'vendor')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_vendor_user();

-- PRODUCTS
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price_zar NUMERIC(10,2) NOT NULL CHECK (price_zar >= 0),
  category TEXT NOT NULL,
  image_url TEXT,
  status public.product_status NOT NULL DEFAULT 'pending',
  ai_risk_score INT,
  ai_review_notes TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public views approved products" ON public.products FOR SELECT TO anon, authenticated
  USING (status = 'approved' OR auth.uid() = vendor_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Vendor manages own products" ON public.products FOR ALL TO authenticated
  USING (auth.uid() = vendor_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = vendor_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_products_vendor ON public.products(vendor_id);
CREATE INDEX idx_products_status ON public.products(status);
CREATE INDEX idx_products_category ON public.products(category);

-- PAYMENTS (manual EFT proof)
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  plan public.plan_tier NOT NULL,
  amount_zar NUMERIC(10,2) NOT NULL,
  proof_url TEXT NOT NULL,
  reference TEXT,
  status public.payment_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ
);
GRANT SELECT, INSERT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendor sees own payments" ON public.payments FOR SELECT TO authenticated
  USING (auth.uid() = vendor_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Vendor submits own payment" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = vendor_id);
CREATE POLICY "Admin updates payments" ON public.payments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Helper: get vendor's plan product limit
CREATE OR REPLACE FUNCTION public.plan_product_limit(_plan public.plan_tier)
RETURNS INT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _plan
    WHEN 'starter' THEN 5
    WHEN 'growth' THEN 20
    WHEN 'unlimited' THEN 2147483647
    ELSE 0
  END
$$;
