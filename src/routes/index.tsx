import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { ArrowRight, Search, MessageCircle, Tag, ShieldCheck, Truck, BadgeCheck, Users, Sparkles, Store, Handshake, Zap, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isPromoActive } from "@/lib/promotions";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { ProductCard, type ProductCardData } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORIES, SITE_NAME, CONTACT_EMAIL } from "@/lib/constants";


import shoe1 from "@/assets/IMG-20260604-WA0140.jpg.asset.json";
import shoe2 from "@/assets/IMG-20260606-WA0028.jpg.asset.json";
import shoe3 from "@/assets/IMG-20260606-WA0041.jpg.asset.json";
import shoe4 from "@/assets/IMG-20260606-WA0047.jpg.asset.json";
import shoe5 from "@/assets/IMG-20260606-WA0082.jpg.asset.json";
import shoe6 from "@/assets/IMG-20260608-WA0019.jpg.asset.json";
import shoe7 from "@/assets/IMG-20260608-WA0020.jpg.asset.json";

/** Real product photos from stores on the marketplace (used until live listings load). */
const FALLBACK_SLIDES = [shoe1, shoe2, shoe3, shoe4, shoe5, shoe6, shoe7];
const img1 = shoe1;


export const Route = createFileRoute("/")({
  validateSearch: z.object({ q: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Niberdealz | Marketplace on WhatsApp" },
      { name: "description", content: "Niberdealz is the marketplace where you buy and sell sneakers, clothing, textbooks, electronics and more with verified sellers near you, direct on WhatsApp." },
      { property: "og:title", content: "Niberdealz | Marketplace on WhatsApp" },
      { property: "og:description", content: "Buy and sell sneakers, clothing, textbooks and electronics with verified sellers near you, direct on WhatsApp." },

      { property: "og:url", content: "https://niberdealz.lovable.app/" },
    ],
    links: [
      { rel: "canonical", href: "https://niberdealz.lovable.app/" },
      { rel: "preload", as: "image", href: img1.url, fetchpriority: "high" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Niberdealz",
          url: "https://niberdealz.lovable.app/",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://niberdealz.lovable.app/?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Niberdealz",
          alternateName: ["NIBERDEALZ", "Niber Dealz", "Niber-Dealz"],
          url: "https://niberdealz.lovable.app/",
          logo: "https://niberdealz.lovable.app/favicon.ico",
          description: "South African student marketplace connecting verified vendors and buyers on WhatsApp.",
          areaServed: "ZA",
        }),
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { q: qParam } = Route.useSearch();
  const [q, setQ] = useState(qParam ?? "");
  const [category, setCategory] = useState<string>("");
  const [slide, setSlide] = useState(0);

  useEffect(() => { setQ(qParam ?? ""); }, [qParam]);




  const { data, isLoading } = useQuery({
    queryKey: ["homefeed", q, category],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id, title, price_zar, category, image_url, stock, is_sold, vendor_id, vendors!inner(business_name, city, verified, is_official, status, plan, plan_active_until)")
        .eq("status", "approved")
        .eq("vendors.status", "approved")
        .order("created_at", { ascending: false })
        .limit(96);
      if (q.trim()) query = query.ilike("title", `%${q.trim()}%`);
      if (category) query = query.eq("category", category);

      // Load current user's profile city for location-based sort (best-effort)
      const { data: userData } = await supabase.auth.getUser();
      let myCity = "";
      if (userData.user) {
        const { data: prof } = await supabase.from("profiles").select("city").eq("id", userData.user.id).maybeSingle();
        myCity = ((prof as any)?.city ?? "").toLowerCase().trim();
      }

      const [{ data: products, error }, activeSales, reviews] = await Promise.all([
        query,
        (supabase.from("sale_campaigns" as any) as any)
          .select("id, discount_pct, starts_at, ends_at")
          .lte("starts_at", new Date().toISOString())
          .gte("ends_at", new Date().toISOString()),
        supabase.from("product_reviews").select("product_id, rating"),
      ]);
      if (error) throw error;

      const activeCampaignIds: string[] = (activeSales.data ?? []).map((c: any) => c.id);
      const bestDiscountByCampaign = new Map<string, number>(
        (activeSales.data ?? []).map((c: any) => [c.id, c.discount_pct as number])
      );

      let joinedByVendor = new Map<string, number>();
      if (activeCampaignIds.length > 0) {
        const { data: parts } = await (supabase.from("sale_participants" as any) as any)
          .select("vendor_id, campaign_id, status")
          .in("campaign_id", activeCampaignIds)
          .eq("status", "joined");
        (parts ?? []).forEach((p: any) => {
          const d = bestDiscountByCampaign.get(p.campaign_id) ?? 0;
          const prev = joinedByVendor.get(p.vendor_id) ?? 0;
          if (d > prev) joinedByVendor.set(p.vendor_id, d);
        });
      }

      const agg = new Map<string, { sum: number; n: number }>();
      (reviews.data ?? []).forEach((r: any) => {
        const cur = agg.get(r.product_id) ?? { sum: 0, n: 0 };
        cur.sum += r.rating; cur.n += 1;
        agg.set(r.product_id, cur);
      });

      const enriched = (products ?? []).map((p: any) => {
        const discount = joinedByVendor.get(p.vendor_id) ?? 0;
        const a = agg.get(p.id);
        const vCity = (p.vendors?.city ?? "").toLowerCase().trim();
        const nearby = !!myCity && !!vCity && (vCity === myCity || vCity.includes(myCity) || myCity.includes(vCity));
        return {
          ...p,
          discount_pct: discount || null,
          avg_rating: a ? a.sum / a.n : null,
          review_count: a?.n ?? 0,
          _nearby: nearby,
        };
      }) as (ProductCardData & { vendor_id: string; _nearby?: boolean })[];

      return { list: enriched, myCity };
    },
  });

  const products = useMemo(() => {
    const list = data?.list ?? [];
    // Ordering: nearby first, then on sale, then boosted stores, then NIBER-DEALZ STORE, then everyone else
    return [...list].sort((a: any, b: any) => {
      const aN = a._nearby ? 1 : 0;
      const bN = b._nearby ? 1 : 0;
      if (aN !== bN) return bN - aN;
      const aSale = a.discount_pct ? 1 : 0;
      const bSale = b.discount_pct ? 1 : 0;
      if (aSale !== bSale) return bSale - aSale;
      const aBoost = isPromoActive(a.vendors) ? 1 : 0;
      const bBoost = isPromoActive(b.vendors) ? 1 : 0;
      if (aBoost !== bBoost) return bBoost - aBoost;
      const aOff = a.vendors?.is_official ? 1 : 0;
      const bOff = b.vendors?.is_official ? 1 : 0;
      if (aOff !== bOff) return bOff - aOff;
      return 0;
    });
  }, [data]);

  const myCity = data?.myCity ?? "";

  const flashSales = useMemo(() => products.filter((p: any) => p.discount_pct).slice(0, 8), [products]);

  const { data: stores = [] } = useQuery({
    queryKey: ["home-stores"],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("vendors")
        .select("id, business_name, city, category, logo_url, verified, is_official, plan, plan_active_until")
        .eq("status", "approved")
        .order("is_official", { ascending: false })
        .limit(12);
      return rows ?? [];
    },
  });

  // Hero slides use real photos of products listed on the marketplace.
  const SLIDES = useMemo(() => {
    const urls = (products as any[]).map((p) => p.image_url).filter(Boolean) as string[];
    const uniq = Array.from(new Set(urls)).slice(0, 7);
    return uniq.length >= 3 ? uniq : FALLBACK_SLIDES.map((a) => a.url);
  }, [products]);

  useEffect(() => {
    setSlide(0);
    const t = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 4000);
    return () => clearInterval(t);
  }, [SLIDES]);


  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <section className="container mx-auto px-4 pt-4 pb-6">
        <div className="relative overflow-hidden rounded-2xl border border-border aspect-video">
          {SLIDES.map((src, i) => (
            i === 0 ? (
              <img
                key={src}
                src={src}
                alt="Product listed on Niberdealz"
                width={1600}
                height={900}
                fetchPriority="high"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000"
                style={{ opacity: i === slide ? 1 : 0 }}
              />
            ) : (
              <div
                key={src}
                className="absolute inset-0 transition-opacity duration-1000"
                style={{ opacity: i === slide ? 1 : 0, backgroundImage: `url(${src})`, backgroundSize: "cover", backgroundPosition: "center" }}
              />
            )
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 md:p-8">
            <h1 className="font-display text-2xl md:text-4xl font-bold text-white">
              Welcome to {SITE_NAME}. Shop now.
            </h1>
            <div className="mt-3 flex gap-1.5">
              {SLIDES.map((_, i) => (
                <button key={i} onClick={() => setSlide(i)} aria-label={`Slide ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${i === slide ? "w-8 bg-white" : "w-1.5 bg-white/50"}`} />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 max-w-xl relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search every store on Niberdealz"
            aria-label="Search every store on Niberdealz"
            className="h-12 pl-10"
          />
        </div>
      </section>


      {flashSales.length > 0 && (
        <section className="container mx-auto px-4 py-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
                <Zap className="h-6 w-6 text-[color:var(--deal)]" />Flash sales
              </h2>
              <p className="text-muted-foreground text-sm">Live discounts from stores running a sale right now.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {flashSales.map((p: any) => <ProductCard key={p.id} p={p} />)}
          </div>
        </section>
      )}


      <section className="border-y border-border bg-card/60">
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

        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2"><Tag className="h-6 w-6 text-[color:var(--deal)]" />Fresh listings</h2>
            <p className="text-muted-foreground text-sm">{myCity ? <>Near <strong className="text-foreground">{myCity}</strong> first, then sales, then rest.</> : "Sign in and add your city to see listings near you first."}</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link to="/auth" search={{ mode: "register" }}>Become a seller <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
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

      <section className="bg-secondary/40 border-t border-border">
        <div className="container mx-auto px-4 py-14">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[color:var(--deal)] mb-2"><Sparkles className="h-3.5 w-3.5" />How it works</div>
            <h2 className="font-display text-3xl md:text-4xl font-bold">Buy or sell in three steps</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { Icon: Search, t: "1. Browse", s: "Search sneakers, textbooks, electronics and more from verified students." },
              { Icon: MessageCircle, t: "2. Tap WhatsApp", s: "Message the seller directly. Agree on a campus meet-up." },
              { Icon: Handshake, t: "3. Inspect & pay", s: "Meet in public, check the item, pay only when you're happy." },
            ].map(({ Icon, t, s }) => (
              <div key={t} className="rounded-2xl bg-card border border-border p-6 shadow-[var(--shadow-card)]">
                <div className="h-11 w-11 rounded-xl bg-[var(--deal)]/10 text-[color:var(--deal)] flex items-center justify-center mb-3"><Icon className="h-5 w-5" /></div>
                <h3 className="font-display text-lg font-bold">{t}</h3>
                <p className="text-sm text-muted-foreground mt-1">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-14">
        <div className="rounded-3xl bg-gradient-to-br from-foreground to-foreground/80 text-background p-8 md:p-12 grid md:grid-cols-[1fr_auto] items-center gap-6 shadow-[var(--shadow-card)]">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[color:var(--accent)] mb-2"><Store className="h-3.5 w-3.5" />For sellers</div>
            <h2 className="font-display text-2xl md:text-4xl font-bold">Open your free store today.</h2>
            <p className="text-background/70 mt-2 max-w-xl">No listing fees, no commission, no waiting. List your items in minutes and meet buyers on campus.</p>
            <div className="mt-3 text-xs text-background/60">Questions? Email {CONTACT_EMAIL} or visit our Contact page.</div>
          </div>
          <Button asChild size="lg" className="bg-[var(--deal)] hover:bg-[var(--deal)]/90 text-[color:var(--deal-foreground)] shadow-[var(--shadow-deal)]">
            <Link to="/auth" search={{ mode: "register" }}>Start selling free <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      <section className="border-t border-border bg-background">
        <div className="container mx-auto px-4 py-10 grid grid-cols-3 gap-4 text-center">
          {[
            { Icon: Users, n: "Students first", s: "Built for campus" },
            { Icon: BadgeCheck, n: "0% fees", s: "Free to list and browse" },
            { Icon: Truck, n: "Hand-to-hand", s: "Meet, inspect, pay" },
          ].map(({ Icon, n, s }) => (
            <div key={n} className="flex flex-col items-center">
              <Icon className="h-6 w-6 text-[color:var(--deal)] mb-1.5" />
              <div className="font-display text-lg font-bold">{n}</div>
              <div className="text-xs text-muted-foreground">{s}</div>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
