import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const productInput = z.object({
  id: z.string().uuid().optional(), title: z.string().trim().min(2).max(180), description: z.string().trim().min(10).max(8000),
  price_zar: z.number().min(0), sale_price_zar: z.number().min(0).nullable().optional(), category: z.string().trim().min(2).max(100),
  brand: z.string().trim().max(100).optional().default(""), sku: z.string().trim().max(80).optional().default(""), stock: z.number().int().min(0).nullable().optional(),
  size: z.string().trim().max(100).optional().default(""), color: z.string().trim().max(100).optional().default(""), image_url: z.string().url().nullable().optional(),
  images: z.array(z.string().url()).max(12).optional().default([]), variations: z.array(z.object({ name: z.string().max(80), values: z.array(z.string().max(80)).max(40) })).max(8).optional().default([]),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional().default([]), is_featured: z.boolean().optional().default(false), is_new_arrival: z.boolean().optional().default(false),
  is_best_seller: z.boolean().optional().default(false), is_active: z.boolean().optional().default(true),
});

async function authorize(context: any, required: "staff" | "ceo") {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId);
  const roles = (data ?? []).map((row: any) => row.role);
  const isCEO = roles.includes("owner");
  if (!(isCEO || (required === "staff" && roles.includes("admin")))) throw new Error("Access denied.");
  return { db: supabaseAdmin as any, isCEO };
}
async function audit(db: any, context: any, action: string, objectType: string, objectId: string, details: Record<string, unknown> = {}) {
  await db.from("activity_log").insert({ actor_id: context.userId, actor_email: String(context.claims?.email ?? ""), action, object_type: objectType, object_id: objectId, details });
}

export const saveProduct = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => productInput.parse(d)).handler(async ({ data, context }) => {
  const { db } = await authorize(context, "staff");
  if (data.sale_price_zar != null && data.sale_price_zar > data.price_zar) throw new Error("Sale price cannot exceed regular price.");
  const { data: settings } = await db.from("store_settings").select("house_vendor_id").eq("id", true).single();
  if (!settings?.house_vendor_id) throw new Error("NiberDealz store configuration is incomplete.");
  const values = { vendor_id: settings.house_vendor_id, title: data.title, description: data.description, price_zar: data.price_zar, sale_price_zar: data.sale_price_zar ?? null, category: data.category, brand: data.brand || null, sku: data.sku || null, stock: data.stock ?? null, size: data.size || null, color: data.color || null, image_url: data.image_url ?? data.images[0] ?? null, images: data.images, variations: data.variations, tags: data.tags, is_featured: data.is_featured, is_new_arrival: data.is_new_arrival, is_best_seller: data.is_best_seller, is_active: data.is_active, status: "approved", is_sold: data.stock === 0, updated_by: context.userId };
  const result = data.id ? await db.from("products").update(values).eq("id", data.id).select("*").single() : await db.from("products").insert(values).select("*").single();
  if (result.error) throw new Error(result.error.message);
  await audit(db, context, data.id ? "product_updated" : "product_created", "product", result.data.id, { title: result.data.title, sku: result.data.sku, stock: result.data.stock, price_zar: result.data.price_zar });
  return result.data;
});

export const deleteProduct = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d)).handler(async ({ data, context }) => {
  const { db } = await authorize(context, "staff"); const { data: product } = await db.from("products").select("title").eq("id", data.id).maybeSingle();
  const { error } = await db.from("products").delete().eq("id", data.id); if (error) throw new Error(error.message);
  await audit(db, context, "product_deleted", "product", data.id, { title: product?.title ?? "" });
});

export const updateOrderFulfillment = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => z.object({ id: z.string().uuid(), status: z.enum(["pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"]) }).parse(d)).handler(async ({ data, context }) => {
  const { db, isCEO } = await authorize(context, "staff"); if (!isCEO && data.status === "refunded") throw new Error("Only the CEO can mark an order refunded.");
  const { data: order } = await db.from("orders").select("status, reference, payment_status").eq("id", data.id).single(); if (!order) throw new Error("Order not found.");
  const transitions: Record<string, string[]> = { pending: ["paid", "processing", "cancelled"], paid: ["processing", "cancelled", "refunded"], processing: ["shipped", "cancelled", "refunded"], shipped: ["delivered", "refunded"], delivered: ["refunded"], cancelled: [], refunded: [] };
  if (order.status !== data.status && !transitions[order.status]?.includes(data.status)) throw new Error("That order status change is not allowed.");
  const { error } = await db.from("orders").update({ status: data.status, payment_status: data.status === "paid" ? "paid" : order.payment_status }).eq("id", data.id); if (error) throw new Error(error.message);
  await audit(db, context, "order_status_changed", "order", data.id, { reference: order.reference, from: order.status, to: data.status });
});

