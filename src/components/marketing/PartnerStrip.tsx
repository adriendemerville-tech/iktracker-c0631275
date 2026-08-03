import { ExternalLink } from "lucide-react";
import {
  usePartners,
  buildPartnerRedirectUrl,
} from "@/hooks/usePartners";
import { useLocation } from "@/lib/router-compat";

interface PartnerStripProps {
  page?: string;
  persona?: string | null;
  title?: string;
  limit?: number;
}

/**
 * Discreet footer-style strip showing up to N partner logos with taglines.
 * Lower visual weight than PartnerCard; ideal for bottom-of-page placement.
 */
export function PartnerStrip({
  page,
  persona,
  title = "Outils partenaires recommandés",
  limit = 4,
}: PartnerStripProps) {
  const location = useLocation();
  const pageKey = page ?? location.pathname;

  const { data: partners = [] } = usePartners({
    page: pageKey,
    persona,
    limit,
  });

  if (!partners.length) return null;

  return (
    <section
      aria-label="Outils partenaires"
      className="border-t border-border/60 bg-muted/20 py-8 sm:py-10"
    >
      <div className="container mx-auto px-4">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            {title}
          </h2>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
            Offres partenaires
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {partners.map((partner) => {
            const href = buildPartnerRedirectUrl({
              slug: partner.slug,
              page: pageKey,
              placement: "footer_strip",
              persona,
            });
            return (
              <a
                key={partner.id}
                href={href}
                target="_blank"
                rel="sponsored nofollow noopener"
                className="group flex items-center gap-3 rounded-lg border border-border/60 bg-card p-3 transition-colors hover:border-primary/40"
              >
                {partner.logo_url && (
                  <img
                    src={partner.logo_url}
                    alt={`Logo ${partner.name}`}
                    className="h-9 w-9 shrink-0 rounded-md object-contain"
                    loading="lazy"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {partner.name}
                  </p>
                  {partner.tagline && (
                    <p className="truncate text-xs text-muted-foreground">
                      {partner.tagline}
                    </p>
                  )}
                </div>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
