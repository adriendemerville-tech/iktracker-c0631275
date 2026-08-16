import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PartnerCategory =
  "neobank" | "accounting" | "insurance" | "fuel_card" | "leasing" | "other";

export interface Partner {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  tagline: string | null;
  description: string | null;
  category: PartnerCategory;
  target_url: string;
  commission_amount: number;
  is_active: boolean;
  priority: number;
  target_personas: string[];
  target_pages: string[];
}

/**
 * Fetch active partners that match the given page and (optionally) persona.
 * Returns at most `limit` partners sorted by priority.
 */
export function usePartners(opts: {
  page: string;
  persona?: string | null;
  limit?: number;
  enabled?: boolean;
}) {
  const { page, persona, limit = 3, enabled = true } = opts;

  return useQuery({
    queryKey: ["partners", page, persona ?? "anon", limit],
    enabled,
    staleTime: 5 * 60 * 1000, // 5 min
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outbound_partners")
        .select(
          "id, slug, name, logo_url, tagline, description, category, target_url, commission_amount, is_active, priority, target_personas, target_pages",
        )
        .eq("is_active", true)
        .order("priority", { ascending: false });

      if (error) throw error;

      const filtered = (data as Partner[]).filter((p) => {
        // Page targeting: empty target_pages means "all pages"
        const pageMatch =
          !p.target_pages?.length ||
          p.target_pages.includes(page) ||
          p.target_pages.includes("all");

        // Persona targeting
        const personaMatch =
          !p.target_personas?.length ||
          p.target_personas.includes("all") ||
          (persona ? p.target_personas.includes(persona) : true);

        return pageMatch && personaMatch;
      });

      return filtered.slice(0, limit);
    },
  });
}

/**
 * Build the public redirect URL for a partner click.
 * Goes through the partner-redirect edge function for server-side tracking.
 */
export function buildPartnerRedirectUrl(opts: {
  slug: string;
  page?: string;
  placement?: string;
  persona?: string | null;
  sessionId?: string | null;
}): string {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;
  const base = projectId
    ? `https://${projectId}.supabase.co/functions/v1/partner-redirect`
    : "/functions/v1/partner-redirect";

  const params = new URLSearchParams({ slug: opts.slug });
  if (opts.page) params.set("page", opts.page);
  if (opts.placement) params.set("placement", opts.placement);
  if (opts.persona) params.set("persona", opts.persona);
  if (opts.sessionId) params.set("sid", opts.sessionId);

  return `${base}?${params.toString()}`;
}
