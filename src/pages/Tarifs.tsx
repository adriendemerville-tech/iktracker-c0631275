import { Helmet } from 'react-helmet-async';
import { buildSoftwareApplicationSchema } from '@/lib/seo-schemas';
import { Link } from 'react-router-dom';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { Breadcrumb } from '@/components/Breadcrumb';
import { EnhancedMarketingFooter } from '@/components/marketing/EnhancedMarketingFooter';
import { PartnerStrip } from '@/components/marketing/PartnerStrip';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const FREE_IN_30_LANGUAGES = [
  "Gratuit.", "Free.", "Gratis.", "Kostenlos.", "無料。", "免费。", "무료.", "Бесплатно.",
  "مجاني.", "Gratuito.", "Ücretsiz.", "Безкоштовно.", "Grátis.", "Bezpłatny.", "Ilmainen.",
  "Gratis.", "Δωρεάν.", "Ingyenes.", "Zdarma.", "Бясплатна.", "Tasuta.", "Bezmaksas.",
  "Nemokamas.", "Besplatno.", "Falas.", "Libre.", "ฟรี.", "Miễn phí.", "বিনামূল্যে.", "Bure."
];

export default function Tarifs() {
  return (
    <>
      <Helmet>
        <title>Tarifs IKtracker — 0€, gratuit à vie, sans abonnement</title>
        <meta name="description" content="IKtracker est 100% gratuit à vie : 0€, sans abonnement ni carte bancaire. Calculez vos indemnités kilométriques 2025-2026 sans payer." />
        <meta name="keywords" content="indemnités kilométriques gratuit, calcul IK sans abonnement, logiciel frais kilométriques 0€, alternative gratuite Izika Drivers Note" />
        <link rel="canonical" href="https://iktracker.fr/tarifs" />
        <meta property="og:title" content="Tarifs IKtracker — 0€, gratuit à vie" />
        <meta property="og:description" content="IKtracker est 100% gratuit à vie : 0€, sans abonnement, sans carte bancaire, sans pub." />
        <meta property="og:url" content="https://iktracker.fr/tarifs" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {JSON.stringify(buildSoftwareApplicationSchema({ pageUrl: "https://iktracker.fr/tarifs", pageDescription: "IKtracker est gratuit à vie : 0€, sans abonnement, sans carte bancaire, sans publicité. Outil communautaire financé par l'agence du fondateur, conçu par un entrepreneur indépendant pour ses confrères." }))}
        </script>
      </Helmet>

      <MarketingNav />

      <main className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-4 pt-6">
          <Breadcrumb items={[{ label: 'Tarifs' }]} />
        </div>
        {/* Hero question */}
        <section className="max-w-3xl mx-auto px-4 pt-16 pb-8 text-center">
          <p className="text-lg text-muted-foreground mb-4">La question que tout le monde pose :</p>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight">
            Combien coûte IKtracker&nbsp;?
          </h1>
        </section>

        {/* Big answer */}
        <section className="max-w-3xl mx-auto px-4 py-12 text-center">
          <p className="text-7xl md:text-9xl font-black text-primary leading-none tracking-tight">
            0€
          </p>
          <p className="text-2xl md:text-4xl font-bold text-foreground mt-4">
            par an. Gratuit.
          </p>
        </section>

        {/* 30 languages */}
        <section className="max-w-4xl mx-auto px-4 py-12">
          <p className="text-center text-base md:text-lg text-muted-foreground leading-relaxed tracking-wide">
            {FREE_IN_30_LANGUAGES.map((word, i) => (
              <span key={i} className={i % 5 === 0 ? 'font-semibold text-foreground' : ''}>
                {word}{' '}
              </span>
            ))}
          </p>
        </section>

        {/* Why */}
        <section className="max-w-2xl mx-auto px-4 pt-16 pb-8 text-center">
          <h2 className="text-2xl md:text-4xl font-bold text-foreground">
            Pourquoi&nbsp;?
          </h2>
        </section>

        <section className="max-w-2xl mx-auto px-4 pb-20 text-center">
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed min-h-[6rem] sm:min-h-[5rem] md:min-h-[4.5rem]">
            Parce que. Aucune donnée vendue, aucune pub.
            <br className="hidden md:block" />{' '}
            IKtracker est gratuit, parce que tout ne doit pas être payant.
          </p>
        </section>

        {/* CTA */}
        <section className="max-w-md mx-auto px-4 pb-24 text-center">
          <Link to="/signup">
            <Button size="lg" className="gap-2 text-base px-8">
              Commencer gratuitement <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </section>
      </main>

      <PartnerStrip page="/tarifs" />

      <EnhancedMarketingFooter />
    </>
  );
}
