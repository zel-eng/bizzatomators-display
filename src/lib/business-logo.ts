import { supabase } from "@/integrations/supabase/client";

/** Logos live beside product photos in the existing private bucket. */
const BUCKET = "product-images";

const urlCache = new Map<string, string>();

export async function uploadBusinessLogo(dataUrl: string) {
  const blob = await (await fetch(dataUrl)).blob();
  const ext = (blob.type.split("/")[1] || "png").replace("jpeg", "jpg");
  const path = `logos/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type || "image/png",
  });
  if (error) throw error;
  return path;
}

export async function businessLogoUrl(path?: string | null) {
  if (!path) return null;
  const cached = urlCache.get(path);
  if (cached) return cached;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (data?.signedUrl) urlCache.set(path, data.signedUrl);
  return data?.signedUrl ?? null;
}

/** Reads any http(s) image into a data URL so jsPDF can embed it. */
export async function imageToDataUrl(url: string): Promise<string | null> {
  try {
    const blob = await (await fetch(url)).blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function businessLogoDataUrl(path?: string | null) {
  const url = await businessLogoUrl(path);
  return url ? imageToDataUrl(url) : null;
}

/** Dominant, readable accent colour taken from the logo (falls back to corporate slate). */
export async function accentFromLogo(dataUrl: string): Promise<[number, number, number] | null> {
  if (typeof document === "undefined") return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 48;
        canvas.height = 48;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, 48, 48);
        const { data } = ctx.getImageData(0, 0, 48, 48);
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3];
          if (alpha < 200) continue;
          const [pr, pg, pb] = [data[i], data[i + 1], data[i + 2]];
          const max = Math.max(pr, pg, pb);
          const min = Math.min(pr, pg, pb);
          // Skip near-white / near-black pixels: they carry no brand colour.
          if (max > 235 && min > 210) continue;
          if (max < 35) continue;
          r += pr; g += pg; b += pb; n += 1;
        }
        if (!n) return resolve(null);
        let out: [number, number, number] = [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
        // Keep it dark enough to read on white paper.
        const lum = 0.299 * out[0] + 0.587 * out[1] + 0.114 * out[2];
        if (lum > 170) out = out.map((c) => Math.round(c * (150 / lum))) as [number, number, number];
        resolve(out);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}
