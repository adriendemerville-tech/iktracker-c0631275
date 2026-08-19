import { Link } from "@/lib/router-compat";
import { ArrowRight } from "lucide-react";

export type RelatedLink = {
  label: string;
  href: string;
  description?: string;
};

interface RelatedLinksProps {
  title?: string;
  links: RelatedLink[];
}

export function RelatedLinks({ title = "Pour aller plus loin", links }: RelatedLinksProps) {
  if (links.length === 0) return null;

  return (
    <section className="py-12 px-4 border-t border-border bg-muted/20" aria-labelledby="related-links-heading">
      <div className="container mx-auto max-w-5xl">
        <h2 id="related-links-heading" className="text-xl md:text-2xl font-bold text-foreground mb-6">
          {title}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                to={link.href}
                className="group block h-full rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50 focus-visible-ring"
              >
                <span className="flex items-center gap-2 font-semibold text-foreground group-hover:text-primary">
                  {link.label}
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                </span>
                {link.description && (
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {link.description}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
