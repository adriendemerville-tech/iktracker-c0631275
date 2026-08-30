import { LastUpdated } from "@/components/LastUpdated";
import { DirectAnswer } from "@/components/DirectAnswer";
import { getPageDates } from "@/lib/page-dates";
import { Helmet } from "@/lib/helmet-compat";
import { Link } from "@/lib/router-compat";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Breadcrumb } from "@/components/Breadcrumb";
import { EnhancedMarketingFooter } from "@/components/marketing/EnhancedMarketingFooter";
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
  BellRing,
  Calculator,
  CalendarClock,
  ShieldCheck,
  Zap,
  FileDown,
} from "lucide-react";

const PAGE_DATE = getPageDates("/indemnites-kilometriques-2027");
const PAGE_URL = "https://iktracker.fr/indemnites-kilometriques-2027";

const faqs = [
  {
    q: "Le barème kilométrique 2027 est-il déjà publié ?",
    a: "Non. À la date de mise à jour de cette page, la DGFiP n'a pas encore publié le barème applicable aux revenus 2026 déclarés en 2027. Il est traditionnellement dévoilé entre février et avril, juste avant la campagne de déclaration des revenus. Cette page sera mise à jour dès la publication officielle au BOFiP.",
  },
  {
    q: "Le barème 2027 sera-t-il revalorisé ?",
    a: "Rien n'est garanti. La revalorisation dépend de la loi de finances : les barèmes 2023 et 2024 ont été relevés (+5,4 % en 2023), mais celui applicable en 2026 est resté inchangé. Toute revalorisation éventuelle pour 2027 sera annoncée dans la loi de finances pour 2026 ou lors de la publication du barème.",
  },
  {
    q: "Quel barème utiliser pour mes trajets de 2026 ?",
    a: "Tous les trajets professionnels parcourus entre le 1er janvier et le 31 décembre 2026 se calculent avec le barème actuellement en vigueur, reproduit sur cette page. Le futur barème 2027 ne s'appliquera qu'aux trajets parcourus à partir du 1er janvier 2027.",
  },
  {
    q: "La majoration de 20 % pour les véhicules électriques sera-t-elle maintenue en 2027 ?",
    a: "La majoration de 20 % pour les véhicules 100 % électriques fait partie intégrante du barème depuis 2021 et rien n'indique sa suppression. En l'absence de décision contraire, elle s'appliquera au barème 2027. Les hybrides, y compris rechargeables, en restent exclus.",
  },
  {
    q: "Comment être alerté de la publication du barème 2027 ?",
    a: "Créez un compte gratuit IKtracker : le barème intégré à l'outil est mis à jour dès la publication officielle et vos trajets 2027 sont automatiquement calculés avec les nouveaux taux, sans aucune action de votre part. Le passage au nouveau barème est signalé dans votre espace.",
  },
];

const brackets = [
  { label: "Jusqu'à 5 000 km", key: "upTo5000" as const },
  { label: "De 5 001 à 20 000 km", key: "from5001To20000" as const },
  { label: "Au-delà de 20 000 km", key: "over20000" as const },
];

