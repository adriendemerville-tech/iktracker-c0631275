import { Helmet } from '@/lib/helmet-compat';
import { Link } from "@/lib/router-compat";
import { lazy, Suspense, memo } from "react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, BedDouble, UtensilsCrossed, Plane, ShieldCheck, Euro } from "lucide-react";
import { buildSoftwareApplicationSchema } from "@/lib/seo-schemas";

const EnhancedMarketingFooter = lazy(() =>
  import("@/components/marketing/EnhancedMarketingFooter").then((m) => ({
    default: m.EnhancedMarketingFooter,
  })),
);
const FooterPlaceholder = memo(() => <div className="min-h-[400px] bg-muted/30 animate-pulse" />);

const PAGE_URL = "https://iktracker.fr/indemnite-grand-deplacement-2026";
const PAGE_TITLE = "Indemnité grand déplacement 2026 — barème URSSAF & calcul";
const PAGE_DESC =
  "Barème URSSAF 2026 de l'indemnité de grand déplacement : plafonds repas, nuitée + petit-déjeuner (Paris/province/DOM), conditions de distance et de temps, cumul avec les indemnités kilométriques.";

const BAREME_METROPOLE = [
  { label: "Repas (par repas)", value: "20,70 €" },
  { label: "Nuitée + petit-déjeuner — Paris & petite couronne (75, 92, 93, 94)", value: "74,30 €" },
  { label: "Nuitée + petit-déjeuner — Autres départements", value: "55,10 €" },
];

const BAREME_LONGUE_DUREE = [
  { periode: "Du 1ᵉʳ au 3ᵉ mois", repas: "20,70 €", nuitee_paris: "74,30 €", nuitee_prov: "55,10 €" },
  { periode: "Du 4ᵉ au 24ᵉ mois (−15 %)", repas: "17,60 €", nuitee_paris: "63,20 €", nuitee_prov: "46,80 €" },
  { periode: "Du 25ᵉ au 72ᵉ mois (−30 %)", repas: "14,50 €", nuitee_paris: "52,00 €", nuitee_prov: "38,60 €" },
];

const FAQS = [
  {
    q: "Qu'est-ce que l'indemnité de grand déplacement ?",
    a: "C'est une somme versée par l'employeur au salarié empêché de rentrer chez lui chaque soir en raison d'un déplacement professionnel. Elle couvre forfaitairement les frais de repas et d'hébergement (nuitée + petit-déjeuner), en exonération de cotisations URSSAF dans la limite du barème officiel.",
  },
  {
    q: "Quelles sont les conditions du grand déplacement en 2026 ?",
    a: "Deux critères cumulatifs URSSAF : la distance domicile / lieu de mission doit être d'au moins 50 km (aller simple) ET le trajet en transports en commun doit prendre au moins 1h30 (aller simple). Si l'un des deux n'est pas rempli, on retombe sur le régime du petit déplacement.",
  },
  {
    q: "Quels sont les montants 2026 ?",
    a: "Repas : 20,70 € par repas. Nuitée + petit-déjeuner : 74,30 € à Paris et petite couronne (75, 92, 93, 94), 55,10 € dans les autres départements de métropole. Les montants sont réduits de 15 % à partir du 4ᵉ mois et de 30 % à partir du 25ᵉ mois sur un même lieu de mission.",
  },
  {
    q: "Peut-on cumuler grand déplacement et indemnités kilométriques ?",
    a: "Oui. Les indemnités kilométriques couvrent le trajet en véhicule personnel (barème IK 2026). Les indemnités de grand déplacement couvrent les frais sur place (repas + hébergement). Les deux dispositifs se cumulent dès lors que chacun est justifié.",
  },
  {
    q: "Faut-il des justificatifs ?",
    a: "Non pour le régime forfaitaire URSSAF : la simple justification de la situation de grand déplacement (ordre de mission, distance, durée) suffit. Au-delà des plafonds, l'employeur doit passer au régime des frais réels et conserver toutes les factures.",
  },
  {
    q: "Le grand déplacement est-il imposable ?",
    a: "Non, dans la limite du barème URSSAF. Au-delà, la fraction excédentaire est réintégrée dans le net imposable et soumise à cotisations sociales, sauf si l'employeur peut prouver la réalité et le caractère professionnel de la dépense par des justificatifs.",
  },
];

