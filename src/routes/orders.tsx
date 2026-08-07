import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, ClipboardList, MapPin, MessageCircle, ShieldAlert, Store, Trash2, XCircle } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { useOrders, ORDER_STEPS, type Order, type OrderStatus } from "@/lib/cart";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Order status | Niberdealz" },
      { name: "description", content: "Track every order you sent to a Niberdealz store, follow the safe meetup protocol and mark your order as completed." },
      { property: "og:title", content: "Order status | Niberdealz" },
      { property: "og:description", content: "Track your Niberdealz orders and follow the safe meetup protocol from order sent to completed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrdersPage,
});

const STATUS_LABEL: Record<OrderStatus, string> = {
  sent: "Order sent",
  meetup_agreed: "Meetup agreed",
  completed: "Completed",
  cancelled: "Cancelled",
};

function StatusTrack({ status }: { status: OrderStatus }) {
  if (status === "cancelled") {
    return (
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
        <XCircle className="h-3.5 w-3.5" /> Cancelled
      </div>
    );
  }
  const idx = ORDER_STEPS.findIndex((s) => s.key === status);
  return (
    <ol className="mt-4 space-y-3">
      {ORDER_STEPS.map((step, i) => {
        const done = i <= idx;
        return (
          <li key={step.key} className="flex gap-3">
            <span
              className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center ${done ? "border-[color:var(--deal)] bg-[var(--deal)] text-[color:var(--deal-foreground)]" : "border-border"}`}
            >
              {done && <CheckCircle2 className="h-3.5 w-3.5" />}
            </span>
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${done ? "" : "text-muted-foreground"}`}>{step.label}</p>
              <p className="text-xs text-muted-foreground">{step.hint}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function OrderCard({ order, onStatus, onRemove }: { order: Order; onStatus: (s: OrderStatus) => void; onRemove: () => void }) {
  const wa = (order.whatsapp_number ?? "").replace(/[^0-9]/g, "");
  return (
    <div className="rounded-2xl bg-card border border-border p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Reference {order.id}</p>
          <div className="flex items-center gap-2 font-semibold">
            <Store className="h-4 w-4 text-[color:var(--deal)]" />
            <Link to="/vendor/$id" params={{ id: order.vendor_id }} className="hover:underline">{order.vendor_name}</Link>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Placed {new Date(order.created_at).toLocaleString("en-ZA")}
          </p>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">{STATUS_LABEL[order.status]}</span>
      </div>

      <div className="mt-4 space-y-3">
        {order.items.map((i, n) => (
          <div key={`${i.product_id}-${n}`} className="flex gap-3">
            <div className="h-16 w-16 rounded-xl overflow-hidden bg-muted shrink-0">
              {i.image_url && <img src={i.image_url} alt={i.title} className="h-full w-full object-cover" loading="lazy" />}
            </div>
            <div className="min-w-0 text-sm">
              <Link to="/product/$id" params={{ id: i.product_id }} className="font-medium hover:underline line-clamp-1">{i.title}</Link>
              <p className="text-muted-foreground">
                Qty {i.qty} &middot; R{Number(i.price_zar).toLocaleString("en-ZA")}
                {i.size ? ` \u00b7 Size ${i.size}` : ""}
                {i.color ? ` \u00b7 ${i.color}` : ""}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t text-sm space-y-1">
        <p><span className="text-muted-foreground">Buyer:</span> {order.buyer_name}</p>
        {order.address && <p className="flex items-start gap-1.5"><MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />{order.address}</p>}
        {order.tip > 0 && <p><span className="text-muted-foreground">Tip:</span> R{order.tip.toLocaleString("en-ZA")}</p>}
        <p className="font-display text-lg font-bold">Total R{order.total.toLocaleString("en-ZA")}</p>
      </div>

      <StatusTrack status={order.status} />

      <div className="mt-4 flex flex-wrap gap-2">
        {wa && order.status !== "completed" && order.status !== "cancelled" && (
          <Button asChild size="sm" className="bg-[#25D366] hover:bg-[#25D366]/90 text-white gap-2">
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4" /> Message the seller
            </a>
          </Button>
        )}
        {order.status === "sent" && (
          <Button size="sm" variant="outline" onClick={() => onStatus("meetup_agreed")}>We agreed on a meetup</Button>
        )}
        {order.status === "meetup_agreed" && (
          <Button size="sm" onClick={() => onStatus("completed")}>I inspected it and paid</Button>
        )}
        {order.status !== "completed" && order.status !== "cancelled" && (
          <Button size="sm" variant="ghost" onClick={() => onStatus("cancelled")}>Cancel order</Button>
        )}
        {(order.status === "completed" || order.status === "cancelled") && (
          <Button size="sm" variant="ghost" onClick={onRemove}><Trash2 className="h-4 w-4 mr-1.5 text-destructive" />Remove</Button>
        )}
      </div>
    </div>
  );
}

function OrdersPage() {
  const { orders, setStatus, removeOrder } = useOrders();

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="container mx-auto px-4 py-6 flex-1 max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Keep browsing
        </Link>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <ClipboardList className="h-7 w-7" /> Order status
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Every order you send on WhatsApp is tracked here on this device, from order sent to completed.
        </p>

        <div className="mt-5 rounded-2xl border border-[color:var(--deal)]/40 bg-[var(--deal)]/5 p-5">
          <h2 className="font-semibold flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-[color:var(--deal)]" />Safety protocol for every order</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-foreground/80 space-y-1">
            <li>Never send money upfront. Pay in person, after you inspected the item and are happy with it.</li>
            <li>Meet in a busy public place in daylight, on campus or at a mall, never at a private address you cannot verify.</li>
            <li>Tell a friend where you are going, who you are meeting and when you will be back.</li>
            <li>Keep the whole conversation on the WhatsApp number listed on the store, and screenshot it.</li>
            <li>Buying far away? Ask for a live video of the item before you travel or pay anything.</li>
            <li>Never share your ID number, banking PIN, OTP or NSFAS details with a buyer or seller.</li>
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline"><Link to="/safety">Read the full safety guidelines</Link></Button>
            <Button asChild size="sm" variant="ghost"><Link to="/contact">Report a problem</Link></Button>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="mt-6 rounded-2xl border-2 border-dashed border-border p-14 text-center">
            <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h2 className="font-display text-xl font-semibold mb-2">No orders yet</h2>
            <p className="text-muted-foreground mb-4">When you check out on WhatsApp, your order shows up here.</p>
            <Button asChild><Link to="/">Browse listings</Link></Button>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {orders.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                onStatus={(s) => {
                  setStatus(o.id, s);
                  toast.success(s === "completed" ? "Order marked as completed." : s === "cancelled" ? "Order cancelled." : "Meetup noted. Stay safe out there.");
                }}
                onRemove={() => removeOrder(o.id)}
              />
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
