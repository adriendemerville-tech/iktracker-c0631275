import { lazy, Suspense, memo } from "react";
import { Link } from "@/lib/router-compat";
import { DEVIS_ARTISAN_FAQ } from "@/lib/logiciel-devis-artisan-schema";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Breadcrumb } from "@/components/Breadcrumb";
import { LastUpdated } from "@/components/LastUpdated";
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
import { getPageDates, toIsoDateTime } from "@/lib/page-dates";
import {
  ArrowRight,
  CheckCircle2,
  Mic,
  Search,
  Calculator,
  FileText,
  Clock,
  ExternalLink,
  Sparkles,
  Route as RouteIcon,
} from "lucide-react";

const EnhancedMarketingFooter = lazy(() =>
  import("@/components/marketing/EnhancedMarketingFooter").then((m) => ({
    default: m.EnhancedMarketingFooter,
  })),
);

const FooterPlaceholder = memo(() => <div className="min-h-[600px] bg-muted/30 animate-pulse" />);
FooterPlaceholder.displayName = "FooterPlaceholder";

const PAGE_DATE = getPageDates("/logiciel-devis-artisan");

const TIME_SINKS = [
  {
    icon: FileText,
    title: "Les devis rédigés le soir",
    text: "Le métrage est pris sur le chantier, le devis est tapé à 21 h. Entre les deux, le client a souvent déjà reçu la proposition d'un concurrent plus rapide.",
  },
  {
    icon: RouteIcon,
    title: "Les kilomètres jamais notés",
    text: "Visites techniques, allers-retours fournisseurs, SAV : des centaines d'euros d'indemnités kilométriques disparaissent faute de relevé tenu au jour le jour.",
  },
  {
    icon: Search,
    title: "Un site que personne ne trouve",
    text: "Le bouche-à-oreille plafonne. Sans référencement, ni Google ni les assistants IA ne proposent l'entreprise aux clients qui cherchent un artisan.",
  },
];

const STACK = [
  {
    icon: Mic,
    title: "Chiffrage : le devis dicté à la voix",
    text: "Un agent vocal IA transforme le relevé de chantier en devis structuré. Le document part le jour même, pas trois jours plus tard.",
    tool: "DictaDevi",
  },
  {
    icon: Calculator,
    title: "Déplacements : les IK calculées seules",
    text: "Chaque trajet professionnel est enregistré et converti au barème officiel, majoration de 20 % comprise pour les véhicules 100 % électriques.",
    tool: "IKtracker",
  },
  {
    icon: Search,
    title: "Visibilité : SEO et GEO automatisés",
    text: "Audit technique, correctifs priorisés et contenus qui répondent aux requêtes réelles, pour être trouvé sur Google et cité par les IA.",
    tool: "Crawlers",
  },
];

const FAQ = DEVIS_ARTISAN_FAQ;


