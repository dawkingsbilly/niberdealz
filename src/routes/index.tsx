import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Menu, Search, ShoppingBag, ShoppingCart, UserRound, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { SiteFooter } from "@/components/site-header";
import { ProductCard, type ProductCardData } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/lib/cart";

type CatalogProduct = Pick<
  Database["public"]["Tables"]["products"]["Row"],
  | "id"
  | "title"
  | "price_zar"
  | "sale_price_zar"
  | "category"
  | "image_url"
  | "stock"
  | "is_sold"
  | "is_featured"
  | "is_new_arrival"
  | "is_best_seller"
  | "tags"
  | "description"
>;

type StoreCategory = Pick<Database["public"]["Tables"]["store_categories"]["Row"], "name">;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NiberDealz | New season, your way" },
      {
        name: "description",
        content:
          "Discover the new NiberDealz collection. Thoughtfully selected pieces, delivered directly by us.",
      },
      { property: "og:title", content: "NiberDealz | New season, your way" },
      { property: "og:description", content: "Discover your next favourite with NiberDealz." },
    ],
    links: [{ rel: "canonical", href: "https://www.niberdealz.co.za/" }],
  }),
  component: Home,
});
function Header() {
  const [open, setOpen] = useState(false);
  const { count } = useCart();
  return (
    <>
      <div className="border-b bg-background py-2 text-center text-[9px] font-semibold uppercase tracking-[.13em] sm:text-[10px]">
        Free delivery on orders over R1,000{" "}
        <a href="#shop" className="ml-1 underline underline-offset-2">
          Shop now
        </a>
      </div>
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => setOpen(true)}
            className="grid h-10 w-10 place-items-center"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link
            to="/"
            className="absolute left-1/2 -translate-x-1/2 font-display text-2xl font-black tracking-[-.11em] sm:text-3xl"
          >
            NIBERDEALZ
          </Link>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="icon" aria-label="Search">
              <a href="#shop">
                <Search className="h-5 w-5" />
              </a>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label="Your account"
              className="hidden sm:inline-flex"
            >
              <Link to="/auth" search={{ mode: "login" }}>
                <UserRound className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon" aria-label="Cart" className="relative">
              <Link to="/cart">
                <ShoppingBag className="h-5 w-5" />
                {count > 0 && (
                  <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-foreground px-1 text-[9px] font-bold text-background">
                    {count}
                  </span>
                )}
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <div
        className={`fixed inset-0 z-50 transition ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      >
        <button
          onClick={() => setOpen(false)}
          aria-label="Close menu"
          className={`absolute inset-0 bg-black/25 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        />
        <aside
          className={`absolute left-0 top-0 h-full w-[84%] max-w-sm bg-background p-6 transition-transform ${open ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex items-center justify-between">
            <span className="font-display text-xl font-black tracking-[-.1em]">NIBERDEALZ</span>
            <button onClick={() => setOpen(false)} aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="mt-12 flex flex-col border-t">
            <a
              onClick={() => setOpen(false)}
              href="#shop"
              className="border-b py-4 text-lg font-semibold"
            >
              Shop all
            </a>
            <Link
              onClick={() => setOpen(false)}
              to="/orders"
              className="border-b py-4 text-lg font-semibold"
            >
              Track your order
            </Link>
            <Link
              onClick={() => setOpen(false)}
              to="/contact"
              className="border-b py-4 text-lg font-semibold"
            >
              Contact us
            </Link>
            <Link
              onClick={() => setOpen(false)}
              to="/auth"
              search={{ mode: "login" }}
              className="border-b py-4 text-lg font-semibold"
            >
              Sign in
            </Link>
          </nav>
        </aside>
      </div>
    </>
  );
}
function Home() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["niberdealz-catalog", q, category],
    queryFn: async () => {
      const query = supabase
        .from("products")
        .select(
          "id,title,price_zar,sale_price_zar,category,image_url,stock,is_sold,is_featured,is_new_arrival,is_best_seller,tags,description",
        )
        .eq("status", "approved")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(96);
      const { data: products, error } = category
        ? await query.eq("category", category)
        : await query;
      if (error) throw error;
      const phrase = q.trim().toLocaleLowerCase();
      const matchingProducts = phrase
        ? (products ?? []).filter((product) =>
            [product.title, product.category, product.description, ...(product.tags ?? [])].some(
              (value) =>
                String(value ?? "")
                  .toLocaleLowerCase()
                  .includes(phrase),
            ),
          )
        : (products ?? []);
      const { data: categories } = await supabase
        .from("store_categories")
        .select("name")
        .eq("active", true)
        .order("sort_order");
      return {
        products: matchingProducts as CatalogProduct[],
        categories: (categories ?? []).map((item: StoreCategory) => item.name),
      };
    },
  });
  const products = data?.products ?? [];
  const categories = data?.categories ?? [];
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <section className="relative h-[calc(100svh-99px)] min-h-[600px] max-h-[880px] overflow-hidden bg-black">
          <picture>
            <source
              media="(max-width: 768px)"
              srcSet="/images/niberdealz-editorial-hero-768.webp"
            />
            <source
              media="(max-width: 1440px)"
              srcSet="/images/niberdealz-editorial-hero-1440.webp"
            />
            <img
              src="/images/niberdealz-editorial-hero-1920.webp"
              alt="NiberDealz new season collection"
              className="h-full w-full object-cover object-[53%_35%]"
              fetchPriority="high"
            />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/45" />
          <div className="fashion-shadow absolute inset-x-4 top-[25%] text-center text-white sm:top-[23%]">
            <p className="text-[10px] font-semibold uppercase tracking-[.2em]">Just arrived</p>
            <h1 className="mx-auto mt-3 max-w-lg font-display text-5xl font-bold leading-[.88] tracking-[-.08em] sm:text-7xl">
              Elevate your
              <br />
              everyday.
            </h1>
            <p className="mx-auto mt-5 max-w-xs text-base leading-relaxed text-white/95 sm:text-lg">
              The best of the season,
              <br />
              handpicked by us.
            </p>
          </div>
          <div className="absolute inset-x-4 bottom-7 mx-auto flex max-w-lg flex-col gap-3 sm:bottom-10">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-md bg-background text-xs font-bold uppercase tracking-[.08em] text-foreground hover:bg-background/90"
            >
              <a href="#shop">Shop new arrivals</a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-md border-0 bg-black/80 text-xs font-bold uppercase tracking-[.08em] text-white hover:bg-black"
            >
              <a href="#shop">View collection</a>
            </Button>
          </div>
        </section>
        <section className="border-b border-border bg-background px-4 py-3 text-center">
          <p className="text-[11px] text-muted-foreground">
            Loved by customers across South Africa · Safe checkout · Support when you need it
          </p>
        </section>
        <section id="shop" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-muted-foreground">
              New season collection
            </p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Discover your next favourite.</h2>
          </div>
          <div className="mx-auto mt-8 max-w-xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                className="h-12 rounded-none border-x-0 border-t-0 bg-transparent pl-10 shadow-none focus-visible:ring-0"
                placeholder="Search names, categories or keywords"
              />
            </div>
          </div>
          <div className="mt-7 flex justify-center gap-5 overflow-auto whitespace-nowrap pb-2">
            {["All", ...categories].map((name) => (
              <button
                key={name}
                onClick={() => setCategory(name === "All" ? "" : name)}
                className={`border-b pb-1 text-xs font-semibold uppercase tracking-[.1em] ${(!category && name === "All") || category === name ? "border-foreground" : "border-transparent text-muted-foreground"}`}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="mt-10 flex items-center justify-between">
            <h3 className="text-lg font-bold">
              {q || category ? "Your selection" : "The collection"}
            </h3>
            <span className="text-xs text-muted-foreground">{products.length} pieces</span>
          </div>
          {isLoading ? (
            <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[.8] animate-pulse bg-muted" />
              ))}
            </div>
          ) : products.length ? (
            <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} p={product as ProductCardData} />
              ))}
            </div>
          ) : (
            <div className="mt-8 border py-16 text-center">
              <ShoppingCart className="mx-auto h-5 w-5" />
              <p className="mt-3 font-semibold">Nothing matches that just yet.</p>
              <button
                onClick={() => {
                  setQ("");
                  setCategory("");
                }}
                className="mt-3 text-sm underline underline-offset-4"
              >
                View all products
              </button>
            </div>
          )}
        </section>
        <section className="bg-secondary px-4 py-14 text-center sm:px-6">
          <p className="text-[10px] font-bold uppercase tracking-[.2em]">NiberDealz, directly</p>
          <h2 className="mx-auto mt-4 max-w-xl text-3xl font-bold leading-tight sm:text-4xl">
            Thoughtfully selected.
            <br />
            Straight to your door.
          </h2>
          <Button
            asChild
            variant="outline"
            className="mt-7 rounded-none border-foreground bg-transparent px-7 text-xs font-bold uppercase tracking-[.1em] hover:bg-foreground hover:text-background"
          >
            <Link to="/contact">
              Need help? Talk to us <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
