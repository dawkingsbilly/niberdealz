import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Store, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, SITE_NAME } from "@/lib/constants";
import { submitVendorRegistration } from "@/lib/marketplace.functions";
import logoAsset from "@/assets/niber-logo.ico.asset.json";

export const Route = createFileRoute("/_authenticated/register-shop")({
  component: RegisterShop,
});

function RegisterShop() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const submit = useServerFn(submitVendorRegistration);

  const [form, setForm] = useState({
    business_name: "",
    owner_name: "",
    whatsapp_number: "",
    city: "",
    category: "",
    business_description: "",
  });
  const [loading, setLoading] = useState(false);
  const [hasShop, setHasShop] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("vendors").select("id").eq("id", user.id).maybeSingle()
      .then(({ data }) => { if (data) setHasShop(true); });
  }, [user]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (hasShop) {
    return (
      <div className="min-h-screen bg-[var(--gradient-hero)] flex items-center justify-center px-4">
        <div className="max-w-lg w-full bg-card rounded-2xl p-8 text-center shadow-2xl">
          <Sparkles className="h-10 w-10 mx-auto text-[color:var(--deal)] mb-3" />
          <h1 className="font-display text-2xl font-bold">Your store is live!</h1>
          <p className="text-muted-foreground mt-2">Start adding listings now.</p>
          <Button onClick={() => navigate({ to: "/dashboard" })} className="mt-6 bg-[var(--deal)] hover:bg-[var(--deal)]/90 text-[color:var(--deal-foreground)]">Go to dashboard</Button>
        </div>
      </div>
    );
  }

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit =
    form.business_name.length >= 2 &&
    form.owner_name.length >= 2 &&
    /^[+0-9 ]{9,20}$/.test(form.whatsapp_number) &&
    form.city.length >= 2 &&
    form.category &&
    form.business_description.length >= 10;

  const onSubmit = async () => {
    setLoading(true);
    try {
      await submit({ data: form });
      toast.success("Welcome to Niberdealz! Your store is live.");
      navigate({ to: "/dashboard" });
    } catch (e: any) {
      toast.error(e.message ?? "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--gradient-hero)] px-4 py-10">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-2 justify-center mb-6 text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--deal)] overflow-hidden">
            <img src={logoAsset.url} alt="" className="h-9 w-9 object-contain" />
          </div>
          <span className="font-display text-xl font-bold">{SITE_NAME}</span>
        </div>

        <div className="bg-card rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--deal)]">
            <Store className="h-4 w-4" /> Free vendor account
          </div>
          <h1 className="font-display text-2xl font-bold mt-1">Create your store</h1>
          <p className="text-muted-foreground text-sm mt-1">Takes a minute. No fees, ever — buyers reach you on WhatsApp.</p>

          <div className="mt-6 space-y-4">
            <div className="space-y-1.5"><Label>Store name</Label><Input value={form.business_name} onChange={(e) => update("business_name", e.target.value)} placeholder="e.g. Thabo's Sneaker Plug" /></div>
            <div className="space-y-1.5"><Label>Your full name</Label><Input value={form.owner_name} onChange={(e) => update("owner_name", e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label>WhatsApp number (with country code)</Label>
              <Input value={form.whatsapp_number} onChange={(e) => update("whatsapp_number", e.target.value)} placeholder="+27 82 123 4567" inputMode="tel" />
              <p className="text-xs text-muted-foreground">Buyers will message you here. Include +27 for SA numbers.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>City / Campus</Label><Input value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="e.g. UJ Kingsway" /></div>
              <div className="space-y-1.5">
                <Label>Main category</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.category} onChange={(e) => update("category", e.target.value)}>
                  <option value="">Select</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Short bio (min 10 chars)</Label>
              <Textarea rows={4} value={form.business_description} onChange={(e) => update("business_description", e.target.value)} placeholder="A line or two about your store." />
            </div>
          </div>

          <Button onClick={onSubmit} disabled={!canSubmit || loading} className="w-full mt-6 bg-[var(--deal)] hover:bg-[var(--deal)]/90 text-[color:var(--deal-foreground)]">
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Open my store
          </Button>
        </div>
      </div>
    </div>
  );
}
