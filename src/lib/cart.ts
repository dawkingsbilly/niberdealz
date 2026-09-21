import { useCallback, useEffect, useState } from "react";

export type CartItem = {
  product_id: string;
  title: string;
  price_zar: number;
  image_url: string | null;
  size: string | null;
  color: string | null;
  qty: number;
  comment: string;
};

const KEY = "nd_cart_v2";
const LEGACY_KEY = "nd_cart_v1";
const EVENT = "nd_cart_change";

function normalise(items: unknown): CartItem[] {
  if (!Array.isArray(items)) return [];
  return items.flatMap((raw: any) => {
    if (!raw?.product_id || !raw?.title || !Number.isFinite(Number(raw?.price_zar))) return [];
    return [{ product_id: String(raw.product_id), title: String(raw.title), price_zar: Number(raw.price_zar), image_url: typeof raw.image_url === "string" ? raw.image_url : null, size: typeof raw.size === "string" ? raw.size : null, color: typeof raw.color === "string" ? raw.color : null, qty: Math.max(1, Math.min(50, Number(raw.qty) || 1)), comment: typeof raw.comment === "string" ? raw.comment.slice(0, 300) : "" }];
  });
}
function read(): CartItem[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const current = localStorage.getItem(KEY);
    if (current) return normalise(JSON.parse(current));
    // One-time migration from the old marketplace cart: seller data is intentionally discarded.
    const legacy = normalise(JSON.parse(localStorage.getItem(LEGACY_KEY) ?? "[]"));
    if (legacy.length) localStorage.setItem(KEY, JSON.stringify(legacy));
    localStorage.removeItem(LEGACY_KEY);
    return legacy;
  } catch { return []; }
}
function write(items: CartItem[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(EVENT));
}
function lineKey(i: Pick<CartItem, "product_id" | "size" | "color">) { return `${i.product_id}|${i.size ?? ""}|${i.color ?? ""}`; }

export function addToCart(item: CartItem) {
  const items = read(); const idx = items.findIndex((i) => lineKey(i) === lineKey(item));
  if (idx >= 0) { items[idx].qty = Math.min(50, items[idx].qty + item.qty); if (item.comment) items[idx].comment = item.comment; }
  else items.push(item);
  write(items);
}
export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => { const sync = () => setItems(read()); sync(); window.addEventListener(EVENT, sync); window.addEventListener("storage", sync); return () => { window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync); }; }, []);
  const setQty = useCallback((key: string, qty: number) => write(read().map((i) => lineKey(i) === key ? { ...i, qty: Math.max(0, Math.min(50, qty)) } : i).filter((i) => i.qty > 0)), []);
  const setComment = useCallback((key: string, comment: string) => write(read().map((i) => lineKey(i) === key ? { ...i, comment: comment.slice(0, 300) } : i)), []);
  const remove = useCallback((key: string) => write(read().filter((i) => lineKey(i) !== key)), []);
  const clear = useCallback(() => write([]), []);
  const count = items.reduce((sum, item) => sum + item.qty, 0);
  const total = items.reduce((sum, item) => sum + item.qty * item.price_zar, 0);
  return { items, count, total, setQty, setComment, remove, clear, lineKey };
}
export { lineKey };
