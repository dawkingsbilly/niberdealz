import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { ArrowLeft, MapPin, MessageCircle, Store, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { buildWhatsAppMessage } from "@/lib/constants";
import { adminDeleteProduct } from "@/lib/marketplace.functions";

export const Route = createFileRoute("/product/$id")({
  component: ProductDetail,
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="container mx-auto px-4 py-16 text-center flex-1">
        <h2 className="font-display text-2xl font-bold">Couldn't load listing</h2>
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
        <h2 className="font-display text-2xl font-bold">Listing not available</h2>
        <Button asChild className="mt-6"><Link to="/">Back to browse</Link></Button>
      </div>
      <SiteFooter />
    </div>
  ),
});

function ProductDetail() {
  const { id } = Route.useParams();
  const { roles } = useAuth();
  const navigate = useNavigate();
  const delFn = useServerFn(adminDeleteProduct);
  const canModerate = roles.includes("admin") || roles.includes("owner");

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, description, price_zar, category, image_url, status, is_sold, size, color, vendor_id, vendors(id, business_name, owner_name, whatsapp_number, city, business_description, category, status)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data || data.status !== "approved") throw notFound();
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col"><SiteHeader />
        <div className="container mx-auto px-4 py-8 flex-1 grid md:grid-cols-2 gap-8">
          <div className="aspect-square rounded-2xl bg-muted animate-pulse" />
          <div className="space-y-4"><div className="h-8 w-3/4 bg-muted animate-pulse rounded" /><div className="h-6 w-1/3 bg-muted animate-pulse rounded" /></div>
        </div><SiteFooter />
      </div>
    );
  }
  if (!product) return null;

  const vendor: any = product.vendors;
  const cleanNumber = (vendor?.whatsapp_number ?? "").replace(/[^0-9]/g, "");
  const waLink = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(
    buildWhatsAppMessage(product.title, product.price_zar)
  )}`;

  // Track a view once per product per session
  const tracked = useRef<string | null>(null);
  useEffect(() => {
    if (!product?.id || tracked.current === product.id) return;
    tracked.current = product.id;
    const key = `nd_view_${product.id}`;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(key)) return;
    sessionStorage?.setItem(key, "1");
    supabase.from("product_events").insert({ product_id: product.id, vendor_id: product.vendor_id, event_type: "view" }).then(() => {});
  }, [product?.id, product?.vendor_id]);

  const onWhatsAppClick = () => {
    supabase.from("product_events").insert({ product_id: product.id, vendor_id: product.vendor_id, event_type: "whatsapp_click" }).then(() => {});
  };

  const removeListing = async () => {
    if (!confirm("Remove this listing?")) return;
    try { await delFn({ data: { product_id: product.id } }); toast.success("Removed"); navigate({ to: "/" }); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="container mx-auto px-4 py-6 flex-1">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="h-4 w-4" /> Back to browse</Link>

        <div className="grid md:grid-cols-2 gap-8 mb-10">
          <div className="aspect-square rounded-2xl overflow-hidden bg-muted border border-border relative">
            {product.image_url ? (
              <img src={product.image_url} alt={product.title} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-muted-foreground">No image</div>
            )}
            {product.is_sold && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="rounded-full bg-destructive text-destructive-foreground text-sm font-bold uppercase tracking-wider px-4 py-2">Sold</span>
              </div>
            )}
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--deal)] mb-2">{product.category}</div>
            <h1 className="font-display text-3xl md:text-4xl font-bold leading-tight">{product.title}</h1>
            <div className="mt-4 font-display text-4xl font-bold">R{Number(product.price_zar).toLocaleString("en-ZA")}</div>

            {(product.size || product.color) && (
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                {product.size && <span className="rounded-full bg-muted px-3 py-1">Size: <strong>{product.size}</strong></span>}
                {product.color && <span className="rounded-full bg-muted px-3 py-1">Color: <strong>{product.color}</strong></span>}
              </div>
            )}

            <div className="mt-6">
              <Button asChild size="lg" disabled={product.is_sold} className="w-full h-14 bg-[#25D366] hover:bg-[#25D366]/90 text-white shadow-lg gap-2 text-base font-semibold">
                <a href={product.is_sold ? "#" : waLink} target="_blank" rel="noopener noreferrer" onClick={product.is_sold ? undefined : onWhatsAppClick}>
                  <MessageCircle className="h-5 w-5" /> {product.is_sold ? "Sold" : "Buy on WhatsApp"}
                </a>
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">You'll chat directly with the seller. Niberdealz doesn't handle payment.</p>
            </div>

            <div className="mt-8">
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-foreground/80 whitespace-pre-line leading-relaxed">{product.description}</p>
            </div>

            {canModerate && (
              <div className="mt-6 pt-6 border-t">
                <Button variant="outline" onClick={removeListing}><Trash2 className="h-4 w-4 mr-1.5 text-destructive" />Remove listing (moderator)</Button>
              </div>
            )}
          </div>
        </div>

        {vendor && (
          <div className="rounded-2xl bg-card border border-border p-6 shadow-[var(--shadow-card)]">
            <div className="flex items-start gap-4 flex-wrap">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--deal)]/10 text-[color:var(--deal)] shrink-0"><Store className="h-7 w-7" /></div>
              <div className="flex-1 min-w-0">
                <Link to="/vendor/$id" params={{ id: vendor.id }} className="font-display text-xl font-bold hover:underline">{vendor.business_name}</Link>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{vendor.city}</p>
                <p className="mt-2 text-sm text-foreground/80">{vendor.business_description}</p>
              </div>
            </div>
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
