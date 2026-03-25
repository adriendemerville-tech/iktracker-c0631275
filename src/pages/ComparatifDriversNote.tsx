import { lazy, Suspense, memo } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Breadcrumb } from "@/components/Breadcrumb";
import { useMarketingTracker } from "@/hooks/useMarketingTracker";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuthLazy } from "@/hooks/useAuthLazy";
import { 
  ArrowRight, 
  CheckCircle2,
  XCircle,
  Minus,
  MapPin,
  Calendar,
  Battery,
  Shield,
  Smartphone,
  Euro,
  Zap,
  Eye,
  EyeOff,
  Radio,
  Building2,
  User
} from "lucide-react";

const EnhancedMarketingFooter = lazy(() => import("@/components/marketing/EnhancedMarketingFooter").then(m => ({ default: m.EnhancedMarketingFooter })));

const FooterPlaceholder = memo(() => (
  <div className="h-64 bg-muted/30 animate-pulse" />
));

const ComparatifDriversNote = () => {
  const { user, loading } = useAuthLazy();
  const { trackCTAClick } = useMarketingTracker('comparatif-drivers-note');

  const comparisonData = [
    { 
      feature: "Méthode de tracking", 
      driversnote: "GPS temps réel + Boîtier Bluetooth", 
      iktracker: "Analyse sémantique de l'Agenda",
      dnIcon: Radio,
      ikIcon: Calendar
    },
    { 
      feature: "Impact Batterie", 
      driversnote: "Élevé (GPS permanent)", 
      iktracker: "Nul (Serveur cloud)",
      dnIcon: Battery,
      ikIcon: Zap
    },
    { 
      feature: "Matériel requis", 
      driversnote: "Boîtier iBeacon (~40€)", 
      iktracker: "Aucun (Juste votre téléphone)",
      dnIcon: Radio,
      ikIcon: Smartphone
    },
    { 
      feature: "Confidentialité", 
      driversnote: "Traçage de tous les déplacements", 
      iktracker: "Seuls les RDV pro sont traités",
      dnIcon: Eye,
      ikIcon: EyeOff
    },
    { 
      feature: "Prix Annuel", 
      driversnote: "~130€/an", 
      iktracker: "0€/an",
      dnIcon: Euro,
      ikIcon: CheckCircle2
    },
    { 
      feature: "Oubli de lancement", 
      driversnote: "Impossible (Automatique)", 
      iktracker: "Impossible (Si noté dans l'agenda)",
      dnIcon: CheckCircle2,
      ikIcon: CheckCircle2
    },
    { 
      feature: "Cible principale", 
      driversnote: "PME avec flotte de véhicules", 
      iktracker: "Indépendants & TPE",
      dnIcon: Building2,
      ikIcon: User
    },
  ];

  return (
    <>
      <Helmet>
        <title>Alternative Driversnote Gratuite : Comparatif iBeacon vs Agenda | IKtracker</title>
        <meta 
          name="description" 
          content="Driversnote est trop cher ou trop intrusif ? Découvrez IKtracker, l'alternative sans GPS permanent, sans boîtier à acheter et 100% gratuite." 
        />
        <meta name="keywords" content="driversnote alternative, driversnote gratuit, ibeacon frais kilométriques, mouchard gps voiture, alternative driversnote france, suivi kilométrique sans gps" />
        <link rel="canonical" href="https://iktracker.fr/comparatif-drivers-note" />
        <meta property="og:title" content="Driversnote vs IKtracker : Avez-vous vraiment besoin d'un mouchard GPS ?" />
        <meta property="og:description" content="Comparatif 2026 : Le tracking GPS automatique vs la synchronisation d'agenda intelligente. Alternative gratuite et respectueuse de la vie privée." />
        <meta property="og:type" content="article" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:url" content="https://iktracker.fr/comparatif-drivers-note" />
        <meta property="og:site_name" content="IKtracker" />
        <meta property="og:image" content="https://iktracker.fr/logo-iktracker-250.webp" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Alternative Driversnote Gratuite 2026" />
        <meta name="twitter:description" content="Driversnote trop cher ? Découvrez IKtracker, l'alternative sans GPS permanent et 100% gratuite." />
        <meta name="geo.region" content="FR" />
        <meta name="geo.placename" content="France" />
        <meta name="language" content="fr" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": "Driversnote vs IKtracker : Comparatif iBeacon vs Agenda 2026",
            "description": "Comparatif technique entre Driversnote (tracking GPS iBeacon) et IKtracker (synchronisation agenda) pour le suivi des indemnités kilométriques.",
            "author": {
              "@type": "Person",
              "name": "Adrien de Volontat",
              "url": "https://iktracker.fr/blog/auteur/adrien-de-volontat"
            },
            "publisher": {
              "@type": "Organization",
              "name": "IKtracker",
              "logo": {
                "@type": "ImageObject",
                "url": "https://iktracker.fr/logo-iktracker-250.webp"
              }
            },
            "datePublished": "2026-02-03",
            "dateModified": "2026-02-03",
            "mainEntityOfPage": "https://iktracker.fr/comparatif-drivers-note",
            "inLanguage": "fr-FR"
          })}
        </script>
        {/* FAQ Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              { "@type": "Question", "name": "Où est le piège ? Pourquoi IKtracker est gratuit ?", "acceptedAnswer": { "@type": "Answer", "text": "IKtracker a été créé par un développeur indépendant pour son propre usage. Pas d'investisseurs, pas de gros frais de structure. Aucune publicité et aucune revente de données." }},
              { "@type": "Question", "name": "Que se passe-t-il si je n'ai pas noté un rendez-vous dans mon agenda ?", "acceptedAnswer": { "@type": "Answer", "text": "Vous pouvez toujours ajouter un trajet manuellement. La synchronisation calendrier est un bonus qui automatise la saisie, mais l'application fonctionne parfaitement en mode manuel." }},
              { "@type": "Question", "name": "IKtracker gère-t-il les tournées comme les infirmiers libéraux ?", "acceptedAnswer": { "@type": "Answer", "text": "Oui ! Le mode Tournée est spécialement conçu pour les professionnels qui font plusieurs arrêts dans la journée. Vous enregistrez tous vos points de passage et les distances sont calculées automatiquement." }}
            ]
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background font-display select-text">
        <MarketingNav user={user} loading={loading} />

        <main id="main-content" tabIndex={-1} className="outline-none">
          {/* Breadcrumb */}
          <div className="container mx-auto px-4 pt-24">
            <Breadcrumb items={[{ label: 'Comparatif Driver\'s Note vs IKtracker' }]} />
          </div>

          {/* Hero Section */}
          <section className="pb-12 md:pb-16 px-4 relative overflow-hidden" aria-labelledby="hero-heading">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
            <div className="container mx-auto relative z-10 max-w-4xl">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                  <Shield className="h-4 w-4" />
                  Comparatif Hardware vs Software
                </div>
                <h1 id="hero-heading" className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground leading-tight mb-6">
                  Driversnote vs IKtracker :<br />
                  <span className="text-gradient">Avez-vous vraiment besoin d'un mouchard GPS ?</span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                  <strong className="text-foreground">Comparatif 2026</strong> : Le tracking automatique par iBeacon (Payant) vs 
                  La synchronisation d'agenda intelligente (<strong className="text-success">Gratuit</strong> & Respectueux de la vie privée).
                </p>
              </div>
            </div>
          </section>

          {/* Intro Section */}
          <section className="py-12 px-4">
            <div className="container mx-auto max-w-4xl">
              <div className="grid md:grid-cols-2 gap-6 mb-12">
                <Card className="border-muted-foreground/20">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/30">
                        <Radio className="h-6 w-6 text-orange-600" />
                      </div>
                      <h3 className="font-bold text-lg">Driversnote</h3>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Solution matérielle avec boîtier iBeacon qui détecte automatiquement 
                      vos trajets via GPS permanent. Idéal pour les flottes d'entreprise.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-full bg-primary/20">
                        <Calendar className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-bold text-lg">IKtracker</h3>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Solution logicielle qui synchronise vos agendas Google/Outlook 
                      pour calculer automatiquement les distances. Aucun matériel requis.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Comparison Table */}
          <section className="py-12 px-4 bg-muted/30">
            <div className="container mx-auto max-w-4xl">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
                Tableau comparatif technique
              </h2>
              
              <Card className="overflow-hidden border-primary/20">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Fonctionnalité</TableHead>
                        <TableHead className="font-semibold text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Radio className="h-5 w-5 text-orange-600" />
                            <span>Driversnote (iBeacon)</span>
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-center bg-primary/10">
                          <div className="flex items-center justify-center gap-2">
                            <Calendar className="h-5 w-5 text-primary" />
                            <span>IKtracker (Agenda)</span>
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparisonData.map((row, index) => (
                        <TableRow key={index} className="hover:bg-muted/30">
                          <TableCell className="font-medium">{row.feature}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <row.dnIcon className={`h-4 w-4 ${row.dnIcon === CheckCircle2 ? 'text-success' : 'text-muted-foreground'}`} />
                              <span className="text-sm text-muted-foreground">{row.driversnote}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center bg-primary/5">
                            <div className="flex items-center justify-center gap-2">
                              <row.ikIcon className={`h-4 w-4 ${row.ikIcon === CheckCircle2 ? 'text-success' : 'text-primary'}`} />
                              <span className={`text-sm ${row.feature === "Prix Annuel" ? 'font-bold text-success' : 'text-muted-foreground'}`}>
                                {row.iktracker}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Philosophy Section */}
          <section className="py-12 px-4">
            <div className="container mx-auto max-w-4xl">
              <div className="space-y-6">
              <h3 className="text-xl md:text-2xl font-bold text-primary underline underline-offset-4 mb-4">
                  Pourquoi nous ne suivons pas votre géolocalisation GPS en continu ?
                </h3>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  Chez IKtracker, nous avons fait un <strong className="text-foreground">choix philosophique</strong> : 
                  ne jamais tracer la position GPS de nos utilisateurs en continu. Contrairement aux solutions comme Driversnote 
                  qui enregistrent chaque déplacement en temps réel, nous utilisons une approche radicalement différente.
                </p>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  Notre technologie analyse les <strong className="text-foreground">adresses de vos rendez-vous professionnels</strong> 
                  (depuis Google Calendar ou Outlook) et calcule les distances via l'API Google Maps. Résultat : 
                  seuls vos trajets professionnels sont comptabilisés, pas vos courses au supermarché ou vos 
                  visites chez le médecin.
                </p>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  Cette approche présente plusieurs avantages majeurs. D'abord, elle respecte votre{" "}
                  <strong className="text-foreground">vie privée</strong> : nous ne savons jamais où vous êtes 
                  en temps réel. Ensuite, elle préserve votre <strong className="text-foreground">batterie</strong> : 
                  pas de GPS activé en permanence. Enfin, elle est <strong className="text-foreground">plus précise fiscalement</strong> : 
                  seuls les trajets professionnels légitimes sont déclarés.
                </p>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Pour les professionnels itinérants</strong>, nous proposons 
                  également un <Link to="/mode-tournee" className="text-primary underline hover:text-primary/80">Mode Tournée</Link> optionnel 
                  sur mobile. Cette fonctionnalité active la géolocalisation uniquement pendant votre journée de travail, 
                  si vous le souhaitez. Elle a été pensée pour les{" "}
                  <Link to="/blog/indemnites-kilometriques-infirmier-liberal" className="text-primary underline hover:text-primary/80">infirmiers libéraux</Link>,{" "}
                  <Link to="/blog/indemnites-kilometriques-commercial-itinerant" className="text-primary underline hover:text-primary/80">commerciaux</Link> et autres 
                  indépendants qui enchaînent les rendez-vous loin de leur bureau ou domicile. Vous gardez le contrôle : 
                  c'est vous qui décidez quand activer ou désactiver le suivi.
                </p>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-12 px-4 bg-muted/30">
            <div className="container mx-auto max-w-2xl text-center">
              <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
                <CardContent className="p-8">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <EyeOff className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold mb-4">
                    L'approche sans mouchard GPS
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Pas de boîtier à acheter, pas de GPS permanent, pas de traçage de votre vie privée. 
                    Juste la synchronisation intelligente de votre agenda professionnel.
                  </p>
                  <Link to="/signup" onClick={trackCTAClick}>
                    <Button variant="gradient" size="lg" className="gap-2">
                      Essayer l'approche sans GPS (Gratuit)
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Detailed Comparison Section */}
          <section className="py-12 px-4">
            <div className="container mx-auto max-w-4xl">
              <div className="space-y-6">
                <h3 className="text-xl md:text-2xl font-bold text-primary underline underline-offset-4 mb-4">
                  Driversnote : une solution pensée pour les flottes d'entreprise
                </h3>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  Il faut reconnaître les qualités de Driversnote. Cette solution danoise a été pionnière 
                  dans le tracking automatique des trajets professionnels. Le système iBeacon permet une 
                  détection <strong className="text-foreground">100% automatique</strong> des déplacements : 
                  dès que vous montez dans votre véhicule, le boîtier Bluetooth détecte votre téléphone et 
                  lance l'enregistrement GPS.
                </p>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  Pour une <strong className="text-foreground">PME gérant une flotte de véhicules commerciaux</strong>, 
                  cette automatisation est précieuse. Les managers peuvent suivre les trajets de leurs équipes, 
                  optimiser les tournées et générer des rapports consolidés. Le prix (~130€/an par utilisateur) 
                  se justifie dans ce contexte professionnel structuré.
                </p>

                <h3 className="text-xl md:text-2xl font-bold text-primary underline underline-offset-4 mb-4">
                  IKtracker : l'outil des indépendants et TPE
                </h3>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  Mais pour un <Link to="/blog/indemnites-kilometriques-infirmier-liberal" className="text-primary underline hover:text-primary/80">infirmier libéral</Link>, 
                  un <Link to="/blog/indemnites-kilometriques-consultant-independant" className="text-primary underline hover:text-primary/80">consultant indépendant</Link> ou 
                  un <Link to="/blog/indemnites-kilometriques-artisan-batiment" className="text-primary underline hover:text-primary/80">artisan</Link>, 
                  la situation est différente. Vous n'avez pas besoin qu'un logiciel trace tous vos déplacements. 
                  Vous avez besoin de transformer vos rendez-vous professionnels en{" "}
                  <Link to="/frais-reels" className="text-primary underline hover:text-primary/80">frais kilométriques déductibles</Link>.
                </p>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  C'est exactement ce que fait IKtracker. Notre{" "}
                  <Link to="/calendrier" className="text-primary underline hover:text-primary/80">synchronisation calendrier</Link>{" "}
                  analyse vos rendez-vous et calcule automatiquement les distances. Notre{" "}
                  <Link to="/mode-tournee" className="text-primary underline hover:text-primary/80">mode Tournée</Link>{" "}
                  gère les tournées multi-arrêts des professionnels itinérants. Et nos{" "}
                  <Link to="/expert-comptable" className="text-primary underline hover:text-primary/80">exports PDF</Link>{" "}
                  sont conformes aux exigences de l'{" "}
                  <a 
                    href="https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/indemnites-kilometriques.html" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary underline hover:text-primary/80"
                  >
                    URSSAF
                  </a>{" "}
                  et de{" "}
                  <a 
                    href="https://www.impots.gouv.fr/simulateur-bareme-kilometrique" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary underline hover:text-primary/80"
                  >
                    impots.gouv.fr
                  </a>.
                </p>
              </div>
            </div>
          </section>

          {/* Conclusion */}
          <section className="py-12 px-4 bg-muted/30">
            <div className="container mx-auto max-w-4xl">
              <div className="space-y-6">
                <h3 className="text-xl md:text-2xl font-bold text-primary underline underline-offset-4 mb-4">
                  Conclusion : deux philosophies, deux usages différents
                </h3>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  Soyons honnêtes : Driversnote est une <strong className="text-foreground">excellente solution</strong> pour 
                  son cas d'usage cible. Le tracking GPS automatique via iBeacon est techniquement impressionnant, 
                  et pour une entreprise qui doit suivre une flotte de véhicules commerciaux avec plusieurs 
                  conducteurs, l'investissement de 130€/an par utilisateur peut être totalement justifié. 
                  La détection automatique des trajets élimine le risque d'oubli et les rapports consolidés 
                  facilitent la gestion d'équipe.
                </p>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  Cependant, pour les <strong className="text-foreground">indépendants et les TPE</strong>, 
                  IKtracker représente une alternative plus adaptée. Pas de matériel à acheter, pas d'abonnement 
                  à payer, pas de GPS permanent qui vide votre batterie et trace vos déplacements personnels. 
                  Notre approche par synchronisation d'agenda est plus respectueuse de votre vie privée, 
                  plus économique et parfaitement conforme au{" "}
                  <Link to="/bareme-ik-2026" className="text-primary underline hover:text-primary/80">barème fiscal français 2026</Link>. 
                  Si vous gérez seul vos trajets professionnels et que vos rendez-vous sont dans votre agenda, 
                  IKtracker fait exactement ce dont vous avez besoin — gratuitement.
                </p>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="py-12 px-4">
            <div className="container mx-auto max-w-4xl">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
                Questions fréquentes
              </h2>
              
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger className="text-left">
                    Où est le piège ? Pourquoi IKtracker est gratuit ?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    IKtracker a été créé par un développeur indépendant pour son propre usage. 
                    Pas d'investisseurs à rembourser, pas de gros frais de structure. C'est un 
                    outil communautaire maintenu par passion. Nous n'affichons aucune publicité 
                    et ne vendons aucune donnée.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger className="text-left">
                    Que se passe-t-il si je n'ai pas noté un rendez-vous dans mon agenda ?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Vous pouvez toujours ajouter un trajet manuellement dans IKtracker. 
                    La synchronisation calendrier est un bonus qui automatise la saisie, 
                    mais l'application fonctionne parfaitement en mode manuel également.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger className="text-left">
                    IKtracker gère-t-il les tournées comme les infirmiers libéraux ?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Oui ! Notre <Link to="/mode-tournee" className="text-primary underline">mode Tournée</Link> est 
                    spécialement conçu pour les professionnels qui font plusieurs arrêts dans la journée. 
                    Vous enregistrez tous vos points de passage et nous calculons automatiquement 
                    les distances entre chaque étape.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </section>

          {/* Final CTA */}
          <section className="py-12 px-4">
            <div className="container mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold mb-4">
                Prêt à simplifier vos indemnités kilométriques ?
              </h2>
              <p className="text-muted-foreground mb-6">
                Rejoignez les milliers d'indépendants qui ont choisi l'approche 
                intelligente et respectueuse de la vie privée.
              </p>
              <Link to="/signup" onClick={trackCTAClick}>
                <Button variant="gradient" size="lg" className="gap-2">
                  Créer mon compte IKtracker
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground mt-4">
                Gratuit • Sans GPS • Conforme au barème fiscal 2026
              </p>
            </div>
          </section>
        </main>

        <Suspense fallback={<FooterPlaceholder />}>
          <EnhancedMarketingFooter />
        </Suspense>
      </div>
    </>
  );
};

export default ComparatifDriversNote;
