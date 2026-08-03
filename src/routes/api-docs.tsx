import { createFileRoute } from "@tanstack/react-router";
import ApiDocs from "@/pages/ApiDocs";

export const Route = createFileRoute("/api-docs")({
  head: () => ({
    meta: [
      {"title":"API Partenaires — IKtracker"},
      {"name":"description","content":"Documentation de l'API Partenaires IKtracker : intégrez le calcul d'indemnités kilométriques, la création de trajets et le SSO dans votre plateforme."},
    ],
    links: [
      {"rel":"canonical","href":"https://iktracker.fr/api-docs"},
    ],
  }),
  component: ApiDocs,
});
