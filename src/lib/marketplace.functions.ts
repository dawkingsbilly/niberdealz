import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const VendorInput = z.object({
  business_name: z.string().trim().min(2).max(120),
  owner_name: z.string().trim().min(2).max(120),
  whatsapp_number: z.string().trim().min(9).max(20).regex(/^[+0-9 ]+$/, "Digits only"),
  city: z.string().trim().min(2).max(80),
  business_description: z.string().trim().min(10).max(2000),
  category: z.string().trim().min(2).max(60),
  logo_url: z.string().trim().max(1000).optional().nullable(),
});

export const submitVendorRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => VendorInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const email = (claims.email as string | undefined) ?? "";
    const bootstrapOwner = (process.env.OWNER_BOOTSTRAP_EMAIL ?? "sibandaniberyot99@gmail.com").toLowerCase();
    const isBootstrap = email.toLowerCase() === bootstrapOwner;
    const { error } = await supabase.from("vendors").upsert({
      id: userId,
      business_name: data.business_name,
      owner_name: data.owner_name,
      email,
      whatsapp_number: data.whatsapp_number,
      city: data.city,
      province: "",
      business_description: data.business_description,
      category: data.category,
      logo_url: data.logo_url ?? null,
      status: isBootstrap ? "approved" : "pending",
      verified: isBootstrap,
      is_official: isBootstrap,
    } as any, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return { ok: true, pending: !isBootstrap };
  });

const VendorProfileInput = z.object({
  business_name: z.string().trim().min(2).max(120),
  owner_name: z.string().trim().min(2).max(120),
  whatsapp_number: z.string().trim().min(9).max(20).regex(/^[+0-9 ]+$/, "Digits only"),
  city: z.string().trim().min(2).max(80),
  business_description: z.string().trim().min(5).max(2000),
  category: z.string().trim().min(2).max(60),
  logo_url: z.string().trim().max(1000).optional().nullable(),
});
export const updateVendorProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => VendorProfileInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("vendors")
      .update({
        business_name: data.business_name,
        owner_name: data.owner_name,
        whatsapp_number: data.whatsapp_number,
        city: data.city,
        business_description: data.business_description,
        category: data.category,
        logo_url: data.logo_url ?? null,
      } as any)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const ProductInput = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(5).max(2000),
  price_zar: z.number().min(0).max(10_000_000),
  category: z.string().trim().min(2).max(60),
  image_url: z.string().trim().max(1000).optional().nullable(),
  images: z.array(z.string().trim().max(1000)).max(6).optional(),
  size: z.string().trim().max(40).optional().nullable(),
  color: z.string().trim().max(40).optional().nullable(),
  stock: z.number().int().min(0).max(100000).optional().nullable(),
});

export const submitProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ProductInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: vendor } = await supabase
      .from("vendors").select("status").eq("id", userId).maybeSingle();
    if (!vendor) throw new Error("Create your store first.");

    const images = data.images ?? (data.image_url ? [data.image_url] : []);
    const cover = data.image_url ?? images[0] ?? null;

    const { data: row, error } = await supabase.from("products").insert({
      vendor_id: userId,
      title: data.title,
      description: data.description,
      price_zar: data.price_zar,
      category: data.category,
      image_url: cover,
      images,
      size: data.size || null,
      color: data.color || null,
      stock: data.stock ?? null,
      status: "approved",
      is_sold: false,
    } as any).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

const ProductUpdateInput = z.object({
  product_id: z.string().uuid(),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(5).max(2000),
  price_zar: z.number().min(0).max(10_000_000),
  category: z.string().trim().min(2).max(60),
  images: z.array(z.string().trim().max(1000)).max(6),
  size: z.string().trim().max(40).optional().nullable(),
  color: z.string().trim().max(40).optional().nullable(),
  stock: z.number().int().min(0).max(100000).optional().nullable(),
});

