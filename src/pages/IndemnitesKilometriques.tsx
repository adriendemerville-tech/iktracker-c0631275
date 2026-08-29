import { LastUpdated } from "@/components/LastUpdated";
import { getStaticLastModified } from "@/lib/page-dates";
import { lazy, Suspense } from "react";
import { Helmet } from "@/lib/helmet-compat";
import { Link } from "@/lib/router-compat";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Breadcrumb } from "@/components/Breadcrumb";

// Chargés à la demande : hors chemin critique du LCP mobile
const EnhancedMarketingFooter = lazy(() =>
  import("@/components/marketing/EnhancedMarketingFooter").then((m) => ({
    default: m.EnhancedMarketingFooter,
  })),
);
const IKSimulator = lazy(() =>
  import("@/components/marketing/IKSimulator").then((m) => ({ default: m.IKSimulator })),
);
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  buildSoftwareApplicationSchema,
  FOUNDER_PERSON,
  ORGANIZATION_ID,
} from "@/lib/seo-schemas";
import { IK_BAREME_2024 } from "@/types/trip";
import {
  ArrowRight,
  Calculator,
  ShieldCheck,
  Zap,
  FileDown,
  MapPin,
  Route as RouteIcon,
  CalendarDays,
  Repeat,
  Mail,
} from "lucide-react";

const PAGE_LASTMOD = getStaticLastModified("/indemnites-kilometriques");

const PAGE_URL = "https://iktracker.fr/indemnites-kilometriques";
const PAGE_UPDATED = "2026-08-27";

/** Méthode singulière IKtracker — texte servi en SSR pour SEO/GEO */
const METHOD_STEPS = [
  {
    icon: RouteIcon,
    t: "Mode Tournée : une journée, plusieurs arrêts, un seul enregistrement",
    d: "Le GPS relève la position toutes les 10 secondes et détecte automatiquement un arrêt au-delà de 2 minutes dans un rayon de 100 mètres. Chaque étape devient un segment daté avec sa distance réelle, calculée en Haversine pendant le trajet puis affinée via Distance Matrix à la clôture. Une tournée oubliée est auto-finalisée et signalée à vérifier : aucune journée ne disparaît du carnet de bord.",
  },
  {
    icon: Repeat,
    t: "Trajets ponctuels ou récurrents, saisis en quelques secondes",
    d: "Un déplacement isolé se crée par dictée vocale ou en langage naturel (« Aix puis Salon, visite chantier »), avec autocomplétion d'adresses issue de la Géoplateforme IGN. Les tournées habituelles se déclarent une fois en trajets récurrents : elles se régénèrent seules, sans ressaisie ni oubli en fin de mois.",
  },
  {
    icon: CalendarDays,
    t: "Calendrier synchronisé : l'agenda devient le carnet de bord",
    d: "Google Calendar et Outlook sont synchronisés quatre fois par jour. Les rendez-vous d'un même agenda sur une même journée sont regroupés automatiquement en tournée, avec retour à l'adresse du domicile en fallback et affectation du véhicule par défaut. Les rendez-vous futurs restent masqués jusqu'à leur date réelle : le registre ne contient jamais de kilomètres non parcourus.",
  },
  {
    icon: Mail,
    t: "Rapports automatiques et archive opposable",
    d: "Un relevé mensuel et annuel est généré et envoyé par email à l'utilisateur et à son expert-comptable, avec lien signé temporaire vers le PDF. Chaque ligne porte date, motif, départ, arrivée, distance, véhicule et puissance fiscale — le format attendu par l'URSSAF — et reste consultable dans l'archive pendant la durée légale de conservation de 3 ans.",
  },
];


