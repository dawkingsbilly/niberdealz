import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Package, Tag, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { CATEGORIES } from "@/lib/constants";
import { submitProduct, setProductSold } from "@/lib/marketplace.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function Dashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const submitProductFn = useServerFn(submitProduct);
  const setSoldFn = useServerFn(setProductSold);

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
  const [newP, setNewP] = useState({ title: "", description: "", price_zar: "", category: "", size: "", color: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);

  if (vLoading || !vendor) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const onAdd = async () => {
    if (!imageFile && !newP.title) { toast.error("Add a title and image."); return; }
    setAdding(true);
    try {
      let image_url: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `${user!.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uErr } = await supabase.storage.from("product-images").upload(path, imageFile, { upsert: false });
        if (uErr) throw uErr;
        const { data: signed, error: sErr } = await supabase.storage.from("product-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
        if (sErr) throw sErr;
        image_url = signed.signedUrl;
      }
      await submitProductFn({ data: {
        title: newP.title, description: newP.description,
        price_zar: Number(newP.price_zar), category: newP.category,
        image_url, size: newP.size || null, color: newP.color || null,
      }});
      toast.success("Listing live!");
      setNewP({ title: "", description: "", price_zar: "", category: "", size: "", color: "" });
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
    if (!confirm("Delete this listing?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["vendor-products"] }); }
  };

  const toggleSold = async (id: string, isSold: boolean) => {
    try {
      await setSoldFn({ data: { product_id: id, is_sold: isSold } });
      qc.invalidateQueries({ queryKey: ["vendor-products"] });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="container mx-auto px-4 py-8 flex-1 max-w-6xl">
        <div className="rounded-2xl bg-card border border-border p-6 mb-6 shadow-[var(--shadow-card)]">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold truncate">{vendor.business_name}</h1>
              <p className="text-muted-foreground text-sm">{vendor.category} · {vendor.city} · WhatsApp {vendor.whatsapp_number}</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/vendor/$id" params={{ id: vendor.id }}><ExternalLink className="h-4 w-4 mr-1.5" />View shop</Link>
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6" />Your listings</h2>
          <Button onClick={() => setShowAdd(!showAdd)} className="bg-[var(--deal)] hover:bg-[var(--deal)]/90 text-[color:var(--deal-foreground)]">
            <Plus className="h-4 w-4 mr-1.5" /> Add listing
          </Button>
        </div>

        {showAdd && (
          <div className="rounded-2xl bg-card border border-border p-6 mb-6 shadow-[var(--shadow-card)]">
            <h3 className="font-display text-lg font-bold mb-4">New listing</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2"><Label>Product name *</Label><Input value={newP.title} onChange={(e) => setNewP({ ...newP, title: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Price (R) *</Label><Input type="number" min="0" step="0.01" value={newP.price_zar} onChange={(e) => setNewP({ ...newP, price_zar: e.target.value })} /></div>
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={newP.category} onChange={(e) => setNewP({ ...newP, category: e.target.value })}>
                  <option value="">Select</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5"><Label>Size (optional)</Label><Input value={newP.size} onChange={(e) => setNewP({ ...newP, size: e.target.value })} placeholder="e.g. UK 9, M, Large" /></div>
              <div className="space-y-1.5"><Label>Color (optional)</Label><Input value={newP.color} onChange={(e) => setNewP({ ...newP, color: e.target.value })} placeholder="e.g. Black" /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label>Description *</Label><Textarea rows={4} value={newP.description} onChange={(e) => setNewP({ ...newP, description: e.target.value })} placeholder="Condition, details, where to meet…" /></div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Product image *</Label>
                <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={onAdd} disabled={adding} className="bg-[var(--deal)] hover:bg-[var(--deal)]/90 text-[color:var(--deal-foreground)]">
                {adding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Publish listing
              </Button>
            </div>
          </div>
        )}

        {products.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center text-muted-foreground">
            No listings yet. Tap <strong>Add listing</strong> to post your first item.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p: any) => (
              <div key={p.id} className="rounded-2xl bg-card border border-border overflow-hidden shadow-[var(--shadow-card)]">
                <div className="aspect-square bg-muted overflow-hidden relative">
                  {p.image_url && <img src={p.image_url} alt={p.title} className="h-full w-full object-cover" />}
                  {p.is_sold && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="rounded-full bg-destructive text-destructive-foreground text-xs font-bold uppercase tracking-wider px-3 py-1">Sold</span>
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <div className="font-semibold line-clamp-1">{p.title}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" />R{p.price_zar} · {p.category}</div>
                  {(p.size || p.color) && (
                    <div className="text-xs text-muted-foreground">{p.size && `Size ${p.size}`}{p.size && p.color && " · "}{p.color}</div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <label className="flex items-center gap-2 text-xs">
                      <Switch checked={!!p.is_sold} onCheckedChange={(v) => toggleSold(p.id, v)} />
                      <span>{p.is_sold ? "Sold" : "Available"}</span>
                    </label>
                    <Button size="sm" variant="ghost" onClick={() => deleteProduct(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
