import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Store, BadgeCheck, Crown, Copy, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { ProductCard, type ProductCardData } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitStoreReview } from "@/lib/marketplace.functions";

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
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["vendor", id],
    queryFn: async () => {
      const [{ data: vendor }, { data: products }, { data: reviews }] = await Promise.all([
        supabase.from("vendors").select("id, business_name, owner_name, whatsapp_number, city, province, category, business_description, logo_url, verified, is_official, status, created_at").eq("id", id).eq("status", "approved").maybeSingle(),
        supabase.from("products").select("id, title, price_zar, category, image_url, stock, is_sold").eq("vendor_id", id).eq("status", "approved").order("created_at", { ascending: false }),
        (supabase.from("store_reviews" as any) as any).select("*").eq("vendor_id", id).order("created_at", { ascending: false }),
      ]);
      if (!vendor) throw notFound();
      return { vendor, products: (products ?? []) as ProductCardData[], reviews: reviews ?? [] };
    },
  });

  if (isLoading || !data) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  const { vendor, products, reviews } = data as any;

  const avg = reviews.length ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length : 0;

  const copyLink = () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/vendor/${vendor.id}`;
    navigator.clipboard?.writeText(url);
    toast.success("Store link copied to clipboard");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="container mx-auto px-4 py-6 flex-1">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="h-4 w-4" /> Back to browse</Link>

        <div className="rounded-2xl bg-card border border-border p-6 shadow-[var(--shadow-card)] mb-6">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="h-20 w-20 rounded-2xl overflow-hidden bg-[var(--deal)]/10 text-[color:var(--deal)] flex items-center justify-center shrink-0">
              {vendor.logo_url ? <img src={vendor.logo_url} alt="" className="h-full w-full object-cover" /> : <Store className="h-9 w-9" />}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2 flex-wrap">
                {vendor.business_name}
                {vendor.verified && <BadgeCheck className="h-6 w-6 text-sky-500" />}
                {vendor.is_official && <span className="inline-flex items-center gap-1 rounded-md bg-foreground text-background text-[10px] font-bold uppercase tracking-wider px-2 py-1"><Crown className="h-3 w-3" />Official</span>}
              </h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1"><MapPin className="h-3.5 w-3.5" />{vendor.city} · {vendor.category}</p>
              {reviews.length > 0 && (
                <div className="mt-1 text-sm inline-flex items-center gap-1"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /><strong>{avg.toFixed(1)}</strong> <span className="text-muted-foreground">({reviews.length} store rating{reviews.length !== 1 ? "s" : ""})</span></div>
              )}
              <p className="mt-3 text-foreground/80">{vendor.business_description}</p>
              <div className="mt-3">
                <Button size="sm" variant="outline" onClick={copyLink}><Copy className="h-3.5 w-3.5 mr-1.5" />Copy store link</Button>
              </div>
            </div>
          </div>
        </div>

        <h2 className="font-display text-xl font-bold mb-3">Listings ({products.length})</h2>
        {products.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center text-muted-foreground">No listings yet.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            {products.map((p: any) => <ProductCard key={p.id} p={{ ...p, vendors: { business_name: vendor.business_name, city: vendor.city, verified: vendor.verified, is_official: vendor.is_official } }} />)}
          </div>
        )}

        <StoreReviews vendorId={vendor.id} reviews={reviews} canPost={!!user} userId={user?.id} onPosted={() => qc.invalidateQueries({ queryKey: ["vendor", id] })} />
      </div>
      <SiteFooter />
    </div>
  );
}

function StoreReviews({ vendorId, reviews, canPost, userId, onPosted }: any) {
  const fn = useServerFn(submitStoreReview);
  const mine = reviews.find((r: any) => r.user_id === userId);
  const [rating, setRating] = useState<number>(mine?.rating ?? 0);
  const [comment, setComment] = useState<string>(mine?.comment ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!rating) { toast.error("Pick a rating"); return; }
    setSaving(true);
    try { await fn({ data: { vendor_id: vendorId, rating, comment } }); toast.success("Thanks for rating this store!"); onPosted(); }
    catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="rounded-2xl bg-card border border-border p-6 shadow-[var(--shadow-card)]">
      <h3 className="font-display text-xl font-bold mb-4">Store reviews</h3>
      {canPost ? (
        <div className="mb-6 border-b pb-6">
          <p className="text-sm font-medium mb-2">{mine ? "Update your rating" : "Rate this store"}</p>
          <div className="flex gap-1 mb-2">
            {[1,2,3,4,5].map((n) => (
              <button key={n} onClick={() => setRating(n)}><Star className={`h-7 w-7 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} /></button>
            ))}
          </div>
          <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="How was your experience with this store?" />
          <div className="mt-2 flex justify-end"><Button onClick={submit} disabled={saving}>{mine ? "Update" : "Post"} rating</Button></div>
        </div>
      ) : <p className="text-sm text-muted-foreground mb-4">Sign in to rate this store.</p>}
      {reviews.length === 0 ? <p className="text-sm text-muted-foreground">No store ratings yet.</p> : (
        <div className="space-y-4">
          {reviews.map((r: any) => (
            <div key={r.id} className="text-sm">
              <div className="flex items-center gap-2">
                <div className="inline-flex">{[1,2,3,4,5].map(n => <Star key={n} className={`h-3.5 w-3.5 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />)}</div>
                <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              {r.comment && <p className="mt-1 text-foreground/80 whitespace-pre-line">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