export default function IndemnitesKilometriques2027() {
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
          {JSON.stringify(
            buildSoftwareApplicationSchema({
              pageUrl: PAGE_URL,
              pageDescription:
                "Indemnités kilométriques 2027 : barème en attente de publication officielle, calendrier prévisionnel, barème 2026 en vigueur et alerte de mise à jour automatique.",
            }),
          )}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TechArticle",
            "@id": `${PAGE_URL}#article`,
            headline: "Indemnités kilométriques 2027 : barème attendu, calendrier et anticipation",
            description:
              "Page de suivi du barème kilométrique 2027 : date de publication prévisionnelle, rappel du barème 2026 en vigueur, majoration électrique et préparation du carnet de bord.",
            inLanguage: "fr-FR",
            url: PAGE_URL,
            mainEntityOfPage: PAGE_URL,
            datePublished: PAGE_DATE.published,
            dateModified: PAGE_DATE.modified,
            author: FOUNDER_PERSON,
            publisher: { "@type": "Organization", "@id": ORGANIZATION_ID, name: "IKtracker" },
            about: [
              { "@type": "Thing", name: "Indemnité kilométrique" },
              { "@type": "Thing", name: "Barème kilométrique 2027" },
              { "@type": "Thing", name: "Barème kilométrique DGFiP" },
            ],
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
          <Breadcrumb
            items={[
              { label: "Indemnités kilométriques", href: "/indemnites-kilometriques" },
              { label: "Barème 2027" },
            ]}
          />
        </div>

        <section className="max-w-3xl mx-auto px-4 pt-10 pb-8 text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight tracking-tight">
            Indemnités kilométriques <span className="text-primary">2027</span>
          </h1>
          <LastUpdated date={PAGE_DATE.modified} className="mt-2 mb-4" />
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Le barème kilométrique 2027 n'est pas encore publié par la DGFiP. Cette page le
            suivra dès sa parution officielle.{" "}
            <strong className="text-foreground">
              En attendant, tous vos trajets 2026 restent calculés au barème en vigueur
            </strong>{" "}
            — et un compte IKtracker gratuit vous garantit la bascule automatique au nouveau
            barème le 1er janvier 2027.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/signup" className="w-full sm:w-auto">
              <Button size="lg" className="gap-2 w-full sm:w-auto">
                <BellRing className="w-4 h-4" /> Être alerté du barème 2027
              </Button>
            </Link>
            <Link to="/indemnites-kilometriques" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Barème 2026 en vigueur
              </Button>
            </Link>
          </div>

          <DirectAnswer question="Le barème kilométrique 2027 est-il publié, et quel barème appliquer en attendant ?">
            <p>
              Non : au moment de la mise à jour de cette page, le barème kilométrique 2027 n'a pas
              encore été publié par la DGFiP. Il paraît traditionnellement par arrêté au Journal
              officiel entre mars et avril, pour la déclaration de revenus de l'année précédente,
              et s'applique rétroactivement à tous les trajets effectués depuis le 1er janvier
              2027.
            </p>
            <p>
              En attendant, tout déplacement professionnel réalisé en 2026 se calcule au barème
              2026 en vigueur : kilomètres × tarif selon la puissance fiscale et la tranche
              annuelle, avec une majoration de 20 % pour les véhicules 100 % électriques.
            </p>
            <p>
              La bonne pratique est donc d'enregistrer les trajets au fil de l'eau plutôt que
              d'attendre la publication : IKtracker conserve le détail par trajet et recalcule
              automatiquement l'historique dès que le barème 2027 est officiel.
            </p>
          </DirectAnswer>
        </section>

        {/* Statut du barème */}
        <section className="max-w-3xl mx-auto px-4 py-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Où en est le barème kilométrique 2027 ?
          </h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              À ce jour, la{" "}
              <a
                href="https://www.impots.gouv.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4"
              >
                Direction générale des finances publiques (DGFiP)
              </a>{" "}
              n'a pas encore publié le barème kilométrique applicable aux revenus 2026, qui sera
              utilisé pour la déclaration de revenus du printemps 2027. C'est un calendrier
              habituel : le barème est traditionnellement dévoilé{" "}
              <strong className="text-foreground">
                entre février et avril, au Bulletin officiel des finances publiques (BOFiP)
              </strong>
              , quelques semaines avant l'ouverture de la campagne déclarative.
            </p>
            <p>
              Faut-il s'attendre à une revalorisation ? Rien n'est acquis. Le barème a été relevé
              de 5,4 % en 2023 puis maintenu quasiment inchangé les années suivantes, malgré la
              hausse des prix du carburant et de l'entretien. Une éventuelle revalorisation 2027
              dépendra de la loi de finances et des arbitrages budgétaires. Dès la publication
              officielle, cette page sera mise à jour avec le tableau complet par puissance
              fiscale, la date d'application exacte et les conséquences pratiques pour les
              salariés aux frais réels comme pour les professions libérales.
            </p>
            <p>
              Ce qui est déjà certain : le mécanisme de calcul ne changera pas. Le barème 2027
              restera adossé à la{" "}
              <strong className="text-foreground">puissance fiscale</strong> du véhicule (case
              P.6 de la carte grise) et à des{" "}
              <strong className="text-foreground">tranches kilométriques annuelles</strong> —
              jusqu'à 5 000 km, de 5 001 à 20 000 km, au-delà de 20 000 km. La majoration de 20 %
              réservée aux véhicules 100 % électriques, intégrée au barème depuis 2021, devrait
              également être reconduite ; les hybrides et hybrides rechargeables en resteront
              exclus.
            </p>
          </div>
        </section>

        {/* Calendrier prévisionnel */}
        <section className="max-w-4xl mx-auto px-4 py-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
            Le calendrier à anticiper pour 2027
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                icon: CalendarClock,
                t: "1er janvier 2027 : nouveau compteur kilométrique",
                d: "Les tranches du barème s'apprécient sur l'année civile. Au 1er janvier 2027, votre kilométrage professionnel repart à zéro : c'est le moment de vérifier que votre carnet de bord 2026 est complet avant de basculer.",
              },
              {
                icon: BellRing,
                t: "Février à avril 2027 : publication au BOFiP",
                d: "La DGFiP publie le barème applicable aux revenus 2026. IKtracker intègre les nouveaux taux dès la parution officielle : aucune saisie manuelle, aucune formule à corriger.",
              },
              {
                icon: FileDown,
                t: "Printemps 2027 : déclaration des revenus 2026",
                d: "C'est le barème publié en 2027 qui sert à calculer les frais réels des trajets parcourus en 2026. Un relevé annuel PDF daté, détaillé ligne à ligne, constitue la pièce attendue par votre expert-comptable.",
              },
              {
                icon: ShieldCheck,
                t: "Toute l'année : conservation des justificatifs",
                d: "Date, motif, départ, arrivée, distance et véhicule pour chaque déplacement, conservés 3 ans. Une estimation globale est systématiquement rejetée en cas de contrôle URSSAF ou fiscal.",
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

        {/* Barème 2026 en vigueur */}
        <section className="max-w-4xl mx-auto px-4 py-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            En attendant : le barème 2026 reste la référence
          </h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Tant que le barème 2027 n'est pas publié, tous les trajets parcourus en 2026 se
            calculent avec les taux ci-dessous. Ce tableau donne aussi un ordre de grandeur
            réaliste pour anticiper vos indemnités 2027 : même en cas de revalorisation, les
            montants évoluent traditionnellement de quelques centièmes d'euro par kilomètre.
          </p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Barème kilométrique actuellement en vigueur, par puissance fiscale et tranche
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
            , applicable aux trajets parcourus en 2026. Majoration de 20 % pour les véhicules
            100 % électriques. Détail complet sur{" "}
            <Link to="/bareme-ik-2026" className="text-primary underline underline-offset-4">
              la page du barème 2026
            </Link>
            .
          </p>
        </section>

        {/* Préparer 2027 */}
        <section className="max-w-3xl mx-auto px-4 py-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Préparer 2027 : trois réflexes à prendre dès maintenant
          </h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground">1. Ne laissez pas de trou dans 2026.</strong>{" "}
              Le passage à la nouvelle année est le pire moment pour reconstituer des trajets de
              mémoire. Chaque déplacement non enregistré avant le 31 décembre est une indemnité
              potentiellement perdue : une dizaine de kilomètres oubliés par semaine représente
              plusieurs centaines d'euros sur l'année.
            </p>
            <p>
              <strong className="text-foreground">2. Fiabilisez vos distances.</strong> En cas de
              contrôle, l'administration confronte votre carnet de bord aux itinéraires réels.
              Les distances doivent être mesurées, pas estimées : le Mode Tournée d'IKtracker
              relève le GPS toutes les 10 secondes, détecte les arrêts de plus de 2 minutes et
              recalcule chaque segment via Distance Matrix à la clôture.
            </p>
            <p>
              <strong className="text-foreground">3. Automatisez la bascule de barème.</strong>{" "}
              Avec un compte gratuit, vos trajets 2027 seront calculés avec les nouveaux taux dès
              leur publication — sans export, sans tableur, sans formule à corriger. Le
              changement de véhicule ou de puissance fiscale déclenche au choix le recalcul des
              trajets déjà enregistrés, et le relevé annuel part automatiquement vers votre
              expert-comptable avec un lien signé vers le PDF.
            </p>
            <p>
              IKtracker est un outil communautaire,{" "}
              <strong className="text-foreground">
                gratuit à vie, sans abonnement ni carte bancaire
              </strong>
              . La synchronisation de votre agenda (Google Calendar, Outlook) regroupe
              automatiquement les rendez-vous d'une même journée en tournée : le carnet de bord
              se remplit sans y penser, prêt pour le barème 2027 comme pour un éventuel contrôle.
            </p>
          </div>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link to="/signup" className="w-full sm:w-auto">
              <Button size="lg" className="gap-2 w-full sm:w-auto">
                <Calculator className="w-4 h-4" /> Accéder gratuitement <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/indemnites-kilometriques" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                <Zap className="w-4 h-4" /> Calculer mes IK 2026
              </Button>
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-4 py-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
            Questions fréquentes sur le barème 2027
          </h2>
          <div className="space-y-4">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-xl border border-border bg-card p-5 open:pb-5"
              >
                <summary className="cursor-pointer font-semibold text-foreground list-none flex items-center justify-between gap-4">
                  {f.q}
                  <span className="text-primary transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <EnhancedMarketingFooter />
    </>
  );
}
