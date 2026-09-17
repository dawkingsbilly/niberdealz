import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  COUPON_DISCOUNT_PCT,
  MIN_POINTS_TO_SPEND,
  POINT_VALUE_ZAR,
  purchasePoints,
} from "@/lib/affiliate";

const itemSchema = z.object({
  product_id: z.string().uuid(),
  qty: z.number().int().min(1).max(50),
  size: z.string().max(40).nullable().optional(),
  color: z.string().max(40).nullable().optional(),
  comment: z.string().max(300).optional().default(""),
});

const placeSchema = z.object({
  vendor_id: z.string().uuid(),
  items: z.array(itemSchema).min(1).max(30),
  buyer_name: z.string().trim().min(2).max(80),
  buyer_phone: z.string().trim().min(9).max(20),
  delivery_method: z.enum(["courier", "paxi", "pickup", "meetup"]),
  delivery_address: z.string().trim().max(300).optional().default(""),
  note: z.string().trim().max(500).optional().default(""),
  coupon_code: z.string().trim().max(20).optional().default(""),
  points_to_use: z.number().int().min(0).max(100000).optional().default(0),
});

function reference() {
  return `ND${Date.now().toString(36).toUpperCase().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
}

/** Create an order on the website. Prices, delivery fees and discounts are all recalculated server side. */
export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => placeSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db: any = supabaseAdmin;

    const ids = data.items.map((i) => i.product_id);
    const { data: products } = await db
      .from("products")
      .select("id, title, price_zar, image_url, vendor_id, status, is_sold, stock, delivery_options")
      .in("id", ids);

    if (!products || products.length === 0) throw new Error("These items are no longer available.");

    const lines: any[] = [];
    let subtotal = 0;
    for (const item of data.items) {
      const p = products.find((x: any) => x.id === item.product_id);
      if (!p) throw new Error("One of the items is no longer available.");
      if (p.vendor_id !== data.vendor_id) throw new Error("Items must be ordered per store.");
      if (p.status !== "approved" || p.is_sold) throw new Error(`"${p.title}" is no longer for sale.`);
      if (typeof p.stock === "number" && p.stock > 0 && item.qty > p.stock) {
        throw new Error(`Only ${p.stock} left of "${p.title}".`);
      }
      const price = Number(p.price_zar);
      subtotal += price * item.qty;
      lines.push({
        product_id: p.id,
        title: p.title,
        unit_price_zar: price,
        qty: item.qty,
        size: item.size ?? null,
        color: item.color ?? null,
        comment: item.comment ?? "",
        image_url: p.image_url ?? null,
      });
    }

    // Delivery fee comes from the seller's own options on the first product.
    const options: any[] = Array.isArray(products[0]?.delivery_options) ? products[0].delivery_options : [];
    const chosen = options.find((o: any) => o?.method === data.delivery_method);
    const deliveryFee = Number(chosen?.fee_zar ?? 0);
    const deliveryDays = chosen?.days != null ? Number(chosen.days) : null;

    // Coupon: buyer gets a small discount, the affiliate earns points.
    let couponAffiliate: any = null;
    let discount = 0;
    const code = (data.coupon_code ?? "").trim().toUpperCase();
    if (code) {
      const { data: aff } = await db.from("affiliates").select("id, user_id, points").eq("code", code).maybeSingle();
      if (!aff) throw new Error("That coupon code is not valid.");
      if (aff.user_id === context.userId) throw new Error("You cannot use your own coupon code.");
      couponAffiliate = aff;
      discount += Math.round(subtotal * (COUPON_DISCOUNT_PCT / 100) * 100) / 100;
    }

    // Points the buyer chooses to spend as a discount.
    let pointsUsed = 0;
    let myAccount: any = null;
    if (data.points_to_use > 0) {
      if (data.points_to_use < MIN_POINTS_TO_SPEND) {
        throw new Error(`You need at least ${MIN_POINTS_TO_SPEND} points to use them as a discount.`);
      }
      const { data: mine } = await db.from("affiliates").select("*").eq("user_id", context.userId).maybeSingle();
      if (!mine || mine.points < data.points_to_use) throw new Error("You do not have that many points.");
      myAccount = mine;
      const maxZar = Math.max(0, subtotal - discount);
      const wanted = Math.round(data.points_to_use * POINT_VALUE_ZAR * 100) / 100;
      const applied = Math.min(maxZar, wanted);
      pointsUsed = Math.round(applied / POINT_VALUE_ZAR);
      discount += applied;
    }

    const total = Math.max(0, Math.round((subtotal - discount + deliveryFee) * 100) / 100);

    const { data: order, error } = await db
      .from("orders")
      .insert({
        reference: reference(),
        buyer_id: context.userId,
        vendor_id: data.vendor_id,
        buyer_name: data.buyer_name,
        buyer_phone: data.buyer_phone,
        delivery_method: data.delivery_method,
        delivery_address: data.delivery_address ?? "",
        delivery_fee_zar: deliveryFee,
        delivery_days: deliveryDays,
        note: data.note ?? "",
        subtotal_zar: subtotal,
        discount_zar: Math.round(discount * 100) / 100,
        total_zar: total,
        coupon_code: code || null,
        affiliate_id: couponAffiliate?.id ?? null,
        points_used: pointsUsed,
        status: "pending",
        payment_status: "unpaid",
      })
      .select("*")
      .maybeSingle();

    if (error || !order) throw new Error(error?.message ?? "Could not create your order.");

    await db.from("order_items").insert(lines.map((l) => ({ ...l, order_id: order.id })));

    for (const l of lines) {
      await db.from("product_events").insert({ product_id: l.product_id, vendor_id: data.vendor_id, event_type: "order_placed" });
    }

    if (pointsUsed > 0 && myAccount) {
      await db.from("affiliates").update({
        points: myAccount.points - pointsUsed,
        points_redeemed: myAccount.points_redeemed + pointsUsed,
      }).eq("id", myAccount.id);
      await db.from("affiliate_points_ledger").insert({
        affiliate_id: myAccount.id,
        points: -pointsUsed,
        kind: "discount_used",
        order_id: order.id,
        note: `Points used as a discount on order ${order.reference}`,
      });
    }

    if (couponAffiliate) {
      const earned = purchasePoints(subtotal);
      await db.from("affiliates").update({ points: couponAffiliate.points + earned }).eq("id", couponAffiliate.id);
      await db.from("affiliate_points_ledger").insert({
        affiliate_id: couponAffiliate.id,
        points: earned,
        kind: "purchase",
        order_id: order.id,
        note: `Purchase of R${subtotal.toLocaleString("en-ZA")} with your coupon code`,
      });
      await db.from("affiliate_referrals").update({ has_purchased: true })
        .eq("affiliate_id", couponAffiliate.id).eq("referred_user_id", context.userId);
    }

    return { order_id: order.id as string, reference: order.reference as string, total_zar: total };
  });

/** Orders placed by the signed in buyer. */
export const listMyOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase.from("orders" as any) as any)
      .select("*, order_items(*), vendors(business_name, city, whatsapp_number)")
      .eq("buyer_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Orders received by the signed in seller. */
export const listVendorOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase.from("orders" as any) as any)
      .select("*, order_items(*)")
      .eq("vendor_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Seller or staff moves an order along. */
export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { order_id: string; status: string; payment_status?: string }) =>
    z.object({
      order_id: z.string().uuid(),
      status: z.enum(["pending", "confirmed", "shipped", "completed", "cancelled"]),
      payment_status: z.enum(["unpaid", "paid", "refunded"]).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = { status: data.status };
    if (data.payment_status) patch.payment_status = data.payment_status;
    const { error } = await (context.supabase.from("orders" as any) as any).update(patch).eq("id", data.order_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** CEO / admin view of every order. */
export const staffListOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase.from("orders" as any) as any)
      .select("*, order_items(*), vendors(business_name, city)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
