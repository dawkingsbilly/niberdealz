import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  MIN_POINTS_TO_WITHDRAW,
  POINT_VALUE_ZAR,
  POINTS_PER_SIGNUP,
} from "@/lib/affiliate";

function makeCode(seed: string) {
  const base = seed.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 5) || "NIBER";
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}${rand}`;
}

/** Fetch (or create) the signed in user's affiliate account plus all dashboard data. */
export const getMyAffiliate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db: any = supabaseAdmin;

    let { data: account } = await db.from("affiliates").select("*").eq("user_id", context.userId).maybeSingle();

    if (!account) {
      const { data: profile } = await db.from("profiles").select("full_name").eq("id", context.userId).maybeSingle();
      const name = profile?.full_name ?? "";
      let created = null;
      for (let i = 0; i < 5 && !created; i++) {
        const { data, error } = await db
          .from("affiliates")
          .insert({ user_id: context.userId, code: makeCode(name || "NIBER"), display_name: name })
          .select("*")
          .maybeSingle();
        if (!error) created = data;
      }
      if (!created) throw new Error("Could not create your affiliate account. Please try again.");
      account = created;
    }

    const [{ data: referrals }, { data: ledger }, { data: payouts }, { data: orders }] = await Promise.all([
      db.from("affiliate_referrals").select("*").eq("affiliate_id", account.id).order("created_at", { ascending: false }),
      db.from("affiliate_points_ledger").select("*").eq("affiliate_id", account.id).order("created_at", { ascending: false }).limit(100),
      db.from("affiliate_payouts").select("*").eq("affiliate_id", account.id).order("created_at", { ascending: false }),
      db.from("orders").select("id, reference, total_zar, status, created_at").eq("affiliate_id", account.id).order("created_at", { ascending: false }).limit(50),
    ]);

    const list = ledger ?? [];
    const lifetimePoints = list.filter((l: any) => l.points > 0).reduce((s: number, l: any) => s + l.points, 0);

    return {
      account,
      referrals: referrals ?? [],
      ledger: list,
      payouts: payouts ?? [],
      orders: orders ?? [],
      lifetimePoints,
      availableZar: Math.round(account.points * POINT_VALUE_ZAR * 100) / 100,
    };
  });

/** Attribute a brand new member to the affiliate whose link or coupon they used. */
export const attachReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string; source: "link" | "coupon" }) =>
    z.object({ code: z.string().trim().min(3).max(20), source: z.enum(["link", "coupon"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db: any = supabaseAdmin;

    const { data: existing } = await db.from("affiliate_referrals").select("id").eq("referred_user_id", context.userId).maybeSingle();
    if (existing) return { ok: true, already: true };

    const { data: affiliate } = await db.from("affiliates").select("id, user_id, points").eq("code", data.code.toUpperCase()).maybeSingle();
    if (!affiliate) return { ok: false, reason: "unknown_code" as const };
    if (affiliate.user_id === context.userId) return { ok: false, reason: "own_code" as const };

    await db.from("affiliate_referrals").insert({
      affiliate_id: affiliate.id,
      referred_user_id: context.userId,
      source: data.source,
      points_awarded: POINTS_PER_SIGNUP,
    });
    await db.from("affiliate_points_ledger").insert({
      affiliate_id: affiliate.id,
      points: POINTS_PER_SIGNUP,
      kind: "signup",
      note: `New member joined with your ${data.source === "coupon" ? "coupon code" : "affiliate link"}`,
    });
    await db.from("affiliates").update({ points: affiliate.points + POINTS_PER_SIGNUP }).eq("id", affiliate.id);

    return { ok: true, already: false };
  });

/** Request a cash withdrawal against available points. */
export const requestAffiliatePayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { points: number; method: string; details: string }) =>
    z.object({
      points: z.number().int().min(MIN_POINTS_TO_WITHDRAW),
      method: z.string().trim().min(2).max(60),
      details: z.string().trim().min(3).max(300),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db: any = supabaseAdmin;

    const { data: account } = await db.from("affiliates").select("*").eq("user_id", context.userId).maybeSingle();
    if (!account) throw new Error("You do not have an affiliate account yet.");
    if (account.points < data.points) throw new Error("You do not have that many points available.");

    const amount = Math.round(data.points * POINT_VALUE_ZAR * 100) / 100;

    await db.from("affiliate_payouts").insert({
      affiliate_id: account.id,
      points_spent: data.points,
      amount_zar: amount,
      method: data.method,
      details: data.details,
    });
    await db.from("affiliates").update({
      points: account.points - data.points,
      points_redeemed: account.points_redeemed + data.points,
    }).eq("id", account.id);
    await db.from("affiliate_points_ledger").insert({
      affiliate_id: account.id,
      points: -data.points,
      kind: "payout_request",
      note: `Withdrawal requested: R${amount}`,
    });

    return { ok: true, amount_zar: amount };
  });

/** CEO / admin: list every payout request. */
export const staffListPayouts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const { data: isOwner } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "owner" });
    if (!isAdmin && !isOwner) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db: any = supabaseAdmin;
    const { data } = await db
      .from("affiliate_payouts")
      .select("*, affiliates(code, display_name, points, user_id)")
      .order("created_at", { ascending: false });
    return data ?? [];
  });

/** CEO / admin: approve or reject a payout. */
export const setPayoutStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { payout_id: string; status: "paid" | "rejected" }) =>
    z.object({ payout_id: z.string().uuid(), status: z.enum(["paid", "rejected"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const { data: isOwner } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "owner" });
    if (!isAdmin && !isOwner) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db: any = supabaseAdmin;

    const { data: payout } = await db.from("affiliate_payouts").select("*").eq("id", data.payout_id).maybeSingle();
    if (!payout) throw new Error("Payout not found");
    if (payout.status !== "pending") throw new Error("This request was already handled.");

    if (data.status === "rejected") {
      const { data: account } = await db.from("affiliates").select("points, points_redeemed").eq("id", payout.affiliate_id).maybeSingle();
      if (account) {
        await db.from("affiliates").update({
          points: account.points + payout.points_spent,
          points_redeemed: Math.max(0, account.points_redeemed - payout.points_spent),
        }).eq("id", payout.affiliate_id);
        await db.from("affiliate_points_ledger").insert({
          affiliate_id: payout.affiliate_id,
          points: payout.points_spent,
          kind: "payout_reversed",
          note: "Withdrawal request declined, points returned",
        });
      }
    } else {
      const { data: account } = await db.from("affiliates").select("paid_out_zar").eq("id", payout.affiliate_id).maybeSingle();
      await db.from("affiliates").update({
        paid_out_zar: Number(account?.paid_out_zar ?? 0) + Number(payout.amount_zar),
      }).eq("id", payout.affiliate_id);
    }

    await db.from("affiliate_payouts").update({ status: data.status }).eq("id", data.payout_id);
    return { ok: true };
  });
