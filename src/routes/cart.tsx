import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MapPin,
  ShoppingCart,
  Trash2,
  Truck,
  UserPlus,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart, type CartItem } from "@/lib/cart";
import { createNiberDealzOrder } from "@/lib/ecommerce.functions";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Checkout | NiberDealz" },
      {
        name: "description",
        content: "Place a NiberDealz order with delivery pricing shown upfront.",
      },
    ],
  }),
  component: CartPage,
});
type DeliveryTier =
  | "courier"
  | "paxi_standard_5kg"
  | "paxi_express_5kg"
  | "paxi_standard_10kg"
  | "paxi_express_10kg";
const tierInfo: Record<DeliveryTier, { label: string; fee: number; detail: string }> = {
  courier: { label: "Courier", fee: 150, detail: "Door-to-door delivery" },
  paxi_standard_5kg: {
    label: "PAXI Standard · up to 5kg",
    fee: 59.95,
    detail: "7–9 business days",
  },
  paxi_express_5kg: { label: "PAXI Express · up to 5kg", fee: 109.95, detail: "3–5 business days" },
  paxi_standard_10kg: {
    label: "PAXI Standard · up to 10kg",
    fee: 109.95,
    detail: "7–9 business days",
  },
  paxi_express_10kg: {
    label: "PAXI Express · up to 10kg",
    fee: 139.95,
    detail: "3–5 business days",
  },
};
const money = (value: number) =>
  `R${value.toLocaleString("en-ZA", { minimumFractionDigits: value % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

function CartPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { items, count, total, setQty, setComment, remove, clear, lineKey } = useCart();
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [method, setMethod] = useState<"courier" | "paxi" | "pickup">("courier");
  const [tier, setTier] = useState<DeliveryTier>("courier");
  const [pickupPoint, setPickupPoint] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    reference: string;
    total: number;
    deliveryFee: number;
    shippingDiscount: number;
  } | null>(null);
  const placeOrder = useServerFn(createNiberDealzOrder);
  const selected = tierInfo[tier];
  const displayedFee = method === "pickup" ? 0 : selected.fee;
  const chooseMethod = (value: "courier" | "paxi" | "pickup") => {
    setMethod(value);
    if (value === "courier") setTier("courier");
    if (value === "paxi" && tier === "courier") setTier("paxi_standard_5kg");
  };
  const submit = async () => {
    if (!user) {
      toast.error("Please sign in to continue to checkout.");
      navigate({ to: "/auth", search: { mode: "register", next: "/cart" } });
      return;
    }
    if (!items.length) return;
    if (!buyerName.trim() || !buyerPhone.trim()) {
      toast.error("Add your name and contact number.");
      return;
    }
    if (method !== "pickup" && !address.trim()) {
      toast.error("Add a delivery address.");
      return;
    }
    if (method === "paxi" && pickupPoint.trim().length < 3) {
      toast.error("Enter your selected PAXI pickup point.");
      return;
    }
    if (!accepted) {
      toast.error("Please accept the Terms and Privacy Policy.");
      return;
    }
    setPlacing(true);
    try {
      const result = (await placeOrder({
        data: {
          items: items.map((item) => ({
            product_id: item.product_id,
            qty: item.qty,
            size: item.size,
            color: item.color,
            comment: item.comment,
          })),
          buyer_name: buyerName,
          buyer_phone: buyerPhone,
          delivery_method: method,
          delivery_address: address,
          note,
          discount_code: "",
          delivery_tier: method === "pickup" ? "pickup" : tier,
          paxi_pickup_point: pickupPoint,
          terms_version: "2026-09",
        },
      })) as {
        order_id?: string;
        reference: string;
        total_zar: number | string;
        delivery_fee_zar: number | string;
        shipping_discount_zar: number | string;
      };
      if (!result.order_id) throw new Error("We could not create your order. Please try again.");
      // Payment collection is deliberately disabled until the Yoco release is validated.
      // Orders remain subject to stock and manual fulfilment confirmation.
      clear();
      setConfirmation({
        reference: result.reference,
        total: Number(result.total_zar),
        deliveryFee: Number(result.delivery_fee_zar),
        shippingDiscount: Number(result.shipping_discount_zar),
      });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not place order.");
    } finally {
      setPlacing(false);
    }
  };
  if (confirmation)
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="container mx-auto max-w-xl px-4 py-16 flex-1 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
          <h1 className="font-display mt-4 text-3xl font-bold">Request received</h1>
          <p className="mt-3 text-muted-foreground">
            Your NiberDealz order request{" "}
            <strong className="text-foreground">{confirmation.reference}</strong> has been received.{" "}
            Card payments are not available yet. We will review stock and contact you before
            fulfilment.
          </p>
          {confirmation.shippingDiscount > 0 && (
            <p className="mt-3 text-sm font-medium text-emerald-700">
              Shipping offer applied: −{money(confirmation.shippingDiscount)}
            </p>
          )}
          {confirmation.deliveryFee > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Delivery {money(confirmation.deliveryFee)}
            </p>
          )}
          <p className="font-display mt-4 text-2xl font-bold">{money(confirmation.total)}</p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild variant="outline">
              <Link to="/orders">View orders</Link>
            </Button>
            <Button asChild>
              <Link to="/">Continue shopping</Link>
            </Button>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="container mx-auto max-w-6xl px-4 py-8 flex-1">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link to="/">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Continue shopping
          </Link>
        </Button>
        <h1 className="font-display text-3xl font-bold">Your cart</h1>
        {items.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed p-14 text-center">
            <ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-3 font-display text-xl font-bold">Your cart is empty</h2>
            <Button asChild className="mt-5">
              <Link to="/">Shop NiberDealz</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-6 grid gap-7 lg:grid-cols-[1fr_380px]">
            <section className="space-y-3">
              {items.map((item) => (
                <CartLine
                  key={lineKey(item)}
                  item={item}
                  onQty={(qty) => setQty(lineKey(item), qty)}
                  onComment={(value) => setComment(lineKey(item), value)}
                  onRemove={() => remove(lineKey(item))}
                />
              ))}
            </section>
            <aside className="rounded-2xl border bg-card p-5 h-fit">
              <h2 className="font-display text-xl font-bold">Checkout</h2>
              <div className="mt-4 grid gap-3">
                <div>
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Contact number</Label>
                  <Input
                    id="phone"
                    inputMode="tel"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Delivery</Label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {(["courier", "paxi", "pickup"] as const).map((option) => (
                      <button
                        key={option}
                        onClick={() => chooseMethod(option)}
                        className={`rounded-lg border px-2 py-2 text-xs font-semibold capitalize ${method === option ? "border-foreground bg-foreground text-background" : "hover:bg-muted"}`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
                {method === "paxi" && (
                  <div className="rounded-xl border bg-secondary/30 p-3">
                    <Label>PAXI service</Label>
                    <div className="mt-2 grid gap-2">
                      {(
                        Object.entries(tierInfo).filter(([key]) => key !== "courier") as [
                          DeliveryTier,
                          (typeof tierInfo)[DeliveryTier],
                        ][]
                      ).map(([key, option]) => (
                        <button
                          key={key}
                          onClick={() => setTier(key)}
                          className={`rounded-lg border p-2 text-left text-xs ${tier === key ? "border-foreground" : "hover:bg-muted"}`}
                        >
                          <strong>
                            {option.label} · {money(option.fee)}
                          </strong>
                          <span className="block text-muted-foreground">{option.detail}</span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-3">
                      <Label htmlFor="paxi-point">PAXI pickup point</Label>
                      <Input
                        id="paxi-point"
                        value={pickupPoint}
                        onChange={(e) => setPickupPoint(e.target.value)}
                        placeholder="PEP, Ackermans or Shoe City branch"
                      />
                    </div>
                    <p className="mt-2 flex gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      Bring your ID and the SMS collection PIN when collecting.
                    </p>
                  </div>
                )}
                {method !== "pickup" && (
                  <div>
                    <Label htmlFor="address">Delivery address</Label>
                    <Textarea
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street address, suburb, city and postal code"
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="note">Order note</Label>
                  <Textarea
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Optional delivery note"
                  />
                </div>
              </div>
              <div className="my-5 border-t pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>
                    {count} item{count === 1 ? "" : "s"}
                  </span>
                  <span>{money(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Truck className="h-4 w-4" />
                    {method === "pickup" ? "Collection" : selected.label}
                  </span>
                  <span>{method === "pickup" ? "Confirmed with order" : money(displayedFee)}</span>
                </div>
                {method !== "pickup" && (
                  <p className="text-xs text-muted-foreground">
                    First-order shipping offers, if eligible, are calculated securely when you
                    submit your request.
                  </p>
                )}
                <div className="flex justify-between font-display text-xl font-bold pt-2">
                  <span>Estimated total</span>
                  <span>{money(total + displayedFee)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  The final total is recalculated securely before your order is created.
                </p>
              </div>
              <label className="mb-3 flex cursor-pointer gap-2 text-xs leading-relaxed">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4"
                />
                <span>
                  I agree to the{" "}
                  <Link to="/terms" className="underline">
                    Terms of service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="underline">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
              {!user && (
                <Button asChild variant="outline" className="w-full mb-2">
                  <Link to="/auth" search={{ mode: "register", next: "/cart" }}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Sign in to checkout
                  </Link>
                </Button>
              )}
              <Button className="w-full" size="lg" disabled={placing} onClick={submit}>
                {placing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {placing ? "Submitting order…" : "Submit order request"}
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Card payments are not available on this site. We will review stock and contact you
                about the next steps before fulfilment.
              </p>
            </aside>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
function CartLine({
  item,
  onQty,
  onComment,
  onRemove,
}: {
  item: CartItem;
  onQty: (qty: number) => void;
  onComment: (value: string) => void;
  onRemove: () => void;
}) {
  return (
    <article className="rounded-2xl border bg-card p-4 flex gap-4">
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
        {item.image_url && (
          <img
            src={item.image_url}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex gap-3 justify-between">
          <div>
            <h2 className="font-semibold">{item.title}</h2>
            {item.size && (
              <p className="text-xs text-muted-foreground">
                {item.size}
                {item.color ? ` · ${item.color}` : ""}
              </p>
            )}
          </div>
          <button
            onClick={onRemove}
            aria-label="Remove item"
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 font-display text-lg font-bold">{money(item.price_zar)}</p>
        <div className="mt-2 flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => onQty(item.qty - 1)}>
            -
          </Button>
          <span className="w-6 text-center text-sm font-semibold">{item.qty}</span>
          <Button variant="outline" size="icon" onClick={() => onQty(item.qty + 1)}>
            +
          </Button>
        </div>
        <Input
          className="mt-3 h-9 text-xs"
          value={item.comment}
          onChange={(e) => onComment(e.target.value)}
          placeholder="Note for NiberDealz (optional)"
        />
      </div>
    </article>
  );
}
