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
  supplier_sku: z.string().trim().max(160).optional().default(""),
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
      supplier_sku: data.supplier_sku || null,
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

const supplierConnectionInput = z.object({
  id: z.string().uuid().optional(),
  supplier_name: z.string().trim().min(2).max(160),
  base_url: z
    .string()
    .url()
    .refine((value) => value.startsWith("https://"), "Use an HTTPS URL."),
  source_type: z.enum(["website", "api_feed"]).default("website"),
  is_enabled: z.boolean().default(true),
});

/** CEO only: records a supplier the owner has manually connected. Credentials are never accepted here. */
export const saveSupplierConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => supplierConnectionInput.parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await authorize(context, "ceo");
    const values = {
      supplier_name: data.supplier_name,
      base_url: data.base_url,
      source_type: data.source_type,
      connection_mode: "manual",
      is_enabled: data.is_enabled,
      connection_status: "connected",
      updated_at: new Date().toISOString(),
      updated_by: context.userId,
    };
    const result = data.id
      ? await db.from("supplier_connections").update(values).eq("id", data.id).select("*").single()
      : await db
          .from("supplier_connections")
          .insert({ ...values, created_by: context.userId })
          .select("*")
          .single();
    if (result.error) throw new Error("Could not save the supplier connection.");
    await audit(
      db,
      context,
      data.id ? "supplier_connection_updated" : "supplier_connection_created",
      "supplier_connection",
      result.data.id,
      {
        supplier_name: result.data.supplier_name,
        connection_mode: "manual",
      },
    );
    return result.data;
  });

export const listSupplierConnections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db } = await authorize(context, "ceo");
    const { data, error } = await db
      .from("supplier_connections")
      .select(
        "id,supplier_name,base_url,source_type,connection_mode,is_enabled,connection_status,last_checked_at,created_at,updated_at",
      )
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error("Unable to load supplier connections.");
    return data ?? [];
  });

const importRowInput = z.object({
  source_key: z.string().trim().min(1).max(180).optional(),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().min(10).max(8000),
  category: z.string().trim().min(2).max(100),
  brand: z.string().trim().max(100).optional().default(""),
  supplier_sku: z.string().trim().max(160).optional().default(""),
  source_url: z.string().url(),
  supplier_cost_zar: z.number().positive(),
  stock: z.number().int().min(0).nullable().optional(),
  images: z.array(z.string().url()).min(5).max(12),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional().default([]),
  variations: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        values: z.array(z.string().trim().min(1).max(80)).min(1).max(40),
      }),
    )
    .max(8)
    .optional()
    .default([]),
});
const supplierImportInput = z.object({
  supplier_connection_id: z.string().uuid(),
  rows: z.array(z.unknown()).min(1).max(200),
  confirmed_by_owner: z.literal(true),
});

/**
 * CEO-only, confirmation-gated staging path for manual files and future authorised AI assistance.
 * It creates private review records only; it never publishes a product or contacts a supplier.
 */
