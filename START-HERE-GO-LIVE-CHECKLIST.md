# Start here: why the live site is broken, and what to do

## The short version

The code in this zip is **newer and more fixed** than what's actually running on
niberdealz.co.za right now. Someone (a previous Lovable/AI build session) already
did most of the engineering work you're asking for — a working supplier-agnostic
import system, required storefront categories, a payment-free order-request
checkout, first-order free shipping, etc. — but it was **never deployed or
migrated to your live Supabase project**. That's why your live site still shows
things like a "TeemDrop SKU" field (removed in this code) and "Unauthorized:
Invalid token" errors this code doesn't even produce anymore.

So the fastest path to "start selling now" is **not** more code changes — it's
deploying what's already here. I made two small fixes (below) but the big
unlock is deployment.

## What I actually fixed in this zip

- **Wrong environment variable name.** `.env.example` and `docs/yoco-configuration.md`
  told whoever set up hosting to create `SUPABASE_ANON_KEY`. The real code
  (`auth-middleware.ts`, `client.server.ts`, several server functions) reads
  `SUPABASE_PUBLISHABLE_KEY`. If your Cloudflare Worker has the wrong name set,
  every server-side login check silently fails — which looks exactly like the
  "Unauthorized / session expired / invalid token" errors in your screenshots.
  Fixed the docs; **you still need to check the actual variable name in your
  Cloudflare Worker's environment settings and correct it if needed.**

I did not change any business logic, payment code, or database schema — I don't
have access to your live Supabase or Cloudflare accounts, and this environment
has no internet access, so I could not install dependencies, build, or test the
app. Everything below is what needs to happen on your actual accounts.

## Your checklist items, mapped to what's really going on

| Your note | What's happening |
|---|---|
| "Not receiving emails/messages/calls from customers" | There's no automated notification system in the code at all — new orders and messages just sit in the admin panel. You have to check it manually, or this needs a notification integration (e.g. Resend for email) added, which needs an API key from you. |
| "Categories are missing" | Categories now come from a `store_categories` database table, populated by a migration (`20260923110000_required_store_categories.sql`) that has **not been run** on your live database yet. |
| "When I search I am not getting [results]" | Search only returns products with `status = approved` and `is_active = true`. Anything sitting in your review queue won't show up until you approve it — and if categories/products tables aren't migrated, nothing shows at all. |
| "Product must show picture, price, name, shipping day, quantity, category" | Already in the current product/catalogue-import model in this code. |
| "Popup offering free shipping on first order" | Already built — see `20260923120000_first_order_shipping_promotion.sql`. |
| "Can't upload products, checkout, or record supplier — invalid token" | This is the deployment/env-var issue above, plus the fact that your live site is running an older version of the supplier-import code (the "TeemDrop SKU" field in your screenshot was replaced by a generic supplier system in this code). |
| "Can't add admins again" | No admin-invite feature exists yet in this codebase — this needs to be built, or confirm you mean something else (e.g. Supabase dashboard access) so I can build it. |
| Payments | Deliberately **not wired live yet**. Checkout currently submits an order request with no payment — you review it and contact the customer. The Yoco integration exists in code (`src/lib/yoco.server.ts`, `docs/yoco-configuration.md`) but needs your real Yoco test/live secret keys and a webhook registered before it can go live — see that doc for the exact steps. I can't create a Yoco account or keys for you. |

## One correction: you're on Vercel, not Cloudflare

`LAUNCH_RUNBOOK.md` in this repo has a whole section about a Cloudflare Worker
(`dawkingsbilly-niberdealz`, `wrangler.json`). That's stale — this repo also
has a `vercel.json`, and you've confirmed you deploy via GitHub + Vercel.
**Ignore the Cloudflare section of `LAUNCH_RUNBOOK.md` entirely**; everything
else in it (the migration sequence, the SQL verification checks, the live-safe
order test) still applies. Where the checklist below says "your host," that
means **Vercel's Project → Settings → Environment Variables**, not Cloudflare.

## Recommended order of operations

1. **Confirm which Supabase project is actually live** for niberdealz.co.za, and
   back it up.
2. **Apply the pending migrations in `supabase/migrations/` in timestamp order**
   (see `LAUNCH_RUNBOOK.md` for the exact sequence and verification SQL — skip
   its Cloudflare-specific section).
3. **In Vercel → your project → Settings → Environment Variables**, check the
   server-side variable names match this code exactly: `SUPABASE_URL`,
   `SUPABASE_PUBLISHABLE_KEY` (not `SUPABASE_ANON_KEY`),
   `SUPABASE_SERVICE_ROLE_KEY`, `PUBLIC_SITE_URL`, `APP_BASE_URL` — plus the
   browser-side `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
   `VITE_SUPABASE_PROJECT_ID`. Set each for the Production environment (and
   Preview too, if you test on preview deploys).
4. **Push this code to your GitHub repo** (replace the contents with what's in
   this zip, or apply it as a PR) — Vercel will auto-build and deploy from
   GitHub the way it's already connected. No manual build step needed on your
   end unless you want to test locally first (`bun install && bun run build`).
5. Re-test on the live Vercel deployment: sign in, record a supplier,
   stage/approve a product, search for it, place a real order-request end to
   end.
6. Only after that works cleanly: follow `docs/yoco-configuration.md` to bring
   payments online with **test** Yoco keys first (set in Vercel env vars, same
   as above), then live keys once everything's verified.

If you don't have someone comfortable running Supabase migrations and pushing
to GitHub/Vercel, that's the actual blocker to "selling now" — happy to walk
through it step by step.
Deploy the small patch from "niberdealz-patch.zip" to the dawkingsbilly/niberdealz GitHub repo.

The zip contains exactly 3 files, each with the correct path already matching the repo structure:
- .env.example                     -> repo root, overwrite the existing file
- docs/yoco-configuration.md       -> overwrite the existing file at docs/yoco-configuration.md
- START-HERE-GO-LIVE-CHECKLIST.md  -> repo root, new file (doesn't exist yet)

Do the following:

1. Unzip niberdealz-patch.zip.
2. In the dawkingsbilly/niberdealz repo, replace the contents of .env.example and docs/yoco-configuration.md with the unzipped versions, and add START-HERE-GO-LIVE-CHECKLIST.md as a new file at the repo root. Do not touch any other files.
3. Commit to main with the message: "Fix Supabase env var naming, add go-live checklist"
4. Push to GitHub. This should trigger an automatic Vercel deployment since Vercel is already connected to this repo.
5. Confirm the push succeeded and give me the commit URL and the resulting Vercel deployment status/URL.

If the GitHub write still fails with a 403 or permission error, stop and tell me exactly what permission is missing rather than trying a workaround — I'll fix the connection myself.

Do not modify any other files, database, environment variables, or payment configuration in this step. That's the next step, which I'll direct separately.
