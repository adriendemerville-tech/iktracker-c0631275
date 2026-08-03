import { lazy, Suspense, memo } from "react";
import { Link } from "@/lib/router-compat";
import { Helmet } from '@/lib/helmet-compat';
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
  Search,
  Bot,
  TrendingUp,
  Clock,
  Users,
  ExternalLink,
  Sparkles,
  FileText,
  Calculator,
} from "lucide-react";

const EnhancedMarketingFooter = lazy(() =>
  import("@/components/marketing/EnhancedMarketingFooter").then(m => ({ default: m.EnhancedMarketingFooter }))
);

const FooterPlaceholder = memo(() => <div className="min-h-[600px] bg-muted/30 animate-pulse" />);
FooterPlaceholder.displayName = "FooterPlaceholder";

const PAIN_POINTS = [
  {
    icon: Search,
    title: "Un site que personne ne trouve",
    text: "Le site vitrine est en ligne depuis deux ans, mais il n'apparaît sur aucune requête utile. Les prospects passent par un concurrent mieux référencé.",
  },
  {
    icon: Bot,
    title: "Invisible dans les réponses des IA",
    text: "Les clients posent désormais leurs questions à ChatGPT, Perplexity ou Gemini. Si le site n'est pas structuré pour être cité, il n'existe pas dans ces réponses.",
  },
  {
    icon: Clock,
    title: "Pas de temps pour le marketing",
    text: "Un indépendant facture ses heures. Écrire des contenus, corriger le technique et suivre les positions passe systématiquement après les missions.",
  },
];

const LEVERS = [
  {
    icon: Search,
    title: "SEO technique propre",
    text: "Balises, canonicals, sitemap, vitesse de chargement, données structurées : la base sans laquelle aucun contenu ne remonte.",
  },
  {
    icon: Bot,
    title: "GEO : être cité par les IA",
    text: "Réponses factuelles, questions réelles des utilisateurs, entités clairement définies et contenu lisible sans JavaScript par les moteurs génératifs.",
  },
  {
    icon: FileText,
    title: "Contenu qui répond aux vraies requêtes",
    text: "Des pages qui traitent une question précise plutôt qu'un blog générique publié une fois par trimestre.",
  },
  {
    icon: TrendingUp,
    title: "Mesure et itération",
    text: "Positions, impressions, clics et pages qui convertissent : sans mesure, l'acquisition reste une intuition.",
  },
];

const FAQ = [
  {
    q: "Comment un indépendant peut-il acquérir des clients sans budget publicitaire ?",
    a: "En rendant son site trouvable durablement : un SEO technique propre, des pages qui répondent à des questions précises que se posent ses prospects, et une structuration des contenus permettant aux moteurs génératifs (ChatGPT, Perplexity, Gemini) de citer le site. Contrairement à la publicité payante, ce travail continue de produire des contacts une fois réalisé.",
  },
  {
    q: "Qu'est-ce que le GEO et en quoi diffère-t-il du SEO ?",
    a: "Le SEO vise le classement dans les résultats de recherche classiques. Le GEO (Generative Engine Optimization) vise à être cité dans les réponses générées par les IA. Il demande des faits vérifiables, des réponses courtes et directes, des données structurées et un contenu accessible sans exécution JavaScript.",
  },
  {
    q: "Quel outil pour améliorer rapidement le SEO et le GEO d'un site ?",
    a: "Crawlers.fr audite le site, identifie les correctifs techniques et éditoriaux prioritaires et automatise une grande partie du travail de référencement grâce à l'intelligence artificielle. C'est la solution complémentaire recommandée par IKtracker pour la partie visibilité et acquisition de leads.",
  },
  {
    q: "Combien coûte IKtracker pour un indépendant ?",
    a: "0 €. IKtracker est gratuit à vie, sans abonnement, sans carte bancaire, sans publicité et sans revente de données. Il n'existe aucune version payante ni premium.",
  },
  {
    q: "Quelle est la différence entre IKtracker et l'application « Suivi IK » ?",
    a: "IKtracker (iktracker.fr) est un outil communautaire gratuit, sans store et sans version payante. L'application Android « Suivi IK » est un produit tiers payant, sans aucun lien avec IKtracker.",
  },
];