export const stageSupplierImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => supplierImportInput.parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await authorize(context, "ceo");
    const { data: connection } = await db
      .from("supplier_connections")
      .select("id,supplier_name,is_enabled")
      .eq("id", data.supplier_connection_id)
      .maybeSingle();
    if (!connection || !connection.is_enabled)
      throw new Error("Choose an active manually connected supplier.");

    const { data: imported, error: importError } = await db
      .from("catalogue_imports")
      .insert({
        source_type: "manual",
        supplier_connection_id: connection.id,
        source_url: null,
        status: "queued",
        requested_by: context.userId,
      })
      .select("id")
      .single();
    if (importError || !imported) throw new Error("Could not open the import review queue.");

    const validRows: any[] = [];
    const errors: any[] = [];
    const sourceKeys = new Set<string>();
    data.rows.forEach((raw, index) => {
      const parsed = importRowInput.safeParse(raw);
      const rowNumber = index + 1;
      if (!parsed.success) {
        errors.push({
          catalogue_import_id: imported.id,
          row_number: rowNumber,
          message: parsed.error.issues[0]?.message ?? "Invalid product row.",
        });
        return;
      }
      const row = parsed.data;
      const sourceKey = row.source_key || row.supplier_sku || row.source_url;
      if (sourceKeys.has(sourceKey)) {
        errors.push({
          catalogue_import_id: imported.id,
          row_number: rowNumber,
          source_key: sourceKey,
          message: "Duplicate supplier SKU or source link in this import.",
        });
        return;
      }
      sourceKeys.add(sourceKey);
      validRows.push({
        catalogue_import_id: imported.id,
        title: row.title,
        description: row.description,
        category: row.category,
        brand: row.brand,
        image_url: row.images[0],
        images: row.images,
        source_url: row.source_url,
        supplier_name: connection.supplier_name,
        supplier_sku: row.supplier_sku || null,
        original_price_zar: row.supplier_cost_zar,
        proposed_price_zar: sellingPriceFromSupplierCost(row.supplier_cost_zar),
        stock: row.stock ?? null,
        tags: row.tags,
        variations: row.variations,
        source_key: sourceKey,
        status: "pending_review",
      });
    });
    if (validRows.length) {
      const { error } = await db.from("catalogue_review_items").insert(validRows);
      if (error) throw new Error("The import was saved, but review items could not be staged.");
    }
    if (errors.length) await db.from("catalogue_import_errors").insert(errors);
    const status = errors.length && !validRows.length ? "error" : "processed";
    await db
      .from("catalogue_imports")
      .update({
        status,
        item_count: validRows.length,
        error_message: errors.length ? `${errors.length} row(s) need attention.` : null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", imported.id);
    await audit(db, context, "supplier_import_staged", "catalogue_import", imported.id, {
      supplier_connection_id: connection.id,
      staged_count: validRows.length,
      rejected_count: errors.length,
      confirmed_by_owner: true,
    });
    return {
      import_id: imported.id as string,
      staged_count: validRows.length,
      rejected_count: errors.length,
    };
  });

export const listCatalogueOperations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db } = await authorize(context, "ceo");
    const [imports, reviews, errors, activity] = await Promise.all([
      db
        .from("catalogue_imports")
        .select(
          "id,status,item_count,error_message,created_at,completed_at,supplier_connections(supplier_name)",
        )
        .order("created_at", { ascending: false })
        .limit(30),
      db
        .from("catalogue_review_items")
        .select(
          "id,catalogue_import_id,title,category,image_url,images,supplier_name,supplier_sku,original_price_zar,proposed_price_zar,stock,status,created_at",
        )
        .eq("status", "pending_review")
        .order("created_at", { ascending: false })
        .limit(100),
      db
        .from("catalogue_import_errors")
        .select("id,catalogue_import_id,row_number,source_key,message")
        .order("created_at", { ascending: false })
        .limit(100),
      db
        .from("activity_log")
        .select("id,action,object_type,object_id,details,created_at")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    if (imports.error || reviews.error || errors.error || activity.error)
      throw new Error("Unable to load catalogue operations.");
    return {
      imports: imports.data ?? [],
      reviews: reviews.data ?? [],
      errors: errors.data ?? [],
      activity: activity.data ?? [],
    };
  });

