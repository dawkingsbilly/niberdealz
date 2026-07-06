import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "list_stores",
  title: "List stores",
  description: "List approved marketplace stores, optionally filtered by city or category.",
  inputSchema: {
    city: z.string().trim().max(80).optional(),
    category: z.string().trim().max(60).optional(),
    limit: z.number().int().min(1).max(50).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ city, category, limit }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    let q = supabase
      .from("vendors")
      .select("id,business_name,city,category,business_description,logo_url,is_official,verified,website_url")
      .eq("status", "approved")
      .limit(limit ?? 20);
    if (city) q = q.eq("city", city);
    if (category) q = q.eq("category", category);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { stores: data ?? [] },
    };
  },
});
