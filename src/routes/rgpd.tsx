import { createFileRoute } from "@tanstack/react-router";
import Rgpd from "@/pages/Rgpd";

export const Route = createFileRoute("/rgpd")({
  head: () => ({
    meta: [
      {"title":"RGPD — Protection des données personnelles | IKtracker"},
      {"name":"description","content":"Politique RGPD d'IKtracker : droits d'accès, rectification, effacement, portabilité. Conformité totale au Règlement Général sur la Protection des Données pour les indépendants français."},
      {"name":"keywords","content":"RGPD, protection données personnelles, conformité RGPD, droits utilisateurs, CNIL, IKtracker, données trajets"},
      {"name":"robots","content":"index, follow"},
      {"property":"og:title","content":"RGPD — Protection des données personnelles | IKtracker"},
      {"property":"og:description","content":"Conformité RGPD totale d'IKtracker. Exercez vos droits d'accès, rectification, effacement et portabilité en toute simplicité."},
      {"property":"og:type","content":"website"},
      {"property":"og:url","content":"https://iktracker.fr/rgpd"},
      {"property":"og:locale","content":"fr_FR"},
      {"property":"og:site_name","content":"IKtracker"},
      {"name":"twitter:card","content":"summary"},
      {"name":"twitter:title","content":"RGPD — Protection des données personnelles | IKtracker"},
      {"name":"twitter:description","content":"Conformité RGPD totale d'IKtracker. Exercez vos droits en toute simplicité."},
    ],
    links: [
      {"rel":"canonical","href":"https://iktracker.fr/rgpd"},
    ],
  }),
  component: Rgpd,
});
