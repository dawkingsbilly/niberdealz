
This is a large set of changes (24 items). To keep quality high and let you review as we go, I'll break it into 4 phases. Reply **"do phase 1"** (or "do all") to start. You can also drop / re-order items.

---

## Phase 1 — Branding, Navigation, Dark Mode (quick wins)

1. **Header**
   - Bigger logo, remove black background ring (transparent, ~44px).
   - Brand name shown as **NIBER-DEALZ** (uppercase, tracked).
   - Add a **hamburger menu button** (mobile + desktop) with Browse, Safety, Contact, Dashboard, Sign in/out, plus links to your WhatsApp channel.
2. **Dark mode toggle** in header (persists in localStorage, respects system preference).

---

## Phase 2 — Stores & Verification

3. **Store profile editor** — vendors edit business name, owner name, description, city, WhatsApp, **profile picture**, category from their dashboard.
4. **Solo sellers** — registration copy + validation allow personal name instead of business name; profile picture required.
5. **Unique shareable store link** — already `/vendor/:id`; add a "Copy store link" button on the vendor page and dashboard.
6. **Verified badge** on every approved store (blue check next to name on cards, product pages, store page).
7. **CEO approval flow** — new stores default to `pending`; only `approved` stores & their products appear publicly. CEO dashboard gets an **Approvals** tab with Approve / Decline (+ reason) buttons.
8. **Buyer rates store** — signed-in buyers leave 1–5★ + comment on a store; average shown on store page and store cards.

---

## Phase 3 — Customers, Comms, Sales Campaigns

9. **Browse without signup** — already works; add a clear "Sign in to buy / contact seller" CTA on product page (WhatsApp button gated behind sign-in).
10. **WhatsApp channel prompt** on sign-up — success screen with a prominent "Join our WhatsApp channel" button linking to your channel.
11. **CEO broadcast** (email)
    - One-click email to **all customers**.
    - Separate one-click email to **all store owners**.
    - Uses Lovable Emails (we'll set up the email domain — you'll need to add a sender domain via the email setup dialog).
12. **Platform-wide sales campaigns** (CEO)
    - Create campaign: name, % discount, start/end dates.
    - Stores receive an **invitation** in their dashboard → **Join** or **Decline**.
    - On join, vendor picks which products participate (or "all").
    - Joined products show a **SALE badge + discounted price** during the window.

---

## Phase 4 — Listings, Stock, Ordering

13. **Stock quantity** field on listing form; shows "Only X left" or "Sold out" automatically.
14. **Ratings on product cards** — show ★ average + review count on the homepage grid (no click required).
15. **Homepage ordering**:
    1. Active sale products
    2. NIBER-DEALZ STORE products
    3. Everyone else
    (When no sale: NIBER-DEALZ STORE still pinned to top.)
    - I'll add an `is_official` flag on the vendors table and mark your own store as the official one.

---

## Technical notes (for reference)

- DB additions: `vendors.logo_url`, `vendors.is_official`, `vendors.verified`, `vendors.status` flow; `products.stock`; new tables `store_reviews`, `sale_campaigns`, `sale_participants`, `sale_products`, `broadcasts`.
- Storage bucket `vendor-logos` already exists — we'll wire it to the editor.
- Phase 3 email requires setting up your sender domain (one-time DNS step) — I'll trigger the setup dialog when we get there.
- Auth: WhatsApp channel join is a link, not API (WhatsApp has no programmatic channel-join).

---

**Reply with which phase(s) to start.** Recommended: do them in order so each phase is testable before the next.
