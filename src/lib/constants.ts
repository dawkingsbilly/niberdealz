export const SITE_NAME = "Niberdealz";
export const SITE_TAGLINE = "Thoughtfully selected pieces, delivered directly by us.";

export const CATEGORIES = [
  "Sneakers",
  "Clothing",
  "Electronics",
  "Textbooks",
  "Furniture",
  "Accessories",
  "Services",
  "Other",
] as const;

export function buildWhatsAppMessage(productTitle: string, priceZar: number | string) {
  return `Hey! I saw your listing on Niberdealz and I'm interested.\n\nItem: ${productTitle}\nPrice: R${priceZar}\n\nLet me know when and where we can meet up to check it out.`;
}
