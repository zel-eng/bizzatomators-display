import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { accentFromLogo, businessLogoDataUrl } from "@/lib/business-logo";

export type BusinessIdentity = {
  name: string;
  address: string;
  phone: string;
  logoPath: string;
  /** Embedded logo, ready for PDF rendering. */
  logoDataUrl: string | null;
  /** Brand accent derived from the logo, when one exists. */
  accent: [number, number, number] | null;
};

const EMPTY: BusinessIdentity = { name: "Bizz", address: "", phone: "", logoPath: "", logoDataUrl: null, accent: null };

/** Business identity used on printed sales documents. */
export function useBusinessProfile() {
  const [profile, setProfile] = useState<BusinessIdentity>(EMPTY);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return;
    const { data } = await supabase
      .from("profiles")
      .select("business_name, full_name, phone, logo_path, business_address")
      .eq("id", userId)
      .maybeSingle();
    const row = data as any;
    const logoPath = String(row?.logo_path ?? "");
    const logoDataUrl = logoPath ? await businessLogoDataUrl(logoPath) : null;
    const accent = logoDataUrl ? await accentFromLogo(logoDataUrl) : null;
    setProfile({
      name: row?.business_name || row?.full_name || "Bizz",
      address: row?.business_address ?? "",
      phone: row?.phone ?? "",
      logoPath,
      logoDataUrl,
      accent,
    });
  }, []);

  useEffect(() => { void load(); }, [load]);

  /** Saves branding fields (logo, address) onto the same business profile row. */
  const saveBranding = useCallback(
    async (patch: { logoPath?: string | null; address?: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return;
      const update: Record<string, unknown> = {};
      if (patch.logoPath !== undefined) update["logo_path"] = patch.logoPath || null;
      if (patch.address !== undefined) update["business_address"] = patch.address;
      if (Object.keys(update).length === 0) return;
      await supabase.from("profiles").update(update as never).eq("id", userId);
      await load();
    },
    [load],
  );

  return { ...profile, refresh: load, saveBranding };
}
