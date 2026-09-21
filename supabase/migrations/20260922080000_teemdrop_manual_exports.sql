-- TeemDrop manual XLSX export audit. Customer data leaves NiberDealz only after CEO approval.
-- The source-side TeemDrop SKU is private and is never exposed to shoppers.

ALTER TABLE public.product_supplier_sources
  ADD COLUMN IF NOT EXISTS supplier_sku text,
  ADD COLUMN IF NOT EXISTS teemdrop_sa_fulfilment_verified_at timestamptz;

ALTER TABLE public.order_item_supplier_sources
  ADD COLUMN IF NOT EXISTS supplier_sku text,
  ADD COLUMN IF NOT EXISTS teemdrop_sa_fulfilment_verified_at timestamptz;

-- Existing checkout code already snapshots supplier sources. Enrich each new snapshot
-- from its product source so supplier SKU and fulfilment verification travel with the order.
CREATE OR REPLACE FUNCTION public.snapshot_teemdrop_order_source()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.order_item_supplier_sources destination
  SET supplier_sku = source.supplier_sku,
      teemdrop_sa_fulfilment_verified_at = source.teemdrop_sa_fulfilment_verified_at
  FROM public.order_items item
  JOIN public.product_supplier_sources source ON source.product_id = item.product_id
  WHERE destination.order_item_id = NEW.order_item_id
    AND item.id = NEW.order_item_id;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_snapshot_teemdrop_order_source ON public.order_item_supplier_sources;
CREATE TRIGGER trg_snapshot_teemdrop_order_source
AFTER INSERT ON public.order_item_supplier_sources
FOR EACH ROW EXECUTE FUNCTION public.snapshot_teemdrop_order_source();

CREATE TABLE IF NOT EXISTS public.teemdrop_order_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  export_key text NOT NULL UNIQUE,
  exported_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  exported_at timestamptz NOT NULL DEFAULT now(),
  row_count integer NOT NULL CHECK (row_count > 0),
  template_version text NOT NULL DEFAULT '2026-09-22',
  UNIQUE (order_id)
);
ALTER TABLE public.teemdrop_order_exports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.teemdrop_order_exports FROM anon, authenticated;
GRANT ALL ON public.teemdrop_order_exports TO service_role;
CREATE POLICY "ceo reads TeemDrop export audit" ON public.teemdrop_order_exports
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'));
