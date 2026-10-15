-- Payment gateway selection is intentionally deferred.
-- Clear any legacy provider label without configuring a replacement.
ALTER TABLE public.store_settings
  ALTER COLUMN payment_provider SET DEFAULT 'Not configured';

UPDATE public.store_settings
SET payment_provider = 'Not configured',
    payment_mode = 'pending';
