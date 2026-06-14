import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, MessageCircle, ShieldCheck, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { ProductCard, type ProductCardData } from "@/components/product-card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/vendor/$id")({
  component: VendorPage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen"><SiteHeader /><div className="container mx-auto px-4 py-16 text-center"><p>{error.message}</p></div></div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen"><SiteHeader /><div className="container mx-auto px-4 py-16 text-center"><h2 className="font-display text-2xl font-bold">Shop not found</h2></div></div>
  ),
});

function VendorPage() {
  const { id } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["vendor", id],
    queryFn: async () => {
      const [{ data: vendor }, { data: products }] = await Promise.all([
        supabase.from("vendors").select("*").eq("id", id).eq("status", "approved").maybeSingle(),
        supabase.from("products").select("id, title, price_zar, category, image_url").eq("vendor_id", id).eq("status", "approved").order("created_at", { ascending: false }),
      ]);
      if (!vendor) throw notFound();
      return { vendor, products: (products ?? []) as ProductCardData[] };
    },
  });

  if (isLoading || !data) {
    return <div className="min-h-screen"><SiteHeader /><div className="container mx-auto px-4 py-16">Loading…</div></div>;
  }
  const { vendor, products } = data;
  const cleanNumber = vendor.whatsapp_number.replace(/[^0-9]/g, "");

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="container mx-auto px-4 py-6 flex-1">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="h-4 w-4" /> Browse</Link>

        <div className="rounded-2xl bg-[var(--gradient-hero)] text-white p-8 mb-8">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur"><Store className="h-8 w-8" /></div>
            <div className="flex-1">
              <div className="inline-flex items-center gap-1 rounded-full bg-[color:var(--accent)] text-[color:var(--accent-foreground)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider mb-2">
                <ShieldCheck className="h-3 w-3" /> Verified vendor
              </div>
              <h1 className="font-display text-3xl font-bold">{vendor.business_name}</h1>
              <div className="text-white/80 text-sm flex items-center gap-3 mt-1">
                <span>{vendor.category}</span><span>·</span>
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{vendor.city}, {vendor.province}</span>
              </div>
              <p className="text-white/85 mt-4 max-w-2xl leading-relaxed">{vendor.business_description}</p>
              <Button asChild className="mt-5 bg-[#25D366] hover:bg-[#25D366]/90 text-white">
                <a href={`https://wa.me/${cleanNumber}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4 mr-1.5" /> Chat on WhatsApp</a>
              </Button>
            </div>
          </div>
        </div>

        <h2 className="font-display text-2xl font-bold mb-4">Products ({products.length})</h2>
        {products.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-border p-12 text-center text-muted-foreground">No products listed yet.</div>
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
