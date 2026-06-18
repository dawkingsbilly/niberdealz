import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowRight, Search, MessageCircle, GraduationCap, Tag, ShieldCheck, Truck, BadgeCheck, Users, Sparkles, Store, Handshake } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { ProductCard, type ProductCardData } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORIES, SITE_NAME, CONTACT_PHONE, CONTACT_EMAIL } from "@/lib/constants";

import img1 from "@/assets/IMG-20260604-WA0140.jpg.asset.json";
import img2 from "@/assets/IMG-20260606-WA0028.jpg.asset.json";
import img3 from "@/assets/IMG-20260606-WA0041.jpg.asset.json";
import img4 from "@/assets/IMG-20260606-WA0047.jpg.asset.json";
import img5 from "@/assets/IMG-20260606-WA0082.jpg.asset.json";
import img6 from "@/assets/IMG-20260608-WA0019.jpg.asset.json";
import img7 from "@/assets/IMG-20260608-WA0020.jpg.asset.json";

const SLIDES = [img1, img2, img3, img4, img5, img6, img7];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Niberdealz — Student marketplace, buy and sell on WhatsApp" },
      { name: "description", content: "The free student marketplace. Find sneakers, textbooks, electronics and more from students near you. Connect on WhatsApp." },
    ],
  }),
  component: Home,
});

function Home() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("");
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 4000);
    return () => clearInterval(t);
  }, []);

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

      {/* Hero slideshow */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          {SLIDES.map((img, i) => (
            <div
              key={i}
              className="absolute inset-0 transition-opacity duration-1000"
              style={{ opacity: i === slide ? 1 : 0, backgroundImage: `url(${img.url})`, backgroundSize: "cover", backgroundPosition: "center" }}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
        </div>
        <div className="relative container mx-auto px-4 py-20 md:py-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur border border-white/20 px-3 py-1 text-xs font-medium text-white/90 mb-5">
            <GraduationCap className="h-3.5 w-3.5" /> The student marketplace
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold text-white max-w-3xl mx-auto leading-tight">
            Buy and sell with students.<br />
            <span className="text-[color:var(--accent)]">Connect on WhatsApp.</span>
          </h1>
          <p className="mt-5 text-lg text-white/85 max-w-xl mx-auto">
            Sneakers, textbooks, electronics, furniture — all from students near you. Free to list. Free to browse.
          </p>

          <div className="mt-8 max-w-xl mx-auto flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search sneakers, textbooks, laptops…"
                className="h-12 pl-10 bg-white text-foreground"
              />
            </div>
            <Button asChild size="lg" className="h-12 bg-[var(--deal)] hover:bg-[var(--deal)]/90 text-[color:var(--deal-foreground)] shadow-[var(--shadow-deal)]">
              <Link to="/auth" search={{ mode: "register" }}>Sell something <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>

          {/* Slide dots */}
          <div className="mt-8 flex justify-center gap-1.5">
            {SLIDES.map((_, i) => (
              <button key={i} onClick={() => setSlide(i)} aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === slide ? "w-8 bg-white" : "w-1.5 bg-white/40"}`} />
            ))}
          </div>
        </div>
      </section>

      {/* Category chips */}
      <section className="border-b border-border bg-card/60">
        <div className="container mx-auto px-4 py-4 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setCategory("")}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border transition ${category === "" ? "bg-foreground text-background border-foreground" : "bg-background border-border hover:bg-muted"}`}
          >All</button>
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border transition ${category === c ? "bg-foreground text-background border-foreground" : "bg-background border-border hover:bg-muted"}`}
            >{c}</button>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-10 flex-1">
        <div className="mb-6">
          <h2 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2"><Tag className="h-6 w-6 text-[color:var(--deal)]" />Fresh listings</h2>
          <p className="text-muted-foreground text-sm">Latest from students near you.</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (<div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border p-16 text-center">
            <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-display text-xl font-semibold mb-2">No listings yet</h3>
            <p className="text-muted-foreground mb-4">Be the first student to post on {SITE_NAME}.</p>
            <Button asChild className="bg-[var(--deal)] hover:bg-[var(--deal)]/90 text-[color:var(--deal-foreground)]">
              <Link to="/auth" search={{ mode: "register" }}>Open your store</Link>
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
