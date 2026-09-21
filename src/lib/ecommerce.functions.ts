/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase's runtime admin client is intentionally untyped in server functions. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SUPPLIER_MARKUP = 1.4;
const sellingPriceFromSupplierCost = (cost: number) =>
  Math.round(cost * SUPPLIER_MARKUP * 100) / 100;

const productInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().min(10).max(8000),
  // Legacy client field: server always derives the customer price from supplier cost.
  price_zar: z.number().min(0).optional(),
  sale_price_zar: z.number().min(0).nullable().optional(),
  category: z.string().trim().min(2).max(100),
  brand: z.string().trim().max(100).optional().default(""),
  sku: z.string().trim().max(80).optional().default(""),
  stock: z.number().int().min(0).nullable().optional(),
  size: z.string().trim().max(100).optional().default(""),
  color: z.string().trim().max(100).optional().default(""),
  image_url: z.string().url().nullable().optional(),
  images: z.array(z.string().url()).min(5, "Upload at least 5 product photos.").max(12),
  variations: z
    .array(z.object({ name: z.string().max(80), values: z.array(z.string().max(80)).max(40) }))
    .max(8)
    .optional()
    .default([]),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional().default([]),
  is_featured: z.boolean().optional().default(false),
  is_new_arrival: z.boolean().optional().default(false),
  is_best_seller: z.boolean().optional().default(false),
  is_active: z.boolean().optional().default(true),
  supplier_source_url: z.string().url(),
  supplier_original_price_zar: z.number().positive(),
  supplier_name: z.string().trim().min(2).max(160),
});

async function authorize(context: any, required: "staff" | "ceo") {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  const roles = (data ?? []).map((row: any) => row.role);
  const isCEO = roles.includes("owner");
  if (!(isCEO || (required === "staff" && roles.includes("admin"))))
    throw new Error("Access denied.");
  return { db: supabaseAdmin as any, isCEO };
}
async function audit(
  db: any,
  context: any,
  action: string,
  objectType: string,
  objectId: string,
  details: Record<string, unknown> = {},
) {
  await db.from("activity_log").insert({
    actor_id: context.userId,
    actor_email: String(context.claims?.email ?? ""),
    action,
    object_type: objectType,
    object_id: objectId,
    details,
  });
}

/** CEO only: catalogue changes are financial and brand authority. */
export const saveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => productInput.parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await authorize(context, "ceo");
    const sellingPrice = sellingPriceFromSupplierCost(data.supplier_original_price_zar);
    if (data.sale_price_zar != null && data.sale_price_zar > sellingPrice)
      throw new Error("Sale price cannot exceed regular price.");
    const { data: settings } = await db
      .from("store_settings")
      .select("house_vendor_id")
      .eq("id", true)
      .single();
    if (!settings?.house_vendor_id)
      throw new Error("NiberDealz store configuration is incomplete.");
    const values = {
      vendor_id: settings.house_vendor_id,
      title: data.title,
      description: data.description,
      price_zar: sellingPrice,
      sale_price_zar: data.sale_price_zar ?? null,
      category: data.category,
      brand: data.brand || null,
      sku: data.sku || null,
      stock: data.stock ?? null,
      size: data.size || null,
      color: data.color || null,
      image_url: data.images[0],
      images: data.images,
      variations: data.variations,
      tags: data.tags,
      is_featured: data.is_featured,
      is_new_arrival: data.is_new_arrival,
      is_best_seller: data.is_best_seller,
      is_active: data.is_active,
      status: "approved",
      is_sold: data.stock === 0,
      updated_by: context.userId,
    };
    const result = data.id
      ? await db.from("products").update(values).eq("id", data.id).select("*").single()
      : await db.from("products").insert(values).select("*").single();
    if (result.error) throw new Error(result.error.message);
    const source = {
      product_id: result.data.id,
      source_url: data.supplier_source_url || "",
      original_price_zar: data.supplier_original_price_zar,
      supplier_name: data.supplier_name,
      updated_at: new Date().toISOString(),
      updated_by: context.userId,
    };
    const sourceResult = await db
      .from("product_supplier_sources")
      .upsert(source, { onConflict: "product_id" });
    if (sourceResult.error)
      throw new Error("Product saved, but supplier source details could not be recorded.");
    await audit(
      db,
      context,
      data.id ? "product_updated" : "product_created",
      "product",
      result.data.id,
      {
        title: result.data.title,
        sku: result.data.sku,
        stock: result.data.stock,
        price_zar: result.data.price_zar,
      },
    );
    return result.data;
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await authorize(context, "ceo");
    const { data: product } = await db
      .from("products")
      .select("title")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await db.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(db, context, "product_deleted", "product", data.id, {
      title: product?.title ?? "",
    });
  });

