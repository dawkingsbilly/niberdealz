// Client safe affiliate rules and helpers. No server imports here.

/** 1 point is worth R0.50 in discounts or cash. */
export const POINT_VALUE_ZAR = 0.5;

/** Points earned for every member who joins through a link or coupon code. */
export const POINTS_PER_SIGNUP = 10;

/** Minimum points a buyer can spend as a discount at checkout. */
export const MIN_POINTS_TO_SPEND = 20;

/** Minimum points before cash can be withdrawn. 100 points is R50. */
export const MIN_POINTS_TO_WITHDRAW = 100;

/** Discount a buyer gets when they use an affiliate coupon code. */
export const COUPON_DISCOUNT_PCT = 5;

export const LEVELS = [
  { level: 1, name: "Starter", points: 0, commissionPct: 0 },
  { level: 2, name: "Riser", points: 100, commissionPct: 3 },
  { level: 3, name: "Pro", points: 300, commissionPct: 5 },
  { level: 4, name: "Elite", points: 700, commissionPct: 7 },
  { level: 5, name: "Legend", points: 1500, commissionPct: 10 },
] as const;

/**
 * Points earned when someone buys with your coupon code.
 * Under R50 is 1 point, then one more point for every R50 band.
 */
export function purchasePoints(amountZar: number): number {
  const amount = Math.max(0, Number(amountZar) || 0);
  return Math.floor(amount / 50) + 1;
}

export function pointsToZar(points: number): number {
  return Math.round(points * POINT_VALUE_ZAR * 100) / 100;
}

export function levelFor(lifetimePoints: number) {
  let current = LEVELS[0];
  for (const l of LEVELS) if (lifetimePoints >= l.points) current = l;
  const next = LEVELS.find((l) => l.points > lifetimePoints) ?? null;
  const span = next ? next.points - current.points : 0;
  const done = next ? lifetimePoints - current.points : span;
  return {
    current,
    next,
    progressPct: next && span > 0 ? Math.min(100, Math.round((done / span) * 100)) : 100,
    pointsToNext: next ? Math.max(0, next.points - lifetimePoints) : 0,
  };
}

/* ---------- referral capture (link visits) ---------- */

const REF_KEY = "nd_ref_code";

export function captureRefFromUrl() {
  if (typeof window === "undefined") return;
  const code = new URLSearchParams(window.location.search).get("ref");
  if (code && /^[A-Za-z0-9]{4,16}$/.test(code)) {
    try { localStorage.setItem(REF_KEY, code.toUpperCase()); } catch { /* ignore */ }
  }
}

export function storedRefCode(): string | null {
  if (typeof localStorage === "undefined") return null;
  try { return localStorage.getItem(REF_KEY); } catch { return null; }
}

export function clearRefCode() {
  try { localStorage.removeItem(REF_KEY); } catch { /* ignore */ }
}

export const DELIVERY_METHODS = [
  { key: "courier", label: "Courier to your door" },
  { key: "paxi", label: "PAXI collection at PEP store" },
  { key: "pickup", label: "Pickup at a set location" },
  { key: "meetup", label: "Meet up in person" },
] as const;

export type DeliveryMethodKey = (typeof DELIVERY_METHODS)[number]["key"];

export type DeliveryOption = {
  method: DeliveryMethodKey;
  fee_zar: number;
  days: number;
};

export function deliveryLabel(method: string): string {
  return DELIVERY_METHODS.find((m) => m.key === method)?.label ?? method;
}

export function parseDeliveryOptions(raw: unknown): DeliveryOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((o) => o && typeof o === "object")
    .map((o: any) => ({
      method: String(o.method) as DeliveryMethodKey,
      fee_zar: Number(o.fee_zar) || 0,
      days: Number(o.days) || 0,
    }))
    .filter((o) => DELIVERY_METHODS.some((m) => m.key === o.method));
}

export function deliverySummary(options: DeliveryOption[]): string {
  if (options.length === 0) return "Delivery arranged with the seller";
  const fastest = [...options].sort((a, b) => a.days - b.days)[0];
  const cheapest = [...options].sort((a, b) => a.fee_zar - b.fee_zar)[0];
  const fee = cheapest.fee_zar === 0 ? "Free" : `From R${cheapest.fee_zar}`;
  return `${fee} · about ${fastest.days} day${fastest.days === 1 ? "" : "s"}`;
}
