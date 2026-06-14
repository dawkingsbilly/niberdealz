import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// AI scam/safety check via Lovable AI Gateway.
// Returns risk score 0-100 and a short note. Falls back to neutral on failure.
async function runScamCheck(payload: {
  type: "vendor" | "product";
  text: string;
}): Promise<{ score: number; notes: string; verdict: "approve" | "review" | "reject" }> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return { score: 50, notes: "AI unavailable, manual review required.", verdict: "review" };

  const systemPrompt = `You are a strict trust-and-safety reviewer for a South African online marketplace called Niber-Dealz.
Score the submission for scam / fraud / prohibited-content risk on a 0-100 scale (0 = clearly legitimate, 100 = clearly a scam).
Prohibited: weapons, drugs, counterfeit goods, adult content, stolen items, "get rich quick", crypto/forex schemes, anything requiring upfront payment for a "release", anything illegal in South Africa.
Suspicious wording: unrealistic prices, urgency pressure, requests to pay outside the platform, vague descriptions, all-caps spam, impossible promises.
Respond with strict JSON only: {"score": <int 0-100>, "verdict": "approve"|"review"|"reject", "notes": "<one short sentence>"}.
Use "approve" if score < 30, "review" if 30-69, "reject" if >=70.`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Type: ${payload.type}\n\n${payload.text}` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      console.error("AI gateway error", res.status, await res.text().catch(() => ""));
      return { score: 50, notes: "AI check failed, queued for manual review.", verdict: "review" };
    }
    const json = await res.json();
    const raw = json?.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);
    const score = Math.max(0, Math.min(100, Number(parsed.score ?? 50)));
    const verdict = (parsed.verdict ?? (score < 30 ? "approve" : score >= 70 ? "reject" : "review")) as "approve" | "review" | "reject";
    const notes = String(parsed.notes ?? "").slice(0, 280) || "No notes.";
    return { score, verdict, notes };
  } catch (e) {
    console.error("Scam check failed:", e);
    return { score: 50, notes: "AI check failed, queued for manual review.", verdict: "review" };
  }
}

const VendorInput = z.object({
  business_name: z.string().trim().min(2).max(120),
  owner_name: z.string().trim().min(2).max(120),
  whatsapp_number: z.string().trim().min(9).max(20).regex(/^[+0-9 ]+$/, "Digits only"),
  city: z.string().trim().min(2).max(80),
  province: z.string().trim().min(2).max(40),
  business_description: z.string().trim().min(20).max(2000),
  category: z.string().trim().min(2).max(60),
});

export const submitVendorRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => VendorInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;

    const text = `Business: ${data.business_name}
