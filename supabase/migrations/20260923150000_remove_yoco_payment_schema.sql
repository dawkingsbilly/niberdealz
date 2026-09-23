BEGIN;

-- Drop the Yoco confirmation function if it still exists.
DROP FUNCTION IF EXISTS public.confirm_yoco_payment(uuid, uuid, text, text);

-- Remove legacy payment tables and any dependent objects.
DROP TABLE IF EXISTS public.payment_webhook_events CASCADE;
DROP TABLE IF EXISTS public.payment_attempts CASCADE;

-- Remove provider settings that were only used for a payment gateway.
ALTER TABLE public.store_settings
  DROP COLUMN IF EXISTS payment_provider,
  DROP COLUMN IF EXISTS payment_mode;

COMMIT;
