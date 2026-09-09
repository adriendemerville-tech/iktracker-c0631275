// Maillage interne en deux clusters distincts (évite la cannibalisation) :
//  - Cluster « frais réels » : pilier /frais-reels (fiscalité, déclaration)
//  - Cluster « indemnités kilométriques » : pilier /indemnites-kilometriques (barèmes, outils)
// Les deux piliers se citent mutuellement (le calcul IK est une brique des frais réels),
// mais les satellites d'un cluster ne pointent jamais vers le pilier de l'autre.
import type { RelatedLink } from "@/components/marketing/RelatedLinks";

export type ClusterId = "frais-reels" | "indemnites-kilometriques";

interface ClusterDefinition {
  pillar: RelatedLink;
  satellites: RelatedLink[];
}

export const CLUSTERS: Record<ClusterId, ClusterDefinition> = {
  "frais-reels": {
    pillar: {
      label: "Frais réels : le guide complet",
      href: "/frais-reels",
      description: "Déduire ses frais professionnels au réel plutôt qu'au forfait de 10 %.",
    },
    satellites: [
      {
        label: "Note de frais kilométrique",
        href: "/note-de-frais-kilometrique",
        description: "Le justificatif à fournir pour vos remboursements.",
      },
      {
        label: "Indemnité grand déplacement 2026",
        href: "/indemnite-grand-deplacement-2026",
        description: "Barèmes repas et hébergement hors du domicile.",
      },
      {
        label: "Expert-comptable",
        href: "/expert-comptable",
        description: "Transmettre un relevé conforme à votre cabinet.",
      },
      {
        label: "Lexique fiscal",
        href: "/lexique",
        description: "Tous les termes de la déduction des frais professionnels.",
      },
    ],
  },
  "indemnites-kilometriques": {
    pillar: {
      label: "Indemnités kilométriques : le guide",
      href: "/indemnites-kilometriques",
      description: "Calcul, barème officiel, justificatifs et cas particuliers.",
    },
    satellites: [
      {
        label: "Barème kilométrique 2026",
        href: "/bareme-ik-2026",
        description: "Les tarifs officiels par puissance fiscale et distance.",
      },
      {
        label: "Barème kilométrique 2027",
        href: "/indemnites-kilometriques-2027",
        description: "Projections et nouveautés attendues pour 2027.",
      },
      {
        label: "Indemnité kilométrique vélo",
        href: "/indemnite-kilometrique-velo",
        description: "Forfait mobilités durables et barème vélo.",
      },
      {
        label: "Meilleurs outils IK 2027",
        href: "/meilleurs-outils-indemnites-kilometriques-2027",
        description: "Comparatif des applications de suivi kilométrique.",
      },
      {
        label: "Meilleure application IK",
        href: "/meilleure-application-indemnites-kilometriques",
        description: "Les critères pour choisir son application de suivi.",
      },
      {
        label: "IKtracker vs Izika",
        href: "/comparatif-izika",
        description: "Comparatif détaillé des deux applications.",
      },
      {
        label: "IKtracker vs Drivers Note",
        href: "/comparatif-driversnote",
        description: "Comparatif détaillé des deux applications.",
      },
    ],
  },
};

/** Page -> cluster auquel elle appartient. */
export const PAGE_CLUSTER: Record<string, ClusterId> = {
  "/frais-reels": "frais-reels",
  "/note-de-frais-kilometrique": "frais-reels",
  "/indemnite-grand-deplacement-2026": "frais-reels",
  "/expert-comptable": "frais-reels",
  "/lexique": "frais-reels",
  "/indemnites-kilometriques": "indemnites-kilometriques",
  "/bareme-ik-2026": "indemnites-kilometriques",
  "/indemnites-kilometriques-2027": "indemnites-kilometriques",
  "/indemnite-kilometrique-velo": "indemnites-kilometriques",
  "/meilleurs-outils-indemnites-kilometriques-2027": "indemnites-kilometriques",
  "/meilleure-application-indemnites-kilometriques": "indemnites-kilometriques",
  "/comparatif-izika": "indemnites-kilometriques",
  "/comparatif-driversnote": "indemnites-kilometriques",
};

const OTHER: Record<ClusterId, ClusterId> = {
  "frais-reels": "indemnites-kilometriques",
  "indemnites-kilometriques": "frais-reels",
};

/**
 * Liens internes d'une page :
 *  - satellite : le pilier de son cluster en premier, puis ses pages sœurs
 *  - pilier : ses satellites principaux + un lien réciproque vers l'autre pilier
 */
export function getClusterLinks(path: string, limit = 3): RelatedLink[] {
  const clusterId = PAGE_CLUSTER[path];
  if (!clusterId) return [];
  const cluster = CLUSTERS[clusterId];
  const isPillar = cluster.pillar.href === path;

  if (isPillar) {
    const links = cluster.satellites.slice(0, Math.max(limit - 1, 1));
    links.push(CLUSTERS[OTHER[clusterId]].pillar);
    return links;
  }

  const siblings = cluster.satellites.filter((s) => s.href !== path);
  return [cluster.pillar, ...siblings].slice(0, limit);
}
