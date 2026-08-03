import { Helmet } from '@/lib/helmet-compat';
import { buildSoftwareApplicationSchema } from "@/lib/seo-schemas";
import { Link } from "@/lib/router-compat";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { EnhancedMarketingFooter } from "@/components/marketing/EnhancedMarketingFooter";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bike, Leaf, Euro, ShieldCheck } from "lucide-react";

const faqs = [
  {
    q: "Qu'est-ce que l'indemnité kilométrique vélo (IK vélo) ?",
    a: "L'indemnité kilométrique vélo est une somme versée par l'employeur au salarié qui se rend à son travail à vélo (musculaire ou à assistance électrique). Depuis 2020, elle est intégrée au Forfait Mobilités Durables (FMD), un dispositif unique qui regroupe vélo, covoiturage, trottinette, autopartage et transports publics.",
  },
  {
    q: "Quel est le montant de l'indemnité kilométrique vélo en 2025-2026 ?",
    a: "Il n'existe plus de barème officiel par kilomètre. Le Forfait Mobilités Durables permet à l'employeur de verser jusqu'à 700 € par an et par salarié en exonération de cotisations et d'impôt sur le revenu (800 € si cumulé avec un abonnement transport public). Certaines conventions collectives maintiennent un barème interne, souvent autour de 0,25 €/km.",
  },
  {
    q: "L'indemnité kilométrique vélo est-elle obligatoire pour l'employeur ?",
    a: "Non. Le Forfait Mobilités Durables reste facultatif dans le secteur privé (sauf accord d'entreprise ou de branche le rendant obligatoire). Dans la fonction publique d'État, il est en revanche obligatoire depuis 2020 et plafonné à 300 € par an.",
  },
  {
    q: "Comment justifier ses trajets domicile-travail à vélo ?",
    a: "L'employeur peut demander une déclaration sur l'honneur ou un justificatif annuel. Tenir un journal de bord daté (date, trajet, distance) est la méthode la plus simple pour sécuriser le versement. IKtracker permet de consigner ces trajets et d'exporter un PDF récapitulatif à transmettre au service paie.",
  },
  {
    q: "Peut-on cumuler IK vélo et indemnités kilométriques voiture ?",
    a: "Oui, sous conditions. Le Forfait Mobilités Durables vélo concerne le trajet domicile-travail. Les indemnités kilométriques voiture concernent les déplacements professionnels effectués pour le compte de l'employeur. Les deux dispositifs ont des bases légales distinctes et peuvent se cumuler dans les plafonds respectifs.",
  },
  {
    q: "L'IK vélo est-elle imposable ?",
    a: "Non, dans la limite de 700 € par an et par salarié (800 € en cumul avec un abonnement transport). Au-delà, le surplus est soumis à cotisations sociales et à l'impôt sur le revenu, comme un complément de salaire.",
  },
];

export default function IndemniteKilometriqueVelo() {
  return (
    <>
      <Helmet>

        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: "Indemnité kilométrique vélo 2025-2026 : guide complet",
            description:
              "Tout savoir sur l'indemnité kilométrique vélo et le Forfait Mobilités Durables en France : montant, conditions, exonération et justificatifs.",
            author: { "@type": "Person", name: "Adrien de Volontat", url: "https://iktracker.fr/blog/auteur/adrien-de-volontat" },
            publisher: { "@type": "Organization", name: "IKtracker", url: "https://iktracker.fr" },
            datePublished: "2026-06-29",
            dateModified: "2026-06-29",
            mainEntityOfPage: "https://iktracker.fr/indemnite-kilometrique-velo",
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
          {JSON.stringify(buildSoftwareApplicationSchema({ pageUrl: "https://iktracker.fr/indemnite-kilometrique-velo", pageDescription: "Indemnité kilométrique vélo 2025-2026 et Forfait Mobilités Durables : guide pratique, plafond 700 €, conditions, justificatifs. IKtracker consigne vos trajets vélo et voiture dans un journal opposable, gratuit à vie." }))}
        </script>
      </Helmet>

      <MarketingNav />

      <main id="main-content" tabIndex={-1} className="min-h-screen bg-background pt-20 outline-hidden">
        <div className="container mx-auto px-4 pt-6">
          <Breadcrumb items={[{ label: "Indemnité kilométrique vélo" }]} />
        </div>

        {/* Hero */}
        <section className="max-w-3xl mx-auto px-4 pt-12 pb-10 text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight tracking-tight">
            Indemnité kilométrique vélo
            <br />
            <span className="text-primary">2025 - 2026</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed min-h-[7rem] sm:min-h-[5.5rem] md:min-h-[5rem]">
            Le guide pratique de l'<strong className="text-foreground">IK vélo</strong> et du
            <strong className="text-foreground"> Forfait Mobilités Durables</strong> : jusqu'à
            <strong className="text-foreground"> 700 €/an exonérés</strong> de cotisations et d'impôt
            pour vos trajets domicile-travail à vélo.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/signup">
              <Button size="lg" className="gap-2">
                Consigner mes trajets vélo <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/bareme-ik-2026">
              <Button size="lg" variant="outline">
                Voir aussi le barème IK voiture
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
              { icon: Euro, t: "700 € / an exonérés", d: "Plafond du Forfait Mobilités Durables, porté à 800 € si cumulé avec un abonnement transport public." },
              { icon: Bike, t: "Vélo musculaire et électrique", d: "Le dispositif couvre le vélo classique, le VAE et même la trottinette ou le covoiturage." },
              { icon: ShieldCheck, t: "Exonéré URSSAF & impôt", d: "Aucune cotisation sociale ni impôt sur le revenu dans la limite du plafond annuel." },
              { icon: Leaf, t: "Mobilité durable", d: "Dispositif unique remplaçant l'ancienne IK vélo depuis la Loi d'Orientation des Mobilités (LOM)." },
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

        {/* Comment ça marche */}
        <section className="max-w-3xl mx-auto px-4 py-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 text-center">
            IK vélo vs Forfait Mobilités Durables : quelle différence ?
          </h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Jusqu'en 2019, l'<strong className="text-foreground">indemnité kilométrique vélo</strong> était un dispositif autonome, fixé à 0,25 €/km parcouru à vélo entre le domicile et le lieu de travail. La <strong className="text-foreground">Loi d'Orientation des Mobilités</strong> (LOM) de décembre 2019 l'a fusionnée avec d'autres dispositifs au sein du <strong className="text-foreground">Forfait Mobilités Durables</strong> (FMD).
            </p>
            <p>
              Depuis, l'employeur verse un <strong className="text-foreground">forfait annuel</strong> plutôt qu'une indemnité au kilomètre. Le montant est libre, dans la limite de <strong className="text-foreground">700 € par an et par salarié</strong> en exonération de cotisations URSSAF et d'impôt sur le revenu (800 € en cumul avec un abonnement transport).
            </p>
            <p>
              Certaines entreprises conservent cependant un calcul au kilomètre dans leur accord interne — c'est dans ce cas qu'un journal kilométrique à vélo, comme celui géré par <Link to="/app/mestrajets" className="text-primary underline">IKtracker</Link>, devient essentiel pour justifier le versement.
            </p>
          </div>
        </section>

        {/* FAQ */}
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
            Consignez vos trajets vélo et voiture dans un journal unique, opposable et gratuit à vie.
          </p>
          <Link to="/signup">
            <Button size="lg" className="gap-2 px-8">
              Créer mon compte gratuit <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </section>
      </main>

      <EnhancedMarketingFooter />
    </>
  );
}