const faqs = [
  {
    q: "Qu'est-ce qu'une indemnité kilométrique ?",
    a: "L'indemnité kilométrique (IK) est le remboursement forfaitaire des frais engagés lorsqu'un véhicule personnel est utilisé pour un déplacement professionnel. Elle couvre le carburant, l'usure, l'entretien, l'assurance et la dépréciation du véhicule. Son montant est fixé par le barème kilométrique publié chaque année par la DGFiP (BOFiP) et repris par l'URSSAF.",
  },
  {
    q: "Comment calculer ses indemnités kilométriques en 2026 ?",
    a: "Le calcul repose sur trois éléments : la distance professionnelle parcourue dans l'année, la puissance fiscale du véhicule (case P.6 de la carte grise) et la tranche kilométrique applicable (jusqu'à 5 000 km, de 5 001 à 20 000 km, au-delà de 20 000 km). On multiplie les kilomètres par le taux de la tranche, puis on ajoute le forfait prévu par le barème pour la tranche intermédiaire.",
  },
  {
    q: "Qui peut déduire des indemnités kilométriques ?",
    a: "Les salariés qui optent pour les frais réels, les professions libérales au régime de la déclaration contrôlée, les gérants et dirigeants, ainsi que les entreprises qui remboursent leurs collaborateurs. Les auto-entrepreneurs au régime micro ne peuvent pas déduire d'IK : leur abattement forfaitaire couvre déjà les frais.",
  },
  {
    q: "Quel est le montant des indemnités kilométriques pour un véhicule électrique ?",
    a: "Le barème est majoré de 20 % pour les véhicules 100 % électriques. Les hybrides et hybrides rechargeables ne bénéficient pas de cette majoration. La majoration s'applique au montant total calculé selon la tranche kilométrique.",
  },
  {
    q: "Quels justificatifs conserver pour ses indemnités kilométriques ?",
    a: "L'administration et l'URSSAF exigent un carnet de bord détaillé : date, motif professionnel, lieu de départ et d'arrivée, distance parcourue et véhicule utilisé. Ces justificatifs doivent être conservés 3 ans. Une simple estimation globale est systématiquement rejetée en cas de contrôle.",
  },
  {
    q: "Les trajets domicile-travail comptent-ils dans les indemnités kilométriques ?",
    a: "Oui, dans la limite de 40 km aller simple. Au-delà, seuls les 40 premiers kilomètres sont déductibles, sauf circonstances particulières justifiées (emploi du conjoint, état de santé, absence d'offre d'emploi locale).",
  },
  {
    q: "Indemnités kilométriques ou frais réels : quelle différence ?",
    a: "Les indemnités kilométriques sont l'un des postes des frais réels. Opter pour les frais réels signifie renoncer à l'abattement forfaitaire de 10 % pour déclarer l'ensemble de ses dépenses professionnelles justifiées, dont les IK calculées via le barème kilométrique.",
  },
];

const brackets = [
  { label: "Jusqu'à 5 000 km", key: "upTo5000" as const },
  { label: "De 5 001 à 20 000 km", key: "from5001To20000" as const },
  { label: "Au-delà de 20 000 km", key: "over20000" as const },
];

export default function IndemnitesKilometriques() {
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
            name: "Comment calculer ses indemnités kilométriques",
            description:
              "Méthode officielle de calcul des indemnités kilométriques selon le barème DGFiP 2026.",
            totalTime: "PT5M",
            step: [
              {
                "@type": "HowToStep",
                position: 1,
                name: "Relever la puissance fiscale",
                text: "Lisez la case P.6 de la carte grise du véhicule utilisé.",
              },
              {
                "@type": "HowToStep",
                position: 2,
                name: "Totaliser les kilomètres professionnels",
                text: "Additionnez tous les trajets professionnels de l'année, hors trajets personnels.",
              },
              {
                "@type": "HowToStep",
                position: 3,
                name: "Appliquer la tranche du barème",
                text: "Utilisez le taux correspondant à la tranche kilométrique annuelle atteinte.",
              },
              {
                "@type": "HowToStep",
                position: 4,
                name: "Majorer si véhicule électrique",
                text: "Ajoutez 20 % au montant obtenu pour un véhicule 100 % électrique.",
              },
              {
                "@type": "HowToStep",
                position: 5,
                name: "Archiver les justificatifs",
                text: "Conservez le détail de chaque trajet pendant 3 ans.",
              },
            ],
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(
            buildSoftwareApplicationSchema({
              pageUrl: PAGE_URL,
              pageDescription:
                "Indemnités kilométriques 2026 : définition, barème officiel par puissance fiscale, calcul, majoration électrique et justificatifs. Simulateur gratuit sans inscription.",
            }),
          )}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TechArticle",
            "@id": `${PAGE_URL}#article`,
            headline: "Indemnités kilométriques 2026 : barème, calcul et méthode de suivi",
            description:
              "Méthode complète de calcul et de justification des indemnités kilométriques 2026 : barème DGFiP, majoration électrique, carnet de bord opposable, suivi GPS et rapports automatiques.",
            inLanguage: "fr-FR",
            url: PAGE_URL,
            mainEntityOfPage: PAGE_URL,
            datePublished: "2026-08-27",
            dateModified: PAGE_UPDATED,
            author: FOUNDER_PERSON,
            publisher: { "@type": "Organization", "@id": ORGANIZATION_ID, name: "IKtracker" },
            about: [
              { "@type": "Thing", name: "Indemnité kilométrique" },
              { "@type": "Thing", name: "Barème kilométrique DGFiP" },
              { "@type": "Thing", name: "Frais réels" },
            ],
            mentions: METHOD_STEPS.map((s) => ({ "@type": "Thing", name: s.t })),
          })}
        </script>
      </Helmet>


      <MarketingNav />

      <main
        id="main-content"
        tabIndex={-1}
        className="min-h-screen bg-background pt-20 outline-hidden"
      >
        <div className="container mx-auto px-4 pt-6">
          <Breadcrumb items={[{ label: "Indemnités kilométriques" }]} />
        </div>

        <section className="max-w-3xl mx-auto px-4 pt-10 pb-8 text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight tracking-tight">
            Indemnités kilométriques <span className="text-primary">2026</span>
          </h1>
          {PAGE_LASTMOD ? <LastUpdated date={PAGE_LASTMOD} className="mt-2 mb-4" /> : null}
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Définition, barème officiel DGFiP par puissance fiscale, méthode de calcul, majoration
            de 20 % pour les véhicules électriques et justificatifs exigés en cas de contrôle.
            <strong className="text-foreground"> Simulateur gratuit, sans inscription.</strong>
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <a href="#simulateur-ik" className="w-full sm:w-auto">
              <Button size="lg" className="gap-2 w-full sm:w-auto">
                Calculer mes indemnités <ArrowRight className="w-4 h-4" />
              </Button>
            </a>
            <Link to="/bareme-ik-2026" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Voir le barème détaillé
              </Button>
            </Link>
          </div>

        </section>

        {/* Définition */}
        <section className="max-w-3xl mx-auto px-4 py-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Qu'est-ce qu'une indemnité kilométrique ?
          </h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Une <strong className="text-foreground">indemnité kilométrique</strong> est le
              remboursement forfaitaire des frais engagés lorsqu'un véhicule personnel est utilisé à
              des fins professionnelles. Elle est calculée à partir d'un barème publié chaque année
              par la{" "}
              <a
                href="https://www.impots.gouv.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4"
              >
                Direction générale des finances publiques (DGFiP)
              </a>{" "}
              et repris par l'
              <a
                href="https://www.urssaf.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4"
              >
                URSSAF
              </a>{" "}
              pour l'exonération de cotisations sociales.
            </p>
            <p>
              Le forfait couvre l'ensemble des coûts d'usage du véhicule :{" "}
              <strong className="text-foreground">
                carburant ou électricité, entretien, pneumatiques, assurance et dépréciation
              </strong>
              . Ces dépenses ne peuvent donc pas être déduites une seconde fois à côté des
              indemnités kilométriques. Seuls les péages, les frais de parking et les intérêts
              d'emprunt du véhicule restent déductibles en plus.
            </p>
            <p>
              Les indemnités kilométriques concernent les salariés aux frais réels, les professions
              libérales, les gérants, ainsi que les employeurs qui remboursent les déplacements de
              leurs collaborateurs. Les micro-entrepreneurs en sont exclus : leur abattement
              forfaitaire intègre déjà ces frais.
            </p>
          </div>
        </section>

        {/* Barème */}
        <section className="max-w-4xl mx-auto px-4 py-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Barème des indemnités kilométriques 2026
          </h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Le barème dépend de la puissance fiscale du véhicule (case P.6 de la carte grise) et de
            la distance professionnelle parcourue dans l'année. Les tranches ne sont pas cumulatives
            : la tranche atteinte s'applique à la totalité des kilomètres, avec un forfait
            correctif pour la tranche intermédiaire.
          </p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Barème des indemnités kilométriques 2026 par puissance fiscale et tranche
                kilométrique
              </caption>
              <thead className="bg-muted/50">
                <tr>
                  <th scope="col" className="text-left p-3 font-semibold">
                    Puissance fiscale
                  </th>
                  {brackets.map((b) => (
                    <th scope="col" key={b.key} className="text-left p-3 font-semibold">
                      {b.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {IK_BAREME_2024.map((row) => (
                  <tr key={row.cv} className="border-t border-border">
                    <th scope="row" className="text-left p-3 font-medium text-foreground">
                      {row.cv === "7+" ? "7 CV et plus" : `${row.cv} CV`}
                    </th>
                    {brackets.map((b) => {
                      const cell = row[b.key];
                      return (
                        <td key={b.key} className="p-3 text-muted-foreground">
                          {cell.rate.toFixed(3)} €/km
                          {"fixed" in cell ? ` + ${cell.fixed} €` : ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Source :{" "}
            <a
              href="https://www.impots.gouv.fr/professionnel/resultats?query=bar%C3%A8me%20kilom%C3%A9trique"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-4"
            >
              barème kilométrique DGFiP (BOFiP)
            </a>
            , applicable aux revenus déclarés en 2026. Majoration de 20 % pour les véhicules 100 %
            électriques.
          </p>
        </section>

        {/* Simulateur */}
        <section id="simulateur-ik" className="max-w-4xl mx-auto px-4 py-10 scroll-mt-24">
          <Suspense fallback={<div className="min-h-[520px]" aria-hidden="true" />}>
            <IKSimulator
              idSuffix="-ik-pillar"
              title="Simulateur d'indemnités kilométriques"
              subtitle="Estimez le montant de vos indemnités kilométriques 2026 selon votre puissance fiscale et votre kilométrage annuel."
              trackerPage="indemnites-kilometriques"
            />
          </Suspense>
        </section>

        {/* Méthode */}
        <section className="max-w-4xl mx-auto px-4 py-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
            Comment calculer ses indemnités kilométriques
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                icon: Calculator,
                t: "1. Puissance fiscale et kilométrage",
                d: "Relevez la case P.6 de la carte grise et totalisez uniquement les kilomètres professionnels de l'année.",
              },
              {
                icon: MapPin,
                t: "2. Distances opposables",
                d: "Chaque trajet doit être mesuré de façon vérifiable : itinéraire routier réel, pas d'estimation à la louche.",
              },
              {
                icon: Zap,
                t: "3. Majoration électrique",
                d: "+20 % automatique sur le montant obtenu pour un véhicule 100 % électrique. Les hybrides sont exclus.",
              },
              {
                icon: ShieldCheck,
                t: "4. Justificatifs sur 3 ans",
                d: "Date, motif, départ, arrivée, distance et véhicule pour chaque déplacement, conservés 3 ans.",
              },
            ].map(({ icon: Icon, t, d }) => (
              <Card key={t} className="border-border">
                <CardContent className="p-5 flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{t}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{d}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Méthode singulière IKtracker */}
        <section className="max-w-4xl mx-auto px-4 py-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            La méthode IKtracker : du trajet réel à l'indemnité justifiable
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            La difficulté des indemnités kilométriques n'est pas le calcul, c'est la preuve. Un
            barème s'applique en une multiplication ; un carnet de bord opposable, lui, se
            construit jour après jour. IKtracker part donc du déplacement réel — enregistré,
            horodaté, mesuré — et remonte jusqu'au montant fiscal, plutôt que l'inverse. Cette
            logique explique les quatre briques ci-dessous, conçues par un entrepreneur
            indépendant pour son propre usage de terrain.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {METHOD_STEPS.map(({ icon: Icon, t, d }) => (
              <Card key={t} className="border-border">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground leading-snug">{t}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{d}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-muted-foreground leading-relaxed mt-6">
            Chaque trajet enregistré est ensuite converti au barème DGFiP en vigueur, avec la
            majoration de 20 % appliquée automatiquement aux véhicules 100 % électriques et le
            passage de tranche kilométrique signalé dès qu'il est atteint. Un changement de
            véhicule ou de puissance fiscale déclenche, au choix, le recalcul des trajets déjà
            enregistrés. L'ensemble est{" "}
            <strong className="text-foreground">
              gratuit à vie, sans abonnement ni carte bancaire
            </strong>
            .
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/mode-tournee">
              <Button variant="outline">Découvrir le Mode Tournée</Button>
            </Link>
            <Link to="/calendrier">
              <Button variant="outline">Synchronisation calendrier</Button>
            </Link>
            <Link to="/fonctionnalites">
              <Button variant="outline">Toutes les fonctionnalités</Button>
            </Link>
          </div>
        </section>

        {/* Cas particuliers + maillage */}

        <section className="max-w-3xl mx-auto px-4 py-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
            Cas particuliers et ressources
          </h2>
          <ul className="space-y-3 text-muted-foreground">
            <li>
              <Link to="/bareme-ik-2026" className="text-primary underline underline-offset-4">
                Barème kilométrique 2026 complet
              </Link>{" "}
              — tableau officiel par CV, forfaits par tranche et exemples chiffrés.
            </li>
            <li>
              <Link to="/frais-reels" className="text-primary underline underline-offset-4">
                Frais réels ou abattement de 10 %
              </Link>{" "}
              — savoir à partir de quel kilométrage l'option devient gagnante.
            </li>
            <li>
              <Link
                to="/note-de-frais-kilometrique"
                className="text-primary underline underline-offset-4"
              >
                Note de frais kilométrique
              </Link>{" "}
              — le document à remettre à l'employeur ou au comptable.
            </li>
            <li>
              <Link
                to="/indemnite-kilometrique-velo"
                className="text-primary underline underline-offset-4"
              >
                Indemnité kilométrique vélo
              </Link>{" "}
              — forfait mobilités durables et cumul possible.
            </li>
            <li>
              <Link
                to="/indemnite-grand-deplacement-2026"
                className="text-primary underline underline-offset-4"
              >
                Indemnité de grand déplacement
              </Link>{" "}
              — repas et hébergement lors des missions éloignées.
            </li>
          </ul>

          <h3 className="text-xl font-bold text-foreground mt-10 mb-4">Sources officielles</h3>
          <ul className="space-y-3 text-muted-foreground">
            <li>
              <a
                href="https://www.impots.gouv.fr/professionnel/resultats?query=bar%C3%A8me%20kilom%C3%A9trique"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4"
              >
                Barème kilométrique DGFiP / BOFiP
              </a>{" "}
              — texte officiel et simulateur de l'administration fiscale.
            </li>
            <li>
              <a
                href="https://www.urssaf.fr/accueil/outils-documentation/taux-et-baremes/frais-professionnels.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4"
              >
                Frais professionnels — URSSAF
              </a>{" "}
              — règles de remboursement et exonération de cotisations.
            </li>
            <li>
              <a
                href="https://www.service-public.fr/particuliers/vosdroits/F35100"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4"
              >
                Frais réels : frais de déplacement — Service-public.fr
              </a>{" "}
              — fiche officielle pour les particuliers.
            </li>
            <li>
              <a
                href="https://www.legifrance.gouv.fr/codes/id/LEGIARTI000046299349/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4"
              >
                Code général des impôts — article 83
              </a>{" "}
              — base légale des frais professionnels.
            </li>
          </ul>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-4 py-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
            Questions fréquentes sur les indemnités kilométriques
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
        <section className="max-w-md mx-auto px-4 pb-24 pt-4 text-center">
          <FileDown className="w-8 h-8 text-primary mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">
            Suivez vos trajets toute l'année et exportez vos indemnités kilométriques en PDF ou
            Excel.
          </p>
          <Link to="/signup">
            <Button size="lg" className="gap-2 px-8">
              Suivre mes indemnités gratuitement <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </section>
      </main>

      <Suspense fallback={<div className="min-h-[400px]" aria-hidden="true" />}>
        <EnhancedMarketingFooter />
      </Suspense>
    </>
  );
}
