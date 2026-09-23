-- Supplier-agnostic operations. Connections are manually recorded; no provider credentials or
-- automated catalogue publishing are created by this migration.

-- Remove the retired supplier-specific export path while preserving generic supplier SKU fields.
DROP TRIGGER IF EXISTS trg_snapshot_teemdrop_order_source ON public.order_item_supplier_sources;
DROP FUNCTION IF EXISTS public.snapshot_teemdrop_order_source();
DROP TABLE IF EXISTS public.teemdrop_order_exports;
ALTER TABLE public.product_supplier_sources
  DROP COLUMN IF EXISTS teemdrop_sa_fulfilment_verified_at;
ALTER TABLE public.order_item_supplier_sources
  DROP COLUMN IF EXISTS teemdrop_sa_fulfilment_verified_at;

-- Preserve the generic private supplier SKU snapshot used by manual fulfilment.
CREATE OR REPLACE FUNCTION public.snapshot_order_supplier_source()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.order_item_supplier_sources destination
  SET supplier_sku = source.supplier_sku
  FROM public.order_items item
  JOIN public.product_supplier_sources source ON source.product_id = item.product_id
  WHERE destination.order_item_id = NEW.order_item_id
    AND item.id = NEW.order_item_id;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_snapshot_order_supplier_source ON public.order_item_supplier_sources;
CREATE TRIGGER trg_snapshot_order_supplier_source
AFTER INSERT ON public.order_item_supplier_sources
FOR EACH ROW EXECUTE FUNCTION public.snapshot_order_supplier_source();

-- Imported records remain private and incomplete until the CEO explicitly reviews and publishes
-- them. The normalized fields make manual files and future authorised assistants use one path.
ALTER TABLE public.catalogue_review_items
  ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS brand text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS stock integer NULL CHECK (stock IS NULL OR stock >= 0),
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS variations jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS source_key text NULL,
  ADD COLUMN IF NOT EXISTS source_checked_at timestamptz NULL;
CREATE UNIQUE INDEX IF NOT EXISTS catalogue_review_items_source_key_idx
  ON public.catalogue_review_items(catalogue_import_id, source_key)
  WHERE source_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.catalogue_import_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalogue_import_id uuid NOT NULL REFERENCES public.catalogue_imports(id) ON DELETE CASCADE,
  row_number integer NOT NULL CHECK (row_number > 0),
  source_key text NULL,
  message text NOT NULL CHECK (char_length(message) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (catalogue_import_id, row_number)
);
ALTER TABLE public.catalogue_import_errors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.catalogue_import_errors FROM anon, authenticated;
GRANT ALL ON public.catalogue_import_errors TO service_role;

-- Make the source state explicit: a manually recorded source is not an API connection.
ALTER TABLE public.supplier_connections
  ADD COLUMN IF NOT EXISTS connection_mode text NOT NULL DEFAULT 'manual'
    CHECK (connection_mode IN ('manual','authorised_api'));

-- Imported products can be traced to the private review record after explicit publication.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS catalogue_review_item_id uuid NULL
    REFERENCES public.catalogue_review_items(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS products_catalogue_review_item_idx
  ON public.products(catalogue_review_item_id)
  WHERE catalogue_review_item_id IS NOT NULL;
