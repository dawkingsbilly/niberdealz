import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ClipboardList, Loader2, MapPin, Truck } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { listMyOrders } from "@/lib/orders.functions";
import { deliveryLabel } from "@/lib/affiliate";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Your orders | Niberdealz" },
      { name: "description", content: "See every order you placed on Niberdealz, what you paid, the delivery method and how far along your order is." },
      { property: "og:title", content: "Your orders | Niberdealz" },
      { property: "og:description", content: "Track your Niberdealz orders from placed to completed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrdersPage,
});

const STATUS_LABEL: Record<string, string> = {
  pending: "Placed, waiting for the seller",
  confirmed: "Confirmed by the seller",
  shipped: "On the way",
  completed: "Completed",
  cancelled: "Cancelled",
};

const PAYMENT_LABEL: Record<string, string> = {
  unpaid: "Awaiting payment",
  paid: "Paid",
  refunded: "Refunded",
};

function money(v: unknown) {
  return `R${Number(v ?? 0).toLocaleString("en-ZA")}`;
}

function OrdersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const fetchOrders = useServerFn(listMyOrders);
  const { data, isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => fetchOrders(),
    enabled: !!user,
  });

  const orders: any[] = (data as any[]) ?? [];

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="container mx-auto px-4 py-6 flex-1 max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Keep browsing
        </Link>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <ClipboardList className="h-7 w-7" /> Your orders
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Every order you place on the website is saved to your account with its totals, delivery method and status.
        </p>

        {!authLoading && !user ? (
          <div className="mt-8 rounded-2xl border-2 border-dashed border-border p-14 text-center">
            <h2 className="font-display text-xl font-semibold mb-2">Sign in to see your orders</h2>
            <p className="text-muted-foreground mb-4">Your order history is tied to your free account.</p>
            <Button asChild><Link to="/auth" search={{ mode: "login", next: "/orders" }}>Sign in</Link></Button>
          </div>
        ) : isLoading || authLoading ? (
          <div className="mt-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : orders.length === 0 ? (
          <div className="mt-8 rounded-2xl border-2 border-dashed border-border p-14 text-center">
            <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h2 className="font-display text-xl font-semibold mb-2">No orders yet</h2>
            <p className="text-muted-foreground mb-4">When you place an order it shows up here.</p>
            <Button asChild><Link to="/">Browse listings</Link></Button>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {orders.map((o) => (
              <div key={o.id} className="rounded-2xl bg-card border border-border p-5 shadow-[var(--shadow-card)]">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Reference {o.reference}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Placed {new Date(o.created_at).toLocaleString("en-ZA")}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">{STATUS_LABEL[o.status] ?? o.status}</span>
                    <span className="text-xs text-muted-foreground">{PAYMENT_LABEL[o.payment_status] ?? o.payment_status}</span>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {(o.order_items ?? []).map((i: any) => (
                    <div key={i.id} className="flex gap-3">
                      <div className="h-16 w-16 rounded-xl overflow-hidden bg-muted shrink-0">
                        {i.image_url && <img src={i.image_url} alt={i.title} loading="lazy" className="h-full w-full object-cover" />}
                      </div>
                      <div className="min-w-0 text-sm">
                        {i.product_id ? (
                          <Link to="/product/$id" params={{ id: i.product_id }} className="font-medium hover:underline line-clamp-1">{i.title}</Link>
                        ) : (
                          <span className="font-medium line-clamp-1">{i.title}</span>
                        )}
                        <p className="text-muted-foreground">
                          Qty {i.qty} &middot; {money(i.unit_price_zar)}
                          {i.size ? ` \u00b7 Size ${i.size}` : ""}
                          {i.color ? ` \u00b7 ${i.color}` : ""}
                        </p>
                        {i.comment && <p className="text-xs text-muted-foreground">Note: {i.comment}</p>}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t text-sm space-y-1">
                  <p className="flex items-center gap-1.5"><Truck className="h-4 w-4 text-muted-foreground" />{deliveryLabel(o.delivery_method)}{o.delivery_days ? ` \u00b7 about ${o.delivery_days} day${o.delivery_days === 1 ? "" : "s"}` : ""}</p>
                  {o.delivery_address && <p className="flex items-start gap-1.5"><MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />{o.delivery_address}</p>}
                  <p><span className="text-muted-foreground">Items:</span> {money(o.subtotal_zar)}</p>
                  {Number(o.discount_zar) > 0 && <p className="text-success"><span className="text-muted-foreground">Discount:</span> {money(o.discount_zar)}{o.coupon_code ? ` (code ${o.coupon_code})` : ""}</p>}
                  {Number(o.delivery_fee_zar) > 0 && <p><span className="text-muted-foreground">Delivery:</span> {money(o.delivery_fee_zar)}</p>}
                  <p className="font-display text-lg font-bold">Total {money(o.total_zar)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
