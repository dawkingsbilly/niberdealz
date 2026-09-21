import { supabase } from "@/integrations/supabase/client";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

/** Upload product photos and return long lived signed links. */
export async function uploadImages(files: File[], folder: string, bucket = "product-images"): Promise<string[]> {
  const urls: string[] = [];
  for (const f of files) {
    if (!ALLOWED_MIME.includes(f.type)) throw new Error("Use JPG, PNG, WEBP, GIF or AVIF.");
    if (f.size > 5 * 1024 * 1024) throw new Error("Each image must be under 5 MB.");
    const path = `${folder}/${crypto.randomUUID()}.${EXT_BY_MIME[f.type]}`;
    const { error: uErr } = await supabase.storage.from(bucket).upload(path, f, { upsert: false, contentType: f.type });
    if (uErr) throw uErr;
    const { data: signed, error: sErr } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    if (sErr) throw sErr;
    urls.push(signed.signedUrl);
  }
  return urls;
}
