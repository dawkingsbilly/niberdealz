import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { staffListPayouts, setPayoutStatus } from "@/lib/affiliate.functions";

export function PayoutsTab() {
  const load = useServerFn(staffListPayouts);
  const setStatus = useServerFn(setPayoutStatus);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["staff-payouts"], queryFn: () => load() });
  const payouts: any[] = (data as any[]) ?? [];

  const act = async (id: string, status: "paid" | "rejected") => {
    try {
      await setStatus({ data: { payout_id: id, status } });
      toast.success(status === "paid" ? "Marked as paid." : "Request declined and points returned.");
      qc.invalidateQueries({ queryKey: ["staff-payouts"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not update this request.");
    }
  };

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-3">
      <h2 className="font-display text-xl font-bold flex items-center gap-2"><Wallet className="h-5 w-5" />Affiliate withdrawals</h2>
      {payouts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No withdrawal requests yet.</p>
      ) : (
        payouts.map((p) => (
          <div key={p.id} className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{p.affiliates?.display_name || "Affiliate"} {"\u00b7"} <span className="font-mono">{p.affiliates?.code}</span></p>
              <p className="text-sm">R{Number(p.amount_zar).toLocaleString("en-ZA")} for {p.points_spent} points</p>
              <p className="text-xs text-muted-foreground">{p.method}: {p.details}</p>
              <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString("en-ZA")}</p>
            </div>
            {p.status === "pending" ? (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => act(p.id, "paid")}>Mark as paid</Button>
                <Button size="sm" variant="outline" onClick={() => act(p.id, "rejected")}>Decline</Button>
              </div>
            ) : (
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{p.status}</span>
            )}
          </div>
        ))
      )}
    </div>
  );
}
