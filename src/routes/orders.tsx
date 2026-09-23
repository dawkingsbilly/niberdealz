import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ClipboardList, Loader2, MapPin, Truck } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { listMyOrders, type CustomerOrder } from "@/lib/orders.functions";
import { deliveryLabel } from "@/lib/affiliate";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Your orders | Niberdealz" },
      {
        name: "description",
        content: "See your NiberDealz order requests, delivery method and their current progress.",
      },
      { property: "og:title", content: "Your orders | Niberdealz" },
      {
        property: "og:description",
        content: "Track your NiberDealz order requests from submission to delivery.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrdersPage,
});

const STATUS_LABEL: Record<string, string> = {
  pending: "Request received",
  processing: "Being prepared",
  shipped: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function money(value: unknown) {
  return `R${Number(value ?? 0).toLocaleString("en-ZA")}`;
}

function OrdersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const fetchOrders = useServerFn(listMyOrders);
  const { data, isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => fetchOrders(),
    enabled: !!user,
  });

  const orders: CustomerOrder[] = data ?? [];

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="container mx-auto px-4 py-6 flex-1 max-w-3xl">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Keep browsing
        </Link>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <ClipboardList className="h-7 w-7" /> Your orders
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Every order request is saved to your account with its total, delivery method and progress.
        </p>

        {!authLoading && !user ? (
          <div className="mt-8 rounded-2xl border-2 border-dashed border-border p-14 text-center">
            <h2 className="font-display text-xl font-semibold mb-2">Sign in to see your orders</h2>
            <p className="text-muted-foreground mb-4">
              Your order history is tied to your free account.
            </p>
            <Button asChild>
              <Link to="/auth" search={{ mode: "login", next: "/orders" }}>
                Sign in
              </Link>
            </Button>
          </div>
        ) : isLoading || authLoading ? (
          <div className="mt-10 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : orders.length === 0 ? (
          <div className="mt-8 rounded-2xl border-2 border-dashed border-border p-14 text-center">
            <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h2 className="font-display text-xl font-semibold mb-2">No orders yet</h2>
            <p className="text-muted-foreground mb-4">
              When you submit an order request, it shows up here.
            </p>
            <Button asChild>
              <Link to="/">Browse listings</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-2xl bg-card border border-border p-5 shadow-[var(--shadow-card)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Reference {order.reference}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Submitted {new Date(order.created_at).toLocaleString("en-ZA")}
                    </p>
                  </div>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">
                    {STATUS_LABEL[order.status] ?? "Under review"}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {(order.order_items ?? []).map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="h-16 w-16 rounded-xl overflow-hidden bg-muted shrink-0">
                        {item.image_url && (
                          <img
                            src={item.image_url}
                            alt={item.title}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0 text-sm">
                        {item.product_id ? (
                          <Link
                            to="/product/$id"
                            params={{ id: item.product_id }}
                            className="font-medium hover:underline line-clamp-1"
                          >
                            {item.title}
                          </Link>
                        ) : (
                          <span className="font-medium line-clamp-1">{item.title}</span>
                        )}
                        <p className="text-muted-foreground">
                          Qty {item.qty} &middot; {money(item.unit_price_zar)}
                          {item.size ? ` · Size ${item.size}` : ""}
                          {item.color ? ` · ${item.color}` : ""}
                        </p>
                        {item.comment && (
                          <p className="text-xs text-muted-foreground">Note: {item.comment}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t text-sm space-y-1">
                  <p className="flex items-center gap-1.5">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    {deliveryLabel(order.delivery_method)}
                    {order.delivery_days
                      ? ` · about ${order.delivery_days} day${order.delivery_days === 1 ? "" : "s"}`
                      : ""}
                  </p>
                  {order.delivery_address && (
                    <p className="flex items-start gap-1.5">
                      <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      {order.delivery_address}
                    </p>
                  )}
                  <p>
                    <span className="text-muted-foreground">Items:</span>{" "}
                    {money(order.subtotal_zar)}
                  </p>
                  {Number(order.discount_zar) > 0 && (
                    <p className="text-success">
                      <span className="text-muted-foreground">Discount:</span>{" "}
                      {money(order.discount_zar)}
                      {order.coupon_code ? ` (code ${order.coupon_code})` : ""}
                    </p>
                  )}
                  {Number(order.delivery_fee_zar) > 0 && (
                    <p>
                      <span className="text-muted-foreground">Delivery:</span>{" "}
                      {money(order.delivery_fee_zar)}
                    </p>
                  )}
                  {Number(order.shipping_discount_zar) > 0 && (
                    <p className="text-success">
                      <span className="text-muted-foreground">Shipping offer:</span> −
                      {money(order.shipping_discount_zar)}
                    </p>
                  )}
                  <p className="font-display text-lg font-bold">Total {money(order.total_zar)}</p>
                  <p className="pt-1 text-xs text-muted-foreground">
                    Card payments are not available on this site. NiberDealz will contact you after
                    reviewing your request.
                  </p>
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