export const updateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ProductUpdateInput.parse(d))
  .handler(async ({ data, context }) => {
    const cover = data.images[0] ?? null;
    const { error } = await context.supabase.from("products")
      .update({
        title: data.title, description: data.description,
        price_zar: data.price_zar, category: data.category,
        images: data.images, image_url: cover,
        size: data.size || null, color: data.color || null,
        stock: data.stock ?? null,
      } as any)
      .eq("id", data.product_id)
      .eq("vendor_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setProductSold = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ product_id: z.string().uuid(), is_sold: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("products")
      .update({ is_sold: data.is_sold })
      .eq("id", data.product_id)
      .eq("vendor_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ product_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: isAdmin }, { data: isOwner }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "owner" }),
    ]);
    if (!isAdmin && !isOwner) throw new Error("Forbidden");
    const { error } = await context.supabase.from("products").delete().eq("id", data.product_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const ownerDeleteVendor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ vendor_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isOwner } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "owner" });
    if (!isOwner) throw new Error("Only the owner can delete stores.");
    await context.supabase.from("products").delete().eq("vendor_id", data.vendor_id);
    const { error } = await context.supabase.from("vendors").delete().eq("id", data.vendor_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Owner/admin: approve or decline a pending store
const VendorStatusInput = z.object({
  vendor_id: z.string().uuid(),
  status: z.enum(["approved", "pending", "rejected"]),
  reason: z.string().trim().max(500).optional(),
});
export const setVendorStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => VendorStatusInput.parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: isAdmin }, { data: isOwner }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "owner" }),
    ]);
    if (!isAdmin && !isOwner) throw new Error("Forbidden");
    const patch: any = { status: data.status, rejection_reason: data.reason ?? null };
    if (data.status === "approved") patch.verified = true;
    const { error } = await context.supabase.from("vendors").update(patch).eq("id", data.vendor_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const ownerListUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isOwner } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "owner" });
    if (!isOwner) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 500 });
    if (error) throw new Error(error.message);
    return {
      users: list.users.map(u => ({
        id: u.id,
        email: u.email ?? "",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
      })),
    };
  });

const PromoteInput = z.object({ email: z.string().email(), role: z.enum(["admin", "owner"]).default("admin") });
export const promoteToRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PromoteInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bootstrapOwnerEmail = (process.env.OWNER_BOOTSTRAP_EMAIL ?? "sibandaniberyot99@gmail.com").toLowerCase();
    const callerEmail = ((context.claims.email as string | undefined) ?? "").toLowerCase();

    if (data.role === "owner") {
      const { count: ownerCount } = await supabaseAdmin
        .from("user_roles").select("*", { count: "exact", head: true }).eq("role", "owner");
      if ((ownerCount ?? 0) > 0) {
        const { data: isOwner } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "owner" });
        if (!isOwner) throw new Error("Only the owner can add another owner.");
      } else {
        if (callerEmail !== bootstrapOwnerEmail) {
          throw new Error("Only the verified CEO email can claim the owner role.");
        }
        if (data.email.toLowerCase() !== bootstrapOwnerEmail) {
          throw new Error("The first owner must be the verified CEO account.");
        }
      }
    } else {
      const { count: adminCount } = await supabaseAdmin
        .from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin");
      if ((adminCount ?? 0) > 0) {
        const [{ data: isOwner }, { data: isAdmin }] = await Promise.all([
          context.supabase.rpc("has_role", { _user_id: context.userId, _role: "owner" }),
          context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
        ]);
        if (!isOwner && !isAdmin) throw new Error("Only an owner or admin can add admins.");
      }
    }

    const { data: list, error: lErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 500 });
    if (lErr) throw new Error(lErr.message);
    const target = list.users.find((u) => (u.email ?? "").toLowerCase() === data.email.toLowerCase());
    if (!target) throw new Error("No user found with that email. They must register first.");

    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: target.id, role: data.role });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true, userId: target.id };
  });

