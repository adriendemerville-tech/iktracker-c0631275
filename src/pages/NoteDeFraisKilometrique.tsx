import { Helmet } from '@/lib/helmet-compat';
import { buildSoftwareApplicationSchema } from "@/lib/seo-schemas";
import { Link } from "@/lib/router-compat";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { EnhancedMarketingFooter } from "@/components/marketing/EnhancedMarketingFooter";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText, ListChecks, ShieldCheck, FileDown } from "lucide-react";

const faqs = [
  {
    q: "Comment faire une note de frais kilométrique ?",
    a: "Une note de frais kilométrique doit mentionner : la date du déplacement, le motif professionnel, l'adresse de départ et d'arrivée, la distance parcourue en kilomètres, la puissance fiscale du véhicule (case P.6 de la carte grise) et le montant calculé selon le barème URSSAF en vigueur. IKtracker génère automatiquement chacun de ces champs et exporte le tout en PDF ou Excel.",
  },
  {
    q: "Quel modèle de note de frais kilométrique utiliser ?",
    a: "Un modèle conforme reprend les colonnes : date, trajet, motif, kilomètres, taux barème, total HT. Vous pouvez utiliser un modèle Excel libre ou générer la note depuis IKtracker — l'export reprend exactement la structure attendue par les employeurs et les experts-comptables.",
  },
  {
    q: "Comment justifier une note de frais kilométrique auprès de l'URSSAF ?",
    a: "L'URSSAF exige la tenue d'un carnet de bord : chaque trajet doit être daté, motivé et géolocalisable. Le Mode Tournée GPS d'IKtracker enregistre automatiquement chaque arrêt et conserve un historique opposable pendant 3 ans, durée légale d'archivage des justificatifs fiscaux.",
  },
  {
    q: "Peut-on remplir une note de frais kilométrique pour un véhicule électrique ?",
    a: "Oui. Le barème kilométrique est majoré de 20 % pour les véhicules 100 % électriques (les hybrides ne sont pas concernés). IKtracker applique cette majoration automatiquement dès que vous renseignez l'énergie du véhicule.",
  },
  {
    q: "Quelle différence entre note de frais kilométrique et indemnité kilométrique ?",
    a: "La note de frais kilométrique est le document remis à l'employeur ou au comptable pour demander le remboursement. L'indemnité kilométrique (IK) est le montant calculé sur ce document, selon le barème fiscal. Les deux notions se confondent en pratique mais désignent l'une le document, l'autre le calcul.",
  },
];

export default function NoteDeFraisKilometrique() {
  return (
    <>
      <Helmet>
        <title>Note de frais kilométrique 2025-2026 | Modèle & calcul gratuit</title>
        <meta
          name="description"
          content="Comment faire une note de frais kilométrique conforme URSSAF en 2025-2026 : modèle, calcul automatique selon barème officiel, export PDF & Excel. Gratuit pour salariés, libéraux et auto-entrepreneurs."
        />
        <meta
          name="keywords"
          content="note de frais kilométrique, modèle note de frais kilométrique, comment faire une note de frais kilométrique, calcul note de frais, justifier frais kilométrique impôt, remboursement kilométrique"
        />
        <link rel="canonical" href="https://iktracker.fr/note-de-frais-kilometrique" />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
        <meta property="og:title" content="Note de frais kilométrique 2025-2026 | Modèle gratuit" />
        <meta property="og:description" content="Modèle de note de frais kilométrique conforme URSSAF + calcul automatique selon barème 2025-2026. Export PDF & Excel gratuit." />
        <meta property="og:url" content="https://iktracker.fr/note-de-frais-kilometrique" />
        <meta property="og:type" content="article" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:site_name" content="IKtracker" />

        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: "Comment faire une note de frais kilométrique",
            description:
              "Méthode complète et conforme URSSAF pour rédiger une note de frais kilométrique en 2025-2026.",
            totalTime: "PT3M",
            tool: [{ "@type": "HowToTool", name: "IKtracker — calculateur gratuit" }],
            step: [
              { "@type": "HowToStep", position: 1, name: "Lister chaque trajet", text: "Notez la date, l'adresse de départ et d'arrivée, ainsi que le motif professionnel." },
              { "@type": "HowToStep", position: 2, name: "Mesurer la distance", text: "Utilisez Google Maps ou la géolocalisation IKtracker pour obtenir une distance opposable." },
              { "@type": "HowToStep", position: 3, name: "Appliquer le barème", text: "Multipliez la distance par le tarif du barème kilométrique 2025-2026 correspondant à la puissance fiscale du véhicule." },
              { "@type": "HowToStep", position: 4, name: "Exporter et archiver", text: "Générez un PDF ou un Excel à remettre à l'employeur ou à l'expert-comptable, et conservez-le 3 ans." },
            ],
          })}
        </script>

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
          {JSON.stringify(buildSoftwareApplicationSchema({ pageUrl: "https://iktracker.fr/note-de-frais-kilometrique", pageDescription: "Note de frais kilométrique 2025-2026 : modèle conforme URSSAF, calcul automatique selon barème officiel, export PDF/Excel. Gratuit, conçu par un entrepreneur indépendant pour les salariés, libéraux et auto-entrepreneurs." }))}
        </script>
      </Helmet>

      <MarketingNav />

      <main id="main-content" tabIndex={-1} className="min-h-screen bg-background pt-20 outline-hidden">
        <div className="container mx-auto px-4 pt-6">
          <Breadcrumb items={[{ label: "Note de frais kilométrique" }]} />
        </div>

        {/* Hero */}
        <section className="max-w-3xl mx-auto px-4 pt-12 pb-10 text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight tracking-tight">
            Note de frais kilométrique
            <br />
            <span className="text-primary">2025 - 2026</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed min-h-[7rem] sm:min-h-[5.5rem] md:min-h-[5rem]">
            Le modèle conforme URSSAF, le calcul automatique selon le barème officiel,
            et l'export PDF ou Excel prêt à transmettre à votre employeur ou expert-comptable.
            <strong className="text-foreground"> Gratuit, sans abonnement.</strong>
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/signup">
              <Button size="lg" className="gap-2">
                Générer ma note de frais <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/bareme-ik-2026">
              <Button size="lg" variant="outline">
                Voir le barème 2025-2026
              </Button>
            </Link>
          </div>
        </section>

        {/* What goes on the note */}
        <section className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
            Ce qu'une note de frais kilométrique doit contenir
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: FileText, t: "Date et motif", d: "Chaque ligne identifie clairement le déplacement et son objet professionnel." },
              { icon: ListChecks, t: "Trajet et kilomètres", d: "Adresse de départ, d'arrivée et distance opposable (Maps ou GPS)." },
              { icon: ShieldCheck, t: "Véhicule et puissance fiscale", d: "Case P.6 de la carte grise. +20 % automatique pour les véhicules 100 % électriques." },
              { icon: FileDown, t: "Montant calculé", d: "Application du barème URSSAF 2025-2026 selon la tranche kilométrique annuelle." },
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

        {/* FAQ — visible + JSON-LD */}
        <section className="max-w-3xl mx-auto px-4 py-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
            Questions fréquentes
          </h2>
          <div className="space-y-4">
            {faqs.map((f) => (
              <details key={f.q} className="group rounded-xl border border-border bg-card p-5 open:shadow-xs transition-shadow">
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
            Plus besoin de saisir manuellement ligne par ligne.
          </p>
          <Link to="/signup">
            <Button size="lg" className="gap-2 px-8">
              Créer ma note gratuitement <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </section>
      </main>

      <EnhancedMarketingFooter />
    </>
  );
}
