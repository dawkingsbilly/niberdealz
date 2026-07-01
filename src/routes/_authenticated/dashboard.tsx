import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Package, Tag, ExternalLink, Pencil, AlertTriangle, X, Store, Copy, ClipboardList, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { CATEGORIES } from "@/lib/constants";
import { submitProduct, setProductSold, updateProduct, acknowledgeWarning, updateVendorProfile, respondToCampaign } from "@/lib/marketplace.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const EXT_BY_MIME: Record<string, string> = { "image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif","image/avif":"avif" };
const MAX_IMAGES = 6;

async function uploadImages(files: File[], userId: string, bucket = "product-images"): Promise<string[]> {
  const urls: string[] = [];
  for (const f of files) {
    if (!ALLOWED_MIME.includes(f.type)) throw new Error("Use JPG, PNG, WEBP, GIF or AVIF.");
    if (f.size > 5 * 1024 * 1024) throw new Error("Each image must be under 5 MB.");
    const path = `${userId}/${crypto.randomUUID()}.${EXT_BY_MIME[f.type]}`;
    const { error: uErr } = await supabase.storage.from(bucket).upload(path, f, { upsert: false, contentType: f.type });
    if (uErr) throw uErr;
    const { data: signed, error: sErr } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    if (sErr) throw sErr;
    urls.push(signed.signedUrl);
  }
  return urls;
}

function Dashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const submitProductFn = useServerFn(submitProduct);
  const updateFn = useServerFn(updateProduct);
  const setSoldFn = useServerFn(setProductSold);
  const ackFn = useServerFn(acknowledgeWarning);
  const respondFn = useServerFn(respondToCampaign);

  const { data: vendor, isLoading: vLoading } = useQuery({
    queryKey: ["vendor-self", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("vendors").select("*").eq("id", user!.id).maybeSingle();
      return data as any;
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

  const { data: warnings = [] } = useQuery({
    queryKey: ["vendor-warnings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase.from("vendor_warnings" as any) as any).select("*").eq("vendor_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["vendor-campaigns", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: parts } = await (supabase.from("sale_participants" as any) as any).select("*, sale_campaigns(*)").eq("vendor_id", user!.id).order("created_at", { ascending: false });
      return parts ?? [];
    },
  });

  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newP, setNewP] = useState({ title: "", description: "", price_zar: "", category: "", size: "", color: "", stock: "" });
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  if (vLoading || !vendor) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const onAdd = async () => {
    if (!newP.title || !newP.price_zar || !newP.category || newFiles.length === 0) { toast.error("Fill all fields and add at least one image."); return; }
    setAdding(true);
    try {
      const images = await uploadImages(newFiles.slice(0, MAX_IMAGES), user!.id);
      await submitProductFn({ data: {
        title: newP.title, description: newP.description,
        price_zar: Number(newP.price_zar), category: newP.category,
        image_url: images[0], images,
        size: newP.size || null, color: newP.color || null,
        stock: newP.stock === "" ? null : Number(newP.stock),
      }});
      toast.success("Listing live!");
      setNewP({ title: "", description: "", price_zar: "", category: "", size: "", color: "", stock: "" });
      setNewFiles([]);
      setShowAdd(false);
      qc.invalidateQueries({ queryKey: ["vendor-products"] });
    } catch (e: any) { toast.error(e.message ?? "Could not add product"); }
    finally { setAdding(false); }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this listing?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["vendor-products"] }); }
  };

  const toggleSold = async (id: string, isSold: boolean) => {
    try { await setSoldFn({ data: { product_id: id, is_sold: isSold } }); qc.invalidateQueries({ queryKey: ["vendor-products"] }); }
    catch (e: any) { toast.error(e.message); }
  };

  const ack = async (id: string) => {
    try { await ackFn({ data: { warning_id: id } }); qc.invalidateQueries({ queryKey: ["vendor-warnings"] }); }
    catch (e: any) { toast.error(e.message); }
  };

  const respond = async (campaign_id: string, status: "joined" | "declined") => {
    try { await respondFn({ data: { campaign_id, status } }); qc.invalidateQueries({ queryKey: ["vendor-campaigns"] }); toast.success(status === "joined" ? "You joined the sale!" : "Declined."); }
    catch (e: any) { toast.error(e.message); }
  };

  const copyLink = () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/vendor/${vendor.id}`;
    navigator.clipboard?.writeText(url);
    toast.success("Store link copied");
  };

  const activeInvites = (campaigns as any[]).filter(c => c.status === "invited" && c.sale_campaigns && new Date(c.sale_campaigns.ends_at) > new Date());
  const joined = (campaigns as any[]).filter(c => c.status === "joined" && c.sale_campaigns && new Date(c.sale_campaigns.ends_at) > new Date());

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="container mx-auto px-4 py-8 flex-1 max-w-6xl">
        <div className="rounded-2xl bg-card border border-border p-6 mb-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="h-16 w-16 rounded-2xl overflow-hidden bg-muted flex items-center justify-center shrink-0">
              {vendor.logo_url ? <img src={vendor.logo_url} alt="" className="h-full w-full object-cover" /> : <Store className="h-8 w-8 text-muted-foreground" />}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-2xl font-bold truncate">{vendor.business_name}</h1>
              <p className="text-muted-foreground text-sm">{vendor.category} · {vendor.city} · WhatsApp {vendor.whatsapp_number}</p>
              {vendor.status === "pending" && <p className="text-xs text-amber-600 mt-1">⏳ Awaiting CEO approval — your store isn't public yet.</p>}
              {vendor.status === "rejected" && <p className="text-xs text-destructive mt-1">Your store was declined. {vendor.rejection_reason}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={copyLink}><Copy className="h-4 w-4 mr-1.5" />Copy link</Button>
              <Button variant="outline" size="sm" onClick={() => setShowProfile((s) => !s)}><Pencil className="h-4 w-4 mr-1.5" />Edit profile</Button>
              <Button asChild variant="outline" size="sm"><Link to="/vendor/$id" params={{ id: vendor.id }}><ExternalLink className="h-4 w-4 mr-1.5" />View shop</Link></Button>
            </div>
          </div>
        </div>

        {showProfile && (
          <ProfileEditor vendor={vendor} onClose={() => setShowProfile(false)} onSaved={() => { setShowProfile(false); qc.invalidateQueries({ queryKey: ["vendor-self"] }); }} />
        )}

        {warnings.filter((w: any) => !w.acknowledged_at).length > 0 && (
          <div className="rounded-2xl border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/30 p-4 mb-6 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200"><AlertTriangle className="h-5 w-5" />Warnings from Niberdealz</div>
            {warnings.filter((w: any) => !w.acknowledged_at).map((w: any) => (
              <div key={w.id} className="rounded-lg bg-card p-3 border border-amber-200">
                <p className="text-sm whitespace-pre-line text-foreground">{w.message}</p>
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>{new Date(w.created_at).toLocaleString()}</span>
                  <Button size="sm" variant="outline" onClick={() => ack(w.id)}>I understand</Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {(activeInvites.length > 0 || joined.length > 0) && (
          <div className="rounded-2xl border-2 border-[color:var(--deal)] bg-[color:var(--deal)]/5 p-4 mb-6 space-y-3">
            <div className="flex items-center gap-2 font-semibold"><Sparkles className="h-5 w-5 text-[color:var(--deal)]" />Sales campaigns</div>
            {activeInvites.map((c: any) => (
              <div key={c.id} className="rounded-lg bg-card p-3 border">
                <div className="font-semibold">{c.sale_campaigns.title} · -{c.sale_campaigns.discount_pct}%</div>
                <p className="text-xs text-muted-foreground">Runs {new Date(c.sale_campaigns.starts_at).toLocaleDateString()} — {new Date(c.sale_campaigns.ends_at).toLocaleDateString()}</p>
                {c.sale_campaigns.description && <p className="text-sm mt-1 text-foreground/80">{c.sale_campaigns.description}</p>}
                <div className="flex justify-end gap-2 mt-2">
                  <Button size="sm" variant="ghost" onClick={() => respond(c.campaign_id, "declined")}>Decline</Button>
                  <Button size="sm" className="bg-[var(--deal)] hover:bg-[var(--deal)]/90 text-[color:var(--deal-foreground)]" onClick={() => respond(c.campaign_id, "joined")}>Join sale</Button>
                </div>
              </div>
            ))}
            {joined.map((c: any) => (
              <div key={c.id} className="rounded-lg bg-card p-3 border text-sm">
                ✅ You joined <strong>{c.sale_campaigns.title}</strong> (-{c.sale_campaigns.discount_pct}%). Buyers see discounted prices on all your listings until {new Date(c.sale_campaigns.ends_at).toLocaleDateString()}.
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6" />Your listings</h2>
          <Button onClick={() => setShowAdd(!showAdd)} className="bg-[var(--deal)] hover:bg-[var(--deal)]/90 text-[color:var(--deal-foreground)]"><Plus className="h-4 w-4 mr-1.5" /> Add listing</Button>
        </div>

        {showAdd && (
          <div className="rounded-2xl bg-card border border-border p-6 mb-6 shadow-[var(--shadow-card)]">
            <h3 className="font-display text-lg font-bold mb-4">New listing</h3>
            <ProductForm value={newP} onChange={setNewP} files={newFiles} setFiles={setNewFiles} existingUrls={[]} />
            <div className="flex gap-2 mt-5 justify-end">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={onAdd} disabled={adding} className="bg-[var(--deal)] hover:bg-[var(--deal)]/90 text-[color:var(--deal-foreground)]">{adding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Publish listing</Button>
            </div>
          </div>
        )}

        {products.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center text-muted-foreground">No listings yet. Tap <strong>Add listing</strong> to post your first item.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p: any) => (
              <div key={p.id} className="rounded-2xl bg-card border border-border overflow-hidden shadow-[var(--shadow-card)]">
                <div className="aspect-square bg-muted overflow-hidden relative">
                  {p.image_url && <img src={p.image_url} alt={p.title} className="h-full w-full object-cover" />}
                  {p.is_sold && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><span className="rounded-full bg-destructive text-destructive-foreground text-xs font-bold uppercase tracking-wider px-3 py-1">Sold</span></div>}
                </div>
                <div className="p-4 space-y-2">
                  <div className="font-semibold line-clamp-1">{p.title}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1.5 flex-wrap">
                    <Tag className="h-3.5 w-3.5" />R{p.price_zar} · {p.category}
                    {typeof p.stock === "number" && <span className="inline-flex items-center gap-1"><ClipboardList className="h-3 w-3" />{p.stock} in stock</span>}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <label className="flex items-center gap-2 text-xs">
                      <Switch checked={!!p.is_sold} onCheckedChange={(v) => toggleSold(p.id, v)} />
                      <span>{p.is_sold ? "Sold" : "Available"}</span>
                    </label>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteProduct(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {editing && (
          <EditDialog product={editing} userId={user!.id} updateFn={updateFn} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["vendor-products"] }); }} />
        )}
      </div>
      <SiteFooter />
    </div>
  );
}

function ProductForm({ value, onChange, files, setFiles, existingUrls, onRemoveExisting }: {
  value: any; onChange: (v: any) => void;
  files: File[]; setFiles: (f: File[]) => void;
  existingUrls: string[]; onRemoveExisting?: (u: string) => void;
}) {
  const totalCount = existingUrls.length + files.length;
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div className="space-y-1.5 sm:col-span-2"><Label>Product name *</Label><Input value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Price (R) *</Label><Input type="number" min="0" step="0.01" value={value.price_zar} onChange={(e) => onChange({ ...value, price_zar: e.target.value })} /></div>
      <div className="space-y-1.5">
        <Label>Category *</Label>
        <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={value.category} onChange={(e) => onChange({ ...value, category: e.target.value })}>
          <option value="">Select</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="space-y-1.5"><Label>Stock quantity (leave blank if not applicable)</Label><Input type="number" min="0" step="1" value={value.stock ?? ""} onChange={(e) => onChange({ ...value, stock: e.target.value })} placeholder="e.g. 10" /></div>
      <div className="space-y-1.5"><Label>Size (optional)</Label><Input value={value.size} onChange={(e) => onChange({ ...value, size: e.target.value })} placeholder="e.g. UK 9, M, Large" /></div>
      <div className="space-y-1.5"><Label>Color (optional)</Label><Input value={value.color} onChange={(e) => onChange({ ...value, color: e.target.value })} placeholder="e.g. Black" /></div>
      <div className="space-y-1.5 sm:col-span-2"><Label>Description *</Label><Textarea rows={4} value={value.description} onChange={(e) => onChange({ ...value, description: e.target.value })} placeholder="Condition, details, where to meet…" /></div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Photos * (up to {MAX_IMAGES}, first one is the cover)</Label>
        {(existingUrls.length > 0 || files.length > 0) && (
          <div className="flex flex-wrap gap-2 mb-2">
            {existingUrls.map((u) => (
              <div key={u} className="relative h-20 w-20 rounded-lg overflow-hidden border">
                <img src={u} alt="" className="h-full w-full object-cover" />
                {onRemoveExisting && (
                  <button type="button" onClick={() => onRemoveExisting(u)} className="absolute top-0 right-0 bg-black/70 text-white rounded-bl p-0.5"><X className="h-3 w-3" /></button>
                )}
              </div>
            ))}
            {files.map((f, i) => (
              <div key={i} className="relative h-20 w-20 rounded-lg overflow-hidden border">
                <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="absolute top-0 right-0 bg-black/70 text-white rounded-bl p-0.5"><X className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
        )}
        <Input type="file" accept="image/*" multiple onChange={(e) => {
          const picked = Array.from(e.target.files ?? []);
          const remaining = MAX_IMAGES - totalCount;
          setFiles([...files, ...picked.slice(0, Math.max(0, remaining))]);
          e.target.value = "";
        }} />
        <p className="text-xs text-muted-foreground">{totalCount}/{MAX_IMAGES} photos</p>
      </div>
    </div>
  );
}

function EditDialog({ product, userId, updateFn, onClose, onSaved }: any) {
  const [value, setValue] = useState({
    title: product.title, description: product.description,
    price_zar: String(product.price_zar), category: product.category,
    size: product.size ?? "", color: product.color ?? "",
    stock: product.stock === null || product.stock === undefined ? "" : String(product.stock),
  });
  const [existing, setExisting] = useState<string[]>(product.images?.length ? product.images : (product.image_url ? [product.image_url] : []));
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (existing.length + files.length === 0) { toast.error("Add at least one photo."); return; }
    setSaving(true);
    try {
      const uploaded = await uploadImages(files, userId);
      const images = [...existing, ...uploaded].slice(0, MAX_IMAGES);
      await updateFn({ data: {
        product_id: product.id,
        title: value.title, description: value.description,
        price_zar: Number(value.price_zar), category: value.category,
        images, size: value.size || null, color: value.color || null,
        stock: value.stock === "" ? null : Number(value.stock),
      }});
      toast.success("Listing updated");
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-card rounded-2xl w-full max-w-2xl my-8 p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold">Edit listing</h3>
          <Button size="sm" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <ProductForm value={value} onChange={setValue} files={files} setFiles={setFiles} existingUrls={existing} onRemoveExisting={(u) => setExisting(existing.filter((x) => x !== u))} />
        <div className="flex gap-2 mt-5 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save changes</Button>
        </div>
      </div>
    </div>
  );
}

function ProfileEditor({ vendor, onClose, onSaved }: { vendor: any; onClose: () => void; onSaved: () => void }) {
  const updateFn = useServerFn(updateVendorProfile);
  const [form, setForm] = useState({
    business_name: vendor.business_name ?? "",
    owner_name: vendor.owner_name ?? "",
    whatsapp_number: vendor.whatsapp_number ?? "",
    city: vendor.city ?? "",
    category: vendor.category ?? "",
    business_description: vendor.business_description ?? "",
    logo_url: vendor.logo_url ?? "",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      let logo_url = form.logo_url;
      if (logoFile) {
        const [url] = await uploadImages([logoFile], vendor.id, "vendor-logos");
        logo_url = url;
      }
      await updateFn({ data: { ...form, logo_url: logo_url || null } });
      toast.success("Store profile updated");
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const upd = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="rounded-2xl bg-card border border-border p-6 mb-6 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-bold">Edit store profile</h3>
        <Button size="sm" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Store profile picture / logo *</Label>
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 rounded-xl overflow-hidden bg-muted flex items-center justify-center shrink-0">
              {logoFile ? <img src={URL.createObjectURL(logoFile)} className="h-full w-full object-cover" alt="" /> :
                form.logo_url ? <img src={form.logo_url} className="h-full w-full object-cover" alt="" /> :
                <Store className="h-7 w-7 text-muted-foreground" />}
            </div>
            <Input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <div className="space-y-1.5"><Label>Store / business name</Label><Input value={form.business_name} onChange={(e) => upd("business_name", e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Owner / your name</Label><Input value={form.owner_name} onChange={(e) => upd("owner_name", e.target.value)} /></div>
        <div className="space-y-1.5"><Label>WhatsApp number</Label><Input value={form.whatsapp_number} onChange={(e) => upd("whatsapp_number", e.target.value)} /></div>
        <div className="space-y-1.5"><Label>City / campus</Label><Input value={form.city} onChange={(e) => upd("city", e.target.value)} /></div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Main category</Label>
          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.category} onChange={(e) => upd("category", e.target.value)}>
            <option value="">Select</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1.5 sm:col-span-2"><Label>About your store</Label><Textarea rows={4} value={form.business_description} onChange={(e) => upd("business_description", e.target.value)} /></div>
      </div>
      <div className="flex gap-2 mt-4 justify-end">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save profile</Button>
      </div>
    </div>
  );
}
