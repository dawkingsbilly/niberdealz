import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, MapPin, MessageCircle, Store, Trash2, Flag, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { buildWhatsAppMessage } from "@/lib/constants";
import { adminDeleteProduct, submitReport, submitReview } from "@/lib/marketplace.functions";

export const Route = createFileRoute("/product/$id")({
  component: ProductDetail,
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex flex-col"><SiteHeader />
      <div className="container mx-auto px-4 py-16 text-center flex-1">
        <h2 className="font-display text-2xl font-bold">Couldn't load listing</h2>
        <p className="text-muted-foreground mt-2">{error.message}</p>
        <Button asChild className="mt-6"><Link to="/">Back to browse</Link></Button>
      </div><SiteFooter />
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen flex flex-col"><SiteHeader />
      <div className="container mx-auto px-4 py-16 text-center flex-1">
        <h2 className="font-display text-2xl font-bold">Listing not available</h2>
        <Button asChild className="mt-6"><Link to="/">Back to browse</Link></Button>
      </div><SiteFooter />
    </div>
  ),
});

function ProductDetail() {
  const { id } = Route.useParams();
  const { roles, user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const delFn = useServerFn(adminDeleteProduct);
  const canModerate = roles.includes("admin") || roles.includes("owner");

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, description, price_zar, category, image_url, images, status, is_sold, size, color, checkout_url, vendor_id, vendors(id, business_name, owner_name, whatsapp_number, city, business_description, category, status, website_url, checkout_pref, is_formal_business)")
        .eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data || data.status !== "approved") throw notFound();
      return data as any;
    },
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews", id],
    queryFn: async () => {
      const { data } = await (supabase.from("product_reviews" as any) as any).select("*").eq("product_id", id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const [activeImg, setActiveImg] = useState(0);
  const [reportOpen, setReportOpen] = useState<null | "product" | "store">(null);

  const tracked = useRef<string | null>(null);
  useEffect(() => {
    if (!product?.id || tracked.current === product.id) return;
    tracked.current = product.id;
    const key = `nd_view_${product.id}`;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(key)) return;
    sessionStorage?.setItem(key, "1");
    supabase.from("product_events").insert({ product_id: product.id, vendor_id: product.vendor_id, event_type: "view" }).then(() => {});
  }, [product?.id, product?.vendor_id]);

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
  const gallery: string[] = (product.images && product.images.length > 0) ? product.images : (product.image_url ? [product.image_url] : []);
  const cover = gallery[activeImg] ?? null;
  const cleanNumber = (vendor?.whatsapp_number ?? "").replace(/[^0-9]/g, "");
  const waLink = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(buildWhatsAppMessage(product.title, product.price_zar))}`;

  const onWhatsAppClick = () => {
    supabase.from("product_events").insert({ product_id: product.id, vendor_id: product.vendor_id, event_type: "whatsapp_click" }).then(() => {});
  };

  const removeListing = async () => {
    if (!confirm("Remove this listing?")) return;
    try { await delFn({ data: { product_id: product.id } }); toast.success("Removed"); navigate({ to: "/" }); }
    catch (e: any) { toast.error(e.message); }
  };

  const avgRating = reviews.length ? (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length) : 0;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="container mx-auto px-4 py-6 flex-1">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="h-4 w-4" /> Back to browse</Link>

        <div className="grid md:grid-cols-2 gap-8 mb-10">
          <div>
            <div className="aspect-square rounded-2xl overflow-hidden bg-muted border border-border relative">
              {cover ? <img src={cover} alt={product.title} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-muted-foreground">No image</div>}
              {product.is_sold && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><span className="rounded-full bg-destructive text-destructive-foreground text-sm font-bold uppercase tracking-wider px-4 py-2">Sold</span></div>}
            </div>
            {gallery.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {gallery.map((g, i) => (
                  <button key={g} onClick={() => setActiveImg(i)} className={`h-16 w-16 rounded-lg overflow-hidden border-2 shrink-0 ${i === activeImg ? "border-foreground" : "border-transparent"}`}>
                    <img src={g} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--deal)] mb-2">{product.category}</div>
            <h1 className="font-display text-3xl md:text-4xl font-bold leading-tight">{product.title}</h1>
            {reviews.length > 0 && (
              <div className="mt-2 flex items-center gap-1.5 text-sm">
                <Stars value={avgRating} />
                <span className="font-semibold">{avgRating.toFixed(1)}</span>
                <span className="text-muted-foreground">({reviews.length} review{reviews.length !== 1 ? "s" : ""})</span>
              </div>
            )}
            <div className="mt-4 font-display text-4xl font-bold">R{Number(product.price_zar).toLocaleString("en-ZA")}</div>

            {(product.size || product.color) && (
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                {product.size && <span className="rounded-full bg-muted px-3 py-1">Size: <strong>{product.size}</strong></span>}
                {product.color && <span className="rounded-full bg-muted px-3 py-1">Color: <strong>{product.color}</strong></span>}
              </div>
            )}

            <div className="mt-6 space-y-2">
              {(() => {
                const websiteUrl = product.checkout_url || vendor?.website_url;
                const pref = vendor?.checkout_pref || "whatsapp";
                const showWebsite = !!websiteUrl && (pref === "website" || pref === "both");
                const showWhatsApp = pref !== "website" || !websiteUrl;
                return (
                  <>
                    {showWebsite && (
                      <Button asChild size="lg" disabled={product.is_sold} className="w-full h-14 bg-foreground text-background hover:bg-foreground/90 gap-2 text-base font-semibold">
                        <a href={product.is_sold ? "#" : websiteUrl} target="_blank" rel="noopener noreferrer">
                          <Store className="h-5 w-5" /> {product.is_sold ? "Sold" : "Buy on business website"}
                        </a>
                      </Button>
                    )}
                    {showWhatsApp && (
                      user ? (
                        <Button asChild size="lg" disabled={product.is_sold} className="w-full h-14 bg-[#25D366] hover:bg-[#25D366]/90 text-white shadow-lg gap-2 text-base font-semibold">
                          <a href={product.is_sold ? "#" : waLink} target="_blank" rel="noopener noreferrer" onClick={product.is_sold ? undefined : onWhatsAppClick}>
                            <MessageCircle className="h-5 w-5" /> {product.is_sold ? "Sold" : "Chat seller on WhatsApp"}
                          </a>
                        </Button>
                      ) : (
                        <Button asChild size="lg" className="w-full h-14 bg-[#25D366] hover:bg-[#25D366]/90 text-white shadow-lg gap-2 text-base font-semibold">
                          <Link to="/auth" search={{ mode: "register", next: `/product/${product.id}` }}>
                            <MessageCircle className="h-5 w-5" /> Sign up free to chat seller
                          </Link>
                        </Button>
                      )
                    )}
                  </>
                );
              })()}
              <p className="text-xs text-muted-foreground text-center">You'll chat directly with the seller. Niberdealz doesn't handle payment.</p>
            </div>

            <div className="mt-4 rounded-lg border border-amber-300/40 bg-amber-50 dark:bg-amber-500/5 p-3 text-xs text-foreground/80">
              <strong>Off-campus / can't inspect in person?</strong> Ask the seller for a short video of the item, check their store reviews below, and only send money once you're sure they're reliable. Meet in a public place if possible.
            </div>

            <div className="mt-8">
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-foreground/80 whitespace-pre-line leading-relaxed">{product.description}</p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setReportOpen("product")}><Flag className="h-4 w-4 mr-1.5" />Report this listing</Button>
              {vendor && <Button variant="outline" size="sm" onClick={() => setReportOpen("store")}><Flag className="h-4 w-4 mr-1.5" />Report this store</Button>}
              {canModerate && <Button variant="outline" size="sm" onClick={removeListing}><Trash2 className="h-4 w-4 mr-1.5 text-destructive" />Remove (moderator)</Button>}
            </div>
          </div>
        </div>

        {vendor && (
          <div className="rounded-2xl bg-card border border-border p-6 shadow-[var(--shadow-card)] mb-8">
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

        <Reviews productId={product.id} reviews={reviews} canPost={!!user} userId={user?.id} onPosted={() => qc.invalidateQueries({ queryKey: ["reviews", id] })} />
      </div>

      {reportOpen && (
        <ReportDialog
          targetType={reportOpen}
          targetId={reportOpen === "product" ? product.id : vendor.id}
          targetLabel={reportOpen === "product" ? product.title : vendor.business_name}
          canReport={!!user}
          onClose={() => setReportOpen(null)}
        />
      )}
      <SiteFooter />
    </div>
  );
}

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="inline-flex">
      {[1,2,3,4,5].map((n) => (
        <Star key={n} style={{ width: size, height: size }} className={n <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"} />
      ))}
    </div>
  );
}

function Reviews({ productId, reviews, canPost, userId, onPosted }: any) {
  const reviewFn = useServerFn(submitReview);
  const mine = reviews.find((r: any) => r.user_id === userId);
  const [rating, setRating] = useState<number>(mine?.rating ?? 0);
  const [comment, setComment] = useState<string>(mine?.comment ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!rating) { toast.error("Pick a rating"); return; }
    setSaving(true);
    try { await reviewFn({ data: { product_id: productId, rating, comment } }); toast.success("Thanks for your review!"); onPosted(); }
    catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="rounded-2xl bg-card border border-border p-6 shadow-[var(--shadow-card)]">
      <h3 className="font-display text-xl font-bold mb-4">Reviews</h3>
      {canPost ? (
        <div className="mb-6 border-b pb-6">
          <p className="text-sm font-medium mb-2">{mine ? "Update your review" : "Leave a review"}</p>
          <div className="flex gap-1 mb-2">
            {[1,2,3,4,5].map((n) => (
              <button key={n} onClick={() => setRating(n)}><Star className={`h-7 w-7 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} /></button>
            ))}
          </div>
          <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience…" />
          <div className="mt-2 flex justify-end"><Button onClick={submit} disabled={saving}>{mine ? "Update" : "Post"} review</Button></div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mb-4">Sign in to leave a review.</p>
      )}
      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews yet. Be the first.</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((r: any) => (
            <div key={r.id} className="text-sm">
              <div className="flex items-center gap-2"><Stars value={r.rating} /><span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span></div>
              {r.comment && <p className="mt-1 text-foreground/80 whitespace-pre-line">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const REPORT_REASONS = ["Scam / fraud", "Counterfeit / fake item", "Stolen goods", "Misleading description", "Offensive content", "Other"];

function ReportDialog({ targetType, targetId, targetLabel, canReport, onClose }: any) {
  const reportFn = useServerFn(submitReport);
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try { await reportFn({ data: { target_type: targetType, target_id: targetId, reason, note } }); toast.success("Thanks — our team will review it."); onClose(); }
    catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-lg font-bold mb-1">Report {targetType === "product" ? "listing" : "store"}</h3>
        <p className="text-xs text-muted-foreground mb-4 line-clamp-1">{targetLabel}</p>
        {!canReport ? (
          <p className="text-sm">Please sign in to submit a report.</p>
        ) : (
          <>
            <label className="text-sm font-medium">Reason</label>
            <select className="w-full mt-1 h-10 rounded-md border border-input bg-background px-3 text-sm" value={reason} onChange={(e) => setReason(e.target.value)}>
              {REPORT_REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
            <label className="text-sm font-medium mt-3 block">Details (optional)</label>
            <Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What happened?" />
          </>
        )}
        <div className="flex gap-2 mt-4 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {canReport && <Button onClick={submit} disabled={saving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Submit report</Button>}
        </div>
      </div>
    </div>
  );
}