export default function IndemniteGrandDeplacement2026() {
  return (
    <>
      <Helmet>

        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: PAGE_TITLE,
            description: PAGE_DESC,
            author: {
              "@type": "Person",
              name: "Adrien de Volontat",
              url: "https://iktracker.fr/blog/auteur/adrien-de-volontat",
            },
            publisher: { "@type": "Organization", name: "IKtracker", url: "https://iktracker.fr" },
            datePublished: "2026-01-15",
            dateModified: "2026-07-25",
            mainEntityOfPage: PAGE_URL,
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((f) => ({
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
                "IKtracker consigne vos déplacements professionnels (kilomètres, grand déplacement, repas, nuitées) dans un journal opposable URSSAF, gratuit à vie.",
            }),
          )}
        </script>
      </Helmet>

      <MarketingNav />

      <main id="main-content" tabIndex={-1} className="min-h-screen bg-background pt-20 outline-hidden">
        <div className="container mx-auto px-4 pt-6">
          <Breadcrumb items={[{ label: "Indemnité grand déplacement 2026" }]} />
        </div>

        {/* Hero */}
        <section className="max-w-3xl mx-auto px-4 pt-12 pb-10 text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight tracking-tight">
            Indemnité grand déplacement
            <br />
            <span className="text-primary">Barème URSSAF 2026</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Montants officiels des <strong className="text-foreground">frais de repas</strong> et de{" "}
            <strong className="text-foreground">nuitée</strong> quand un salarié ou un freelance ne peut
            pas rentrer chez lui : conditions, plafonds Paris/province, cumul avec les indemnités
            kilométriques 2026.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/signup">
              <Button size="lg" className="gap-2">
                Consigner mes déplacements <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/bareme-ik-2026">
              <Button size="lg" variant="outline">
                Voir aussi le barème IK 2026
              </Button>
            </Link>
          </div>
        </section>

        {/* Key facts */}
        <section className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
            Ce qu'il faut retenir
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: UtensilsCrossed, t: "20,70 € par repas", d: "Forfait exonéré URSSAF pour chaque repas pris hors du domicile en situation de grand déplacement." },
              { icon: BedDouble, t: "55,10 € à 74,30 € / nuit", d: "Nuitée + petit-déjeuner. 74,30 € à Paris et petite couronne, 55,10 € en province." },
              { icon: Plane, t: "≥ 50 km ET ≥ 1h30", d: "Conditions cumulatives : au moins 50 km entre le domicile et le lieu de mission, ET 1h30 de trajet en transports en commun." },
              { icon: ShieldCheck, t: "Exonéré URSSAF & impôt", d: "Sans justificatif dans la limite du barème forfaitaire. Au-delà : régime des frais réels avec factures." },
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

        {/* Barème métropole */}
        <section className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
            Barème 2026 — métropole (3 premiers mois)
          </h2>
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nature de la dépense</TableHead>
                  <TableHead className="text-right">Montant exonéré URSSAF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {BAREME_METROPOLE.map((r) => (
                  <TableRow key={r.label}>
                    <TableCell>{r.label}</TableCell>
                    <TableCell className="text-right font-semibold text-foreground">{r.value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            Source : URSSAF — Barème 2026 des indemnités forfaitaires de grand déplacement en métropole.
          </p>
        </section>

        {/* Longue durée */}
        <section className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
            Mission longue durée : abattements 15 % et 30 %
          </h2>
          <p className="text-muted-foreground mb-4">
            Lorsque le salarié reste affecté sur le même lieu de mission, les plafonds URSSAF sont
            réduits <strong className="text-foreground">de 15 %</strong> à partir du 4ᵉ mois et{" "}
            <strong className="text-foreground">de 30 %</strong> à partir du 25ᵉ mois.
          </p>
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Période</TableHead>
                  <TableHead className="text-right">Repas</TableHead>
                  <TableHead className="text-right">Nuitée Paris / PC</TableHead>
                  <TableHead className="text-right">Nuitée province</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {BAREME_LONGUE_DUREE.map((r) => (
                  <TableRow key={r.periode}>
                    <TableCell>{r.periode}</TableCell>
                    <TableCell className="text-right">{r.repas}</TableCell>
                    <TableCell className="text-right">{r.nuitee_paris}</TableCell>
                    <TableCell className="text-right">{r.nuitee_prov}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        {/* Cumul IK */}
        <section className="max-w-3xl mx-auto px-4 py-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
            Cumul avec les indemnités kilométriques 2026
          </h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Les <Link to="/bareme-ik-2026" className="text-primary underline">indemnités kilométriques</Link> couvrent
              l'usage du véhicule personnel pour se rendre sur le lieu de mission. Les indemnités
              de grand déplacement couvrent, elles, les frais engagés{" "}
              <strong className="text-foreground">sur place</strong> (repas + nuitée).
            </p>
            <p>
              Concrètement : un commercial qui part 3 jours à 400 km de chez lui peut cumuler{" "}
              <strong className="text-foreground">800 km × barème IK</strong> (aller-retour) + 3 nuitées + 6 repas au
              forfait grand déplacement. Les deux régimes sont indépendants et cumulables tant que
              chaque dépense correspond à une réalité professionnelle distincte.
            </p>
            <div className="rounded-xl border border-border bg-card p-5 flex gap-4 items-start">
              <Euro className="w-6 h-6 text-primary shrink-0 mt-1" />
              <p className="text-sm">
                <strong className="text-foreground">Astuce IKtracker :</strong> consignez chaque déplacement
                dans votre journal (date, motif, kilomètres, découchers). Le PDF mensuel envoyé le 15
                sert de pièce probante à votre employeur ou expert-comptable, en complément des notes
                de frais de repas et de nuitée.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-4 py-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
            Questions fréquentes
          </h2>
          <div className="space-y-4">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="group rounded-xl border border-border bg-card p-5 open:shadow-xs transition-shadow"
              >
                <summary className="cursor-pointer font-semibold text-foreground list-none flex justify-between items-center">
                  {f.q}
                  <span className="ml-4 text-primary transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-muted-foreground leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-md mx-auto px-4 pb-24 pt-8 text-center">
          <p className="text-muted-foreground mb-4">
            Un journal unique pour vos kilomètres, découchers et repas professionnels — gratuit à vie.
          </p>
          <Link to="/signup">
            <Button size="lg" className="gap-2 px-8">
              Créer mon compte gratuit <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </section>
      </main>

      <Suspense fallback={<FooterPlaceholder />}>
        <EnhancedMarketingFooter />
      </Suspense>
    </>
  );
}
