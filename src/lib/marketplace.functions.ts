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
});

// Free vendor registration — auto-approved instantly.
export const submitVendorRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => VendorInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const email = (claims.email as string | undefined) ?? "";
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
      status: "approved",
    }, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const ProductInput = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(5).max(2000),
  price_zar: z.number().min(0).max(10_000_000),
  category: z.string().trim().min(2).max(60),
  image_url: z.string().trim().max(1000).optional().nullable(),
  size: z.string().trim().max(40).optional().nullable(),
  color: z.string().trim().max(40).optional().nullable(),
});

export const submitProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ProductInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: vendor } = await supabase
      .from("vendors").select("status").eq("id", userId).maybeSingle();
    if (!vendor) throw new Error("Create your store first.");

    const { data: row, error } = await supabase.from("products").insert({
      vendor_id: userId,
      title: data.title,
      description: data.description,
      price_zar: data.price_zar,
      category: data.category,
      image_url: data.image_url ?? null,
      size: data.size || null,
      color: data.color || null,
      status: "approved",
      is_sold: false,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

// Mark product as available / sold (vendor self-service)
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

// Admin or owner can delete any product listing.
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

// Owner can delete an entire store.
export const ownerDeleteVendor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ vendor_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isOwner } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "owner" });
    if (!isOwner) throw new Error("Only the owner can delete stores.");
    // Delete products first then vendor
    await context.supabase.from("products").delete().eq("vendor_id", data.vendor_id);
    const { error } = await context.supabase.from("vendors").delete().eq("id", data.vendor_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Owner: list all registered users (auth) with their vendor info if any.
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

// Promote a user to admin or owner. Bootstrap: if no owner exists, anyone can claim owner.
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
        // Bootstrap: only the configured CEO email may claim the first owner role.
        if (callerEmail !== bootstrapOwnerEmail) {
          throw new Error("Only the verified CEO email can claim the owner role.");
        }
        if (data.email.toLowerCase() !== bootstrapOwnerEmail) {
          throw new Error("The first owner must be the verified CEO account.");
        }
      }
    } else {
      // admin: only owner or existing admin can add admins (after bootstrap)
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
