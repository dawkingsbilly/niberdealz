import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Rocket, Check, Upload, Clock, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PROMO_PLAN_LIST, isPromoActive, type PromoPlanKey, PROMO_PLANS } from "@/lib/promotions";
import { submitPromotionPayment, listMyPromotionPayments } from "@/lib/marketplace.functions";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif", "application/pdf"];
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "application/pdf": "pdf" };

export function PromotionsCard({ vendor, userId }: { vendor: any; userId: string }) {
  const qc = useQueryClient();
  const submit = useServerFn(submitPromotionPayment);
  const listFn = useServerFn(listMyPromotionPayments);
  const [plan, setPlan] = useState<PromoPlanKey | null>(null);
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ["my-promotion-payments", userId],
    queryFn: () => listFn({ data: undefined as any }),
  });
  const payments: any[] = (data as any)?.payments ?? [];
  const pending = payments.find((p) => p.status === "pending");
  const active = isPromoActive(vendor);

  const send = async () => {
    if (!plan) { toast.error("Pick a plan first."); return; }
    if (!file) { toast.error("Attach your proof of payment."); return; }
    if (!ALLOWED.includes(file.type)) { toast.error("Use a JPG, PNG, WEBP or PDF file."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Keep the file under 5 MB."); return; }
    setBusy(true);
    try {
      const path = `${userId}/${crypto.randomUUID()}.${EXT[file.type]}`;
      const { error: uErr } = await supabase.storage.from("payment-proofs").upload(path, file, { contentType: file.type });
      if (uErr) throw uErr;
      const { data: signed, error: sErr } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (sErr) throw sErr;
      await submit({ data: { plan, proof_url: signed.signedUrl, reference: reference || undefined } });
      toast.success("Proof sent. The CEO will activate your boost shortly.");
      setPlan(null); setFile(null); setReference("");
      qc.invalidateQueries({ queryKey: ["my-promotion-payments"] });
    } catch (e: any) {
      toast.error(e.message ?? "Could not submit payment");
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl bg-card border border-border p-6 mb-6 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-xl font-bold flex items-center gap-2"><Rocket className="h-5 w-5" />Promote your store</h2>
          <p className="text-sm text-muted-foreground mt-1">Boosted stores sit above everyone else on the home feed and in search.</p>
        </div>
        {active && (
          <span className="rounded-full bg-[var(--deal)] text-[color:var(--deal-foreground)] text-xs font-bold uppercase tracking-wider px-3 py-1">
            {PROMO_PLANS[vendor.plan as PromoPlanKey]?.name ?? "Boost"} active until {new Date(vendor.plan_active_until).toLocaleDateString()}
          </span>
        )}
      </div>

      {pending && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" />Your {PROMO_PLANS[pending.plan as PromoPlanKey]?.name} payment of R{Number(pending.amount_zar)} is waiting for approval.
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-3 mt-5">
        {PROMO_PLAN_LIST.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPlan(p.key)}
            className={`text-left rounded-xl border-2 p-4 transition ${plan === p.key ? "border-[color:var(--deal)] bg-secondary/50" : "border-border hover:border-foreground/30"}`}
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{p.name}</div>
            <div className="font-display text-2xl font-bold mt-1">R{p.price}</div>
            <div className="text-xs text-muted-foreground">{p.days} days</div>
            <ul className="mt-3 space-y-1">
              {p.perks.map((perk) => (
                <li key={perk} className="text-xs flex gap-1.5"><Check className="h-3.5 w-3.5 shrink-0 text-[color:var(--deal)]" />{perk}</li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      {plan && (
        <div className="mt-5 rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
          <p className="text-sm">
            Send <strong>R{PROMO_PLANS[plan].price}</strong> to the Niberdealz office on WhatsApp, then upload your proof of payment here.
            Your boost starts the moment the CEO approves it.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Payment reference (optional)</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. Capitec 12 Aug" />
            </div>
            <div className="space-y-1.5">
              <Label>Proof of payment *</Label>
              <Input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPlan(null)}>Cancel</Button>
            <Button onClick={send} disabled={busy} className="bg-[var(--deal)] hover:bg-[var(--deal)]/90 text-[color:var(--deal-foreground)]">
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}Submit payment
            </Button>
          </div>
        </div>
      )}

      {payments.length > 0 && (
        <div className="mt-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Payment history</div>
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <span>{PROMO_PLANS[p.plan as PromoPlanKey]?.name ?? p.plan} · R{Number(p.amount_zar)}</span>
                <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</span>
                <span className={`text-xs font-semibold capitalize ${p.status === "approved" ? "text-[color:var(--deal)]" : p.status === "rejected" ? "text-destructive" : "text-amber-600"}`}>{p.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function PromoPopup({ vendor, onPromote }: { vendor: any; onPromote: () => void }) {
  const [open, setOpen] = useState(() => {
    if (typeof localStorage === "undefined") return false;
    if (isPromoActive(vendor)) return false;
    return localStorage.getItem("nd_promo_seen") !== new Date().toISOString().slice(0, 10);
  });
  if (!open) return null;
  const close = () => {
    setOpen(false);
    try { localStorage.setItem("nd_promo_seen", new Date().toISOString().slice(0, 10)); } catch { /* ignore */ }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={close}>
      <div className="bg-card rounded-2xl w-full max-w-md p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={close} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        <Rocket className="h-8 w-8 text-[color:var(--deal)]" />
        <h3 className="font-display text-xl font-bold mt-3">Get seen by more buyers</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Boost your store from just R20 and sit above every normal store on the home feed, in search and in your categories.
        </p>
        <div className="flex gap-2 mt-5">
          {PROMO_PLAN_LIST.map((p) => (
            <div key={p.key} className="flex-1 rounded-lg border border-border p-2 text-center">
              <div className="font-display font-bold">R{p.price}</div>
              <div className="text-[10px] text-muted-foreground">{p.days} days</div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="ghost" onClick={close}>Maybe later</Button>
          <Button onClick={() => { close(); onPromote(); }} className="bg-[var(--deal)] hover:bg-[var(--deal)]/90 text-[color:var(--deal-foreground)]">See plans</Button>
        </div>
      </div>
    </div>
  );
}
