import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "search_products",
  title: "Search products",
  description:
    "Search public marketplace products by keyword, category, or city. Returns up to 20 approved, in-stock listings.",
  inputSchema: {
    query: z.string().trim().max(120).optional().describe("Free-text search on title/description."),
    category: z.string().trim().max(60).optional().describe("Category filter (e.g. Clothing, Electronics)."),
    city: z.string().trim().max(80).optional().describe("Filter to a specific city."),
    limit: z.number().int().min(1).max(20).optional().describe("Max results (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, category, city, limit }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    let q = supabase
      .from("products")
      .select("id,title,description,price_zar,category,image_url,vendor_id,vendors!inner(business_name,city)")
      .eq("status", "approved")
      .eq("is_sold", false)
      .limit(limit ?? 10);
    if (query) {
      // Escape PostgREST-reserved characters to prevent .or() filter injection.
      // Reserved in filter values: , . ( ) : and % (ilike wildcard).
      const safe = query.replace(/[,.():%*\\]/g, " ").trim();
      if (safe) {
        const pattern = `%${safe}%`;
        q = q.or(`title.ilike.${pattern},description.ilike.${pattern}`);
      }
    }
    if (category) q = q.eq("category", category);
    if (city) q = q.eq("vendors.city", city);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { products: data ?? [] },
    };
  },
});
