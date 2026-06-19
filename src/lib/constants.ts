export const SITE_NAME = "Niberdealz";
export const SITE_TAGLINE = "The student marketplace. Buy and sell on WhatsApp.";

export const CONTACT_PHONE = "068 751 0600";
export const CONTACT_EMAIL = "niberdealz@gmail.com";


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
