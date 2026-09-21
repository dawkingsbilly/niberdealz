import { ImagePlus, Loader2, Trash2, UploadCloud } from "lucide-react";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadImages } from "@/lib/upload";

const MAX_IMAGES = 12;

export function ProductImageUploader({
  images,
  onChange,
  folder,
  minimum = 5,
}: {
  images: string[];
  onChange: (images: string[]) => void;
  folder: string;
  minimum?: number;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const chooseFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const selected = Array.from(files);
    const remaining = MAX_IMAGES - images.length;

    if (selected.length > remaining) {
      toast.error(`You can add up to ${MAX_IMAGES} product photos.`);
      return;
    }

    setUploading(true);
    try {
      const uploaded = await uploadImages(selected, folder);
      onChange([...images, ...uploaded]);
      toast.success(`${uploaded.length} photo${uploaded.length === 1 ? "" : "s"} uploaded`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We could not upload those photos.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = (image: string) => onChange(images.filter((item) => item !== image));

  return (
    <section className="grid gap-3 md:col-span-2" aria-labelledby={`${inputId}-label`}>
      <div>
        <p id={`${inputId}-label`} className="font-medium">
          Product photos
        </p>
        <p className="text-xs text-muted-foreground">
          Upload at least {minimum} photos. The first photo is the cover image. JPG, PNG, WEBP, GIF
          or AVIF; 5 MB each.
        </p>
      </div>

      <input
        ref={inputRef}
        id={inputId}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        multiple
        disabled={uploading || images.length >= MAX_IMAGES}
        onChange={(event) => void chooseFiles(event.target.files)}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {images.map((image, index) => (
          <div
            key={image}
            className="group relative aspect-square overflow-hidden rounded-xl border bg-muted"
          >
            <img
              src={image}
              alt={`Product photo ${index + 1}`}
              className="h-full w-full object-cover"
            />
            {index === 0 && (
              <span className="absolute left-2 top-2 rounded bg-background/90 px-2 py-1 text-[10px] font-bold">
                Cover
              </span>
            )}
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="absolute right-2 top-2 h-8 w-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              aria-label={`Remove photo ${index + 1}`}
              onClick={() => remove(image)}
              disabled={uploading}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {images.length < MAX_IMAGES && (
          <label
            htmlFor={inputId}
            className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed bg-muted/40 p-3 text-center text-sm text-muted-foreground transition hover:bg-muted"
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <ImagePlus className="h-6 w-6" />
            )}
            <span className="mt-2 font-medium">{uploading ? "Uploading…" : "Add photos"}</span>
            <span className="mt-1 text-xs">
              {images.length}/{MAX_IMAGES}
            </span>
          </label>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-fit"
        disabled={uploading || images.length >= MAX_IMAGES}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <UploadCloud className="mr-2 h-4 w-4" />
        )}
        {images.length ? "Add more photos" : "Choose photos"}
      </Button>
    </section>
  );
}
