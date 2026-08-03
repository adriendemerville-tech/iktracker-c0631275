import { createFileRoute } from "@tanstack/react-router";
import Tarifs from "@/pages/Tarifs";

export const Route = createFileRoute("/tarifs")({
  head: () => ({
    meta: [
      {"title":"Tarifs IKtracker — 0€, gratuit à vie, sans abonnement"},
      {"name":"description","content":"IKtracker est 100% gratuit à vie : 0€, sans abonnement ni carte bancaire. Calculez vos indemnités kilométriques 2025-2026 sans payer."},
      {"name":"keywords","content":"indemnités kilométriques gratuit, calcul IK sans abonnement, logiciel frais kilométriques 0€, alternative gratuite Izika Drivers Note"},
      {"property":"og:title","content":"Tarifs IKtracker — 0€, gratuit à vie"},
      {"property":"og:description","content":"IKtracker est 100% gratuit à vie : 0€, sans abonnement, sans carte bancaire, sans pub."},
      {"property":"og:url","content":"https://iktracker.fr/tarifs"},
      {"property":"og:type","content":"website"},
    ],
    links: [
      {"rel":"canonical","href":"https://iktracker.fr/tarifs"},
    ],
  }),
  component: Tarifs,
});
