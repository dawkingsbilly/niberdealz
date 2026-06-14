export const SITE_NAME = "Niber-Dealz";
export const SITE_TAGLINE = "The marketplace where South African vendors sell direct.";

export const PROVINCES = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal",
  "Limpopo", "Mpumalanga", "Northern Cape", "North West", "Western Cape",
] as const;

export const CATEGORIES = [
  "Fashion & Clothing",
  "Electronics",
  "Home & Garden",
  "Beauty & Health",
  "Food & Beverages",
  "Handmade & Crafts",
  "Sports & Outdoors",
  "Kids & Baby",
  "Vehicles & Parts",
  "Services",
  "Other",
] as const;

export type PlanTier = "starter" | "growth" | "unlimited";

export const PLANS: Record<PlanTier, { name: string; price: number; productLimit: number | "unlimited"; description: string }> = {
  starter:   { name: "Starter",   price: 50,  productLimit: 5,           description: "Perfect to test the waters" },
  growth:    { name: "Growth",    price: 100, productLimit: 20,          description: "Most popular — scale your shop" },
  unlimited: { name: "Unlimited", price: 200, productLimit: "unlimited", description: "List as many products as you want" },
};

// Banking details for manual EFT — vendor uploads proof of payment.
// Replace these with the real Niber-Dealz account from Settings.
export const BANK_DETAILS = {
  bank: "FNB",
  accountName: "Niber-Dealz (Pty) Ltd",
  accountNumber: "0000000000",
  branch: "250655",
  reference: "Use your business name",
};
