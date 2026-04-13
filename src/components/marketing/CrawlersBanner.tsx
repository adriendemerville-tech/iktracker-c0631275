import { memo, useCallback } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { isBrowser, isBot } from '@/lib/ssr-utils';
import crawlersLogo from '@/assets/crawlers-logo.png';

function CrawlersBannerComponent() {
  const trackClick = useCallback(() => {
    if (!isBrowser() || isBot()) return;
    supabase.from('marketing_analytics').insert({
      event_type: 'crawlers_click',
      page: 'landing',
      device_type: window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop',
      session_id: sessionStorage.getItem('marketing_session_id') || undefined,
      referrer: document?.referrer || null,
      user_agent: navigator?.userAgent || 'unknown',
    }).then(() => {});
  }, []);

  return (
    <section className="py-12 md:py-16 px-4 section-contained">
      <div className="container mx-auto max-w-4xl">
        <a
          href="https://crawlers.fr"
          target="_blank"
          rel="noopener"
          className="group block"
          onClick={trackClick}
        >
          <div className="relative overflow-hidden rounded-2xl md:rounded-3xl border border-white/10 shadow-[0_8px_40px_-12px_hsl(var(--primary)/0.25)]">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#6C3AED] via-[#7C5CFC] to-[#A78BFA]" />
            {/* Subtle mesh overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15)_0%,transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(251,191,36,0.12)_0%,transparent_50%)]" />

            {/* Content */}
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-10 px-6 py-8 md:px-10 md:py-10">
              {/* Logo */}
              <div className="flex-shrink-0">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden shadow-lg ring-2 ring-white/20 transition-transform duration-300 group-hover:scale-105">
                  <img
                    src={crawlersLogo}
                    alt="Crawlers – SEO & IA"
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>

              {/* Text */}
              <div className="flex-1 text-center md:text-left space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-sm text-white/90 text-xs font-medium tracking-wide uppercase">
                  <Sparkles className="h-3 w-3" />
                  Par le même fondateur
                </div>
                <h3 className="text-xl md:text-2xl lg:text-3xl font-extrabold text-white leading-tight font-display tracking-tight">
                  Crawlers — SEO piloté par l'IA
                </h3>
                <p className="text-sm md:text-base text-white/80 max-w-xl leading-relaxed">
                  Automatisez votre référencement avec l'intelligence artificielle. Audits, contenus et optimisations techniques, le tout en autopilot.
                </p>
              </div>

              {/* CTA */}
              <div className="flex-shrink-0">
                <Button
                  asChild
                  size="lg"
                  className="bg-white text-[#6C3AED] hover:bg-white/90 font-bold text-base px-7 py-6 rounded-xl shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:scale-[1.03] gap-2"
                >
                  <span>
                    Découvrir
                    <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </a>
      </div>
    </section>
  );
}

export const CrawlersBanner = memo(CrawlersBannerComponent);
