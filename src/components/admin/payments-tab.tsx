import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Rocket, Check, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PROMO_PLANS, type PromoPlanKey } from "@/lib/promotions";
import { staffListPromotionPayments, setPromotionPaymentStatus } from "@/lib/marketplace.functions";

export function PaymentsTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(staffListPromotionPayments);
  const setStatus = useServerFn(setPromotionPaymentStatus);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["staff-promotion-payments"],
    queryFn: () => listFn({ data: undefined as any }),
  });
  const payments: any[] = (data as any)?.payments ?? [];

  const act = async (id: string, status: "approved" | "rejected") => {
    setBusy(id);
    try {
      await setStatus({ data: { payment_id: id, status, admin_notes: notes[id] || undefined } });
      toast.success(status === "approved" ? "Boost activated" : "Payment declined");
      qc.invalidateQueries({ queryKey: ["staff-promotion-payments"] });
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  };

  if (isLoading) return <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  const pending = payments.filter((p) => p.status === "pending");
  const rest = payments.filter((p) => p.status !== "pending");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold flex items-center gap-2"><Rocket className="h-5 w-5" />Promotion payments</h2>
        <p className="text-sm text-muted-foreground mt-1">Approve a payment to switch that store's boost on. Starter R20 for 7 days, Growth R30 for 14 days, Unlimited R50 for 30 days.</p>
      </div>

      {pending.length === 0 && <p className="text-sm text-muted-foreground">No payments waiting for review.</p>}

      {pending.map((p) => (
        <div key={p.id} className="rounded-2xl border-2 border-amber-400 bg-card p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-semibold">{p.vendors?.business_name ?? "Store"}</div>
              <div className="text-xs text-muted-foreground">{p.vendors?.owner_name} · {p.vendors?.email} · {p.vendors?.city}</div>
            </div>
            <div className="text-right">
              <div className="font-display text-lg font-bold">R{Number(p.amount_zar)}</div>
              <div className="text-xs text-muted-foreground">{PROMO_PLANS[p.plan as PromoPlanKey]?.name ?? p.plan}</div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Submitted {new Date(p.created_at).toLocaleString()}{p.reference ? ` · Reference: ${p.reference}` : ""}
          </div>
          <a href={p.proof_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold underline">
            <ExternalLink className="h-4 w-4" />View proof of payment
          </a>
          <Input placeholder="Note for the seller (optional)" value={notes[p.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [p.id]: e.target.value }))} />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" disabled={busy === p.id} onClick={() => act(p.id, "rejected")}><X className="h-4 w-4 mr-1.5" />Decline</Button>
            <Button size="sm" disabled={busy === p.id} onClick={() => act(p.id, "approved")} className="bg-[var(--deal)] hover:bg-[var(--deal)]/90 text-[color:var(--deal-foreground)]">
              {busy === p.id ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Check className="h-4 w-4 mr-1.5" />}Approve and activate
            </Button>
          </div>
        </div>
      ))}

      {rest.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">History</div>
          <div className="space-y-2">
            {rest.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <span className="font-medium">{p.vendors?.business_name ?? "Store"}</span>
                <span className="text-xs text-muted-foreground">{PROMO_PLANS[p.plan as PromoPlanKey]?.name ?? p.plan} · R{Number(p.amount_zar)} · {new Date(p.created_at).toLocaleDateString()}</span>
                <span className={`text-xs font-semibold capitalize ${p.status === "approved" ? "text-[color:var(--deal)]" : "text-destructive"}`}>{p.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
