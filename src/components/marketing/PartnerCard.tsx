import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  usePartners,
  buildPartnerRedirectUrl,
  type Partner,
} from "@/hooks/usePartners";
import { useLocation } from "react-router-dom";

interface PartnerCardProps {
  page?: string;
  persona?: string | null;
  placement?: string;
  variant?: "inline" | "compact";
}

/**
 * Native, design-system-aligned partner recommendation block.
 * Server-side tracked redirect via partner-redirect edge function.
 * Always renders with rel="sponsored nofollow" for SEO hygiene.
 */
export function PartnerCard({
  page,
  persona,
  placement = "inline_card",
  variant = "inline",
}: PartnerCardProps) {
  const location = useLocation();
  const pageKey = page ?? location.pathname;

  const { data: partners = [] } = usePartners({
    page: pageKey,
    persona,
    limit: 1,
  });

  if (!partners.length) return null;
  const partner = partners[0];

  if (variant === "compact") {
    return <CompactPartner partner={partner} page={pageKey} placement={placement} persona={persona} />;
  }

  return <InlinePartner partner={partner} page={pageKey} placement={placement} persona={persona} />;
}

function InlinePartner({
  partner,
  page,
  placement,
  persona,
}: {
  partner: Partner;
  page: string;
  placement: string;
  persona?: string | null;
}) {
  const href = buildPartnerRedirectUrl({
    slug: partner.slug,
    page,
    placement,
    persona,
  });

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-card to-primary/5 p-5 sm:p-6">
      <div className="absolute right-3 top-3">
        <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
          Offre partenaire
        </Badge>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {partner.logo_url && (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-background/80 p-2 shadow-sm">
            <img
              src={partner.logo_url}
              alt={`Logo ${partner.name}`}
              className="h-full w-full object-contain"
              loading="lazy"
            />
          </div>
        )}

        <div className="flex-1">
          <h3 className="text-base font-semibold text-foreground sm:text-lg">
            {partner.name}
          </h3>
          {partner.tagline && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {partner.tagline}
            </p>
          )}
          {partner.description && (
            <p className="mt-2 text-sm text-foreground/80">
              {partner.description}
            </p>
          )}

          <Button asChild size="sm" className="mt-4 gap-1.5">
            <a
              href={href}
              target="_blank"
              rel="sponsored nofollow noopener"
            >
              Découvrir {partner.name}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>
    </Card>
  );
}

function CompactPartner({
  partner,
  page,
  placement,
  persona,
}: {
  partner: Partner;
  page: string;
  placement: string;
  persona?: string | null;
}) {
  const href = buildPartnerRedirectUrl({
    slug: partner.slug,
    page,
    placement,
    persona,
  });

  return (
    <a
      href={href}
      target="_blank"
      rel="sponsored nofollow noopener"
      className="group flex items-center gap-3 rounded-lg border border-border/60 bg-card/50 p-3 transition-colors hover:border-primary/40 hover:bg-card"
    >
      {partner.logo_url && (
        <img
          src={partner.logo_url}
          alt={`Logo ${partner.name}`}
          className="h-8 w-8 shrink-0 object-contain"
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
      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
    </a>
  );
}