export const reviewImportedProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), action: z.enum(["approve", "reject"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { db } = await authorize(context, "ceo");
    const { data: review, error } = await db
      .from("catalogue_review_items")
      .select("*")
      .eq("id", data.id)
      .eq("status", "pending_review")
      .maybeSingle();
    if (error || !review) throw new Error("That review item is no longer awaiting approval.");
    if (data.action === "reject") {
      const { error: rejectError } = await db
        .from("catalogue_review_items")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: context.userId,
        })
        .eq("id", review.id);
      if (rejectError) throw new Error("Could not reject this review item.");
      await audit(
        db,
        context,
        "supplier_import_item_rejected",
        "catalogue_review_item",
        review.id,
        { title: review.title },
      );
      return { status: "rejected" };
    }
    const images = Array.isArray(review.images) ? review.images : [];
    if (
      images.length < 5 ||
      !review.source_url ||
      !review.supplier_name ||
      !review.original_price_zar
    )
      throw new Error(
        "This import item is incomplete. Verify its source, supplier cost, and at least 5 images before approval.",
      );
    const { data: settings } = await db
      .from("store_settings")
      .select("house_vendor_id")
      .eq("id", true)
      .single();
    if (!settings?.house_vendor_id)
      throw new Error("NiberDealz store configuration is incomplete.");
    const price = sellingPriceFromSupplierCost(Number(review.original_price_zar));
    const { data: product, error: productError } = await db
      .from("products")
      .insert({
        vendor_id: settings.house_vendor_id,
        title: review.title,
        description: review.description,
        category: review.category,
        brand: review.brand || null,
        sku: review.supplier_sku || null,
        stock: review.stock,
        price_zar: price,
        image_url: images[0],
        images,
        tags: review.tags ?? [],
        variations: review.variations ?? [],
        is_active: true,
        is_sold: review.stock === 0,
        status: "approved",
        review_status: "approved",
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
        listing_source: "manual",
        catalogue_import_id: review.catalogue_import_id,
        catalogue_review_item_id: review.id,
        updated_by: context.userId,
      })
      .select("id,title,price_zar")
      .single();
    if (productError || !product) throw new Error("Could not publish this reviewed product.");
    const sourceResult = await db.from("product_supplier_sources").upsert(
      {
        product_id: product.id,
        source_url: review.source_url,
        original_price_zar: review.original_price_zar,
        supplier_name: review.supplier_name,
        supplier_sku: review.supplier_sku || null,
        updated_at: new Date().toISOString(),
        updated_by: context.userId,
      },
      { onConflict: "product_id" },
    );
    if (sourceResult.error)
      throw new Error("Product published, but its private source record could not be saved.");
    await db.from("product_source_audit").insert({
      product_id: product.id,
      catalogue_import_id: review.catalogue_import_id,
      source_type: "manual",
      source_url: review.source_url,
      supplier_sku: review.supplier_sku || null,
      original_price_zar: review.original_price_zar,
      marked_up_price_zar: price,
      markup_percent: 40,
      created_by: context.userId,
    });
    await db
      .from("catalogue_review_items")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: context.userId,
      })
      .eq("id", review.id);
    await audit(db, context, "supplier_import_item_approved", "product", product.id, {
      review_item_id: review.id,
      title: product.title,
      price_zar: product.price_zar,
    });
    return product;
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

/** CEO only. Order-request status changes remain manual while payment collection is disabled. */
export const updateOrderFulfillment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]),
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
      pending: ["processing", "cancelled"],
      processing: ["shipped", "cancelled"],
      shipped: ["delivered", "cancelled"],
      delivered: [],
      cancelled: [],
    };
    if (order.status !== data.status && !transitions[order.status]?.includes(data.status)) {
      throw new Error("That order status change is not allowed.");
    }

    // Do not call the legacy payment-aware SQL status function here. It can alter payment
    // and inventory records, neither of which belongs to the payment-free request launch.
    const { error } = await db.from("orders").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error("Unable to update the order status.");
    await audit(db, context, "order_status_changed", "order", data.id, {
      reference: order.reference,
      from: order.status,
      to: data.status,
    });
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
        "id,reference,created_at,buyer_name,buyer_phone,delivery_method,delivery_tier,paxi_pickup_point,delivery_address,note,total_zar,payment_status,status,fulfilment_status,order_items(id,title,qty,size,color,comment,order_item_supplier_sources(source_url,original_price_zar,supplier_name,supplier_sku))",
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
    if (error) {
      const reason = String(error.message ?? "");
      const safeMessages = [
        "Authentication required",
        "A valid cart is required",
        "Name and contact number are required",
        "Invalid delivery method",
        "Please accept the Terms and Privacy Policy",
        "A complete courier address is required",
        "Choose a PAXI service, pickup point and address",
        "Invalid collection option",
        "Invalid cart item",
        "A product in your cart is no longer available",
        "Store is not configured",
      ];
      const match = safeMessages.find((message) => reason.includes(message));
      if (match) throw new Error(match);
      if (reason.startsWith("Insufficient stock for"))
        throw new Error(
          "One or more items no longer have enough stock. Review your cart and try again.",
        );
      throw new Error("We could not submit your order just now. Please try again shortly.");
    }
    const order = Array.isArray(result) ? result[0] : result;
    if (!order?.order_id) throw new Error("Could not create your order.");
    return order;
  });
