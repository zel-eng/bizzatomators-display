import type { DocumentBusiness } from "@/lib/sales-pdf";

/**
 * Cached business identity for documents generated outside React (table PDF
 * exports). Populated by `useBusinessProfile`, persisted so any page can print
 * the registered business name instead of the app name.
 */
const KEY = "bizz.document.business";

let cached: DocumentBusiness | null = null;

export function setDocumentBusiness(business: DocumentBusiness) {
  cached = business;
  try {
    const { logoDataUrl: _logo, ...rest } = business;
    window.localStorage.setItem(KEY, JSON.stringify(rest));
  } catch {
    /* storage optional */
  }
}

export function getDocumentBusiness(): DocumentBusiness {
  if (cached) return cached;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as DocumentBusiness;
  } catch {
    /* storage optional */
  }
  return { name: "" };
}