const Independants = () => {
  const { user, loading } = useAuthLazy();
  const { trackCTAClick } = useMarketingTracker("independants");

  return (
    <>
      <Helmet>
        <title>Indépendants : visibilité SEO, GEO et acquisition de clients</title>
        <meta
          name="description"
          content="Indépendant ou freelance : rendez votre site visible sur Google et dans les réponses des IA. SEO et GEO automatisés avec Crawlers, frais kilométriques gratuits avec IKtracker."
        />
        <meta
          name="keywords"
          content="acquisition client indépendant, SEO freelance, GEO intelligence artificielle, visibilité en ligne auto-entrepreneur, générer des leads, crawlers.fr"
        />
        <link rel="canonical" href="https://iktracker.fr/independants" />
        <meta property="og:title" content="Indépendants : visibilité en ligne et acquisition de clients" />
        <meta
          property="og:description"
          content="Un site trouvé sur Google et cité par les IA génère des contacts en continu. Crawlers automatise le SEO et le GEO, IKtracker gère vos kilomètres gratuitement."
        />
        <meta property="og:type" content="article" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:url" content="https://iktracker.fr/independants" />
        <meta property="og:site_name" content="IKtracker" />
        <meta property="og:image" content="https://iktracker.fr/logo-iktracker-250.webp" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Indépendants : SEO, GEO et acquisition de clients" />
        <meta
          name="twitter:description"
          content="Rendez votre site visible sur Google et dans les réponses des IA, et laissez IKtracker gérer vos indemnités kilométriques."
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
            headline: "Indépendants : améliorer sa visibilité en ligne et son acquisition de clients",
            description:
              "Guide pratique pour les indépendants : rendre son site visible sur les moteurs de recherche et dans les réponses des IA, et automatiser sa gestion kilométrique.",
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
            mainEntityOfPage: "https://iktracker.fr/independants",
            inLanguage: "fr-FR",
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <MarketingNav user={user} loading={loading} />

        <div className="container mx-auto px-4 pt-24">
          <Breadcrumb items={[{ label: "Indépendants", href: "/independants" }]} />
        </div>

        {/* Hero */}
        <header className="container mx-auto px-4 py-12 md:py-16 max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground mb-6">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            Indépendants, freelances et TPE
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
            Être trouvé, puis facturé : la visibilité comme canal d'acquisition
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
            Un indépendant ne manque presque jamais de compétences : il manque de contacts entrants. Deux chantiers
            règlent l'essentiel — rendre le site visible sur Google et dans les réponses des IA, et arrêter de perdre
            du temps sur l'administratif. Crawlers s'occupe du premier, IKtracker du second.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild size="lg" onClick={() => trackCTAClick()}>
              <Link to="/signup">
                Accéder à IKtracker gratuitement
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="https://crawlers.fr" target="_blank" rel="noopener">
                Auditer la visibilité de mon site
              </a>
            </Button>
          </div>
        </header>

        {/* Pain points */}
        <section className="container mx-auto px-4 py-12 max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-8">Pourquoi les leads n'arrivent pas</h2>
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

        {/* Leviers */}
        <section className="container mx-auto px-4 py-12 max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Les quatre leviers d'une visibilité qui rapporte</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl">
            Aucun de ces leviers ne demande de budget publicitaire. Ils demandent de la méthode et de la régularité,
            deux choses qu'un indépendant seul a rarement le temps de tenir à la main.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {LEVERS.map(f => (
              <Card key={f.title} className="border-border">
                <CardContent className="p-6">
                  <f.icon className="h-6 w-6 text-primary mb-4" aria-hidden="true" />
                  <h3 className="font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Crawlers */}
        <section className="container mx-auto px-4 py-12 max-w-5xl">
          <Card className="border-primary/30 bg-muted/30">
            <CardContent className="p-6 md:p-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground mb-6">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Solution complémentaire
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Crawlers : le SEO et le GEO pilotés par l'IA
              </h2>
              <p className="text-muted-foreground mb-6 max-w-3xl">
                IKtracker s'arrête volontairement à la gestion des trajets et des indemnités kilométriques. La
                visibilité en ligne est un autre métier :{" "}
                <a
                  href="https://crawlers.fr"
                  target="_blank"
                  rel="noopener"
                  title="Crawlers.fr - SEO boosté à l'IA"
                  className="font-medium text-primary hover:underline"
                >
                  Crawlers.fr, la solution de SEO et GEO automatisée par l'IA
                </a>{" "}
                audite le site, corrige le technique, produit les contenus qui manquent et suit les positions, en
                continu. IKtracker est d'ailleurs le terrain d'essai réel de Crawlers Autopilot.
              </p>
              <ul className="grid gap-3 md:grid-cols-2 mb-8">
                {[
                  "Audit technique complet et correctifs priorisés",
                  "Optimisation GEO pour être cité par ChatGPT, Perplexity et Gemini",
                  "Production de contenus alignés sur les requêtes réelles",
                  "Suivi des positions et des pages qui génèrent des contacts",
                ].map(item => (
                  <li key={item} className="flex gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild variant="outline">
                  <a href="https://crawlers.fr" target="_blank" rel="noopener" title="Crawlers.fr - SEO boosté à l'IA">
                    Découvrir Crawlers.fr
                    <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
                  </a>
                </Button>
                <Button asChild variant="ghost">
                  <Link to="/fonctionnalites">Voir les fonctionnalités IKtracker</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* IKtracker côté temps */}
        <section className="container mx-auto px-4 py-12 max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Pendant ce temps, IKtracker récupère vos heures</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl">
            Prospecter suppose de se déplacer. Chaque rendez-vous client est un trajet professionnel déductible, à
            condition d'être tracé.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Calculator,
                title: "Barème officiel appliqué seul",
                text: "Puissance fiscale, tranches kilométriques et majoration de 20% pour les véhicules 100% électriques.",
                href: "/bareme-ik-2026",
                linkLabel: "Barème IK 2026",
              },
              {
                icon: FileText,
                title: "Relevé mensuel automatique",
                text: "PDF envoyé au comptable, récapitulatif annuel et archive consultable à tout moment.",
                href: "/expert-comptable",
                linkLabel: "Espace expert-comptable",
              },
              {
                icon: TrendingUp,
                title: "Mode Tournée et saisie vocale",
                text: "Enchaînez les rendez-vous, dictez vos trajets, laissez le relevé se construire tout seul.",
                href: "/mode-tournee",
                linkLabel: "Voir le Mode Tournée",
              },
            ].map(f => (
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

        {/* Plan 30 jours */}
        <section className="container mx-auto px-4 py-12 max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-8">Un plan de 30 jours réaliste</h2>
          <ol className="space-y-4">
            {[
              "Semaine 1 — audit du site : technique, indexation, données structurées et pages orphelines.",
              "Semaine 2 — correctifs prioritaires : titres, descriptions, canonicals, vitesse et rendu pour les bots.",
              "Semaine 3 — contenus GEO : une question réelle par page, une réponse factuelle et vérifiable.",
              "Semaine 4 — mesure : positions, impressions, clics et formulaire de contact suivis.",
              "En continu — IKtracker enregistre les trajets vers les rendez-vous et produit le relevé fiscal.",
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
          <h2 className="text-2xl md:text-3xl font-bold mb-8">Questions fréquentes des indépendants</h2>
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
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Commencez par ce qui est gratuit</h2>
          <p className="text-muted-foreground mb-8">
            Créez votre compte IKtracker pour ne plus perdre un kilomètre professionnel, et lancez en parallèle l'audit
            de visibilité de votre site.
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

export default Independants;
