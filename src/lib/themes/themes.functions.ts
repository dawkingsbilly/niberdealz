import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { THEMES_BY_KEY } from "./catalog";

export type ActiveTheme = {
  id: string;
  theme_key: string;
  start_at: string;
  end_at: string;
  note: string | null;
} | null;

export type ScheduledTheme = {
  id: string;
  theme_key: string;
  start_at: string;
  end_at: string;
  note: string | null;
  created_at: string;
};

/** Public: any visitor can read the currently active theme. */
export const getActiveTheme = createServerFn({ method: "GET" }).handler(
  async (): Promise<ActiveTheme> => {
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("site_themes")
      .select("id, theme_key, start_at, end_at, note")
      .lte("start_at", nowIso)
      .gte("end_at", nowIso)
      .order("start_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data as ActiveTheme;
  },
);

/** Owner: list all scheduled themes (past, current, future). */
export const listScheduledThemes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ScheduledTheme[]> => {
    const { data: isOwner, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "owner",
    });
    if (roleErr) throw roleErr;
    if (!isOwner) throw new Error("Forbidden");

    const { data, error } = await context.supabase
      .from("site_themes")
      .select("id, theme_key, start_at, end_at, note, created_at")
      .order("start_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []) as ScheduledTheme[];
  });

const ActivateInput = z.object({
  theme_key: z.string().trim().min(1).max(60),
  start_at: z.string().trim().min(10),
  end_at: z.string().trim().min(10),
  note: z.string().trim().max(280).optional().nullable(),
});

/** Owner: schedule (or activate immediately) a theme. */
export const activateTheme = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ActivateInput.parse(d))
  .handler(async ({ data, context }) => {
    if (!THEMES_BY_KEY[data.theme_key]) {
      throw new Error(`Unknown theme: ${data.theme_key}`);
    }
    const start = new Date(data.start_at);
    const end = new Date(data.end_at);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new Error("Invalid start or end date");
    }
    if (end.getTime() <= start.getTime()) {
      throw new Error("End must be after start");
    }

    const { data: isOwner, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "owner",
    });
    if (roleErr) throw roleErr;
    if (!isOwner) throw new Error("Forbidden");

    const { error } = await context.supabase.from("site_themes").insert({
      theme_key: data.theme_key,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      note: data.note ?? null,
      activated_by: context.userId,
    });
    if (error) throw error;
    return { ok: true };
  });

const DeleteInput = z.object({ id: z.string().uuid() });

/** Owner: delete a scheduled theme (past or future). Ends the theme early if active. */
export const deleteScheduledTheme = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DeleteInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isOwner, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "owner",
    });
    if (roleErr) throw roleErr;
    if (!isOwner) throw new Error("Forbidden");

    const { error } = await context.supabase.from("site_themes").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
