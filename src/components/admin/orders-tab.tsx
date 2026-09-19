import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { staffListOrders } from "@/lib/orders.functions";
import { deliveryLabel } from "@/lib/affiliate";

export function OrdersTab() {
  const load = useServerFn(staffListOrders);
  const { data, isLoading } = useQuery({ queryKey: ["staff-orders"], queryFn: () => load() });
  const orders: any[] = (data as any[]) ?? [];

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const revenue = orders.reduce((s, o) => s + Number(o.total_zar || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Orders</p>
          <p className="font-display text-2xl font-bold mt-1">{orders.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Value</p>
          <p className="font-display text-2xl font-bold mt-1">R{revenue.toLocaleString("en-ZA")}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Paid</p>
          <p className="font-display text-2xl font-bold mt-1">{orders.filter((o) => o.payment_status === "paid").length}</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">No orders yet.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Reference {o.reference}</p>
                  <p className="text-sm font-medium">{o.vendors?.business_name ?? "Store"} {"\u00b7"} {o.buyer_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleString("en-ZA")} {"\u00b7"} {deliveryLabel(o.delivery_method)}
                    {o.coupon_code ? ` \u00b7 code ${o.coupon_code}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg font-bold">R{Number(o.total_zar).toLocaleString("en-ZA")}</p>
                  <p className="text-xs text-muted-foreground capitalize">{o.status} {"\u00b7"} {o.payment_status}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
