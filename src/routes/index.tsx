import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Sparkles, ShieldCheck, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { ProductCard, type ProductCardData } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORIES, SITE_NAME } from "@/lib/constants";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Niber-Dealz — Shop direct from South African vendors" },
      { name: "description", content: "Browse thousands of products from verified SA vendors. Buy direct on WhatsApp. No accounts, no fees, no middleman." },
    ],
  }),
  component: Home,
});

function Home() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("");

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", "approved", q, category],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id, title, price_zar, category, image_url, vendors(business_name, city)")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(48);
      if (q.trim()) query = query.ilike("title", `%${q.trim()}%`);
      if (category) query = query.eq("category", category);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as ProductCardData[];
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[var(--gradient-hero)]" />
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, oklch(0.7 0.22 32 / 0.4), transparent 40%), radial-gradient(circle at 80% 60%, oklch(0.85 0.16 85 / 0.3), transparent 45%)" }} />
        <div className="relative container mx-auto px-4 py-16 md:py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur border border-white/20 px-3 py-1 text-xs font-medium text-white/90 mb-6">
            <Sparkles className="h-3.5 w-3.5 text-[color:var(--accent)]" /> Verified South African vendors
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold text-white max-w-3xl mx-auto leading-tight">
            {SITE_NAME}<span className="text-[color:var(--accent)]">.</span><br />
            Buy direct from SA shops.
          </h1>
          <p className="mt-5 text-lg text-white/80 max-w-xl mx-auto">
            Every vendor is AI-screened and admin-approved. Tap a product, message the seller on WhatsApp, done. No buyer account needed.
          </p>

          <div className="mt-8 max-w-xl mx-auto flex flex-col sm:flex-row gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products, shops, anything…"
              className="h-12 bg-white text-foreground"
            />
            <Button asChild size="lg" className="h-12 bg-[var(--deal)] hover:bg-[var(--deal)]/90 text-[color:var(--deal-foreground)] shadow-[var(--shadow-deal)]">
              <Link to="/pricing">Sell on {SITE_NAME} <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-4 max-w-xl mx-auto text-white/80 text-sm">
            <div className="flex flex-col items-center gap-1.5"><ShieldCheck className="h-5 w-5 text-[color:var(--accent)]" /><span>AI-vetted</span></div>
            <div className="flex flex-col items-center gap-1.5"><MessageCircle className="h-5 w-5 text-[color:var(--accent)]" /><span>WhatsApp checkout</span></div>
            <div className="flex flex-col items-center gap-1.5"><Sparkles className="h-5 w-5 text-[color:var(--accent)]" /><span>No buyer signup</span></div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10 flex-1">
        <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-bold">Fresh from our vendors</h2>
            <p className="text-muted-foreground text-sm">Latest approved listings across SA.</p>
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (<div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border p-16 text-center">
            <h3 className="font-display text-xl font-semibold mb-2">No products yet</h3>
            <p className="text-muted-foreground mb-4">Be one of the first vendors on {SITE_NAME}.</p>
            <Button asChild className="bg-[var(--deal)] hover:bg-[var(--deal)]/90 text-[color:var(--deal-foreground)]">
              <Link to="/auth" search={{ mode: "register" }}>Open your shop</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