/** CEO only. A database function handles payment, stock restoration and promotion claims atomically. */
export const updateOrderFulfillment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum([
          "pending",
          "paid",
          "processing",
          "shipped",
          "delivered",
          "cancelled",
          "refunded",
        ]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { db } = await authorize(context, "ceo");
    const { data: order } = await db
      .from("orders")
      .select("status, reference")
      .eq("id", data.id)
      .single();
    if (!order) throw new Error("Order not found.");
    const transitions: Record<string, string[]> = {
      pending: ["paid", "processing", "cancelled"],
      paid: ["processing", "cancelled", "refunded"],
      processing: ["shipped", "cancelled", "refunded"],
      shipped: ["delivered", "refunded"],
      delivered: ["refunded"],
      cancelled: [],
      refunded: [],
    };
    if (order.status !== data.status && !transitions[order.status]?.includes(data.status))
      throw new Error("That order status change is not allowed.");
    const { error } = await db.rpc("set_niberdealz_order_status", {
      p_order_id: data.id,
      p_status: data.status,
      p_actor_id: context.userId,
    });
    if (error) throw new Error("Unable to update the order status.");
  });

export const updateManualFulfilment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        fulfilment_status: z.enum(["Pending Fulfilment", "Placed with supplier", "Fulfilled"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { db } = await authorize(context, "ceo");
    const { data: order } = await db
      .from("orders")
      .select("reference, fulfilment_status")
      .eq("id", data.id)
      .single();
    if (!order) throw new Error("Order not found.");
    const valid: Record<string, string[]> = {
      "Pending Fulfilment": ["Placed with supplier"],
      "Placed with supplier": ["Fulfilled", "Pending Fulfilment"],
      Fulfilled: [],
    };
    if (
      order.fulfilment_status !== data.fulfilment_status &&
      !valid[order.fulfilment_status]?.includes(data.fulfilment_status)
    )
      throw new Error("That fulfilment change is not allowed.");
    const { error } = await db
      .from("orders")
      .update({
        fulfilment_status: data.fulfilment_status,
        fulfilment_updated_at: new Date().toISOString(),
        fulfilment_updated_by: context.userId,
      })
      .eq("id", data.id);
    if (error) throw new Error("Unable to update fulfilment status.");
    await audit(db, context, "manual_fulfilment_updated", "order", data.id, {
      reference: order.reference,
      from: order.fulfilment_status,
      to: data.fulfilment_status,
    });
  });

export const listFulfilmentQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db } = await authorize(context, "ceo");
    const { data, error } = await db
      .from("orders")
      .select(
        "id,reference,created_at,buyer_name,buyer_phone,delivery_method,delivery_tier,paxi_pickup_point,delivery_address,note,total_zar,payment_status,status,fulfilment_status,order_items(id,title,qty,size,color,comment,order_item_supplier_sources(source_url,original_price_zar,supplier_name))",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error("Unable to load fulfilment queue.");
    return data ?? [];
  });

export const saveCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(2).max(100),
        sort_order: z.number().int().min(0).max(1000).default(0),
        active: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { db } = await authorize(context, "ceo");
    const result = data.id
      ? await db
          .from("store_categories")
          .update({ name: data.name, sort_order: data.sort_order, active: data.active })
          .eq("id", data.id)
          .select()
          .single()
      : await db
          .from("store_categories")
          .insert({ name: data.name, sort_order: data.sort_order, active: data.active })
          .select()
          .single();
    if (result.error) throw new Error(result.error.message);
    await audit(
      db,
      context,
      data.id ? "category_updated" : "category_created",
      "category",
      result.data.id,
      { name: result.data.name },
    );
    return result.data;
  });

