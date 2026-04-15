import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { EnhancedMarketingFooter } from '@/components/marketing/EnhancedMarketingFooter';
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
        <title>Tarifs IKtracker — 0€, gratuit à vie</title>
        <meta name="description" content="IKtracker est 100% gratuit. Aucune donnée vendue, aucune pub. Calculez vos indemnités kilométriques sans jamais payer." />
        <link rel="canonical" href="https://iktracker.lovable.app/tarifs" />
      </Helmet>

      <MarketingNav />

      <main className="min-h-screen bg-background pt-20">
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
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
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

      <EnhancedMarketingFooter />
    </>
  );
}
