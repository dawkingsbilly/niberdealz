# NiberDealz payment-free launch: migration and verification runbook

**Status (23 September 2026):** build completed successfully. The workspace is configured for Supabase project `yddbleywoczpcnsavlzg` (`yddbleywoczpcnsavlzg.supabase.co`) and Cloudflare Worker `dawkingsbilly-niberdealz`; neither production database identity nor Cloudflare authentication has been independently confirmed. **Do not apply migrations or deploy.**

## Release gate

All of the following must be evidenced before publication:

- [ ] An authorised operator confirms that Supabase project `yddbleywoczpcnsavlzg` is the intended production project and has a current backup/rollback window.
- [ ] The migration history shows the prerequisite migrations below and the two prepared `20260923` migrations apply successfully.
- [ ] The SQL checks below show that protected payment/status actions are not callable by `anon` or `authenticated`, while `create_niberdealz_order` is callable only by `authenticated` and `service_role`.
- [ ] Authenticated Cloudflare access identifies Worker `dawkingsbilly-niberdealz`; no deploy is made during connection confirmation.
- [ ] An authorised test account completes the live-safe order-request test and the resulting request is reviewed and closed manually.

## Migration sequence

Apply only through the authorised production migration workflow, in timestamp order:

1. `20260921170000_single_owner_ecommerce_security.sql`
   Establishes the single-owner model, restricts direct order mutations, and creates the original checkout RPC.
2. `20260921210000_checkout_consent_delivery_fulfilment.sql`
   Adds consent records, delivery/fulfilment fields, supplier-source snapshots, and the **10-argument** order-request RPC signature.
3. `20260921230000_payment_safety_and_catalogue_review.sql`
   Provides legacy payment confirmation protections; payment functions later become service-role-only.
4. `20260922060000_lock_order_request_rpc.sql`
   Reasserts that the 10-argument order-request RPC is not executable by `PUBLIC` or `anon`.
5. `20260922080000_teemdrop_manual_exports.sql`
   The prior supplier-specific exporter. It is a prerequisite for safe cleanup by the generic-supplier migration.
6. `20260923070000_generic_supplier_operations.sql`
   Retires the TeemDrop-specific export path; creates the generic supplier-SKU snapshot trigger; adds catalogue-review fields, private import errors, supplier connection mode, and product review traceability.
7. `20260923080000_payment_free_order_request_safeguards.sql`
   Makes payment/status SQL functions service-role-only and replaces checkout with the payment-free order-request workflow: no discount redemption, no inventory reservation/decrement, authenticated users only.

### Dependencies and cautions

- `20260923070000` expects the supplier source, catalogue import/review, and product tables to already exist; it deliberately drops `teemdrop_order_exports` and TeemDrop-specific columns/trigger.
- `20260923080000` relies on the 10-argument `create_niberdealz_order` introduced by the delivery/consent migration and the order/consent/activity-log schema it uses.
- Do not run `20260923080000` without `20260922060000`; the later migration repeats the permission boundary, but the history should remain complete and ordered.

## Rollback notes

- Take a verified database backup and record the pre-migration schema/migration history before starting.
- `20260923080000` is logically reversible by restoring the prior 10-argument RPC definition and its grants from the preceding approved migration set. Do **not** re-open payment/status functions to client roles.
- `20260923070000` is **not fully reversible from schema alone**: it drops the TeemDrop export table and data, trigger/function, and verification columns. Restore those only from the pre-migration backup if a rollback is authorised.
- If either migration fails, stop; do not hand-edit the production schema to “finish” it. Restore or correct using a reviewed forward migration after examining the error and migration state.

## Exact post-migration checks

Run these in the confirmed production project with an authorised database role.

### 1. Confirm expected migrations are recorded

```sql
select version, name
from supabase_migrations.schema_migrations
where version in (
  '20260921170000','20260921210000','20260921230000','20260922060000',
  '20260922080000','20260923070000','20260923080000'
)
order by version;
```

