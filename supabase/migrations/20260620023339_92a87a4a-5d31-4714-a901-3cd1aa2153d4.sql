DROP POLICY IF EXISTS "Public views approved products" ON public.products;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated;