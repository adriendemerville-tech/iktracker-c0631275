import { Helmet } from '@/lib/helmet-compat';
import { buildSoftwareApplicationSchema } from "@/lib/seo-schemas";
import { Link } from "@/lib/router-compat";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { EnhancedMarketingFooter } from "@/components/marketing/EnhancedMarketingFooter";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Route,
  Repeat,
  CalendarSync,
  MapPinned,
  FileDown,
  ShieldCheck,
  Filter,
  Car,
  Sparkles,
} from "lucide-react";

const faqs = [
  {
    q: "À quoi sert la page Mes Trajets d'IKtracker ?",
    a: "Mes Trajets centralise tous vos déplacements professionnels : trajets saisis manuellement, trajets récurrents (domicile-travail, tournées hebdomadaires), trajets importés depuis Google Agenda ou Outlook, et trajets enregistrés via le Mode Tournée GPS. Chaque ligne affiche la date, le motif, la distance et l'indemnité calculée selon le barème fiscal en vigueur.",
  },
  {
    q: "Comment ajouter un trajet récurrent ?",
    a: "Depuis Mes Trajets, ouvrez la modale Récurrents et cliquez sur le bouton +. Renseignez le départ, l'arrivée, la fréquence (jours de la semaine) et la période. IKtracker génère automatiquement chaque occurrence dans votre journal, sans ressaisie. Idéal pour les déplacements domicile-travail, les visites clients hebdomadaires ou les tournées fixes.",
  },
  {
    q: "Puis-je importer mes trajets depuis mon agenda ?",
    a: "Oui. IKtracker se synchronise avec Google Agenda et Microsoft Outlook quatre fois par jour. Chaque événement avec adresse devient un trajet pré-rempli, rattaché à votre véhicule par défaut. Les événements futurs restent masqués jusqu'à leur date pour éviter les déclarations anticipées.",
  },
  {
    q: "Comment exporter ma note de frais kilométrique depuis Mes Trajets ?",
    a: "Cliquez sur Exporter pour générer un PDF ou un Excel filtré par mois, par véhicule ou par catégorie (professionnel, domicile-travail, mixte). Le document reprend la structure attendue par les employeurs, experts-comptables et l'URSSAF, avec la majoration de 20 % automatique pour les véhicules 100 % électriques.",
  },
  {
    q: "Les trajets sont-ils conservés combien de temps ?",
    a: "IKtracker conserve l'historique de vos trajets sans limite de durée tant que votre compte est actif. La législation française impose un archivage minimal de 3 ans pour les justificatifs de frais professionnels — l'export PDF horodaté satisfait cette obligation.",
  },
  {
    q: "Mes Trajets fonctionne-t-il sans connexion internet ?",
    a: "Oui. IKtracker est une Progressive Web App : vos trajets sont accessibles hors-ligne et synchronisés automatiquement dès le retour du réseau. Le Mode Tournée GPS enregistre également les positions en local pour ne perdre aucun déplacement.",
  },
];

const features = [
  {
    icon: Route,
    title: "Saisie rapide",
    desc: "Ajoutez un trajet en quelques secondes avec autocomplétion d'adresses Géoplateforme et calcul automatique de la distance.",
  },
  {
    icon: Repeat,
    title: "Trajets récurrents",
    desc: "Déclarez une fois vos déplacements réguliers (domicile-travail, tournées) — IKtracker les génère chaque semaine sans ressaisie.",
  },
  {
    icon: CalendarSync,
    title: "Import agenda",
    desc: "Synchronisation Google Agenda et Outlook quatre fois par jour. Chaque rendez-vous avec adresse devient un trajet pré-rempli.",
  },
  {
    icon: MapPinned,
    title: "Mode Tournée GPS",
    desc: "Pour les professionnels itinérants : détection automatique des arrêts, distance calculée au mètre, journal opposable URSSAF.",
  },
  {
    icon: Filter,
    title: "Filtres et catégories",
    desc: "Triez par mois, véhicule, motif (pro, domicile-travail, mixte). Visualisez instantanément le total kilométrique et l'IK due.",
  },
  {
    icon: Car,
    title: "Multi-véhicules",
    desc: "Gérez plusieurs véhicules avec leur puissance fiscale, énergie et barème associé. Bonus +20 % automatique pour l'électrique.",
  },
  {
    icon: FileDown,
    title: "Export PDF & Excel",
    desc: "Générez la note de frais conforme employeur, expert-comptable et URSSAF. Format prêt à transmettre, horodaté.",
  },
  {
    icon: ShieldCheck,
    title: "Confidentialité",
    desc: "Vos données restent en Europe. Aucune revente, aucun pisteur publicitaire. Suppression de compte en un clic.",
  },
];

export default function MesTrajetsLanding() {
  return (
    <>
      <Helmet>

        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          })}
        </script>

        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: "Comment tenir son journal de trajets professionnels avec IKtracker",
            description:
              "Méthode complète pour centraliser, catégoriser et exporter ses trajets professionnels conformément aux exigences URSSAF.",
            totalTime: "PT2M",
            step: [
              {
                "@type": "HowToStep",
                position: 1,
                name: "Renseigner ses véhicules",
                text: "Ajoutez chaque véhicule avec sa puissance fiscale (case P.6 carte grise) et son énergie. Le bonus +20 % électrique s'applique automatiquement.",
              },
              {
                "@type": "HowToStep",
                position: 2,
                name: "Connecter son agenda (optionnel)",
                text: "Activez la synchronisation Google Agenda ou Outlook pour que les rendez-vous avec adresse deviennent automatiquement des trajets.",
              },
              {
                "@type": "HowToStep",
                position: 3,
                name: "Déclarer les trajets récurrents",
                text: "Depuis Mes Trajets, ouvrez la modale Récurrents et créez vos déplacements réguliers (domicile-travail, tournées hebdomadaires).",
              },
              {
                "@type": "HowToStep",
                position: 4,
                name: "Exporter la note de frais",
                text: "Chaque mois, exportez en PDF ou Excel filtré par véhicule et catégorie. Format conforme employeur, expert-comptable et URSSAF.",
              },
            ],
          })}
        </script>

        <script type="application/ld+json">
          {JSON.stringify(
            buildSoftwareApplicationSchema({
              pageUrl: "https://iktracker.fr/mes-trajets",
              pageDescription:
                "Mes Trajets IKtracker : journal kilométrique professionnel centralisant saisie manuelle, trajets récurrents, import agenda, Mode Tournée GPS et export PDF/Excel conforme URSSAF. Gratuit à vie.",
            })
          )}
        </script>
      </Helmet>

      <MarketingNav />

      <main
        id="main-content"
        tabIndex={-1}
        className="min-h-screen bg-background pt-20 outline-hidden"
      >
        <div className="container mx-auto px-4 pt-6">
          <Breadcrumb items={[{ label: "Mes Trajets" }]} />
        </div>

        {/* Hero */}
        <section className="max-w-3xl mx-auto px-4 pt-12 pb-10 text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight tracking-tight">
            Mes Trajets
            <br />
            <span className="text-primary">le journal kilométrique pro</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Centralisez tous vos déplacements professionnels : saisie manuelle,
            trajets récurrents, import depuis Google Agenda ou Outlook, et
            détection GPS automatique. Export PDF & Excel conforme URSSAF.
            <strong className="text-foreground"> Gratuit, sans abonnement.</strong>
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/signup">
              <Button size="lg" className="gap-2">
                Ouvrir mon journal de trajets <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/bareme-ik-2026">
              <Button size="lg" variant="outline">
                Voir le barème 2025-2026
              </Button>
            </Link>
          </div>
        </section>

        {/* Features grid */}
        <section className="max-w-5xl mx-auto px-4 py-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 text-center">
            Tout ce qu'il faut pour suivre vos trajets professionnels
          </h2>
          <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
            Une seule page pour saisir, importer, catégoriser, filtrer et
            exporter — sans tableur Excel improvisé.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="border-border h-full">
                <CardContent className="p-5">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">{title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    {desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* For whom */}
        <section className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
            Pour qui ?
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                t: "Salariés en frais réels",
                d: "Optimisez votre déclaration d'impôts en justifiant chaque déplacement professionnel non remboursé.",
              },
              {
                t: "Commerciaux et VRP",
                d: "Tournées hebdomadaires, visites clients, salons : un journal opposable à votre employeur.",
              },
              {
                t: "Professions libérales (BNC)",
                d: "Infirmières, kinés, avocats, consultants : déduction des frais de déplacement du bénéfice imposable.",
              },
              {
                t: "Artisans et auto-entrepreneurs",
                d: "Chantiers, livraisons, rendez-vous fournisseurs : carnet de bord conforme contrôle URSSAF.",
              },
            ].map(({ t, d }) => (
              <Card key={t} className="border-border">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-foreground">{t}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    {d}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Internal links */}
        <section className="max-w-3xl mx-auto px-4 py-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 text-center">
            Aller plus loin
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <Link
              to="/mode-tournee"
              className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition"
            >
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">Mode Tournée GPS</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Enregistrement automatique des trajets pour les professionnels
                itinérants.
              </p>
            </Link>
            <Link
              to="/calendrier"
              className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition"
            >
              <div className="flex items-center gap-2 mb-1">
                <CalendarSync className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">
                  Synchronisation Calendrier
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Google Agenda et Outlook : vos rendez-vous deviennent des
                trajets.
              </p>
            </Link>
            <Link
              to="/note-de-frais-kilometrique"
              className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition"
            >
              <div className="flex items-center gap-2 mb-1">
                <FileDown className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">
                  Note de frais kilométrique
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Modèle conforme URSSAF et méthodologie pas-à-pas.
              </p>
            </Link>
            <Link
              to="/bareme-ik-2026"
              className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition"
            >
              <div className="flex items-center gap-2 mb-1">
                <Car className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">Barème IK 2025-2026</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Tous les taux officiels par puissance fiscale et tranche
                kilométrique.
              </p>
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-4 py-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
            Questions fréquentes
          </h2>
          <div className="space-y-4">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-xl border border-border bg-card p-5 open:shadow-xs transition-shadow"
              >
                <summary className="cursor-pointer font-semibold text-foreground list-none flex justify-between items-center">
                  {f.q}
                  <span className="ml-4 text-primary transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-muted-foreground leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-md mx-auto px-4 pb-24 pt-8 text-center">
          <p className="text-muted-foreground mb-4">
            Reprenez la main sur vos déplacements professionnels en moins de
            deux minutes.
          </p>
          <Link to="/signup">
            <Button size="lg" className="gap-2 px-8">
              Accéder à mon journal <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </section>
      </main>

      <EnhancedMarketingFooter />
    </>
  );
}
