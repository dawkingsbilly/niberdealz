import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, MessageCircle, ShieldCheck, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/product/$id")({
  component: ProductDetail,
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="container mx-auto px-4 py-16 text-center flex-1">
        <h2 className="font-display text-2xl font-bold">Couldn't load product</h2>
        <p className="text-muted-foreground mt-2">{error.message}</p>
        <Button asChild className="mt-6"><Link to="/">Back to browse</Link></Button>
      </div>
      <SiteFooter />
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="container mx-auto px-4 py-16 text-center flex-1">
        <h2 className="font-display text-2xl font-bold">Product not available</h2>
        <p className="text-muted-foreground mt-2">It may have been removed.</p>
        <Button asChild className="mt-6"><Link to="/">Back to browse</Link></Button>
      </div>
      <SiteFooter />
    </div>
  ),
});

function ProductDetail() {
  const { id } = Route.useParams();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, description, price_zar, category, image_url, status, vendor_id, vendors(id, business_name, owner_name, whatsapp_number, city, province, business_description, category, status)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data || data.status !== "approved") throw notFound();
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="container mx-auto px-4 py-8 flex-1">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="aspect-square rounded-2xl bg-muted animate-pulse" />
            <div className="space-y-4">
              <div className="h-8 w-3/4 bg-muted animate-pulse rounded" />
              <div className="h-6 w-1/3 bg-muted animate-pulse rounded" />
              <div className="h-24 w-full bg-muted animate-pulse rounded" />
            </div>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }
  if (!product) return null;

  const vendor = product.vendors as any;
  const cleanNumber = (vendor?.whatsapp_number ?? "").replace(/[^0-9]/g, "");
  const waLink = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(
    `Hi ${vendor?.business_name ?? ""}, I'm interested in "${product.title}" (R${product.price_zar}) on Niber-Dealz.`
  )}`;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="container mx-auto px-4 py-6 flex-1">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="h-4 w-4" /> Back to browse</Link>

        <div className="grid md:grid-cols-2 gap-8 mb-10">
          <div className="aspect-square rounded-2xl overflow-hidden bg-muted border border-border">
            {product.image_url ? (
              <img src={product.image_url} alt={product.title} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-muted-foreground">No image</div>
            )}
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--deal)] mb-2">{product.category}</div>
            <h1 className="font-display text-3xl md:text-4xl font-bold leading-tight">{product.title}</h1>
            <div className="mt-4 font-display text-4xl font-bold">R{Number(product.price_zar).toLocaleString("en-ZA")}</div>

            <div className="mt-6">
              <Button asChild size="lg" className="w-full h-14 bg-[#25D366] hover:bg-[#25D366]/90 text-white shadow-lg gap-2 text-base font-semibold">
                <a href={waLink} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-5 w-5" /> Buy on WhatsApp
                </a>
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">You'll be redirected to chat directly with the vendor. Niber-Dealz doesn't process the payment.</p>
            </div>

            <div className="mt-8">
              <h3 className="font-semibold mb-2">About this item</h3>
              <p className="text-foreground/80 whitespace-pre-line leading-relaxed">{product.description}</p>
            </div>
          </div>
        </div>

        {/* Vendor info */}
        {vendor && (
          <div className="rounded-2xl bg-card border border-border p-6 shadow-[var(--shadow-card)]">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary"><Store className="h-7 w-7 text-foreground/70" /></div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-xl font-bold">{vendor.business_name}</h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 text-success px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                      <ShieldCheck className="h-3 w-3" /> Verified
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-0.5">{vendor.category}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                    <MapPin className="h-3.5 w-3.5" />{vendor.city}, {vendor.province}
                  </div>
                </div>
              </div>
              <Button asChild variant="outline">
                <Link to="/vendor/$id" params={{ id: vendor.id }}>Visit shop</Link>
              </Button>
            </div>
            {vendor.business_description && (
              <p className="text-sm text-foreground/70 mt-4 leading-relaxed border-t border-border/60 pt-4">{vendor.business_description}</p>
            )}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
