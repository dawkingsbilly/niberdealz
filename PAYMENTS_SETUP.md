# Getting on-site payments (Peach Payments) live

## What changed
- **One cart, one checkout, regardless of how many stores.** Buyers add
  items from any number of sellers into the same cart. Checkout is a single
  "Place order & pay" button that pays for everything at once — no more
  separate "place order" per store.
- Behind the scenes, each store still gets its own order (its own items,
  delivery choice, status, and totals — so sellers still only see their own
  stuff), but every store's order is linked by a shared `order_group`. The
  buyer pays the `order_group`'s combined total once.
- **On delivery**: I did *not* pretend the site can physically merge parcels
  from different sellers into one box — that's not something software alone
  can do, since the items are sitting in different sellers' homes/shops. Big
  marketplaces (Takealot, Amazon) handle this the same way: one checkout,
  separate shipments per seller. The cart and orders pages say this plainly
  so buyers aren't surprised when 3 stores' items arrive as 3 deliveries.
  If you eventually want true one-box delivery, that needs a real
  consolidation warehouse/locker that a courier collects everything into
  before forwarding it to the buyer — a logistics/ops build, not a code
  change, and happy to help design that later if you want to go there.
- Checkout now happens on the website: after a buyer places an order in the
  cart, they're redirected straight to Peach's secure Hosted Checkout page
  for the group's combined total.
- Once they pay, Peach redirects them back to `/checkout-result`, which
  double-checks the payment with Peach and marks every store's order in
  that checkout as paid.
- Peach also calls `/webhooks/peach` in the background when a payment
  succeeds, fails or times out — this keeps orders correct even if the
  buyer closes the tab before returning.
- Buyers can also hit **Pay now** on `/orders` for any checkout still marked
  "Awaiting payment" — one button pays for every store in that checkout.
- A new `order_groups` table holds the combined totals/payment status; a
  `payment_webhook_events` table logs every webhook for troubleshooting.

## What you need to do
1. **Run the new migrations** (`supabase/migrations/20260919120000_peach_payments.sql`
   and `supabase/migrations/20260919130000_order_groups.sql`) against your
   Supabase project — these add the payment columns and the `order_groups`
   table.
2. **Get your Peach credentials**: log in to the
   [Peach Payments Dashboard](https://dashboard.peachpayments.com) →
   Checkout → Settings, and note your **Client ID**, **Client Secret**,
   **Merchant ID** and **Entity ID**. Use the sandbox dashboard
   (sandbox-dashboard.peachpayments.com) while testing.
3. **Add these as environment variables/secrets** in your Lovable/Supabase
   project settings (not just in the committed `.env` — that file is
   checked into git, so real secrets shouldn't live there in plain text):
   - `PEACH_ENV` — `sandbox` while testing, `live` when you go live
   - `PEACH_CLIENT_ID`
   - `PEACH_CLIENT_SECRET`
   - `PEACH_MERCHANT_ID`
   - `PEACH_ENTITY_ID`
   - `APP_BASE_URL` — your live site URL, used to build the redirect and
     webhook URLs Peach calls
4. **Test with a sandbox card** (see Peach's
   [test cards](https://developer.peachpayments.com/docs/reference-test-and-go-live))
   by placing a real order end to end before switching `PEACH_ENV` to `live`.
5. Optional but recommended: in the Peach Dashboard, also add
   `https://<your-domain>/webhooks/peach` as a webhook URL under
   Checkout settings, as a backup in case a checkout's own notification
   fails to reach us.

## Not covered yet
Vendor listing-plan payments (the R50 / R100 / R200 monthly fees) still use
the manual "send an EFT, upload proof, admin approves" flow in the Payments
tab. Say the word if you'd like those moved onto Peach too — same pattern,
just a separate checkout type.