// ====== Reviews (product) ======
const ReviewInput = z.object({
  product_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).default(""),
});
export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ReviewInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: prod, error: pErr } = await context.supabase
      .from("products").select("vendor_id").eq("id", data.product_id).maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!prod) throw new Error("Product not found");
    const { error } = await (context.supabase.from("product_reviews") as any).upsert({
      product_id: data.product_id,
      vendor_id: prod.vendor_id,
      user_id: context.userId,
      rating: data.rating,
      comment: data.comment,
    }, { onConflict: "product_id,user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ====== Reviews (store) ======
const StoreReviewInput = z.object({
  vendor_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).default(""),
});
export const submitStoreReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => StoreReviewInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase.from("store_reviews") as any).upsert({
      vendor_id: data.vendor_id,
      user_id: context.userId,
      rating: data.rating,
      comment: data.comment,
    }, { onConflict: "vendor_id,user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ====== Reports ======
const ReportInput = z.object({
  target_type: z.enum(["product", "store"]),
  target_id: z.string().uuid(),
  reason: z.string().trim().min(2).max(80),
  note: z.string().trim().max(1000).default(""),
});
export const submitReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ReportInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase.from("reports") as any).insert({
      reporter_id: context.userId,
      target_type: data.target_type,
      target_id: data.target_id,
      reason: data.reason,
      note: data.note,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const ReportStatusInput = z.object({
  report_id: z.string().uuid(),
  status: z.enum(["open", "reviewed", "dismissed"]),
});
export const setReportStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ReportStatusInput.parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: isAdmin }, { data: isOwner }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "owner" }),
    ]);
    if (!isAdmin && !isOwner) throw new Error("Forbidden");
    const { error } = await (context.supabase.from("reports") as any)
      .update({ status: data.status }).eq("id", data.report_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ====== Vendor warnings ======
const WarningInput = z.object({
  vendor_id: z.string().uuid(),
  message: z.string().trim().min(5).max(2000),
});
export const sendVendorWarning = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => WarningInput.parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: isAdmin }, { data: isOwner }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "owner" }),
    ]);
    if (!isAdmin && !isOwner) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin.from("vendor_warnings") as any).insert({
      vendor_id: data.vendor_id,
      message: data.message,
      sent_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const acknowledgeWarning = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ warning_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase.from("vendor_warnings") as any)
      .update({ acknowledged_at: new Date().toISOString() })
      .eq("id", data.warning_id)
      .eq("vendor_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Owner: full store detail
export const ownerStoreDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ vendor_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: isAdmin }, { data: isOwner }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "owner" }),
    ]);
    if (!isAdmin && !isOwner) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [vendor, products, warnings, reports, authUser] = await Promise.all([
      supabaseAdmin.from("vendors").select("*").eq("id", data.vendor_id).maybeSingle(),
      supabaseAdmin.from("products").select("id, title, price_zar, status, is_sold, created_at").eq("vendor_id", data.vendor_id).order("created_at", { ascending: false }),
      (supabaseAdmin.from("vendor_warnings") as any).select("*").eq("vendor_id", data.vendor_id).order("created_at", { ascending: false }),
      (supabaseAdmin.from("reports") as any).select("*").or(`and(target_type.eq.store,target_id.eq.${data.vendor_id})`).order("created_at", { ascending: false }),
      supabaseAdmin.auth.admin.getUserById(data.vendor_id),
    ]);
    return {
      vendor: vendor.data ?? null,
      products: products.data ?? [],
      warnings: warnings.data ?? [],
      reports: reports.data ?? [],
      user: authUser.data?.user ? {
        email: authUser.data.user.email ?? "",
        created_at: authUser.data.user.created_at,
        last_sign_in_at: authUser.data.user.last_sign_in_at ?? null,
      } : null,
    };
  });

// ====== Sale campaigns ======
const CampaignInput = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).default(""),
  discount_pct: z.number().int().min(1).max(90),
  starts_at: z.string(),
  ends_at: z.string(),
});
export const createSaleCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CampaignInput.parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: isAdmin }, { data: isOwner }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "owner" }),
    ]);
    if (!isAdmin && !isOwner) throw new Error("Forbidden");
    const { data: camp, error } = await (context.supabase.from("sale_campaigns") as any).insert({
      title: data.title, description: data.description,
      discount_pct: data.discount_pct,
      starts_at: data.starts_at, ends_at: data.ends_at,
      created_by: context.userId,
    }).select("id").single();
    if (error) throw new Error(error.message);
    // Auto-invite every approved vendor
    const { data: vendors } = await context.supabase.from("vendors").select("id").eq("status", "approved");
    if (vendors && vendors.length > 0) {
      const rows = vendors.map((v: any) => ({ campaign_id: camp.id, vendor_id: v.id, status: "invited" }));
      await (context.supabase.from("sale_participants") as any).insert(rows);
    }
    return { ok: true, id: camp.id };
  });

export const deleteSaleCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ campaign_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: isAdmin }, { data: isOwner }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "owner" }),
    ]);
    if (!isAdmin && !isOwner) throw new Error("Forbidden");
    const { error } = await (context.supabase.from("sale_campaigns") as any).delete().eq("id", data.campaign_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const respondToCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    campaign_id: z.string().uuid(),
    status: z.enum(["joined", "declined"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase.from("sale_participants") as any)
      .update({ status: data.status })
      .eq("campaign_id", data.campaign_id)
      .eq("vendor_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
