import { ClusterLinks } from "@/components/marketing/ClusterLinks";
import { LastUpdated } from "@/components/LastUpdated";
import { getStaticLastModified } from "@/lib/page-dates";
import { JsonLd } from "@/components/JsonLd";
import { buildSoftwareApplicationSchema } from "@/lib/seo-schemas";
import { Link } from "@/lib/router-compat";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { EnhancedMarketingFooter } from "@/components/marketing/EnhancedMarketingFooter";
import { Breadcrumb } from "@/components/Breadcrumb";
import { IKSimulator } from "@/components/marketing/IKSimulator";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Calculator,
  Scale,
  Zap,
  FileCheck2,
  TableProperties,
} from "lucide-react";
import { IK_BAREME_2026, calculateTotalAnnualIK } from "@/types/trip";

const PAGE_LASTMOD = getStaticLastModified("/simulateur-indemnites-kilometriques-2026");

const KM_SAMPLES = [5000, 10000, 15000, 20000, 25000];

const euro = (v: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(v)) + " €";

const baremeRows = IK_BAREME_2026.map((b) => {
  const cv = parseInt(b.cv) || 7;
  return {
    label: b.cv === "7+" ? "7 CV et plus" : `${b.cv} CV`,
    cells: KM_SAMPLES.map((km) => euro(calculateTotalAnnualIK(km, cv))),
  };
});

const steps = [
  {
    icon: Calculator,
    t: "1. Renseignez deux valeurs",
    d: "La puissance fiscale du véhicule (case P.6 de la carte grise) et le nombre de kilomètres parcourus sur l'année fiscale, tous trajets confondus.",
  },
  {
    icon: Scale,
    t: "2. Le barème applique la bonne tranche",
    d: "Le calcul suit le barème officiel à trois tranches : jusqu'à 5 000 km, de 5 001 à 20 000 km (avec une part fixe), puis au-delà de 20 000 km. Le taux retenu est celui de la tranche atteinte, pas une moyenne.",
  },
  {
    icon: FileCheck2,
    t: "3. Utilisez le montant",
    d: "Le total obtenu est celui que vous pouvez inscrire sur votre note de frais ou déclarer en frais réels, à condition de tenir un carnet de bord daté et motivé.",
  },
];

const faqs = [
  {
    q: "Le simulateur est-il gratuit et sans inscription ?",
    a: "Oui. Le calcul est effectué dans votre navigateur, aucune inscription n'est demandée pour obtenir un résultat. IKtracker reste gratuit à vie pour la suite : enregistrement des trajets, calcul automatique et export PDF ou Excel.",
  },
  {
    q: "Quelle puissance fiscale dois-je indiquer ?",
    a: "La puissance fiscale administrative, inscrite en case P.6 de la carte grise, et non la puissance réelle du moteur. Elle détermine la colonne du barème : un même trajet ne donne pas le même montant avec une 3 CV ou une 6 CV.",
  },
  {
    q: "Comment la majoration de 20 % pour véhicule électrique est-elle appliquée ?",
    a: "Elle s'applique au total calculé, pour un véhicule 100 % électrique. Les véhicules hybrides, rechargeables ou non, ne sont pas éligibles. Dans le simulateur, activez l'option pour voir le montant majoré et le gain exact.",
  },
  {
    q: "Les kilomètres pris en compte sont-ils ceux d'un seul trajet ?",
    a: "Non. Le barème dépend du kilométrage annuel total du véhicule, pas de la longueur de chaque déplacement. Un trajet de 30 km n'est pas remboursé au même taux si vous roulez 4 000 ou 18 000 km dans l'année.",
  },
  {
    q: "Ce montant est-il opposable en cas de contrôle ?",
    a: "Le montant seul ne suffit pas. L'URSSAF et l'administration fiscale exigent un carnet de bord : date, motif professionnel, départ, arrivée, distance et puissance fiscale. IKtracker conserve ces justificatifs pendant 3 ans et les exporte en PDF ou Excel.",
  },
  {
    q: "Puis-je comparer avec l'abattement forfaitaire de 10 % ?",
    a: "Oui, c'est même recommandé : l'abattement de 10 % s'applique au revenu imposable, pas aux kilomètres. La page frais réels détaille la comparaison et permet de vérifier si le passage au réel est avantageux dans votre situation.",
  },
];

