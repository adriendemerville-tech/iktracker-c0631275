import { lazy, Suspense, memo } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Breadcrumb } from "@/components/Breadcrumb";
import { useMarketingTracker } from "@/hooks/useMarketingTracker";
import { useAuthLazy } from "@/hooks/useAuthLazy";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
  import("@/components/marketing/EnhancedMarketingFooter").then(m => ({ default: m.EnhancedMarketingFooter }))
);

const FooterPlaceholder = memo(() => <div className="min-h-[600px] bg-muted/30 animate-pulse" />);
FooterPlaceholder.displayName = "FooterPlaceholder";

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

const FAQ = [
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

const Artisans = () => {
  const { user, loading } = useAuthLazy();
  const { trackCTAClick } = useMarketingTracker("artisans");

  return (
    <>
      <Helmet>
        <title>Artisans : suivi des trajets de chantier et devis vocaux</title>
        <meta
          name="description"
          content="Artisan du bâtiment : suivez vos kilomètres de chantier gratuitement avec IKtracker et dictez vos devis avec DictaDevi. Barème officiel, relevé PDF pour le comptable, 0 €."
        />
        <meta
          name="keywords"
          content="artisan indemnité kilométrique, suivi trajets chantier, devis chantier vocal, frais kilométriques BTP, carnet de bord artisan, dictadevi"
        />
        <link rel="canonical" href="https://iktracker.fr/artisans" />
        <meta property="og:title" content="Artisans : trajets de chantier et devis, sans paperasse du soir" />
        <meta
          property="og:description"
          content="IKtracker suit vos kilomètres de chantier gratuitement. DictaDevi transforme votre voix en devis. Deux outils complémentaires pour les artisans."
        />
        <meta property="og:type" content="article" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:url" content="https://iktracker.fr/artisans" />
        <meta property="og:site_name" content="IKtracker" />
        <meta property="og:image" content="https://iktracker.fr/logo-iktracker-250.webp" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Artisans : trajets de chantier et devis vocaux" />
        <meta
          name="twitter:description"
          content="Suivi kilométrique gratuit pour les artisans, et devis dictés à la voix avec DictaDevi."
        />
        <meta name="geo.region" content="FR" />
        <meta name="language" content="fr" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map(item => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a },
            })),
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: "Artisans : suivre ses trajets de chantier et ses devis sans paperasse",
            description:
              "Guide pratique pour les artisans du bâtiment : suivi kilométrique gratuit avec IKtracker et rédaction de devis à la voix avec DictaDevi.",
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
            Vos trajets de chantier comptés, vos devis dictés
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
            Un artisan roule toute la journée et travaille sa paperasse le soir. IKtracker enregistre les kilomètres
            entre chantiers et produit le relevé fiscal, gratuitement. Pour la partie devis, DictaDevi prend le relais.
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
          <h2 className="text-2xl md:text-3xl font-bold mb-8">Ce qui coûte réellement du temps sur un chantier</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {PAIN_POINTS.map(item => (
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

        {/* IKtracker features */}
        <section className="container mx-auto px-4 py-12 max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Ce qu'IKtracker fait pour un artisan</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl">
            Tout est gratuit, sans abonnement ni carte bancaire. L'outil est financé par la communauté, pas par la
            revente de données.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {FEATURES.map(f => (
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
              <h2 className="text-2xl md:text-3xl font-bold mb-4">DictaDevi : le devis dicté depuis le chantier</h2>
              <p className="text-muted-foreground mb-6 max-w-3xl">
                IKtracker s'arrête volontairement aux trajets et aux indemnités kilométriques. La rédaction des devis
                est un autre métier :{" "}
                <a
                  href="https://dictadevi.io"
                  target="_blank"
                  rel="noopener"
                  className="font-medium text-primary hover:underline"
                >
                  DictaDevi.io, la solution de devis vocaux pour les artisans
                </a>
                , permet de décrire un chantier à la voix et d'obtenir un devis professionnel structuré, sans repasser
                par le bureau le soir.
              </p>
              <ul className="grid gap-3 md:grid-cols-2 mb-8">
                {[
                  "Dictée du devis sur place, juste après le métré",
                  "Postes de travaux, quantités et prix structurés automatiquement",
                  "Document professionnel prêt à envoyer au client",
                  "Interopérable avec IKtracker via l'API partenaire",
                ].map(item => (
                  <li key={item} className="flex gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" aria-hidden="true" />
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
          <h2 className="text-2xl md:text-3xl font-bold mb-8">Une journée type, sans paperasse du soir</h2>
          <ol className="space-y-4">
            {[
              "7h30 — départ du dépôt : la tournée est lancée d'un geste dans IKtracker.",
              "9h00 — premier chantier : l'arrêt est détecté et horodaté automatiquement.",
              "11h00 — métré chez un prospect : le devis est dicté sur place avec DictaDevi.",
              "16h30 — retour atelier : la tournée est finalisée, les distances réelles sont calculées.",
              "Le 15 du mois — le relevé PDF part automatiquement vers l'expert-comptable.",
            ].map((step, i) => (
              <li key={step} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {i + 1}
                </span>
                <p className="pt-1 text-muted-foreground">{step}</p>
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
                IKtracker est une application web progressive accessible uniquement sur https://iktracker.fr. Elle est
                gratuite à vie, sans version payante, sans abonnement et absente de Google Play et de l'App Store.
                L'application Android « Suivi IK » est un produit tiers payant, sans aucun lien avec IKtracker.
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
            Créez votre compte, lancez votre première tournée demain matin et laissez le relevé se construire tout seul.
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