const LogicielDevisArtisan = () => {
  const { user, loading } = useAuthLazy();
  const { trackCTAClick } = useMarketingTracker("logiciel-devis-artisan");

  return (
    <>


      <div className="min-h-screen bg-background">
        <MarketingNav user={user} loading={loading} />

        <div className="container mx-auto px-4 pt-24">
          <Breadcrumb
            items={[{ label: "Logiciel de devis artisan", href: "/logiciel-devis-artisan" }]}
          />
        </div>

        {/* Hero */}
        <header className="container mx-auto px-4 py-12 md:py-16 max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground mb-6">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Bâtiment, rénovation et second œuvre
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
            Logiciel de devis pour artisan : la stack qui rend les heures administratives
          </h1>
          <p className="text-lg text-muted-foreground mb-4 max-w-2xl">
            Un artisan facture ses heures de chantier, jamais ses heures de bureau. Trois postes
            mangent pourtant ses soirées : chiffrer les devis, justifier les déplacements et rester
            visible. Trois outils spécialisés suffisent à les absorber.
          </p>
          <LastUpdated date={PAGE_DATE.modified} className="mb-8" />
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild size="lg" onClick={() => trackCTAClick()}>
              <Link to="/signup">
                Accéder à IKtracker gratuitement
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a
                href="https://dictadevi.io"
                target="_blank"
                rel="noopener"
                title="DictaDevi - devis vocal IA pour le bâtiment"
              >
                Découvrir le devis vocal DictaDevi
              </a>
            </Button>
          </div>
        </header>

        {/* Pertes de temps */}
        <section className="container mx-auto px-4 py-12 max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-8">Où partent les heures non facturées</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {TIME_SINKS.map((item) => (
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

        {/* La stack */}
        <section className="container mx-auto px-4 py-12 max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Trois outils, trois métiers</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl">
            Aucun logiciel ne fait correctement les trois. Mieux vaut un outil dédié par poste,
            chacun capable de fonctionner depuis un téléphone, sur le chantier.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {STACK.map((f) => (
              <Card key={f.title} className="border-border">
                <CardContent className="p-6">
                  <f.icon className="h-6 w-6 text-primary mb-4" aria-hidden="true" />
                  <p className="text-xs font-medium uppercase tracking-wide text-primary mb-2">
                    {f.tool}
                  </p>
                  <h3 className="font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.text}</p>
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
                <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                Chiffrage
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                DictaDevi : le devis dicté depuis le chantier
              </h2>
              <p className="text-muted-foreground mb-6 max-w-3xl">
                IKtracker s'arrête volontairement aux trajets. Le chiffrage est un autre métier :{" "}
                <a
                  href="https://dictadevi.io"
                  target="_blank"
                  rel="noopener"
                  title="DictaDevi - plateforme IA bâtiment et rénovation"
                  className="font-medium text-primary hover:underline"
                >
                  DictaDevi, la plateforme IA dédiée au bâtiment et à la rénovation
                </a>
                , transforme un relevé dicté à la voix en devis structuré, relie le tout à un CRM
                artisan et suit la marge du chantier. Le devis part pendant que le client est encore
                dans l'intention d'achat.
              </p>
              <ul className="grid gap-3 md:grid-cols-2 mb-8">
                {[
                  "Agent vocal IA : le relevé de chantier devient un devis",
                  "CRM artisan et suivi des relances intégrés",
                  "Pilotage de la marge chantier par chantier",
                  "E-facturation conforme et historique client",
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
              <Button asChild variant="outline">
                <a
                  href="https://dictadevi.io"
                  target="_blank"
                  rel="noopener"
                  title="DictaDevi - devis vocal IA pour artisans"
                >
                  Découvrir DictaDevi
                  <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* IKtracker */}
        <section className="container mx-auto px-4 py-12 max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            IKtracker : les kilomètres du chantier, justifiés
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl">
            Visite technique, dépôt, SAV, rendez-vous client : un artisan enchaîne les déplacements.
            Sans relevé tenu, ces kilomètres ne sont ni déduits ni défendables en cas de contrôle.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Calculator,
                title: "Barème officiel appliqué seul",
                text: "Puissance fiscale, tranches kilométriques et majoration de 20 % pour les véhicules 100 % électriques.",
                href: "/bareme-ik-2026",
                linkLabel: "Barème IK 2026",
              },
              {
                icon: RouteIcon,
                title: "Mode Tournée pour les journées à rallonge",
                text: "Plusieurs chantiers dans la journée sont regroupés en une tournée unique, calculée automatiquement.",
                href: "/mode-tournee",
                linkLabel: "Voir le Mode Tournée",
              },
              {
                icon: Clock,
                title: "Relevé prêt pour le comptable",
                text: "PDF mensuel envoyé au cabinet, récapitulatif annuel et archive consultable à tout moment.",
                href: "/expert-comptable",
                linkLabel: "Espace expert-comptable",
              },
            ].map((f) => (
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

        {/* Crawlers */}
        <section className="container mx-auto px-4 py-12 max-w-5xl">
          <Card className="border-border">
            <CardContent className="p-6 md:p-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground mb-6">
                <Search className="h-3.5 w-3.5" aria-hidden="true" />
                Visibilité
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Crawlers : être trouvé avant d'être choisi
              </h2>
              <p className="text-muted-foreground mb-6 max-w-3xl">
                Un devis rapide ne sert à rien si la demande n'arrive jamais.{" "}
                <a
                  href="https://crawlers.fr"
                  target="_blank"
                  rel="noopener"
                  title="Crawlers.fr - SEO boosté à l'IA"
                  className="font-medium text-primary hover:underline"
                >
                  Crawlers.fr, la solution de SEO et GEO automatisée par l'IA
                </a>{" "}
                audite le site de l'entreprise, corrige le technique, produit les contenus manquants
                et suit les positions. IKtracker en est le terrain d'essai réel.
              </p>
              <Button asChild variant="outline">
                <a
                  href="https://crawlers.fr"
                  target="_blank"
                  rel="noopener"
                  title="Crawlers.fr - SEO boosté à l'IA"
                >
                  Découvrir Crawlers.fr
                  <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Journée type */}
        <section className="container mx-auto px-4 py-12 max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-8">Une journée type, outillée</h2>
          <ol className="space-y-4">
            {[
              "7 h 30 — départ vers le premier chantier : le trajet est enregistré, la tournée démarre.",
              "9 h — visite technique : le relevé est dicté, le devis se construit pendant le trajet suivant.",
              "12 h — passage fournisseur : l'arrêt s'ajoute à la tournée du jour, sans saisie manuelle.",
              "16 h — le devis est envoyé au client, relance programmée automatiquement.",
              "Fin de mois — le relevé IK part au comptable, le site continue de générer des demandes.",
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
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Commencez par le poste gratuit</h2>
          <p className="text-muted-foreground mb-8">
            IKtracker est gratuit à vie. Créez votre compte, laissez les kilomètres se compter seuls,
            puis outillez le chiffrage et la visibilité.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" onClick={() => trackCTAClick()}>
              <Link to="/signup">
                Créer mon compte gratuit
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link to="/artisans">Voir la page artisans</Link>
            </Button>
          </div>
        </section>

        <Suspense fallback={<FooterPlaceholder />}>
          <EnhancedMarketingFooter />
        </Suspense>
      </div>
    </>
  );
};

export default LogicielDevisArtisan;