export default function SimulateurIndemnitesKilometriques2026() {
  return (
    <>
      <JsonLd>
        <script type="application/ld+json">
          {JSON.stringify(
            buildSoftwareApplicationSchema({
              pageUrl: "https://iktracker.fr/simulateur-indemnites-kilometriques-2026",
              pageDescription:
                "Simulateur d'indemnités kilométriques 2026 : calculez vos IK selon le barème officiel DGFiP, tranche kilométrique et majoration de 20 % pour les véhicules 100 % électriques. Gratuit, sans inscription.",
            }),
          )}
        </script>
      </JsonLd>

      <MarketingNav />

      <main
        id="main-content"
        tabIndex={-1}
        className="min-h-screen bg-background pt-20 outline-hidden"
      >
        <div className="container mx-auto px-4 pt-6">
          <Breadcrumb items={[{ label: "Simulateur indemnités kilométriques 2026" }]} />
        </div>

        {/* Hero */}
        <section className="max-w-3xl mx-auto px-4 pt-8 pb-8 text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight tracking-tight">
            Simulateur indemnités
            <br />
            kilométriques <span className="text-primary">2026</span>
          </h1>
          {PAGE_LASTMOD ? <LastUpdated date={PAGE_LASTMOD} className="mt-2 mb-4" /> : null}
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed min-h-[7rem] sm:min-h-[5.5rem] md:min-h-[5rem]">
            Deux champs suffisent : la puissance fiscale de votre véhicule et vos kilomètres de
            l'année. Le simulateur applique le barème officiel DGFiP 2026, ses trois tranches
            kilométriques et la majoration de 20 % pour les véhicules 100 % électriques.
            <strong className="text-foreground"> Gratuit, sans inscription.</strong>
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/signup">
              <Button size="lg" className="gap-2">
                Automatiser mes IK <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/bareme-ik-2026">
              <Button size="lg" variant="outline">
                Voir le barème 2026 en détail
              </Button>
            </Link>
          </div>
        </section>

        {/* Simulateur */}
        <section className="max-w-5xl mx-auto px-4 py-8" aria-labelledby="simulateur-page">
          <IKSimulator
            idSuffix="-page"
            trackerPage="simulateur"
            title="Calculez vos indemnités kilométriques 2026"
            subtitle="Puissance fiscale, kilomètres annuels, option véhicule électrique : le montant est recalculé immédiatement selon le barème en vigueur."
          />
        </section>

        {/* Comment le calcul fonctionne */}
        <section className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
            Comment le simulateur calcule vos IK
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {steps.map(({ icon: Icon, t, d }) => (
              <Card key={t} className="border-border">
                <CardContent className="p-5">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">{t}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{d}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted-foreground text-center">
            Le barème est appliqué par tranche : au-delà de 5 000 km, une part fixe s'ajoute au
            taux kilométrique de la tranche atteinte. C'est ce qui évite le « saut » de
            remboursement au passage d'un seuil.
          </p>
        </section>

        {/* Tableau des résultats */}
        <section className="max-w-5xl mx-auto px-4 py-12">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TableProperties className="w-5 h-5 text-primary" aria-hidden="true" />
            <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center">
              Barème 2026 : indemnités par puissance fiscale et kilométrage
            </h2>
          </div>
          <p className="text-muted-foreground text-center mb-8 max-w-2xl mx-auto">
            Montants annuels calculés avec le barème officiel DGFiP, hors majoration électrique.
            Un véhicule 100 % électrique multiplie ces montants par 1,2.
          </p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Barème indemnités kilométriques 2026 : total annuel en euros selon la puissance
                fiscale et les kilomètres parcourus
              </caption>
              <thead>
                <tr className="bg-muted/60 text-foreground">
                  <th scope="col" className="text-left px-4 py-3 font-semibold">
                    Puissance fiscale
                  </th>
                  {KM_SAMPLES.map((km) => (
                    <th key={km} scope="col" className="text-right px-4 py-3 font-semibold">
                      {km.toLocaleString("fr-FR")} km
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {baremeRows.map((row) => (
                  <tr key={row.label} className="border-t border-border">
                    <th
                      scope="row"
                      className="text-left px-4 py-3 font-medium text-foreground whitespace-nowrap"
                    >
                      {row.label}
                    </th>
                    {row.cells.map((c, i) => (
                      <td key={KM_SAMPLES[i]} className="text-right px-4 py-3 tabular-nums">
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Tranches : jusqu'à 5 000 km, de 5 001 à 20 000 km (taux + part fixe), au-delà de
            20 000 km. Le simulateur officiel de la DGFiP permet de vérifier chaque montant.
          </p>
        </section>

        {/* Majoration électrique */}
        <section className="max-w-3xl mx-auto px-4 py-12">
          <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20">
            <CardContent className="p-6 flex gap-4 items-start">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Véhicule 100 % électrique : +20 % sur le total
                </h2>
                <p className="text-muted-foreground mt-2 leading-relaxed">
                  La majoration de 20 % s'applique au montant calculé, pas au taux kilométrique.
                  Pour 10 000 km avec une 5 CV, le barème donne 4 965 € ; avec la majoration, le
                  total atteint 5 958 €, soit 993 € de plus. Les véhicules hybrides ne sont pas
                  concernés.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Que faire du résultat */}
        <section className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
            Que faire de votre résultat
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="border-border">
              <CardContent className="p-5">
                <h3 className="font-semibold text-foreground">Salarié : la note de frais</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Le montant s'inscrit sur une note de frais kilométrique datée et motivée, remise à
                  l'employeur ou au comptable. Le modèle conforme et les champs obligatoires sont
                  détaillés sur la page note de frais.
                </p>
                <Link
                  to="/note-de-frais-kilometrique"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary mt-3 hover:underline"
                >
                  Voir le modèle de note de frais <ArrowRight className="w-4 h-4" />
                </Link>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-5">
                <h3 className="font-semibold text-foreground">
                  Indépendant : les frais réels
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Les IK remplacent l'abattement forfaitaire de 10 % si elles sont plus
                  avantageuses. La comparaison se fait sur votre revenu imposable, pas sur vos
                  kilomètres.
                </p>
                <Link
                  to="/frais-reels"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary mt-3 hover:underline"
                >
                  Comparer frais réels et abattement <ArrowRight className="w-4 h-4" />
                </Link>
              </CardContent>
            </Card>
          </div>
          <p className="mt-6 text-sm text-muted-foreground text-center">
            Dans les deux cas, il faut pouvoir justifier chaque kilomètre : dates, motifs, adresses,
            distances. IKtracker les enregistre depuis votre agenda ou le GPS, et exporte le relevé
            en PDF ou Excel pour votre expert-comptable.
          </p>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-4 py-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
            Questions fréquentes sur le simulateur
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
            Le simulateur calcule un total. IKtracker le tient à jour toute l'année, trajet par
            trajet.
          </p>
          <Link to="/signup">
            <Button size="lg" className="gap-2 px-8">
              Accéder à IKtracker gratuitement <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </section>
      </main>

      <ClusterLinks path="/simulateur-indemnites-kilometriques-2026" />

      <EnhancedMarketingFooter />
    </>
  );
}
