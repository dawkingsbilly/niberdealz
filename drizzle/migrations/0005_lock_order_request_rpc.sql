-- Keep order requests authenticated-only even if an earlier grant made the RPC public.
REVOKE EXECUTE ON FUNCTION public.create_niberdealz_order(jsonb,text,text,text,text,text,text,text,text,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_niberdealz_order(jsonb,text,text,text,text,text,text,text,text,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_niberdealz_order(jsonb,text,text,text,text,text,text,text,text,text) TO authenticated, service_role;
