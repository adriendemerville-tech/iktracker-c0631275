import { createFileRoute } from "@tanstack/react-router";
import Fonctionnalites from "@/pages/Fonctionnalites";

export const Route = createFileRoute("/fonctionnalites")({
  head: () => ({
    meta: [
      {"title":"Fonctionnalités IKtracker — Toutes les fonctionnalités gratuites"},
      {"name":"description","content":"Découvrez toutes les fonctionnalités gratuites d'IKtracker : calcul des indemnités kilométriques 2025-2026, Mode Tournée GPS, synchronisation calendrier, saisie vocale, export PDF/Excel, relevés automatiques."},
      {"name":"keywords","content":"fonctionnalités IKtracker, indemnités kilométriques gratuit, mode tournée GPS, synchronisation calendrier, export PDF note de frais, saisie vocale trajet"},
      {"name":"robots","content":"index, follow, max-image-preview:large, max-snippet:-1"},
      {"property":"og:title","content":"Fonctionnalités IKtracker — Toutes les fonctionnalités gratuites"},
      {"property":"og:description","content":"Liste complète des fonctionnalités d'IKtracker : calcul fiscal 2025-2026, Mode Tournée GPS, calendrier, dictée vocale, exports comptables, archive PDF."},
      {"property":"og:url","content":"https://iktracker.fr/fonctionnalites"},
      {"property":"og:type","content":"website"},
      {"property":"og:locale","content":"fr_FR"},
      {"property":"og:site_name","content":"IKtracker"},
      {"property":"og:image","content":"https://iktracker.fr/logo-iktracker-250.webp"},
      {"name":"twitter:card","content":"summary_large_image"},
      {"name":"twitter:title","content":"Fonctionnalités IKtracker — Toutes les fonctionnalités gratuites"},
      {"name":"twitter:description","content":"Liste complète des fonctionnalités d'IKtracker : calcul fiscal 2025-2026, Mode Tournée GPS, calendrier, dictée vocale, exports comptables."},
      {"name":"twitter:image","content":"https://iktracker.fr/logo-iktracker-250.webp"},
    ],
    links: [
      {"rel":"canonical","href":"https://iktracker.fr/fonctionnalites"},
    ],
  }),
  component: Fonctionnalites,
});