export const manageAdministrator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        action: z.enum(["grant", "disable", "remove", "reset_access"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { db } = await authorize(context, "ceo");
    const { data: targetRoles } = await db
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user_id);
    if ((targetRoles ?? []).some((r: any) => r.role === "owner"))
      throw new Error("The CEO account cannot be changed here.");
    if (data.action === "grant") {
      const { error } = await db
        .from("user_roles")
        .upsert({ user_id: data.user_id, role: "admin" }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await db
        .from("user_roles")
        .delete()
        .eq("user_id", data.user_id)
        .eq("role", "admin");
      if (error) throw new Error(error.message);
      if (data.action === "reset_access") await db.auth.admin.signOut(data.user_id, "global");
    }
    await audit(db, context, `administrator_${data.action}`, "administrator", data.user_id);
  });

export const grantAdministratorByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ email: z.string().trim().email() }).parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await authorize(context, "ceo");
    const { data: users, error: lookupError } = await db.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (lookupError) throw new Error("Unable to find that account.");
    const user = (users?.users ?? []).find(
      (item: any) => item.email?.toLowerCase() === data.email.toLowerCase(),
    );
    if (!user)
      throw new Error("That person needs a NiberDealz account before you can make them an admin.");
    const { data: roles } = await db.from("user_roles").select("role").eq("user_id", user.id);
    if ((roles ?? []).some((role: any) => role.role === "owner"))
      throw new Error("The CEO account cannot be changed here.");
    const { error } = await db
      .from("user_roles")
      .upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
    await audit(db, context, "administrator_grant", "administrator", user.id);
  });

export const listAdminDirectory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db } = await authorize(context, "ceo");
    const { data: roles, error } = await db
      .from("user_roles")
      .select("user_id, role, created_at")
      .in("role", ["admin", "owner"]);
    if (error) throw new Error(error.message);
    return await Promise.all(
      (roles ?? []).map(async (r: any) => {
        const { data } = await db.auth.admin.getUserById(r.user_id);
        return {
          ...r,
          email: data.user?.email ?? "",
          name: data.user?.user_metadata?.full_name ?? "",
          last_sign_in_at: data.user?.last_sign_in_at ?? null,
        };
      }),
    );
  });

const contactRequestInput = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  topic: z.enum(["order", "product", "delivery", "return", "privacy", "other"]),
  message: z.string().trim().min(10).max(3000),
  preferred_contact: z.enum(["email", "whatsapp", "call"]),
});
export const createContactRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => contactRequestInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("contact_requests").insert(data);
    if (error) throw new Error("We could not send your message. Please try again.");
    return { received: true };
  });

export const listContactRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db } = await authorize(context, "ceo");
    const { data, error } = await (db as any)
      .from("contact_requests")
      .select("id,name,email,topic,message,preferred_contact,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error("Unable to load private messages.");
    return data ?? [];
  });

export const createNiberDealzOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        items: z
          .array(
            z.object({
              product_id: z.string().uuid(),
              qty: z.number().int().min(1).max(50),
              size: z.string().nullable().optional(),
              color: z.string().nullable().optional(),
              comment: z.string().max(300).optional(),
            }),
          )
          .min(1)
          .max(30),
        buyer_name: z.string().trim().min(2).max(80),
        buyer_phone: z.string().trim().min(9).max(30),
        delivery_method: z.enum(["courier", "paxi", "pickup"]),
        delivery_address: z.string().trim().max(500).optional().default(""),
        note: z.string().trim().max(500).optional().default(""),
        discount_code: z.string().trim().max(40).optional().default(""),
        delivery_tier: z.enum([
          "courier",
          "pickup",
          "paxi_standard_5kg",
          "paxi_express_5kg",
          "paxi_standard_10kg",
          "paxi_express_10kg",
        ]),
        paxi_pickup_point: z.string().trim().max(180).optional().default(""),
        terms_version: z.literal("2026-09"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await (context.supabase as any).rpc("create_niberdealz_order", {
      p_items: data.items,
      p_buyer_name: data.buyer_name,
      p_buyer_phone: data.buyer_phone,
      p_delivery_method: data.delivery_method,
      p_delivery_address: data.delivery_address,
      p_note: data.note,
      p_discount_code: data.discount_code,
      p_delivery_tier: data.delivery_tier,
      p_paxi_pickup_point: data.paxi_pickup_point,
      p_terms_version: data.terms_version,
    });
    if (error)
      throw new Error(
        "We could not create your order. Please review the checkout details and try again.",
      );
    const order = Array.isArray(result) ? result[0] : result;
    if (!order?.order_id) throw new Error("Could not create your order.");
    return order;
  });
