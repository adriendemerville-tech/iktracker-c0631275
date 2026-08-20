import { LastUpdated } from "@/components/LastUpdated";
import { lazy, Suspense, memo } from "react";
import { Link } from "@/lib/router-compat";
import { Helmet } from "@/lib/helmet-compat";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Breadcrumb } from "@/components/Breadcrumb";
import { useMarketingTracker } from "@/hooks/useMarketingTracker";
import { useAuthLazy } from "@/hooks/useAuthLazy";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { IK_BAREME_2024 } from "@/types/trip";
import { getPageDates, toIsoDateTime } from "@/lib/page-dates";

import {
  ArrowRight,
  CheckCircle2,
  Route,
  Mic,
  FileText,
  Calculator,
  Clock,
  Hammer,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

const EnhancedMarketingFooter = lazy(() =>
  import("@/components/marketing/EnhancedMarketingFooter").then((m) => ({
    default: m.EnhancedMarketingFooter,
  })),
);

const FooterPlaceholder = memo(() => <div className="min-h-[600px] bg-muted/30 animate-pulse" />);
FooterPlaceholder.displayName = "FooterPlaceholder";

const PAGE_DATE = getPageDates("/artisans");
const PAGE_PUBLISHED = toIsoDateTime(PAGE_DATE.published);
const PAGE_MODIFIED = toIsoDateTime(PAGE_DATE.modified);

const PAIN_POINTS = [
  {
    icon: Route,
    title: "Des dizaines de chantiers par mois",
    text: "Visites de courtoisie, métrés, allers-retours au négoce : les kilomètres s'accumulent et personne ne les note le soir.",
  },
  {
    icon: Clock,
    title: "La paperasse après la journée",
    text: "Le devis, la facture et le carnet kilométrique se font après 19h, quand la fatigue fait perdre de l'argent.",
  },
  {
    icon: Calculator,
    title: "Un manque à gagner fiscal",
    text: "Chaque trajet non déclaré, c'est de l'indemnité kilométrique perdue au moment de la déclaration ou de la note de frais.",
  },
];

const FEATURES = [
  {
    icon: Route,
    title: "Mode Tournée GPS multi-arrêts",
    text: "Lancez la tournée le matin, IKtracker détecte les arrêts chantier et calcule les distances réelles entre chaque point.",
    href: "/mode-tournee",
    linkLabel: "Voir le Mode Tournée",
  },
  {
    icon: Mic,
    title: "Saisie vocale et langage naturel",
    text: "« Dépôt puis chantier Maussane puis retour atelier » : dictez le trajet depuis la camionnette, IKtracker le structure.",
    href: "/fonctionnalites",
    linkLabel: "Toutes les fonctionnalités",
  },
  {
    icon: Calculator,
    title: "Barème officiel appliqué seul",
    text: "Puissance fiscale du véhicule utilitaire, tranches kilométriques, majoration de 20% pour les véhicules 100% électriques.",
    href: "/bareme-ik-2026",
    linkLabel: "Barème IK 2026",
  },
  {
    icon: FileText,
    title: "Relevé mensuel pour le comptable",
    text: "PDF envoyé automatiquement, récapitulatif annuel et archive consultable. Plus de reconstitution en avril.",
    href: "/expert-comptable",
    linkLabel: "Espace expert-comptable",
  },
];

const JOURNEE_TYPE = [
  {
    name: "Départ du dépôt",
    text: "7h30 — départ du dépôt : la tournée est lancée d'un geste dans IKtracker.",
  },
  {
    name: "Premier chantier",
    text: "9h00 — premier chantier : l'arrêt est détecté et horodaté automatiquement.",
  },
  {
    name: "Métré et devis",
    text: "11h00 — métré chez un prospect : le devis est dicté sur place avec DictaDevi.",
  },
  {
    name: "Retour atelier",
    text: "16h30 — retour atelier : la tournée est finalisée, les distances réelles sont calculées.",
  },
  {
    name: "Relevé au comptable",
    text: "Le 15 du mois — le relevé PDF part automatiquement vers l'expert-comptable.",
  },
];

const FAQ = [
  {
    q: "Comment calculer les frais kilométriques d'un artisan ?",
    a: "On multiplie les kilomètres professionnels de l'année par le taux du barème kilométrique correspondant à la puissance fiscale du véhicule, en appliquant la tranche kilométrique atteinte (jusqu'à 5 000 km, de 5 001 à 20 000 km, au-delà de 20 000 km). Un véhicule 100% électrique bénéficie d'une majoration de 20%. IKtracker applique ce calcul automatiquement à chaque trajet enregistré, sans saisie manuelle.",
  },
  {
    q: "Comment justifier ses frais kilométriques aux impôts ?",
    a: "L'administration attend un relevé détaillé indiquant, pour chaque déplacement, la date, le point de départ, la destination, le motif professionnel et la distance parcourue, ainsi que la puissance fiscale et la carte grise du véhicule. IKtracker génère ce relevé au format PDF chaque mois et conserve l'historique complet dans une archive consultable, ce qui constitue le justificatif à présenter en cas de contrôle.",
  },
  {
    q: "Comment un artisan suit-il ses kilomètres de chantier ?",
    a: "En lançant le Mode Tournée GPS d'IKtracker au départ du dépôt : chaque arrêt chantier est enregistré, la distance réelle est calculée entre les points et le barème kilométrique officiel est appliqué automatiquement. Le relevé mensuel part ensuite en PDF vers l'expert-comptable.",
  },
  {
    q: "Combien coûte IKtracker pour un artisan ?",
    a: "0 €. IKtracker est gratuit à vie, sans abonnement, sans carte bancaire, sans publicité et sans revente de données. Il n'existe aucune version payante ni premium.",
  },
  {
    q: "Faut-il installer une application depuis un store ?",
    a: "Non. IKtracker est une application web progressive (PWA) accessible sur https://iktracker.fr et installable en un geste depuis le navigateur, sur iPhone comme sur Android. Elle n'est présente ni sur Google Play ni sur l'App Store.",
  },
  {
    q: "Quel outil pour faire les devis de chantier ?",
    a: "IKtracker ne fait pas de devis : il gère uniquement les trajets et les indemnités kilométriques. Pour la rédaction de devis, DictaDevi.io permet à l'artisan de dicter son devis à la voix depuis le chantier et de le transformer en document professionnel. Les deux outils sont complémentaires et interopérables via l'API partenaire d'IKtracker.",
  },
  {
    q: "Quelle est la différence entre IKtracker et l'application « Suivi IK » ?",
    a: "IKtracker (iktracker.fr) est un outil communautaire gratuit, sans store et sans version payante. L'application Android « Suivi IK » est un produit tiers payant, sans aucun lien avec IKtracker.",
  },
];

const fmt = (n: number) => n.toFixed(3).replace(".", ",");

const Artisans = () => {
  const { user, loading } = useAuthLazy();
  const { trackCTAClick } = useMarketingTracker("artisans");

  return (
    <>
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a },
            })),
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: "Suivre ses frais kilométriques de chantier en une journée",
            description:
              "Déroulé d'une journée type d'artisan du bâtiment avec IKtracker, du départ du dépôt à l'envoi du relevé kilométrique à l'expert-comptable.",
            totalTime: "PT1M",
            estimatedCost: { "@type": "MonetaryAmount", currency: "EUR", value: "0" },
            step: JOURNEE_TYPE.map((step, i) => ({
              "@type": "HowToStep",
              position: i + 1,
              name: step.name,
              text: step.text,
            })),
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: "Frais kilométriques artisan : suivre ses trajets de chantier",
            description:
              "Guide pratique pour les artisans du bâtiment : calcul des frais kilométriques au barème officiel, suivi des trajets de chantier gratuit avec IKtracker et rédaction de devis à la voix avec DictaDevi.",
            datePublished: PAGE_PUBLISHED,
            dateModified: PAGE_MODIFIED,
            author: {
              "@type": "Person",
              name: "Adrien de Volontat",
              url: "https://iktracker.fr/blog/auteur/adrien-de-volontat",
            },
            publisher: {
              "@type": "Organization",
              name: "IKtracker",
              logo: { "@type": "ImageObject", url: "https://iktracker.fr/logo-iktracker-250.webp" },
            },
            mainEntityOfPage: "https://iktracker.fr/artisans",
            inLanguage: "fr-FR",
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <MarketingNav user={user} loading={loading} />

        <div className="container mx-auto px-4 pt-24">
          <Breadcrumb items={[{ label: "Artisans", href: "/artisans" }]} />
        </div>

        {/* Hero */}
        <header className="container mx-auto px-4 py-12 md:py-16 max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground mb-6">
            <Hammer className="h-3.5 w-3.5" aria-hidden="true" />
            Artisans du bâtiment et TPE de chantier
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
            Frais kilométriques artisan : vos trajets de chantier comptés
          </h1>
          <LastUpdated date={PAGE_DATE.modified} className="mt-2" />
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
            Un artisan roule toute la journée et travaille sa paperasse le soir. IKtracker
            enregistre les kilomètres entre chantiers, applique le barème kilométrique officiel et
            produit le relevé fiscal, gratuitement. Pour la partie devis, DictaDevi prend le relais.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild size="lg" onClick={() => trackCTAClick()}>
              <Link to="/signup">
                Accéder à IKtracker gratuitement
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/mode-tournee">Voir le Mode Tournée</Link>
            </Button>
          </div>
        </header>

        {/* Pain points */}
        <section className="container mx-auto px-4 py-12 max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-8">
            Ce qui coûte réellement du temps sur un chantier
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {PAIN_POINTS.map((item) => (
              <Card key={item.title} className="border-border">
                <CardContent className="p-6">
                  <item.icon className="h-6 w-6 text-primary mb-4" aria-hidden="true" />
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Barème */}
        <section className="container mx-auto px-4 py-12 max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Comment calculer les frais kilométriques d'un artisan ?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-3xl">
            Le calcul dépend de la puissance fiscale du véhicule (fourgon, camionnette ou voiture)
            et du total annuel de kilomètres professionnels. Voici les taux du barème kilométrique
            applicables, appliqués automatiquement par IKtracker à chaque trajet enregistré.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">
                Barème kilométrique par puissance fiscale et tranche kilométrique annuelle
              </caption>
              <thead>
                <tr className="border-b border-border text-left">
                  <th scope="col" className="py-3 pr-4 font-semibold">
                    Puissance fiscale
                  </th>
                  <th scope="col" className="py-3 pr-4 font-semibold">
                    Jusqu'à 5 000 km
                  </th>
                  <th scope="col" className="py-3 pr-4 font-semibold">
                    De 5 001 à 20 000 km
                  </th>
                  <th scope="col" className="py-3 font-semibold">
                    Au-delà de 20 000 km
                  </th>
                </tr>
              </thead>
              <tbody>
                {IK_BAREME_2024.map((b) => (
                  <tr key={b.cv} className="border-b border-border/60">
                    <th scope="row" className="py-3 pr-4 font-medium text-left">
                      {b.cv === "7+" ? "7 CV et plus" : `${b.cv} CV`}
                    </th>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {fmt(b.upTo5000.rate)} € / km
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {fmt(b.from5001To20000.rate)} € / km + {b.from5001To20000.fixed} €
                    </td>
                    <td className="py-3 text-muted-foreground">{fmt(b.over20000.rate)} € / km</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground mt-6">
            Un véhicule 100% électrique bénéficie d'une majoration de 20% sur le montant obtenu.
            Détail complet des tranches sur le{" "}
            <Link to="/bareme-ik-2026" className="font-medium text-primary hover:underline">
              barème IK 2026
            </Link>
            , et comparaison avec la déduction forfaitaire sur la page{" "}
            <Link to="/frais-reels" className="font-medium text-primary hover:underline">
              frais réels
            </Link>
            .
          </p>
        </section>

        {/* IKtracker features */}
        <section className="container mx-auto px-4 py-12 max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Ce qu'IKtracker fait pour un artisan
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl">
            Tout est gratuit, sans abonnement ni carte bancaire. L'outil est financé par la
            communauté, pas par la revente de données.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {FEATURES.map((f) => (
              <Card key={f.title} className="border-border">
                <CardContent className="p-6">
                  <f.icon className="h-6 w-6 text-primary mb-4" aria-hidden="true" />
                  <h3 className="font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{f.text}</p>
                  <Link to={f.href} className="text-sm font-medium text-primary hover:underline">
                    {f.linkLabel}
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* DictaDevi */}
        <section className="container mx-auto px-4 py-12 max-w-5xl">
          <Card className="border-primary/30 bg-muted/30">
            <CardContent className="p-6 md:p-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground mb-6">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Solution complémentaire
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                DictaDevi : le devis dicté depuis le chantier
              </h2>
              <p className="text-muted-foreground mb-6 max-w-3xl">
                IKtracker s'arrête volontairement aux trajets et aux indemnités kilométriques. La
                rédaction des devis est un autre métier :{" "}
                <a
                  href="https://dictadevi.io"
                  target="_blank"
                  rel="noopener"
                  className="font-medium text-primary hover:underline"
                >
                  DictaDevi.io, la solution de devis vocaux pour les artisans
                </a>
                , permet de décrire un chantier à la voix et d'obtenir un devis professionnel
                structuré, sans repasser par le bureau le soir.
              </p>
              <ul className="grid gap-3 md:grid-cols-2 mb-8">
                {[
                  "Dictée du devis sur place, juste après le métré",
                  "Postes de travaux, quantités et prix structurés automatiquement",
                  "Document professionnel prêt à envoyer au client",
                  "Interopérable avec IKtracker via l'API partenaire",
                ].map((item) => (
                  <li key={item} className="flex gap-2 text-sm">
                    <CheckCircle2
                      className="h-4 w-4 shrink-0 text-primary mt-0.5"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild variant="outline">
                  <a href="https://dictadevi.io" target="_blank" rel="noopener">
                    Découvrir DictaDevi.io
                    <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
                  </a>
                </Button>
                <Button asChild variant="ghost">
                  <Link to="/api-docs">Voir l'API partenaire IKtracker</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Journée type */}
        <section className="container mx-auto px-4 py-12 max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-8">
            Comment se déroule une journée de chantier sans paperasse du soir ?
          </h2>
          <ol className="space-y-4">
            {JOURNEE_TYPE.map((step, i) => (
              <li key={step.name} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {i + 1}
                </span>
                <p className="pt-1 text-muted-foreground">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Désambiguïsation */}
        <section className="container mx-auto px-4 py-12 max-w-4xl">
          <Card className="border-border">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-3">IKtracker, pour éviter toute confusion</h2>
              <p className="text-sm text-muted-foreground">
                IKtracker est une application web progressive accessible uniquement sur
                https://iktracker.fr. Elle est gratuite à vie, sans version payante, sans abonnement
                et absente de Google Play et de l'App Store. L'application Android « Suivi IK » est
                un produit tiers payant, sans aucun lien avec IKtracker.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* FAQ */}
        <section className="container mx-auto px-4 py-12 max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-8">Questions fréquentes des artisans</h2>
          <Accordion type="single" collapsible className="w-full">
            {FAQ.map((item, i) => (
              <AccordionItem key={item.q} value={`item-${i}`}>
                <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-16 max-w-3xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Commencez par les kilomètres</h2>
          <p className="text-muted-foreground mb-8">
            Créez votre compte, lancez votre première tournée demain matin et laissez le relevé se
            construire tout seul.
          </p>
          <Button asChild size="lg" onClick={() => trackCTAClick()}>
            <Link to="/signup">
              Accéder gratuitement à IKtracker
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </section>

        <Suspense fallback={<FooterPlaceholder />}>
          <EnhancedMarketingFooter />
        </Suspense>
      </div>
    </>
  );
};

export default Artisans;