Expected: all seven rows, in order.

### 2. Confirm protected operational action permissions

```sql
select
  p.proname,
  pg_get_function_identity_arguments(p.oid) as arguments,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'create_niberdealz_order',
    'set_niberdealz_order_status',
    'confirm_yoco_payment'
  )
order by p.proname, arguments;
```

Expected:

- `create_niberdealz_order(jsonb,text,text,text,text,text,text,text,text,text)`: `anon=false`, `authenticated=true`, `service_role=true`.
- `set_niberdealz_order_status(uuid,text,uuid)`: `anon=false`, `authenticated=false`, `service_role=true`.
- `confirm_yoco_payment(uuid,uuid,text,text)`: `anon=false`, `authenticated=false`, `service_role=true`.

### 3. Confirm order writes remain mediated

```sql
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('orders','order_items')
  and grantee in ('anon','authenticated')
order by table_name, grantee, privilege_type;
```

Expected: no `INSERT`, `UPDATE`, or `DELETE` grants for `authenticated` (and none for `anon`).

### 4. Confirm payment-free RPC shape and supplier trigger

```sql
select routine_name, specific_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name = 'create_niberdealz_order';

select tgname, tgenabled
from pg_trigger
where tgrelid = 'public.order_item_supplier_sources'::regclass
  and not tgisinternal
  and tgname = 'trg_snapshot_order_supplier_source';

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'catalogue_import_errors'
order by ordinal_position;
```

Expected: the order function exists; the generic supplier snapshot trigger is enabled; `catalogue_import_errors` contains `id, catalogue_import_id, row_number, source_key, message, created_at`.

### 5. Confirm no request consumes stock or a discount

Use the live-safe test below. Before submitting, record the test product’s `stock`; after submission, verify the order has:

```sql
select reference, status, payment_status, coupon_code, discount_zar,
       shipping_discount_zar, fulfilment_status
from public.orders
where reference = '<TEST_REFERENCE>';
```

Expected: `status='pending'`, `payment_status='unpaid'`, `coupon_code is null`, `discount_zar=0`, `shipping_discount_zar=0`, and `fulfilment_status='Pending Fulfilment'`. Product stock must be unchanged.

## Cloudflare connection checklist (do not publish)

1. Sign in to the Cloudflare account that owns the deployment.
2. Confirm the account can access Workers & Pages and locate Worker **`dawkingsbilly-niberdealz`**.
3. Verify the deployment configuration points to `.output/server/wrangler.json`, where the Worker name is `dawkingsbilly-niberdealz` and assets are served from `.output/public`.
4. Confirm the account and target aloud/in the release record; inspect environment-variable bindings without exposing values.
5. **Stop here.** Do not run a deploy/publish command until the database checks and live-safe test are documented as passing.

## Live-safe order-request test script

This test creates a real pending request and must be authorised before it is run.

1. Use a dedicated authenticated test account and one approved, active product that is explicitly earmarked for this test. Record its product ID, displayed price, and current stock.
2. Add quantity 1 to cart. Use a realistic but clearly labelled test name/address/note; do not use another person’s contact details.
3. Confirm the checkout says **“Submit order request”** and says that card payments are unavailable. Do not enter a discount code.
4. Accept terms/privacy and submit once. Record the returned order reference and screenshot/record the confirmation.
5. As the owner, confirm the request appears in the fulfilment queue with `pending`, `unpaid`, and `Pending Fulfilment`; verify its item, total and delivery fee match the checkout.
6. Run check 5 above. Confirm stock did not change and no discount/promotion was consumed.
7. Confirm a normal customer account cannot invoke payment/status operations or directly alter orders. This is a permission check, not an attempt to bypass controls.
8. Close the test request using the approved owner workflow and record the outcome. Do not mark it paid, place it with a supplier, or contact a customer.

**Safe stopping point:** after Cloudflare target confirmation and before any deploy; after test preparation and before pressing **Submit order request**. Both a production migration and a live test request require the owner’s explicit approval.
