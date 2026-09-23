# Yoco Checkout release configuration

## Status

The application is prepared for **test-mode configuration only**. No Yoco credential, webhook subscription, production domain, migration, or payment was created by this repository change.

## Required hosting environment variables

Add these as **server-only** values in the same hosting project that runs the TanStack Start/Nitro server. Do not create `VITE_` versions of secrets and do not place secrets in client code, Git, logs, email, or chat.

| Variable | Purpose | Test value source |
| --- | --- | --- |
| `PUBLIC_SITE_URL` | Canonical HTTPS site origin, no trailing slash | Deployed test domain |
| `APP_BASE_URL` | Application origin used by server integration | Same value as `PUBLIC_SITE_URL` |
| `YOCO_SECRET_KEY` | Checkout API bearer credential | Yoco Checkout API → How to connect → **Test secret key** (`sk_test_...`) |
| `YOCO_WEBHOOK_SECRET` | Signed event verification | Returned **once** by Yoco when registering the webhook (`whsec_...`) |
| `SUPABASE_URL` | Server database endpoint | Supabase project settings |
| `SUPABASE_PUBLISHABLE_KEY` | Server-side token verification client (must use this exact name, not `SUPABASE_ANON_KEY`) | Supabase project settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Verified webhook database work only | Supabase project settings; server-only |

The browser configuration remains limited to `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_SUPABASE_PROJECT_ID`.

## Deployment order

1. Apply the pending Supabase migrations in timestamp order, including:
   - `20260921200000_ceo_controls_and_private_contact.sql`
   - `20260921210000_checkout_consent_delivery_fulfilment.sql`
   - `20260921220000_operational_payments_integrations.sql`
   - `20260921230000_payment_safety_and_catalogue_review.sql`
2. Deploy a non-production HTTPS URL that supports the server runtime.
3. Set the required **test** environment values on that deployment and redeploy.
4. Register exactly one **test** Yoco webhook:

   ```text
   POST https://payments.yoco.com/api/webhooks
   name: niberdealz-test-payments
   url: https://YOUR-TEST-DOMAIN/api/yoco/webhook
   ```

   Store the one-time returned `secret` as `YOCO_WEBHOOK_SECRET`; never store it in a source file.
5. Complete a Yoco test-card payment. Confirm the payment status only changes from the signed webhook, that duplicate deliveries are harmless, and that failed/cancelled checkout attempts remain retryable.
6. Verify stock, email/outbox records, refunds, PAXI delivery data, totals and all promotion rules with test orders before using live credentials.
7. For production: verify the production domain in Yoco, wait for approval, deploy the production domain, then replace only the two Yoco test values with the live secret and the live webhook secret. Register a new live webhook for the production URL.

## Exact endpoints

- Checkout creation: `POST /api/yoco/create-checkout` — authenticated customer only
- Webhook receiver: `POST /api/yoco/webhook` — raw-body HMAC verification only
- Customer return URLs: `/orders` — informational only; never marks an order paid

## Do not go live until

- The production domain is approved in Yoco Verified Domains.
- Both live Yoco values are stored in hosting secrets, never in source.
- The webhook URL responds over public HTTPS and receives a signed test event.
- Database migrations and required permissions are applied and verified.
- A complete test checkout success, cancellation, provider failure, duplicate webhook, payment retry and refund path have been exercised.
- The final promotion calculation and captured Yoco amount agree before charge. This is a release blocker in the current implementation because shipping promotion is currently finalised after verified payment.
