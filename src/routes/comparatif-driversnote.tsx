import { createFileRoute } from "@tanstack/react-router";
import ComparatifDriversNote from "@/pages/ComparatifDriversNote";

export const Route = createFileRoute("/comparatif-driversnote")({
  head: () => ({
    meta: [
      {"title":"Alternative Driversnote Gratuite : Comparatif iBeacon vs Agenda | IKtracker"},
      {"name":"description","content":"Driversnote est trop cher ou trop intrusif ? Découvrez IKtracker, l'alternative sans GPS permanent, sans boîtier à acheter et 100% gratuite."},
      {"name":"keywords","content":"driversnote alternative, driversnote gratuit, ibeacon frais kilométriques, mouchard gps voiture, alternative driversnote france, suivi kilométrique sans gps"},
      {"property":"og:title","content":"Driversnote vs IKtracker : Avez-vous vraiment besoin d'un mouchard GPS ?"},
      {"property":"og:description","content":"Comparatif 2026 : Le tracking GPS automatique vs la synchronisation d'agenda intelligente. Alternative gratuite et respectueuse de la vie privée."},
      {"property":"og:type","content":"article"},
      {"property":"og:locale","content":"fr_FR"},
      {"property":"og:url","content":"https://iktracker.fr/comparatif-driversnote"},
      {"property":"og:site_name","content":"IKtracker"},
      {"property":"og:image","content":"https://iktracker.fr/logo-iktracker-250.webp"},
      {"name":"twitter:card","content":"summary_large_image"},
      {"name":"twitter:title","content":"Alternative Driversnote Gratuite 2026"},
      {"name":"twitter:description","content":"Driversnote trop cher ? Découvrez IKtracker, l'alternative sans GPS permanent et 100% gratuite."},
      {"name":"geo.region","content":"FR"},
      {"name":"geo.placename","content":"France"},
      {"name":"language","content":"fr"},
    ],
    links: [
      {"rel":"canonical","href":"https://iktracker.fr/comparatif-driversnote"},
    ],
  }),
  component: ComparatifDriversNote,
});
