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
}) {
  const lines = opts.items.map((i) => {
    const bits = [i.title, `Qty: ${i.qty}`, `Price: R${i.price_zar}`];
    if (i.size) bits.push(`Size: ${i.size}`);
    if (i.color) bits.push(`Colour: ${i.color}`);
    if (i.comment) bits.push(`Note: ${i.comment}`);
    return `\u2022 ${bits.join(" | ")}`;
  });
  const total = opts.items.reduce((s, i) => s + i.qty * Number(i.price_zar), 0);
  return [
    `Hey! I saw your listing on Niberdealz and I am interested.`,
    ``,
    `Buyer: ${opts.buyerName}`,
    ``,
    ...lines,
    ``,
    `Total: R${total.toLocaleString("en-ZA")}`,
    opts.note ? `\nComment: ${opts.note}` : "",
    ``,
    `Let me know when and where we can meet up to check it out.`,
  ]
    .filter((l) => l !== undefined)
    .join("\n");
}
