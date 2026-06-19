
DROP POLICY IF EXISTS "Anyone can record an event" ON public.product_events;
CREATE POLICY "Anyone can record a valid event"
ON public.product_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  event_type = ANY (ARRAY['view'::text, 'whatsapp_click'::text])
  AND vendor_id = (SELECT vendor_id FROM public.products WHERE id = product_id)
);

REVOKE SELECT (email, ai_risk_score, ai_review_notes, rejection_reason, plan, plan_active_until)
  ON public.vendors FROM anon;

REVOKE SELECT (ai_risk_score, ai_review_notes, rejection_reason)
  ON public.products FROM anon;

REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;
