import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, ShieldCheck, Clock, XCircle, CreditCard, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { CATEGORIES, PLANS } from "@/lib/constants";
import { submitProduct } from "@/lib/marketplace.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const STATUS_PILL: Record<string, { label: string; cls: string; Icon: React.FC<any> }> = {
  approved: { label: "Approved", cls: "bg-success/10 text-success", Icon: ShieldCheck },
  pending:  { label: "Pending review", cls: "bg-warning/15 text-warning-foreground border border-warning/30", Icon: Clock },
  rejected: { label: "Rejected", cls: "bg-destructive/10 text-destructive", Icon: XCircle },
};

function Dashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const submitProductFn = useServerFn(submitProduct);

  const { data: vendor, isLoading: vLoading } = useQuery({
    queryKey: ["vendor-self", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("vendors").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (!vLoading && user && vendor === null) navigate({ to: "/register-shop", replace: true });
  }, [vLoading, vendor, user, navigate]);

  const { data: products = [] } = useQuery({
    queryKey: ["vendor-products", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq("vendor_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newP, setNewP] = useState({ title: "", description: "", price_zar: "", category: "", image_url: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);

  if (vLoading || !vendor) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const plan = vendor.plan !== "none" ? PLANS[vendor.plan as keyof typeof PLANS] : null;
  const planActive = !!plan && vendor.plan_active_until && new Date(vendor.plan_active_until) > new Date();
  const limit = plan?.productLimit === "unlimited" ? Infinity : (plan?.productLimit ?? 0);
  const usagePct = limit === Infinity ? 0 : Math.min(100, (products.length / (limit as number)) * 100);

  const onAdd = async () => {
    if (!planActive) { toast.error("Activate a plan first."); return; }
    setAdding(true);
    try {
      let image_url = newP.image_url || null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `${user!.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uErr } = await supabase.storage.from("product-images").upload(path, imageFile, { upsert: false });
        if (uErr) throw uErr;
        const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(path);
        image_url = publicUrl;
      }
      const res = await submitProductFn({ data: {
        title: newP.title, description: newP.description,
        price_zar: Number(newP.price_zar), category: newP.category,
        image_url,
      }});
      toast.success(res.status === "approved" ? "Product live!" : res.status === "rejected" ? "Auto-rejected by safety check" : "Submitted — under review");
      setNewP({ title: "", description: "", price_zar: "", category: "", image_url: "" });
      setImageFile(null);
      setShowAdd(false);
      qc.invalidateQueries({ queryKey: ["vendor-products"] });
    } catch (e: any) {
      toast.error(e.message ?? "Could not add product");
    } finally {
      setAdding(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["vendor-products"] }); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="container mx-auto px-4 py-8 flex-1 max-w-6xl">
        {/* Vendor status banner */}
        <div className="rounded-2xl bg-card border border-border p-6 mb-6 shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-display text-2xl font-bold">{vendor.business_name}</h1>
              <p className="text-muted-foreground text-sm">{vendor.category} · {vendor.city}, {vendor.province}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(() => { const s = STATUS_PILL[vendor.status]; const I = s.Icon; return (
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${s.cls}`}><I className="h-3.5 w-3.5" /> {s.label}</span>
                ); })()}
                {planActive ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-[var(--deal)]/10 text-[color:var(--deal)]">
                    {plan!.name} plan · until {new Date(vendor.plan_active_until!).toLocaleDateString()}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-muted text-muted-foreground">No active plan</span>
                )}
              </div>
              {vendor.status === "rejected" && vendor.rejection_reason && (
                <p className="mt-3 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                  <strong>Rejection reason:</strong> {vendor.rejection_reason}
                </p>
              )}
              {vendor.status === "pending" && (
                <p className="mt-3 text-sm text-muted-foreground">Our team is reviewing your registration. You'll be notified once approved.</p>
              )}
            </div>
            <Button asChild variant="outline">
              <Link to="/dashboard/billing"><CreditCard className="h-4 w-4 mr-1.5" /> Billing & plan</Link>
            </Button>
          </div>

          {plan && (
            <div className="mt-5 pt-5 border-t border-border">
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>Products used</span>
                <span>{products.length} / {plan.productLimit === "unlimited" ? "∞" : plan.productLimit}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-[var(--deal)] transition-all" style={{ width: `${usagePct}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Products */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6" />Your products</h2>
          <Button onClick={() => setShowAdd(!showAdd)} className="bg-[var(--deal)] hover:bg-[var(--deal)]/90 text-[color:var(--deal-foreground)]" disabled={vendor.status !== "approved" || !planActive}>
            <Plus className="h-4 w-4 mr-1.5" /> Add product
          </Button>
        </div>

        {vendor.status !== "approved" && (
          <p className="text-sm text-muted-foreground mb-4">You can add products once your vendor account is approved.</p>
        )}
        {vendor.status === "approved" && !planActive && (
          <div className="mb-4 rounded-lg bg-[var(--deal)]/5 border border-[var(--deal)]/30 p-4 text-sm">
            Choose a plan to start listing. <Link to="/dashboard/billing" className="font-semibold underline">Go to billing</Link>.
          </div>
        )}

        {showAdd && (
          <div className="rounded-2xl bg-card border border-border p-6 mb-6 shadow-[var(--shadow-card)]">
            <h3 className="font-display text-lg font-bold mb-4">New product</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2"><Label>Title</Label><Input value={newP.title} onChange={(e) => setNewP({ ...newP, title: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Price (ZAR)</Label><Input type="number" min="0" step="0.01" value={newP.price_zar} onChange={(e) => setNewP({ ...newP, price_zar: e.target.value })} /></div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={newP.category} onChange={(e) => setNewP({ ...newP, category: e.target.value })}>
                  <option value="">Select</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2"><Label>Description</Label><Textarea rows={4} value={newP.description} onChange={(e) => setNewP({ ...newP, description: e.target.value })} /></div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Image</Label>
                <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={onAdd} disabled={adding || !newP.title || !newP.description || !newP.price_zar || !newP.category} className="bg-[var(--deal)] hover:bg-[var(--deal)]/90 text-[color:var(--deal-foreground)]">
                {adding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Submit for review
              </Button>
            </div>
          </div>
        )}

        {products.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center text-muted-foreground">No products yet.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p: any) => {
              const s = STATUS_PILL[p.status]; const I = s.Icon;
              return (
                <div key={p.id} className="rounded-2xl bg-card border border-border overflow-hidden shadow-[var(--shadow-card)]">
                  <div className="aspect-square bg-muted">{p.image_url ? <img src={p.image_url} alt={p.title} className="h-full w-full object-cover" /> : <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No image</div>}</div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold leading-snug line-clamp-2">{p.title}</h4>
                      <span className="font-display font-bold whitespace-nowrap">R{Number(p.price_zar).toLocaleString("en-ZA")}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.cls}`}><I className="h-3 w-3" />{s.label}</span>
                      <button onClick={() => deleteProduct(p.id)} className="text-muted-foreground hover:text-destructive p-1" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    {p.status === "rejected" && p.rejection_reason && <p className="mt-2 text-xs text-destructive">{p.rejection_reason}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
