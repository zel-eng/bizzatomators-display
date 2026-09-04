import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import placeholder from "@/assets/product-placeholder.jpg";

export const productPlaceholder = placeholder;

const cache = new Map<string, string>();

/** Signed URL for a stored product photo, falling back to the placeholder. */
export function useProductImageUrl(path?: string) {
  const [url, setUrl] = useState<string | null>(path ? (cache.get(path) ?? null) : null);

  useEffect(() => {
    let alive = true;
    if (!path) { setUrl(null); return; }
    const cached = cache.get(path);
    if (cached) { setUrl(cached); return; }
    void supabase.storage
      .from("product-images")
      .createSignedUrl(path, 60 * 60)
      .then(({ data }) => {
        if (!alive) return;
        if (data?.signedUrl) cache.set(path, data.signedUrl);
        setUrl(data?.signedUrl ?? null);
      });
    return () => { alive = false; };
  }, [path]);

  return url;
}

export function ProductThumb({ path, alt, className = "" }: { path?: string; alt: string; className?: string }) {
  const url = useProductImageUrl(path);
  return (
    <img
      src={url ?? productPlaceholder}
      alt={alt}
      loading="lazy"
      className={`object-cover ${className}`}
    />
  );
}

const dataUrlToBlob = async (dataUrl: string) => (await fetch(dataUrl)).blob();

/** Uploads a picked photo and returns the storage path saved on the product. */
export async function uploadProductImage(dataUrl: string) {
  const blob = await dataUrlToBlob(dataUrl);
  const ext = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
  const path = `products/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, blob, { contentType: blob.type || "image/jpeg" });
  if (error) throw error;
  return path;
}

/**
 * Visual-first product photo picker: gallery upload or direct camera capture.
 * Holds a data URL until the product is saved.
 */
export function ProductImagePicker({
  value,
  existingPath,
  onChange,
  invalid,
}: {
  value: string;
  existingPath?: string;
  onChange: (dataUrl: string) => void;
  invalid?: boolean;
}) {
  const galleryRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const storedUrl = useProductImageUrl(value ? undefined : existingPath);

  const read = (file?: File | null) => {
    if (!file) return;
    setBusy(true);
    const reader = new FileReader();
    reader.onload = () => { onChange(String(reader.result ?? "")); setBusy(false); };
    reader.onerror = () => setBusy(false);
    reader.readAsDataURL(file);
  };

  const preview = value || storedUrl || productPlaceholder;

  return (
    <div className="mt-2 space-y-2">
      <div className={`relative overflow-hidden rounded-xl border ${invalid ? "border-rose-400/60" : "border-white/10"} bg-black/25`}>
        <img src={preview} alt="Product photo" className="h-40 w-full object-contain" />
        {busy ? (
          <div className="absolute inset-0 grid place-items-center bg-black/50">
            <Loader2 className="h-5 w-5 animate-spin text-amber-300" />
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="flex items-center gap-1.5 rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-amber-400/20"
        >
          <Camera className="h-4 w-4" /> Take photo
        </button>
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/15"
        >
          <ImagePlus className="h-4 w-4" /> Choose photo
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-rose-200 transition hover:bg-rose-400/20"
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        ) : null}
      </div>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => read(event.target.files?.[0])}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => read(event.target.files?.[0])}
      />
    </div>
  );
}
