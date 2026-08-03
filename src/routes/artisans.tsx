import { createFileRoute } from "@tanstack/react-router";
import Artisans from "@/pages/Artisans";

export const Route = createFileRoute("/artisans")({
  head: () => ({
    meta: [
      {"title":"Frais kilométriques artisan : suivi des trajets de chantier"},
      {"name":"description","content":"Artisan du bâtiment : calculez vos frais kilométriques au barème 2026 et suivez vos trajets de chantier gratuitement avec IKtracker. Relevé PDF pour le comptable, 0 €."},
      {"property":"og:title","content":"Frais kilométriques artisan : trajets de chantier et devis"},
      {"property":"og:description","content":"IKtracker calcule vos frais kilométriques de chantier au barème officiel, gratuitement. DictaDevi transforme votre voix en devis."},
      {"property":"og:type","content":"article"},
      {"property":"og:locale","content":"fr_FR"},
      {"property":"og:url","content":"https://iktracker.fr/artisans"},
      {"property":"og:site_name","content":"IKtracker"},
      {"property":"og:image","content":"https://iktracker.fr/logo-iktracker-250.webp"},
      {"name":"twitter:card","content":"summary_large_image"},
      {"name":"twitter:title","content":"Frais kilométriques artisan : trajets de chantier"},
      {"name":"twitter:description","content":"Calcul automatique des frais kilométriques de chantier au barème officiel, gratuit, et devis dictés à la voix avec DictaDevi."},
      {"name":"geo.region","content":"FR"},
      {"name":"language","content":"fr"},
    ],
    links: [
      {"rel":"canonical","href":"https://iktracker.fr/artisans"},
    ],
  }),
  component: Artisans,
});