Owner: ${data.owner_name}
Category: ${data.category}
Location: ${data.city}, ${data.province}
WhatsApp: ${data.whatsapp_number}
Description:
${data.business_description}`;

    const ai = await runScamCheck({ type: "vendor", text });

    const status: "pending" | "approved" | "rejected" =
      ai.verdict === "approve" ? "approved" :
      ai.verdict === "reject" ? "rejected" : "pending";

    const email = (claims.email as string | undefined) ?? "";

    const { error } = await supabase.from("vendors").upsert({
      id: userId,
      business_name: data.business_name,
      owner_name: data.owner_name,
      email,
      whatsapp_number: data.whatsapp_number,
      city: data.city,
      province: data.province,
      business_description: data.business_description,
      category: data.category,
      status,
      ai_risk_score: ai.score,
      ai_review_notes: ai.notes,
      rejection_reason: ai.verdict === "reject" ? ai.notes : null,
    }, { onConflict: "id" });

    if (error) throw new Error(error.message);
    return { ok: true, status, aiScore: ai.score, aiNotes: ai.notes };
  });

const ProductInput = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(15).max(2000),
  price_zar: z.number().min(0).max(10_000_000),
  category: z.string().trim().min(2).max(60),
  image_url: z.string().trim().max(500).optional().nullable(),
});

export const submitProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ProductInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Check vendor approved + plan limit
    const { data: vendor } = await supabase
      .from("vendors")
      .select("status, plan, plan_active_until")
      .eq("id", userId)
      .maybeSingle();
    if (!vendor) throw new Error("Complete vendor registration first.");
    if (vendor.status !== "approved") throw new Error("Your vendor account is still under review.");

    const activeUntil = vendor.plan_active_until ? new Date(vendor.plan_active_until) : null;
    const planActive = vendor.plan !== "none" && activeUntil && activeUntil > new Date();
    if (!planActive) throw new Error("You need an active plan to list products. Visit Billing.");

    const limit = vendor.plan === "starter" ? 5 : vendor.plan === "growth" ? 20 : Number.MAX_SAFE_INTEGER;
    const { count } = await supabase
      .from("products").select("*", { count: "exact", head: true }).eq("vendor_id", userId);
    if ((count ?? 0) >= limit) throw new Error(`Your ${vendor.plan} plan allows ${limit} products. Upgrade to list more.`);

    const ai = await runScamCheck({
      type: "product",
      text: `Title: ${data.title}\nCategory: ${data.category}\nPrice: R${data.price_zar}\n\n${data.description}`,
    });
    const status: "pending" | "approved" | "rejected" =
      ai.verdict === "approve" ? "approved" :
      ai.verdict === "reject" ? "rejected" : "pending";

    const { data: row, error } = await supabase.from("products").insert({
      vendor_id: userId,
      title: data.title,
      description: data.description,
      price_zar: data.price_zar,
      category: data.category,
      image_url: data.image_url ?? null,
      status,
      ai_risk_score: ai.score,
      ai_review_notes: ai.notes,
      rejection_reason: ai.verdict === "reject" ? ai.notes : null,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id, status, aiScore: ai.score };
  });

const PaymentInput = z.object({
  plan: z.enum(["starter", "growth", "unlimited"]),
  amount_zar: z.number().positive().max(100_000),
  proof_url: z.string().trim().min(3).max(500),
  reference: z.string().trim().max(120).optional(),
});

export const submitPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PaymentInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("payments").insert({
      vendor_id: userId,
      plan: data.plan,
      amount_zar: data.amount_zar,
      proof_url: data.proof_url,
      reference: data.reference ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const AdminVendorAction = z.object({
  vendor_id: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
  reason: z.string().max(500).optional(),
});

export const adminVendorAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AdminVendorAction.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await context.supabase.from("vendors").update({
      status: data.action === "approve" ? "approved" : "rejected",
      rejection_reason: data.action === "reject" ? (data.reason ?? "Rejected by admin") : null,
    }).eq("id", data.vendor_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const AdminProductAction = z.object({
  product_id: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
  reason: z.string().max(500).optional(),
});

export const adminProductAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AdminProductAction.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await context.supabase.from("products").update({
      status: data.action === "approve" ? "approved" : "rejected",
      rejection_reason: data.action === "reject" ? (data.reason ?? "Rejected by admin") : null,
    }).eq("id", data.product_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const AdminPaymentAction = z.object({
  payment_id: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
  notes: z.string().max(500).optional(),
});

export const adminPaymentAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AdminPaymentAction.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    const { data: payment, error: pErr } = await context.supabase
      .from("payments").select("vendor_id, plan").eq("id", data.payment_id).single();
    if (pErr) throw new Error(pErr.message);

    if (data.action === "approve") {
      const until = new Date();
      until.setMonth(until.getMonth() + 1);
      const { error: vErr } = await context.supabase.from("vendors").update({
        plan: payment.plan,
        plan_active_until: until.toISOString(),
      }).eq("id", payment.vendor_id);
      if (vErr) throw new Error(vErr.message);
    }

    const { error } = await context.supabase.from("payments").update({
      status: data.action === "approve" ? "approved" : "rejected",
      admin_notes: data.notes ?? null,
      approved_at: data.action === "approve" ? new Date().toISOString() : null,
    }).eq("id", data.payment_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Promote a user to admin (callable by existing admin OR by anyone if there are zero admins — bootstrap).
const PromoteInput = z.object({ email: z.string().email() });
export const promoteToAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PromoteInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count: adminCount } = await supabaseAdmin
      .from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin");

    if ((adminCount ?? 0) > 0) {
      const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
      if (!isAdmin) throw new Error("Only an existing admin can promote new admins.");
    }

    // Find user by email (admin API)
    const { data: list, error: lErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (lErr) throw new Error(lErr.message);
    const target = list.users.find((u) => (u.email ?? "").toLowerCase() === data.email.toLowerCase());
    if (!target) throw new Error("No user found with that email. They must register first.");

    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: target.id, role: "admin" });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true, userId: target.id };
  });
