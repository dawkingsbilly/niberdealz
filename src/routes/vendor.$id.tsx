import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { ProductCard, type ProductCardData } from "@/components/product-card";

export const Route = createFileRoute("/vendor/$id")({
  component: VendorPage,
  notFoundComponent: () => (
    <div className="min-h-screen"><SiteHeader /><div className="container mx-auto px-4 py-16 text-center"><h2 className="font-display text-2xl font-bold">Store not found</h2></div></div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen"><SiteHeader /><div className="container mx-auto px-4 py-16 text-center"><p>{error.message}</p></div></div>
  ),
});

function VendorPage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["vendor", id],
    queryFn: async () => {
      const [{ data: vendor }, { data: products }] = await Promise.all([
        supabase.from("vendors").select("id, business_name, owner_name, whatsapp_number, city, province, category, business_description, logo_url, status, created_at").eq("id", id).eq("status", "approved").maybeSingle(),
        supabase.from("products").select("id, title, price_zar, category, image_url").eq("vendor_id", id).eq("status", "approved").order("created_at", { ascending: false }),
      ]);
      if (!vendor) throw notFound();
      return { vendor, products: (products ?? []) as ProductCardData[] };
    },
  });

  if (isLoading || !data) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  const { vendor, products } = data;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="container mx-auto px-4 py-6 flex-1">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="h-4 w-4" /> Back to browse</Link>

        <div className="rounded-2xl bg-card border border-border p-6 shadow-[var(--shadow-card)] mb-6">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--deal)]/10 text-[color:var(--deal)] shrink-0"><Store className="h-8 w-8" /></div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl md:text-3xl font-bold">{vendor.business_name}</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1"><MapPin className="h-3.5 w-3.5" />{vendor.city} · {vendor.category}</p>
              <p className="mt-3 text-foreground/80">{vendor.business_description}</p>
            </div>
          </div>
        </div>

        <h2 className="font-display text-xl font-bold mb-3">Listings ({products.length})</h2>
        {products.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center text-muted-foreground">No listings yet.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
