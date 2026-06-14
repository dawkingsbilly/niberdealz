import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, ShoppingBag, ShieldCheck, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, PROVINCES, SITE_NAME } from "@/lib/constants";
import { submitVendorRegistration } from "@/lib/marketplace.functions";

export const Route = createFileRoute("/_authenticated/register-shop")({
  component: RegisterShop,
});

function RegisterShop() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const submit = useServerFn(submitVendorRegistration);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    business_name: "",
    owner_name: "",
    whatsapp_number: "",
    city: "",
    province: "",
    category: "",
    business_description: "",
  });
  const [loading, setLoading] = useState(false);
  const [existing, setExisting] = useState<{ status: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("vendors").select("status").eq("id", user.id).maybeSingle()
      .then(({ data }) => { if (data) setExisting({ status: data.status }); });
  }, [user]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (existing) {
    return (
      <div className="min-h-screen bg-[var(--gradient-hero)] flex items-center justify-center px-4">
        <div className="max-w-lg w-full bg-card rounded-2xl p-8 text-center shadow-2xl">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-success/10 text-success mb-4">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="font-display text-2xl font-bold">You're all set, vendor!</h1>
          <p className="text-muted-foreground mt-2">Your shop is registered. Status: <span className="font-semibold text-foreground capitalize">{existing.status}</span>.</p>
          <Button onClick={() => navigate({ to: "/dashboard" })} className="mt-6 bg-[var(--deal)] hover:bg-[var(--deal)]/90 text-[color:var(--deal-foreground)]">Go to dashboard</Button>
        </div>
      </div>
    );
  }

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const canNext1 = form.business_name.length >= 2 && form.owner_name.length >= 2 && /^[+0-9 ]{9,20}$/.test(form.whatsapp_number);
  const canNext2 = form.city.length >= 2 && form.province && form.category;
  const canSubmit = form.business_description.length >= 20;

  const onSubmit = async () => {
    setLoading(true);
    try {
      const res = await submit({ data: form });
      toast.success(
        res.status === "approved" ? "Approved! Welcome to Niber-Dealz." :
        res.status === "rejected" ? "Registration was auto-rejected by our safety check." :
        "Registration submitted! Our team is reviewing it."
      );
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--deal)]"><ShoppingBag className="h-5 w-5" strokeWidth={2.5} /></div>
          <span className="font-display text-xl font-bold">{SITE_NAME}</span>
        </div>

        <div className="bg-card rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? "bg-[var(--deal)]" : "bg-border"}`} />
            ))}
          </div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--deal)]">Step {step} of 3</div>
          <h1 className="font-display text-2xl font-bold mt-1">
            {step === 1 && "Tell us about your business"}
            {step === 2 && "Where are you based?"}
            {step === 3 && "Describe what you sell"}
          </h1>

          <div className="mt-6 space-y-4">
            {step === 1 && (
              <>
                <div className="space-y-1.5"><Label>Business / shop name</Label><Input value={form.business_name} onChange={(e) => update("business_name", e.target.value)} placeholder="e.g. Thabo's Sneaker Co." /></div>
                <div className="space-y-1.5"><Label>Your full name</Label><Input value={form.owner_name} onChange={(e) => update("owner_name", e.target.value)} placeholder="Owner name" /></div>
                <div className="space-y-1.5">
                  <Label>WhatsApp number (with country code)</Label>
                  <Input value={form.whatsapp_number} onChange={(e) => update("whatsapp_number", e.target.value)} placeholder="+27 82 123 4567" inputMode="tel" />
                  <p className="text-xs text-muted-foreground">Buyers will contact you here. Include +27 for SA numbers.</p>
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <div className="space-y-1.5"><Label>City / town</Label><Input value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="e.g. Cape Town" /></div>
                <div className="space-y-1.5">
                  <Label>Province</Label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.province} onChange={(e) => update("province", e.target.value)}>
                    <option value="">Select province</option>
                    {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Main product category</Label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.category} onChange={(e) => update("category", e.target.value)}>
                    <option value="">Select category</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <div className="space-y-1.5">
                  <Label>Tell buyers about your business (min 20 chars)</Label>
                  <Textarea rows={5} value={form.business_description} onChange={(e) => update("business_description", e.target.value)} placeholder="What you sell, how long you've been doing it, what makes you trustworthy…" />
                  <p className="text-xs text-muted-foreground">{form.business_description.length}/2000</p>
                </div>
                <div className="flex gap-3 items-start rounded-lg bg-warning/10 text-warning-foreground border border-warning/30 p-3 text-xs">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-warning" />
                  <p><strong>AI safety check.</strong> Our AI reviewer scans every registration for scams, prohibited items, and suspicious wording. Be honest and specific — sketchy listings get auto-rejected.</p>
                </div>
              </>
            )}
          </div>

          <div className="mt-8 flex gap-2">
            {step > 1 && <Button variant="outline" onClick={() => setStep((s) => s - 1)}>Back</Button>}
            {step < 3 && (
              <Button onClick={() => setStep((s) => s + 1)} disabled={(step === 1 && !canNext1) || (step === 2 && !canNext2)} className="ml-auto bg-[var(--deal)] hover:bg-[var(--deal)]/90 text-[color:var(--deal-foreground)]">Continue</Button>
            )}
            {step === 3 && (
              <Button onClick={onSubmit} disabled={!canSubmit || loading} className="ml-auto bg-[var(--deal)] hover:bg-[var(--deal)]/90 text-[color:var(--deal-foreground)]">
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Submit registration
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
