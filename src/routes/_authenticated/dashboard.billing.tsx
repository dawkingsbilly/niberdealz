import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Upload, CheckCircle2, Clock, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { PLANS, BANK_DETAILS, type PlanTier } from "@/lib/constants";
import { submitPayment } from "@/lib/marketplace.functions";

export const Route = createFileRoute("/_authenticated/dashboard/billing")({
  component: Billing,
});

function Billing() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const submit = useServerFn(submitPayment);

  const [plan, setPlan] = useState<PlanTier>("growth");
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: payments = [] } = useQuery({
    queryKey: ["payments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("payments").select("*").eq("vendor_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const onSubmit = async () => {
    if (!file) { toast.error("Upload proof of payment"); return; }
    setLoading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user!.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uErr } = await supabase.storage.from("payment-proofs").upload(path, file);
      if (uErr) throw uErr;
      await submit({ data: { plan, amount_zar: PLANS[plan].price, proof_url: path, reference } });
      toast.success("Payment submitted! Admin will activate your plan once verified.");
      setFile(null); setReference("");
      qc.invalidateQueries({ queryKey: ["payments"] });
    } catch (e: any) {
      toast.error(e.message ?? "Could not submit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="container mx-auto px-4 py-8 flex-1 max-w-3xl">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
        <h1 className="font-display text-3xl font-bold mb-2">Billing</h1>
        <p className="text-muted-foreground mb-6">Pay by EFT and upload your proof of payment. Plans activate once admin approves.</p>

        <div className="rounded-2xl bg-card border border-border p-6 mb-6 shadow-[var(--shadow-card)]">
          <h2 className="font-display text-xl font-bold mb-4">1. Choose a plan</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {(Object.keys(PLANS) as PlanTier[]).map((k) => {
              const p = PLANS[k]; const selected = plan === k;
              return (
                <button key={k} onClick={() => setPlan(k)} className={`text-left rounded-xl p-4 border-2 transition ${selected ? "border-[var(--deal)] bg-[var(--deal)]/5" : "border-border bg-background hover:border-foreground/30"}`}>
                  <div className="font-semibold">{p.name}</div>
                  <div className="font-display text-2xl font-bold mt-1">R{p.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                  <div className="text-xs text-muted-foreground mt-1">{p.productLimit === "unlimited" ? "Unlimited products" : `Up to ${p.productLimit} products`}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border p-6 mb-6 shadow-[var(--shadow-card)]">
          <h2 className="font-display text-xl font-bold mb-1">2. EFT R{PLANS[plan].price} to</h2>
          <p className="text-sm text-muted-foreground mb-4">Use your business name as reference.</p>
          <dl className="grid grid-cols-2 gap-y-2 text-sm bg-secondary/40 rounded-lg p-4">
            <dt className="text-muted-foreground">Bank</dt><dd className="font-medium">{BANK_DETAILS.bank}</dd>
            <dt className="text-muted-foreground">Account name</dt><dd className="font-medium">{BANK_DETAILS.accountName}</dd>
            <dt className="text-muted-foreground">Account number</dt><dd className="font-medium font-mono">{BANK_DETAILS.accountNumber}</dd>
            <dt className="text-muted-foreground">Branch</dt><dd className="font-medium font-mono">{BANK_DETAILS.branch}</dd>
            <dt className="text-muted-foreground">Reference</dt><dd className="font-medium">{BANK_DETAILS.reference}</dd>
          </dl>
        </div>

        <div className="rounded-2xl bg-card border border-border p-6 mb-6 shadow-[var(--shadow-card)]">
          <h2 className="font-display text-xl font-bold mb-4">3. Upload proof of payment</h2>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Reference used (optional)</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. THABOS SNEAKERS" /></div>
            <div className="space-y-1.5">
              <Label>Proof file (screenshot or PDF)</Label>
              <Input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <Button onClick={onSubmit} disabled={loading || !file} className="w-full bg-[var(--deal)] hover:bg-[var(--deal)]/90 text-[color:var(--deal-foreground)]">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Submit payment for R{PLANS[plan].price}
            </Button>
          </div>
        </div>

        <h2 className="font-display text-xl font-bold mb-3">Payment history</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments yet.</p>
        ) : (
          <div className="space-y-2">
            {payments.map((p: any) => {
              const Icon = p.status === "approved" ? CheckCircle2 : p.status === "rejected" ? XCircle : Clock;
              const color = p.status === "approved" ? "text-success" : p.status === "rejected" ? "text-destructive" : "text-warning";
              return (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-4 bg-card">
                  <div>
                    <div className="font-semibold capitalize">{p.plan} plan · R{p.amount_zar}</div>
                    <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</div>
                  </div>
                  <div className={`flex items-center gap-1.5 text-sm font-medium capitalize ${color}`}><Icon className="h-4 w-4" />{p.status}</div>
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
