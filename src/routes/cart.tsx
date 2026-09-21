import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2, ShoppingCart, Trash2, Truck, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart, lineKey, type CartItem } from "@/lib/cart";
import { placeOrder } from "@/lib/orders.functions";
import {
  DELIVERY_METHODS,
  MIN_POINTS_TO_SPEND,
  POINT_VALUE_ZAR,
  deliveryLabel,
  parseDeliveryOptions,
  type DeliveryOption,
} from "@/lib/affiliate";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart | Niberdealz" },
      { name: "description", content: "Review your items, choose delivery, apply a coupon or reward points and place your order on Niberdealz." },
      { property: "og:title", content: "Your cart | Niberdealz" },
      { property: "og:description", content: "Review your Niberdealz picks and place your order on the website." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { items, count, total, setQty, setComment, remove, clear } = useCart();

  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [coupon, setCoupon] = useState("");
  const [points, setPoints] = useState("");
  const [method, setMethod] = useState<Record<string, string>>({});
  const [options, setOptions] = useState<Record<string, DeliveryOption[]>>({});
  const [placing, setPlacing] = useState<string | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, CartItem[]>();
    items.forEach((i) => {
      const list = map.get(i.vendor_id) ?? [];
      list.push(i);
      map.set(i.vendor_id, list);
    });
    return Array.from(map.entries());
  }, [items]);

  // Load each seller's delivery options from their first product in the cart.
  useEffect(() => {
    if (items.length === 0) return;
    const ids = Array.from(new Set(items.map((i) => i.product_id)));
    (async () => {
      const { data } = await supabase.from("products").select("id, vendor_id, delivery_options").in("id", ids);
      const next: Record<string, DeliveryOption[]> = {};
      (data ?? []).forEach((p: any) => {
        if (!next[p.vendor_id]) next[p.vendor_id] = parseDeliveryOptions(p.delivery_options);
      });
      setOptions(next);
    })();
  }, [items.length]);

  const submit = async (vendorId: string, list: CartItem[]) => {
    if (!user) {
      toast.error("Please create a free account or sign in to place your order.");
      return;
    }
    if (buyerName.trim().length < 2) { toast.error("Please add your name."); return; }
    if (buyerPhone.trim().length < 9) { toast.error("Please add a contact number."); return; }
    const chosen = method[vendorId] ?? options[vendorId]?.[0]?.method ?? "meetup";
    setPlacing(vendorId);
    try {
      const res = await placeOrder({
        data: {
          vendor_id: vendorId,
          items: list.map((i) => ({
            product_id: i.product_id,
            qty: i.qty,
            size: i.size,
            color: i.color,
            comment: i.comment ?? "",
          })),
          buyer_name: buyerName.trim(),
          buyer_phone: buyerPhone.trim(),
          delivery_method: chosen as any,
          delivery_address: address.trim(),
          note: note.trim(),
          coupon_code: coupon.trim().toUpperCase(),
          points_to_use: points === "" ? 0 : Math.max(0, Math.floor(Number(points))),
        },
      });
      list.forEach((i) => remove(lineKey(i)));
      toast.success(`Order ${res.reference} placed. Total R${res.total_zar.toLocaleString("en-ZA")}.`);
      navigate({ to: "/orders" });
    } catch (err: any) {
      toast.error(err?.message ?? "Could not place your order.");
    } finally {
      setPlacing(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="container mx-auto px-4 py-6 flex-1 max-w-4xl">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Keep browsing
        </Link>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-7 w-7" /> Your cart
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Choose delivery, add a coupon code or reward points, then place your order right here on the website.
        </p>

        {items.length === 0 ? (
          <div className="mt-8 rounded-2xl border-2 border-dashed border-border p-16 text-center">
            <ShoppingCart className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h2 className="font-display text-xl font-semibold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-4">Find something you like and add it here.</p>
            <Button asChild><Link to="/">Browse listings</Link></Button>
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-2xl bg-card border border-border p-5 shadow-[var(--shadow-card)]">
              <h2 className="font-display text-xl font-bold">Your details</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="buyerName">Your name</Label>
                  <Input id="buyerName" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="For example Thabo Sibanda" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="buyerPhone">Contact number</Label>
                  <Input id="buyerPhone" value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} placeholder="For example 068 751 0600" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="address">Delivery or collection address</Label>
                  <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, suburb, city or collection point" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="coupon">Coupon code (optional)</Label>
                  <Input id="coupon" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="Affiliate coupon code" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="points">Reward points to use (optional)</Label>
                  <Input id="points" type="number" min="0" step="1" value={points} onChange={(e) => setPoints(e.target.value)} placeholder={`Minimum ${MIN_POINTS_TO_SPEND} points`} />
                  <p className="text-xs text-muted-foreground">1 point is worth R{POINT_VALUE_ZAR.toFixed(2)}.</p>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="note">Comment or special request</Label>
                  <Textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything the seller should know" />
                </div>
              </div>

              {!user && (
                <div className="mt-4 rounded-xl border border-border p-4">
                  <p className="text-sm font-medium">You need a free account to place an order.</p>
                  <Button asChild size="sm" className="mt-3">
                    <Link to="/auth" search={{ mode: "register", next: "/cart" }}><UserPlus className="h-4 w-4 mr-1.5" />Create a free account</Link>
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-6 space-y-6">
              {groups.map(([vendorId, list]) => {
                const opts = options[vendorId] ?? [];
                const chosen = method[vendorId] ?? opts[0]?.method ?? "meetup";
                const fee = opts.find((o) => o.method === chosen)?.fee_zar ?? 0;
                const days = opts.find((o) => o.method === chosen)?.days ?? null;
                const sub = list.reduce((s, i) => s + i.qty * Number(i.price_zar), 0);
                return (
                  <div key={vendorId} className="rounded-2xl bg-card border border-border p-5 shadow-[var(--shadow-card)]">
                    <div className="space-y-4">
                      {list.map((i) => {
                        const key = lineKey(i);
                        return (
                          <div key={key} className="flex gap-3">
                            <div className="h-20 w-20 rounded-xl overflow-hidden bg-muted shrink-0">
                              {i.image_url && <img src={i.image_url} alt={i.title} loading="lazy" className="h-full w-full object-cover" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <Link to="/product/$id" params={{ id: i.product_id }} className="font-medium hover:underline line-clamp-1">{i.title}</Link>
                              <div className="text-sm text-muted-foreground">
                                R{Number(i.price_zar).toLocaleString("en-ZA")}
                                {i.size ? ` \u00b7 Size ${i.size}` : ""}
                                {i.color ? ` \u00b7 ${i.color}` : ""}
                              </div>
                              <div className="mt-2 flex items-center gap-2">
                                <Button size="sm" variant="outline" onClick={() => setQty(key, i.qty - 1)}>-</Button>
                                <span className="w-8 text-center text-sm font-semibold">{i.qty}</span>
                                <Button size="sm" variant="outline" onClick={() => setQty(key, i.qty + 1)}>+</Button>
                                <Button size="sm" variant="ghost" onClick={() => remove(key)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                              </div>
                              <Input
                                className="mt-2 h-9"
                                value={i.comment}
                                onChange={(e) => setComment(key, e.target.value)}
                                placeholder="Comment for the seller, for example preferred colour"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-semibold flex items-center gap-2"><Truck className="h-4 w-4 text-[color:var(--deal)]" />Delivery</p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {(opts.length ? opts : DELIVERY_METHODS.filter((m) => m.key === "meetup" || m.key === "pickup").map((m) => ({ method: m.key, fee_zar: 0, days: 0 }))).map((o) => (
                          <label key={o.method} className={`flex items-center justify-between gap-2 rounded-xl border p-3 text-sm cursor-pointer ${chosen === o.method ? "border-[color:var(--deal)] bg-[var(--deal)]/5" : "border-border"}`}>
                            <span className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`delivery-${vendorId}`}
                                checked={chosen === o.method}
                                onChange={() => setMethod((m) => ({ ...m, [vendorId]: o.method }))}
                                className="accent-[var(--deal)]"
                              />
                              {deliveryLabel(o.method)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {o.fee_zar > 0 ? `R${o.fee_zar}` : "Free"}{o.days ? ` \u00b7 ${o.days} day${o.days === 1 ? "" : "s"}` : ""}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm">
                        Items: <strong>R{sub.toLocaleString("en-ZA")}</strong>
                        {fee > 0 && <> {"\u00b7"} Delivery R{fee.toLocaleString("en-ZA")}</>}
                        {days ? <> {"\u00b7"} about {days} day{days === 1 ? "" : "s"}</> : null}
                      </div>
                      <Button disabled={!user || placing === vendorId} onClick={() => submit(vendorId, list)}>
                        {placing === vendorId && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Place this order
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 rounded-2xl bg-card border border-border p-5 shadow-[var(--shadow-card)] flex items-center justify-between">
              <div className="text-sm text-muted-foreground">{count} item{count !== 1 ? "s" : ""} in your cart</div>
              <div className="font-display text-2xl font-bold">R{total.toLocaleString("en-ZA")}</div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button asChild variant="outline" size="sm"><Link to="/orders">Your orders</Link></Button>
              <Button variant="ghost" size="sm" onClick={clear}>Clear cart</Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Discounts, delivery fees and totals are calculated on our servers, so what you see is what the seller receives.
            </p>
          </>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
