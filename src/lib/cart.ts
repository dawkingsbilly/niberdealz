import { useCallback, useEffect, useState } from "react";

export type CartItem = {
  product_id: string;
  vendor_id: string;
  title: string;
  price_zar: number;
  image_url: string | null;
  size: string | null;
  color: string | null;
  qty: number;
  comment: string;
  vendor_name: string;
  whatsapp_number: string;
};

const KEY = "nd_cart_v1";
const EVENT = "nd_cart_change";

function read(): CartItem[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items: CartItem[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(EVENT));
}

function lineKey(i: Pick<CartItem, "product_id" | "size" | "color">) {
  return `${i.product_id}|${i.size ?? ""}|${i.color ?? ""}`;
}

export function addToCart(item: CartItem) {
  const items = read();
  const idx = items.findIndex((i) => lineKey(i) === lineKey(item));
  if (idx >= 0) {
    items[idx].qty += item.qty;
    if (item.comment) items[idx].comment = item.comment;
  } else {
    items.push(item);
  }
  write(items);
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const sync = () => setItems(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    const next = read()
      .map((i) => (lineKey(i) === key ? { ...i, qty: Math.max(0, qty) } : i))
      .filter((i) => i.qty > 0);
    write(next);
  }, []);

  const setComment = useCallback((key: string, comment: string) => {
    write(read().map((i) => (lineKey(i) === key ? { ...i, comment } : i)));
  }, []);

  const remove = useCallback((key: string) => {
    write(read().filter((i) => lineKey(i) !== key));
  }, []);

  const clear = useCallback(() => write([]), []);

  const count = items.reduce((s, i) => s + i.qty, 0);
  const total = items.reduce((s, i) => s + i.qty * Number(i.price_zar), 0);

  return { items, count, total, setQty, setComment, remove, clear, lineKey };
}

export { lineKey };

export function buildCartMessage(opts: {
  buyerName: string;
  items: CartItem[];
  note: string;
  address?: string;
  tip?: number;
}) {
  const lines = opts.items.map((i) => {
    const bits = [i.title, `Qty: ${i.qty}`, `Price: R${i.price_zar}`];
    if (i.size) bits.push(`Size: ${i.size}`);
    if (i.color) bits.push(`Colour: ${i.color}`);
    if (i.comment) bits.push(`Note: ${i.comment}`);
    return `\u2022 ${bits.join(" | ")}`;
  });
  const subtotal = opts.items.reduce((s, i) => s + i.qty * Number(i.price_zar), 0);
  const tip = Number(opts.tip ?? 0);
  const total = subtotal + (tip > 0 ? tip : 0);
  return [
    `Hey! I saw your listing on Niberdealz and I am interested.`,
    ``,
    `Buyer: ${opts.buyerName}`,
    opts.address ? `Address or meetup spot: ${opts.address}` : "",
    ``,
    ...lines,
    ``,
    `Subtotal: R${subtotal.toLocaleString("en-ZA")}`,
    tip > 0 ? `Tip for the seller: R${tip.toLocaleString("en-ZA")}` : "",
    `Total: R${total.toLocaleString("en-ZA")}`,
    opts.note ? `\nComment: ${opts.note}` : "",
    ``,
    `Let me know when and where we can meet up to check it out.`,
  ]
    .filter((l) => l !== "")
    .join("\n");
}

/* ---------------- Orders (local order tracking) ---------------- */

export type OrderStatus = "sent" | "meetup_agreed" | "completed" | "cancelled";

export type Order = {
  id: string;
  created_at: string;
  updated_at: string;
  status: OrderStatus;
  vendor_id: string;
  vendor_name: string;
  whatsapp_number: string;
  buyer_name: string;
  address: string;
  note: string;
  tip: number;
  total: number;
  items: CartItem[];
  safety_accepted: boolean;
};

const ORDERS_KEY = "nd_orders_v1";
const ORDERS_EVENT = "nd_orders_change";

export const ORDER_STEPS: { key: OrderStatus; label: string; hint: string }[] = [
  { key: "sent", label: "Order sent", hint: "Your order went to the seller on WhatsApp. Agree on a public meetup spot before you travel." },
  { key: "meetup_agreed", label: "Meetup agreed", hint: "Meet in a busy public place in daylight, and tell a friend where you are going." },
  { key: "completed", label: "Completed", hint: "You inspected the item and paid in person. Leave the store a review." },
];

export function readOrders(): Order[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeOrders(orders: Order[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  window.dispatchEvent(new Event(ORDERS_EVENT));
}

export function createOrder(o: Omit<Order, "id" | "created_at" | "updated_at" | "status">): Order {
  const now = new Date().toISOString();
  const ref = `ND${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const order: Order = { ...o, id: ref, created_at: now, updated_at: now, status: "sent" };
  writeOrders([order, ...readOrders()]);
  return order;
}

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const sync = () => setOrders(readOrders());
    sync();
    window.addEventListener(ORDERS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ORDERS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setStatus = useCallback((id: string, status: OrderStatus) => {
    writeOrders(
      readOrders().map((o) => (o.id === id ? { ...o, status, updated_at: new Date().toISOString() } : o)),
    );
  }, []);

  const removeOrder = useCallback((id: string) => {
    writeOrders(readOrders().filter((o) => o.id !== id));
  }, []);

  return { orders, setStatus, removeOrder };
}
