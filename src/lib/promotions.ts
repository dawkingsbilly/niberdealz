export type PromoPlanKey = "starter" | "growth" | "unlimited";

export interface PromoPlan {
  key: PromoPlanKey;
  name: string;
  price: number;
  days: number;
  blurb: string;
  perks: string[];
}

export const PROMO_PLANS: Record<PromoPlanKey, PromoPlan> = {
  starter: {
    key: "starter",
    name: "Starter boost",
    price: 20,
    days: 7,
    blurb: "One week of extra visibility for a small shop.",
    perks: [
      "Your store sits above normal stores for 7 days",
      "Promoted badge on all your listings",
      "Up to 5 active listings",
    ],
  },
  growth: {
    key: "growth",
    name: "Growth boost",
    price: 30,
    days: 14,
    blurb: "Two weeks of push for shops that are picking up.",
    perks: [
      "Two weeks above normal stores",
      "Promoted badge on all your listings",
      "Up to 20 active listings",
      "Priority in search results",
    ],
  },
  unlimited: {
    key: "unlimited",
    name: "Unlimited boost",
    price: 50,
    days: 30,
    blurb: "A full month, no listing cap. Best value.",
    perks: [
      "A full month above normal stores",
      "Promoted badge on all your listings",
      "Unlimited listings",
      "Top priority in search and category pages",
      "First invite to every platform wide sale",
    ],
  },
};

export const PROMO_PLAN_LIST: PromoPlan[] = [
  PROMO_PLANS.starter,
  PROMO_PLANS.growth,
  PROMO_PLANS.unlimited,
];

export function planPrice(plan: PromoPlanKey): number {
  return PROMO_PLANS[plan].price;
}

export function planDays(plan: PromoPlanKey): number {
  return PROMO_PLANS[plan].days;
}

export function isPromoActive(vendor: { plan?: string | null; plan_active_until?: string | null } | null | undefined): boolean {
  if (!vendor?.plan || vendor.plan === "none") return false;
  if (!vendor.plan_active_until) return false;
  return new Date(vendor.plan_active_until).getTime() > Date.now();
}
