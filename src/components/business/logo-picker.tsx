import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { businessLogoUrl } from "@/lib/business-logo";

/**
 * Optional business logo picker. Holds a data URL until the owner saves; never
 * blocks the surrounding form.
 */
export function BusinessLogoPicker({
  value,
  existingPath,
  onChange,
  hint = "Upload your company logo to personalize your quotations, invoices and business documents.",
}: {
  /** Data URL of a freshly picked logo, "" when none picked, null when removed. */
  value: string | null;
  existingPath?: string;
  onChange: (dataUrl: string | null) => void;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [storedUrl, setStoredUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!existingPath) { setStoredUrl(null); return; }
    void businessLogoUrl(existingPath).then((url) => { if (alive) setStoredUrl(url); });
    return () => { alive = false; };
  }, [existingPath]);

  const preview = value || (value === null ? null : storedUrl);

  const read = (file?: File | null) => {
    if (!file) return;
    setBusy(true);
    const reader = new FileReader();
    reader.onload = () => { onChange(String(reader.result ?? "")); setBusy(false); };
    reader.onerror = () => setBusy(false);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-white/55">{hint}</p>
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/25">
        {preview ? (
          <img src={preview} alt="Business logo" className="h-28 w-full object-contain p-3" />
        ) : (
          <div className="grid h-28 place-items-center text-xs text-white/40">No logo yet — optional</div>
        )}
        {busy ? (
          <div className="absolute inset-0 grid place-items-center bg-black/50">
            <Loader2 className="h-5 w-5 animate-spin text-amber-300" />
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-amber-400/20"
        >
          <ImagePlus className="h-4 w-4" /> {preview ? "Replace logo" : "Upload logo"}
        </button>
        {preview ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-rose-200 transition hover:bg-rose-400/20"
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => read(event.target.files?.[0])}
      />
    </div>
  );
}
