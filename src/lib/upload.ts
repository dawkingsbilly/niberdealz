import { supabase } from "@/integrations/supabase/client";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

/** Upload product photos into the signed-in user's storage folder. */
export async function uploadImages(
  files: File[],
  folder: string,
  bucket = "product-images",
): Promise<string[]> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Please sign in before uploading photos.");

  const urls: string[] = [];
  for (const f of files) {
    if (!ALLOWED_MIME.includes(f.type)) throw new Error("Use JPG, PNG, WEBP, GIF or AVIF.");
    if (f.size > 5 * 1024 * 1024) throw new Error("Each image must be under 5 MB.");
    const path = `${user.id}/${folder}/${crypto.randomUUID()}.${EXT_BY_MIME[f.type]}`;
    const { error: uErr } = await supabase.storage
      .from(bucket)
      .upload(path, f, { upsert: false, contentType: f.type });
    if (uErr) throw uErr;
    const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(path);
    if (!publicUrl.publicUrl)
      throw new Error("The image upload completed, but its public link could not be created.");
    urls.push(publicUrl.publicUrl);
  }
  return urls;
}
