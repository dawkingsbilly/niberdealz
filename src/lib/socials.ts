export type SocialKind = "tiktok" | "instagram" | "facebook";

const BASE: Record<SocialKind, string> = {
  tiktok: "https://www.tiktok.com/@",
  instagram: "https://www.instagram.com/",
  facebook: "https://www.facebook.com/",
};

/**
 * Accepts a full URL or a bare handle (with or without @) and returns a
 * clean profile link. Returns null when there is nothing usable.
 */
export function socialUrl(kind: SocialKind, raw?: string | null): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^(www\.)?(tiktok|instagram|facebook)\.com\//i.test(value)) return `https://${value.replace(/^www\./i, "")}`;
  const handle = value.replace(/^@+/, "").replace(/\s+/g, "");
  if (!handle) return null;
  return `${BASE[kind]}${handle}`;
}

export function socialLabel(raw?: string | null): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) {
    try {
      const u = new URL(value);
      const path = u.pathname.replace(/\/+$/, "").replace(/^\//, "");
      return path ? `@${path.replace(/^@/, "")}` : u.hostname;
    } catch {
      return value;
    }
  }
  return `@${value.replace(/^@+/, "")}`;
}
