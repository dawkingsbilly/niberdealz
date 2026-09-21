import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const productCopyInput = z.object({
  title: z.string().trim().min(2).max(180),
  category: z.string().trim().min(2).max(100),
  brand: z.string().trim().max(100).optional().default(""),
  description: z.string().trim().max(8000).optional().default(""),
});

const aiOutput = z.object({
  description: z.string().trim().min(10).max(1600),
  tags: z.array(z.string().trim().min(1).max(40)).max(8),
});

async function requireOwner(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "owner")
    .maybeSingle();

  if (error || !data) throw new Error("Access denied.");
}

function readAiReply(payload: unknown) {
  const content = (payload as { choices?: Array<{ message?: { content?: unknown } }> })
    ?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("The AI provider returned an invalid response.");
  const json = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  return aiOutput.parse(JSON.parse(json));
}

/**
 * Uses a server-only, OpenAI-compatible endpoint. Configure AI_API_URL,
 * AI_API_KEY and AI_MODEL in the hosting environment; never use VITE_ names.
 */
export const suggestProductCopy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => productCopyInput.parse(data))
  .handler(async ({ data, context }) => {
    await requireOwner(context.userId);

    const endpoint = process.env.AI_API_URL;
    const apiKey = process.env.AI_API_KEY;
    const model = process.env.AI_MODEL;
    const allowedHosts = process.env.AI_ALLOWED_HOSTS;
    if (!endpoint || !apiKey || !model || !allowedHosts) {
      throw new Error("AI is not configured yet. Add the server-only AI settings in Vercel first.");
    }

    let url: URL;
    try {
      url = new URL(endpoint);
    } catch {
      throw new Error("AI_API_URL must be a valid HTTPS address.");
    }
    if (url.protocol !== "https:") throw new Error("AI_API_URL must use HTTPS.");
    const host = url.hostname.toLowerCase();
    const permittedHosts = allowedHosts
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    if (!permittedHosts.includes(host))
      throw new Error("AI_API_URL host is not included in AI_ALLOWED_HOSTS.");
    if (
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host === "0.0.0.0" ||
      host === "::1" ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) {
      throw new Error("AI_API_URL must use a public HTTPS host.");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.5,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You write accurate South African retail product copy for NiberDealz. Return JSON only: {description:string,tags:string[]}. Do not invent materials, sizing, availability, discounts, guarantees, delivery promises, prices or brand claims. Keep the description concise, helpful and under 1600 characters. Return 3 to 8 simple tags.",
            },
            {
              role: "user",
              content: JSON.stringify({
                title: data.title,
                category: data.category,
                brand: data.brand || undefined,
                existing_description: data.description || undefined,
              }),
            },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error("The AI provider could not complete the request.");
      const contentLength = Number(response.headers.get("content-length") ?? "0");
      if (Number.isFinite(contentLength) && contentLength > 64_000)
        throw new Error("The AI provider returned an unexpectedly large response.");
      const rawReply = await response.text();
      if (rawReply.length > 64_000)
        throw new Error("The AI provider returned an unexpectedly large response.");
      return readAiReply(JSON.parse(rawReply));
    } catch (error) {
      if (error instanceof z.ZodError)
        throw new Error("The AI response did not have the required product-copy format.");
      if (error instanceof Error && error.name === "AbortError")
        throw new Error("The AI provider took too long to respond. Please try again.");
      throw error;
    } finally {
      clearTimeout(timer);
    }
  });
