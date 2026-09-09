import { RelatedLinks } from "@/components/marketing/RelatedLinks";
import { getClusterLinks, PAGE_CLUSTER } from "@/lib/internal-linking";

const TITLES: Record<string, string> = {
  "frais-reels": "Dans le même dossier : frais réels",
  "indemnites-kilometriques": "Dans le même dossier : indemnités kilométriques",
};

interface ClusterLinksProps {
  /** Chemin canonique de la page courante, ex. "/bareme-ik-2026". */
  path: string;
  limit?: number;
  title?: string;
}

/** Bloc de liens internes calculé depuis le maillage à deux clusters. */
export function ClusterLinks({ path, limit = 3, title }: ClusterLinksProps) {
  const links = getClusterLinks(path, limit);
  if (links.length === 0) return null;
  const cluster = PAGE_CLUSTER[path];
  return <RelatedLinks title={title ?? TITLES[cluster] ?? "Pour aller plus loin"} links={links} />;
}
