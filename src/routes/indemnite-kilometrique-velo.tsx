import { createFileRoute } from "@tanstack/react-router";
import IndemniteKilometriqueVelo from "@/pages/IndemniteKilometriqueVelo";

export const Route = createFileRoute("/indemnite-kilometrique-velo")({
  head: () => ({
    meta: [
      {"title":"Indemnité kilométrique vélo 2025-2026 | Forfait Mobilités Durables"},
      {"name":"description","content":"Guide complet de l'indemnité kilométrique vélo et du Forfait Mobilités Durables en 2025-2026 : montant, plafond 700 €, exonération URSSAF, justificatifs. Pour salariés, freelances et employeurs."},
      {"name":"keywords","content":"indemnité kilométrique vélo, IK vélo, forfait mobilités durables, FMD, indemnité vélo électrique, vélotaf, indemnité vélo employeur, plafond 700 euros vélo"},
      {"name":"robots","content":"index, follow, max-image-preview:large, max-snippet:-1"},
      {"property":"og:title","content":"Indemnité kilométrique vélo 2025-2026 | Forfait Mobilités Durables"},
      {"property":"og:description","content":"Tout savoir sur l'indemnité kilométrique vélo et le Forfait Mobilités Durables : 700 €/an exonérés, conditions, justificatifs et calcul."},
      {"property":"og:url","content":"https://iktracker.fr/indemnite-kilometrique-velo"},
      {"property":"og:type","content":"article"},
      {"property":"og:locale","content":"fr_FR"},
      {"property":"og:site_name","content":"IKtracker"},
    ],
    links: [
      {"rel":"canonical","href":"https://iktracker.fr/indemnite-kilometrique-velo"},
    ],
  }),
  component: IndemniteKilometriqueVelo,
});
