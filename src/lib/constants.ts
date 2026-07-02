export const SITE_NAME = "Niberdealz";
export const SITE_TAGLINE = "The marketplace. Buy and sell on WhatsApp.";

export const CONTACT_PHONE = "068 751 0600";
export const CONTACT_EMAIL = "niberdealz@gmail.com";

// Public WhatsApp channel — every new signup is nudged to follow it.
export const WHATSAPP_CHANNEL_URL = "https://wa.me/channel/0029VaOb9f1KbYMSEsUT6T46";

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
