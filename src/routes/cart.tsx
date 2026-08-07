import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, MessageCircle, ShoppingCart, Store, Trash2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart, buildCartMessage, createOrder, lineKey, type CartItem } from "@/lib/cart";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart | Niberdealz" },
      { name: "description", content: "Review the items you picked, add sizes, colours and a note, then send your order to the seller on WhatsApp." },
      { property: "og:title", content: "Your cart | Niberdealz" },
      { property: "og:description", content: "Review your Niberdealz picks and send your order to the seller on WhatsApp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { user } = useAuth();
  const { items, count, total, setQty, setComment, remove, clear } = useCart();
  const [buyerName, setBuyerName] = useState("");
  const [address, setAddress] = useState("");
  const [tip, setTip] = useState("");
  const [note, setNote] = useState("");
  const [guestOk, setGuestOk] = useState(false);
  const [safetyOk, setSafetyOk] = useState(false);
  const [sent, setSent] = useState<string[]>([]);


  const groups = useMemo(() => {
    const map = new Map<string, CartItem[]>();
    items.forEach((i) => {
      const list = map.get(i.vendor_id) ?? [];
      list.push(i);
      map.set(i.vendor_id, list);
    });
    return Array.from(map.entries());
  }, [items]);

  const identified = !!user || guestOk;

  const checkout = (vendorId: string, list: CartItem[]) => {
    if (!buyerName.trim()) {
      toast.error("Please add your name so the seller knows who is buying.");
      return;
    }
    if (!safetyOk) {
      toast.error("Please accept the safety protocol before you check out.");
      return;
    }
    const number = (list[0].whatsapp_number ?? "").replace(/[^0-9]/g, "");
    if (!number) {
      toast.error("This seller has no WhatsApp number on file.");
      return;
    }
    const tipValue = tip === "" ? 0 : Number(tip);
    const text = buildCartMessage({
      buyerName: buyerName.trim(),
      items: list,
      note: note.trim(),
      address: address.trim(),
      tip: tipValue,
    });
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    const order = createOrder({
      vendor_id: vendorId,
      vendor_name: list[0].vendor_name,
      whatsapp_number: list[0].whatsapp_number,
      buyer_name: buyerName.trim(),
      address: address.trim(),
      note: note.trim(),
      tip: tipValue,
      total: list.reduce((s, i) => s + i.qty * Number(i.price_zar), 0) + (tipValue > 0 ? tipValue : 0),
      items: list,
      safety_accepted: true,
    });
    toast.success(`Order ${order.id} created. Track it on your order status page.`);
    list.forEach((i) => {
      supabase.from("product_events").insert({ product_id: i.product_id, vendor_id: i.vendor_id, event_type: "checkout" }).then(() => {});
    });
    setSent((s) => (s.includes(vendorId) ? s : [...s, vendorId]));
  };


  const confirmSale = (vendorId: string, list: CartItem[], yes: boolean) => {
    list.forEach((i) => {
      supabase.from("product_events").insert({
        product_id: i.product_id,
        vendor_id: i.vendor_id,
        event_type: yes ? "sale_confirmed" : "sale_not_completed",
      }).then(() => {});
    });
    setSent((s) => s.filter((v) => v !== vendorId));
    if (yes) {
      list.forEach((i) => remove(lineKey(i)));
      toast.success("Thanks. We recorded the sale for this seller.");
    } else {
      toast.success("Noted. The items stay in your cart.");
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
          Browsing and adding to your cart is free. You only choose to sign up or continue as a guest when you check out.
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
            <div className="mt-6 space-y-6">
              {groups.map(([vendorId, list]) => (
                <div key={vendorId} className="rounded-2xl bg-card border border-border p-5 shadow-[var(--shadow-card)]">
                  <div className="flex items-center gap-2 font-semibold mb-3">
                    <Store className="h-4 w-4 text-[color:var(--deal)]" />
                    <Link to="/vendor/$id" params={{ id: vendorId }} className="hover:underline">{list[0].vendor_name}</Link>
                  </div>
                  <div className="space-y-4">
                    {list.map((i) => {
                      const key = lineKey(i);
                      return (
                        <div key={key} className="flex gap-3">
                          <div className="h-20 w-20 rounded-xl overflow-hidden bg-muted shrink-0">
                            {i.image_url && <img src={i.image_url} alt={i.title} className="h-full w-full object-cover" />}
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

                  <div className="mt-4 pt-4 border-t flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm">
                      Store total: <strong>R{list.reduce((s, i) => s + i.qty * Number(i.price_zar), 0).toLocaleString("en-ZA")}</strong>
                    </div>
                    <Button
                      disabled={!identified}
                      onClick={() => checkout(vendorId, list)}
                      className="bg-[#25D366] hover:bg-[#25D366]/90 text-white gap-2"
                    >
                      <MessageCircle className="h-4 w-4" /> Check out on WhatsApp
                    </Button>
                  </div>

                  {sent.includes(vendorId) && (
                    <div className="mt-4 rounded-xl border border-border bg-secondary/50 p-4">
                      <p className="text-sm font-medium">Did the sale go through?</p>
                      <p className="text-xs text-muted-foreground mt-0.5">This helps the seller track real sales. It stays private.</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => confirmSale(vendorId, list, true)}>Yes, I bought it</Button>
                        <Button size="sm" variant="outline" onClick={() => confirmSale(vendorId, list, false)}>Not yet</Button>
                        <Button asChild size="sm" variant="ghost"><Link to="/orders">Track this order</Link></Button>
                      </div>
                    </div>
                  )}

                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl bg-card border border-border p-5 shadow-[var(--shadow-card)]">
              <h2 className="font-display text-xl font-bold">Checkout details</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="buyerName">Your name</Label>
                  <Input id="buyerName" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="For example Thabo Sibanda" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tip">Tip for the seller (optional)</Label>
                  <Input id="tip" type="number" min="0" step="1" value={tip} onChange={(e) => setTip(e.target.value)} placeholder="Leave blank to skip" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="address">Address or meetup spot</Label>
                  <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Residence, campus gate, suburb or delivery address" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="note">Comment or special request</Label>
                  <Textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Where you would like to meet, delivery questions, anything else" />
                </div>
              </div>

              {!user && (
                <div className="mt-4 rounded-xl border border-border p-4">
                  <p className="text-sm font-medium">How would you like to check out?</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild size="sm">
                      <Link to="/auth" search={{ mode: "register", next: "/cart" }}><UserPlus className="h-4 w-4 mr-1.5" />Create a free account</Link>
                    </Button>
                    <Button size="sm" variant={guestOk ? "default" : "outline"} onClick={() => setGuestOk(true)}>
                      Continue as guest
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    An account lets you leave reviews, track your orders and get deal alerts. Guests can still message sellers.
                  </p>
                </div>
              )}

              <div className="mt-5 pt-4 border-t flex items-center justify-between">
                <div className="text-sm text-muted-foreground">{count} item{count !== 1 ? "s" : ""}</div>
                <div className="font-display text-2xl font-bold">R{total.toLocaleString("en-ZA")}</div>
              </div>
              <div className="mt-3 flex justify-end">
                <Button variant="ghost" size="sm" onClick={clear}>Clear cart</Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Niberdealz never handles your money. Pay the seller in person after you inspect the item.
              </p>
            </div>
          </>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
