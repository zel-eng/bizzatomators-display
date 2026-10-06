import type { DocumentBusiness } from "@/lib/sales-pdf";
import { supabase } from "@/integrations/supabase/client";
import { accentFromLogo, businessLogoDataUrl } from "@/lib/business-logo";

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

/** Loads the current registered identity when a page has not warmed the cache yet. */
export async function loadDocumentBusiness(): Promise<DocumentBusiness> {
  const existing = getDocumentBusiness();
  // Reuse the in-memory identity only when it is a real registered name.
  if (cached && existing.name && existing.name !== "Business" && existing.name !== "Bizz") return existing;

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return existing.name ? existing : { name: "Business" };

  const { data } = await supabase
    .from("profiles")
    .select("business_name, full_name, phone, logo_path, business_address")
    .eq("id", user.id)
    .maybeSingle();
  const row = data as {
    business_name?: string | null;
    full_name?: string | null;
    phone?: string | null;
    logo_path?: string | null;
    business_address?: string | null;
  } | null;
  const logoPath = row?.logo_path ?? "";
  const logoDataUrl = logoPath ? await businessLogoDataUrl(logoPath) : null;
  const accent = logoDataUrl ? await accentFromLogo(logoDataUrl) : null;
  const business: DocumentBusiness = {
    name: row?.business_name || row?.full_name || String(user.user_metadata?.business_name ?? user.user_metadata?.full_name ?? "Business"),
    address: row?.business_address ?? "",
    phone: row?.phone || user.phone || "",
    logoDataUrl,
    accent,
  };
  setDocumentBusiness(business);
  return business;
}
