import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ClipboardList, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { listVendorOrders, updateOrderStatus } from "@/lib/orders.functions";
import { deliveryLabel } from "@/lib/affiliate";

const NEXT: Record<string, { status: string; label: string }> = {
  pending: { status: "confirmed", label: "Confirm order" },
  confirmed: { status: "shipped", label: "Mark as on the way" },
  shipped: { status: "completed", label: "Mark as completed" },
};

export function VendorOrdersCard() {
  const load = useServerFn(listVendorOrders);
  const setStatus = useServerFn(updateOrderStatus);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["vendor-orders"], queryFn: () => load() });

  const orders: any[] = (data as any[]) ?? [];

  const move = async (id: string, status: string, payment_status?: string) => {
    try {
      await setStatus({ data: { order_id: id, status: status as any, payment_status: payment_status as any } });
      toast.success("Order updated.");
      qc.invalidateQueries({ queryKey: ["vendor-orders"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not update the order.");
    }
  };

  return (
    <div className="rounded-2xl bg-card border border-border p-5 shadow-[var(--shadow-card)]">
      <h2 className="font-display text-xl font-bold flex items-center gap-2"><ClipboardList className="h-5 w-5 text-[color:var(--deal)]" />Orders you received</h2>
      {isLoading ? (
        <div className="mt-4 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : orders.length === 0 ? (
        <p className="text-sm text-muted-foreground mt-2">No orders yet. Keep your listings fresh and your photos clear.</p>
      ) : (
        <div className="mt-4 space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Reference {o.reference}</p>
                  <p className="text-sm font-medium">{o.buyer_name} {"\u00b7"} {o.buyer_phone}</p>
                  <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("en-ZA")}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg font-bold">R{Number(o.total_zar).toLocaleString("en-ZA")}</p>
                  <p className="text-xs text-muted-foreground capitalize">{o.status} {"\u00b7"} {o.payment_status}</p>
                </div>
              </div>
              <ul className="mt-3 text-sm text-muted-foreground space-y-1">
                {(o.order_items ?? []).map((i: any) => (
                  <li key={i.id}>{i.qty} x {i.title}{i.size ? ` (size ${i.size})` : ""}{i.color ? ` (${i.color})` : ""}{i.comment ? ` — ${i.comment}` : ""}</li>
                ))}
              </ul>
              <p className="mt-2 text-sm">{deliveryLabel(o.delivery_method)}{o.delivery_address ? ` to ${o.delivery_address}` : ""}</p>
              {o.note && <p className="text-sm text-muted-foreground">Buyer note: {o.note}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {NEXT[o.status] && (
                  <Button size="sm" onClick={() => move(o.id, NEXT[o.status].status)}>{NEXT[o.status].label}</Button>
                )}
                {o.payment_status !== "paid" && o.status !== "cancelled" && (
                  <Button size="sm" variant="outline" onClick={() => move(o.id, o.status, "paid")}>Mark as paid</Button>
                )}
                {o.status !== "completed" && o.status !== "cancelled" && (
                  <Button size="sm" variant="ghost" onClick={() => move(o.id, "cancelled")}>Cancel</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