export const saveCategory = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => z.object({ id: z.string().uuid().optional(), name: z.string().trim().min(2).max(100), sort_order: z.number().int().min(0).max(1000).default(0), active: z.boolean().default(true) }).parse(d)).handler(async ({ data, context }) => {
  const { db } = await authorize(context, "staff"); const result = data.id ? await db.from("store_categories").update({ name: data.name, sort_order: data.sort_order, active: data.active }).eq("id", data.id).select().single() : await db.from("store_categories").insert({ name: data.name, sort_order: data.sort_order, active: data.active }).select().single();
  if (result.error) throw new Error(result.error.message); await audit(db, context, data.id ? "category_updated" : "category_created", "category", result.data.id, { name: result.data.name }); return result.data;
});

export const manageAdministrator = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => z.object({ user_id: z.string().uuid(), action: z.enum(["grant", "disable", "remove", "reset_access"]) }).parse(d)).handler(async ({ data, context }) => {
  const { db } = await authorize(context, "ceo"); const { data: targetRoles } = await db.from("user_roles").select("role").eq("user_id", data.user_id);
  if ((targetRoles ?? []).some((r: any) => r.role === "owner")) throw new Error("The CEO account cannot be changed here.");
  if (data.action === "grant") { const { error } = await db.from("user_roles").upsert({ user_id: data.user_id, role: "admin" }, { onConflict: "user_id,role" }); if (error) throw new Error(error.message); }
  else { const { error } = await db.from("user_roles").delete().eq("user_id", data.user_id).eq("role", "admin"); if (error) throw new Error(error.message); if (data.action === "reset_access") await db.auth.admin.signOut(data.user_id, "global"); }
  await audit(db, context, `administrator_${data.action}`, "administrator", data.user_id);
});

export const saveStoreSettings = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => z.object({ store_name: z.string().trim().min(2).max(100), support_whatsapp: z.string().trim().max(30), support_email: z.string().trim().email().or(z.literal("")), delivery_note: z.string().trim().max(400), default_delivery_fee_zar: z.number().min(0).max(5000), payment_provider: z.string().trim().max(100), payment_mode: z.enum(["pending", "live", "test"]) }).parse(d)).handler(async ({ data, context }) => {
  const { db } = await authorize(context, "ceo"); const { error } = await db.from("store_settings").update(data).eq("id", true); if (error) throw new Error(error.message); await audit(db, context, "store_settings_changed", "store_settings", "default", { store_name: data.store_name, payment_provider: data.payment_provider, payment_mode: data.payment_mode });
});

export const listAdminDirectory = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { db } = await authorize(context, "ceo"); const { data: roles, error } = await db.from("user_roles").select("user_id, role, created_at").in("role", ["admin", "owner"]); if (error) throw new Error(error.message);
  return await Promise.all((roles ?? []).map(async (r: any) => { const { data } = await db.auth.admin.getUserById(r.user_id); return { ...r, email: data.user?.email ?? "", name: data.user?.user_metadata?.full_name ?? "", last_sign_in_at: data.user?.last_sign_in_at ?? null }; }));
});
export const listActivityLog = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => { const { db } = await authorize(context, "ceo"); const { data, error } = await db.from("activity_log").select("*").order("created_at", { ascending: false }).limit(250); if (error) throw new Error(error.message); return data ?? []; });

export const createNiberDealzOrder = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => z.object({ items: z.array(z.object({ product_id: z.string().uuid(), qty: z.number().int().min(1).max(50), size: z.string().nullable().optional(), color: z.string().nullable().optional(), comment: z.string().max(300).optional() })).min(1).max(30), buyer_name: z.string().trim().min(2).max(80), buyer_phone: z.string().trim().min(9).max(30), delivery_method: z.enum(["courier", "paxi", "pickup"]), delivery_address: z.string().trim().max(500).optional().default(""), note: z.string().trim().max(500).optional().default(""), discount_code: z.string().trim().max(40).optional().default("") }).parse(d)).handler(async ({ data, context }) => {
  const { data: result, error } = await (context.supabase as any).rpc("create_niberdealz_order", { p_items: data.items, p_buyer_name: data.buyer_name, p_buyer_phone: data.buyer_phone, p_delivery_method: data.delivery_method, p_delivery_address: data.delivery_address, p_note: data.note, p_discount_code: data.discount_code });
  if (error) throw new Error(error.message); const order = Array.isArray(result) ? result[0] : result; if (!order?.order_id) throw new Error("Could not create your order."); return order;
});
