import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BadgeCheck, Loader2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitVerificationRequest, listMyVerificationRequests } from "@/lib/marketplace.functions";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const EXT_BY_MIME: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };

async function uploadProofs(files: File[], userId: string): Promise<string[]> {
  const urls: string[] = [];
  for (const f of files) {
    if (!ALLOWED_MIME.includes(f.type)) throw new Error("Use JPG, PNG, WEBP, GIF or AVIF.");
    if (f.size > 5 * 1024 * 1024) throw new Error("Each image must be under 5 MB.");
    const path = `${userId}/verify-${crypto.randomUUID()}.${EXT_BY_MIME[f.type]}`;
    const { error: uErr } = await supabase.storage.from("vendor-logos").upload(path, f, { upsert: false, contentType: f.type });
    if (uErr) throw uErr;
    const { data: signed, error: sErr } = await supabase.storage.from("vendor-logos").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    if (sErr) throw sErr;
    urls.push(signed.signedUrl);
  }
  return urls;
}

export function VerificationCard({ vendor, userId }: { vendor: any; userId: string }) {
  const qc = useQueryClient();
  const submitFn = useServerFn(submitVerificationRequest);
  const listFn = useServerFn(listMyVerificationRequests);

  const { data } = useQuery({
    queryKey: ["my-verification", userId],
    queryFn: () => listFn({ data: undefined as any }),
  });
  const requests: any[] = (data as any)?.requests ?? [];
  const pending = requests.find((r) => r.status === "pending");
  const latest = requests[0];

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    legal_name: vendor.legal_name ?? "",
    selling_since_months: "2",
    selling_channel: vendor.website_url ? "website" : "whatsapp",
    website_url: vendor.website_url ?? "",
    social_tiktok: vendor.social_tiktok ?? "",
    social_instagram: vendor.social_instagram ?? "",
    social_facebook: vendor.social_facebook ?? "",
    note: "",
  });
  const [files, setFiles] = useState<File[]>([]);

  const submit = async () => {
    if (!form.legal_name.trim()) { toast.error("Add your legal name."); return; }
    if (files.length < 5) { toast.error("Add 5 screenshots of reviews from 5 different customers."); return; }
    setSaving(true);
    try {
      const proof_images = await uploadProofs(files.slice(0, 8), userId);
      await submitFn({ data: {
        legal_name: form.legal_name.trim(),
        selling_since_months: Number(form.selling_since_months),
        selling_channel: form.selling_channel,
        website_url: form.website_url || null,
        social_tiktok: form.social_tiktok || null,
        social_instagram: form.social_instagram || null,
        social_facebook: form.social_facebook || null,
        proof_images,
        note: form.note,
      } as any });
      toast.success("Application sent. Niberdealz will review it.");
      setOpen(false);
      setFiles([]);
      qc.invalidateQueries({ queryKey: ["my-verification"] });
    } catch (e: any) { toast.error(e.message ?? "Could not send application"); }
    finally { setSaving(false); }
  };

  return (
    <div className="rounded-2xl bg-card border border-border p-5 mb-6 shadow-[var(--shadow-card)]">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 shrink-0"><BadgeCheck className="h-6 w-6" /></div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-bold">Verify your store</h3>
          {vendor.verified ? (
            <p className="text-sm text-emerald-600 mt-0.5">Your store is verified. Buyers can see your verified badge on your store page.</p>
          ) : pending ? (
            <p className="text-sm text-amber-600 mt-0.5">Your application is being reviewed. We will let you know as soon as it is decided.</p>
          ) : latest?.status === "rejected" ? (
            <p className="text-sm text-destructive mt-0.5">Your last application was declined. {latest.admin_notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground mt-0.5">
              A verified badge tells buyers you are a real seller with a track record. You need at least about 1.5 to 3 months of selling
              on WhatsApp or your own website, your legal name, your social links and 5 screenshots of reviews from 5 different customers.
            </p>
          )}
        </div>
        {!vendor.verified && !pending && (
          <Button size="sm" onClick={() => setOpen((s) => !s)}>{open ? "Close" : "Apply for verification"}</Button>
        )}
      </div>

      {open && !vendor.verified && !pending && (
        <div className="mt-5 grid sm:grid-cols-2 gap-4 border-t pt-5">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Your legal name *</Label>
            <Input value={form.legal_name} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} placeholder="As it appears on your ID" />
          </div>
          <div className="space-y-1.5">
            <Label>How long have you been selling? *</Label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.selling_since_months} onChange={(e) => setForm({ ...form, selling_since_months: e.target.value })}>
              <option value="2">About 1.5 to 2 months</option>
              <option value="3">About 3 months</option>
              <option value="6">About 6 months</option>
              <option value="12">A year or more</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Where do you sell? *</Label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.selling_channel} onChange={(e) => setForm({ ...form, selling_channel: e.target.value })}>
              <option value="whatsapp">WhatsApp</option>
              <option value="website">My own website</option>
              <option value="both">Both</option>
            </select>
          </div>
          {form.selling_channel !== "whatsapp" && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Your website</Label>
              <Input value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} placeholder="https://yourstore.co.za" />
              <p className="text-xs text-muted-foreground">Stores with their own website can also be listed as an official store.</p>
            </div>
          )}
          <div className="space-y-1.5"><Label>TikTok</Label><Input value={form.social_tiktok} onChange={(e) => setForm({ ...form, social_tiktok: e.target.value })} placeholder="@yourhandle" /></div>
          <div className="space-y-1.5"><Label>Instagram</Label><Input value={form.social_instagram} onChange={(e) => setForm({ ...form, social_instagram: e.target.value })} placeholder="@yourhandle" /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>Facebook</Label><Input value={form.social_facebook} onChange={(e) => setForm({ ...form, social_facebook: e.target.value })} placeholder="yourpage" /></div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Proof of reviews * (5 screenshots from 5 different customers)</Label>
            <label className="flex items-center gap-2 rounded-lg border-2 border-dashed border-border p-4 cursor-pointer hover:border-foreground/40">
              <Upload className="h-4 w-4" />
              <span className="text-sm text-muted-foreground">{files.length > 0 ? `${files.length} selected` : "Choose screenshots"}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => setFiles([...files, ...Array.from(e.target.files ?? [])].slice(0, 8))}
              />
            </label>
            {files.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-2">
                {files.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="relative h-16 w-16 rounded-lg overflow-hidden border">
                    <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                    <button type="button" className="absolute top-0 right-0 bg-background/90 p-0.5" onClick={() => setFiles(files.filter((_, n) => n !== i))}><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Anything else we should know?</Label>
            <Textarea rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Tell us about your selling history" />
          </div>

          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Send application</Button>
          </div>
        </div>
      )}
    </div>
  );
}
