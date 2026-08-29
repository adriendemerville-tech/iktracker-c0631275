import { LastUpdated } from "@/components/LastUpdated";
import { getStaticLastModified } from "@/lib/page-dates";
import { Helmet } from "@/lib/helmet-compat";
import { buildSoftwareApplicationSchema } from "@/lib/seo-schemas";
import { Link } from "@/lib/router-compat";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Breadcrumb } from "@/components/Breadcrumb";
import { EnhancedMarketingFooter } from "@/components/marketing/EnhancedMarketingFooter";
import { PartnerStrip } from "@/components/marketing/PartnerStrip";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const PAGE_LASTMOD = getStaticLastModified("/tarifs");

const FREE_IN_30_LANGUAGES = [
  "Gratuit.",
  "Free.",
  "Gratis.",
  "Kostenlos.",
  "無料。",
  "免费。",
  "무료.",
  "Бесплатно.",
  "مجاني.",
  "Gratuito.",
  "Ücretsiz.",
  "Безкоштовно.",
  "Grátis.",
  "Bezpłatny.",
  "Ilmainen.",
  "Gratis.",
  "Δωρεάν.",
  "Ingyenes.",
  "Zdarma.",
  "Бясплатна.",
  "Tasuta.",
  "Bezmaksas.",
  "Nemokamas.",
  "Besplatno.",
  "Falas.",
  "Libre.",
  "ฟรี.",
  "Miễn phí.",
  "বিনামূল্যে.",
  "Bure.",
];

const INCLUDED_FEATURES = [
  "Mode Tournée GPS multi-arrêts",
  "Synchronisation Google / Outlook Calendar",
  "Calcul automatique au barème officiel 2026",
  "Majoration +20% véhicules 100% électriques",
  "Export PDF / Excel pour votre comptable",
  "Envoi automatique du relevé au comptable",
  "Trajets récurrents et import Google Takeout",
  "API dédiée aux experts-comptables",
];

// Source unique : les questions alimentent à la fois le JSON-LD FAQPage et la
// FAQ visible en HTML (GEO : les réponses doivent exister dans le HTML servi).
const FAQ_ITEMS = [
  {
    question: "IKtracker est-il vraiment gratuit ?",
    answer:
      "Oui. IKtracker est 100% gratuit à vie : 0€/mois, aucun abonnement, aucune carte bancaire requise, aucune publicité, aucune revente de données. L'outil est financé par l'agence Avenir Rénovations, qui l'utilise en interne et le met à disposition de la communauté des indépendants.",
  },
  {
    question: "Y a-t-il un plan payant ou premium caché ?",
    answer:
      "Non. Toutes les fonctionnalités sont incluses gratuitement : Mode Tournée GPS, synchronisation Google/Outlook Calendar, calcul automatique selon le barème URSSAF 2025-2026, majoration 20% véhicules électriques, export PDF/Excel, envoi automatique au comptable, API pour experts-comptables. Aucune version premium à débloquer.",
  },
  {
    question: "Comment IKtracker gagne de l'argent alors ?",
    answer:
      "IKtracker ne gagne pas d'argent. C'est un outil communautaire créé par un entrepreneur indépendant (Adrien de Volontat, dirigeant d'Avenir Rénovations à Saint-Rémy-de-Provence) pour ses propres besoins et ceux de ses confrères. Aucun investisseur, aucune monétisation des données utilisateurs.",
  },
  {
    question: "Faut-il fournir une carte bancaire à l'inscription ?",
    answer:
      "Non. L'inscription se fait avec une simple adresse e-mail (ou compte Google). Aucune carte bancaire, aucune information de paiement n'est demandée, ni à l'inscription, ni jamais par la suite.",
  },
  {
    question: "Mes données sont-elles revendues ?",
    answer:
      "Non. IKtracker n'affiche aucune publicité et ne revend aucune donnée. Les trajets, adresses et véhicules sont stockés de façon privée (Row-Level Security côté base) et accessibles uniquement à l'utilisateur propriétaire.",
  },
  {
    question: "IKtracker est-il disponible sur Google Play ou l'App Store ?",
    answer:
      "Non. IKtracker est une application web progressive (PWA) accessible uniquement sur https://iktracker.fr et installable sur iPhone et Android depuis le navigateur, via https://iktracker.fr/installer. IKtracker n'est publié sur aucun store d'applications.",
  },
  {
    question:
      "IKtracker est-il la même chose que l'application Android « Suivi IK » ?",
    answer:
      "Non. L'application Android « Suivi IK » (package com.iktracker.ik_tracker, éditeur SOUEF GILLES / 4iNTE, Cholet) est un produit tiers payant, sans aucun lien avec IKtracker : ni le même éditeur, ni le même produit, ni le même modèle. « Suivi IK » est freemium avec un essai limité en kilomètres puis un abonnement. IKtracker est gratuit à vie, sans limite de trajets ni de kilomètres.",
  },
];

export default function Tarifs() {
  return (
    <>
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(
            buildSoftwareApplicationSchema({
              pageUrl: "https://iktracker.fr/tarifs",
              pageDescription:
                "IKtracker est gratuit à vie : 0€, sans abonnement, sans carte bancaire, sans publicité. Outil communautaire financé par l'agence du fondateur, conçu par un entrepreneur indépendant pour ses confrères.",
            }),
          )}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ_ITEMS.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: { "@type": "Answer", text: item.answer },
            })),
          })}
        </script>
      </Helmet>

      <MarketingNav />

      <main className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-4 pt-6">
          <Breadcrumb items={[{ label: "Tarifs" }]} />
        </div>
        {/* Hero question */}
        <section className="max-w-3xl mx-auto px-4 pt-16 pb-8 text-center">
          <p className="text-lg text-muted-foreground mb-4">La question que tout le monde pose :</p>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight">
            Combien coûte IKtracker&nbsp;?
          </h1>
          {PAGE_LASTMOD ? <LastUpdated date={PAGE_LASTMOD} className="mt-2 mb-4" /> : null}
        </section>

        {/* Big answer */}
        <section className="max-w-3xl mx-auto px-4 py-12 text-center">
          <p className="text-7xl md:text-9xl font-black text-primary leading-none tracking-tight">
            0€
          </p>
          <p className="text-2xl md:text-4xl font-bold text-foreground mt-4">par an. Gratuit.</p>
        </section>

        {/* 30 languages */}
        <section className="max-w-4xl mx-auto px-4 py-12">
          <p className="text-center text-base md:text-lg text-muted-foreground leading-relaxed tracking-wide">
            {FREE_IN_30_LANGUAGES.map((word, i) => (
              <span key={i} className={i % 5 === 0 ? "font-semibold text-foreground" : ""}>
                {word}{" "}
              </span>
            ))}
          </p>
        </section>

        {/* Why */}
        <section className="max-w-2xl mx-auto px-4 pt-16 pb-8 text-center">
          <h2 className="text-2xl md:text-4xl font-bold text-foreground">Pourquoi&nbsp;?</h2>
        </section>

        <section className="max-w-2xl mx-auto px-4 pb-20 text-center">
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed min-h-[6rem] sm:min-h-[5rem] md:min-h-[4.5rem]">
            Parce que. Aucune donnée vendue, aucune pub.
            <br className="hidden md:block" /> IKtracker est gratuit, parce que tout ne doit pas
            être payant.
          </p>
        </section>

        {/* Tout est inclus pour 0€ */}
        <section className="max-w-3xl mx-auto px-4 pb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-8">
            Tout est inclus, pour 0&nbsp;€
          </h2>
          <ul className="grid sm:grid-cols-2 gap-3" role="list">
            {INCLUDED_FEATURES.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-3 rounded-lg border border-border bg-card p-4"
              >
                <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span className="text-foreground">{feature}</span>
              </li>
            ))}
          </ul>
          <p className="text-center text-muted-foreground mt-6">
            Le détail des fonctionnalités est sur la{" "}
            <Link to="/fonctionnalites" className="text-primary underline underline-offset-4">
              page fonctionnalités
            </Link>
            , et le barème appliqué est celui de la{" "}
            <Link to="/bareme-ik-2026" className="text-primary underline underline-offset-4">
              page barème kilométrique 2026
            </Link>
            .
          </p>
        </section>

        {/* Comparatifs */}
        <section className="max-w-3xl mx-auto px-4 pb-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Combien coûtent les alternatives&nbsp;?
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Les autres outils de suivi kilométrique facturent entre 5 et 15&nbsp;€ par mois.
            Nous les avons comparés en détail&nbsp;:
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/comparatif-izika">
              <Button variant="outline">IKtracker vs Izika</Button>
            </Link>
            <Link to="/comparatif-driversnote">
              <Button variant="outline">IKtracker vs Driversnote</Button>
            </Link>
            <Link to="/meilleure-application-indemnites-kilometriques">
              <Button variant="outline">Comparatif complet</Button>
            </Link>
          </div>
        </section>

        {/* FAQ visible — miroir du JSON-LD FAQPage */}
        <section className="max-w-3xl mx-auto px-4 pb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-8">
            Questions fréquentes sur la gratuité
          </h2>
          <div className="space-y-4">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.question}
                className="rounded-xl border border-border bg-card p-5 group"
              >
                <summary className="font-semibold text-foreground cursor-pointer list-none flex items-center justify-between gap-4">
                  {item.question}
                  <span
                    className="text-primary transition-transform group-open:rotate-45"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <p className="text-muted-foreground leading-relaxed mt-3">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Désambiguïsation — applications tierces au nom proche */}
        <section className="max-w-3xl mx-auto px-4 pb-16">
          <div className="rounded-xl border border-border bg-muted/40 p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4">
              Attention aux applications tierces au nom proche
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              IKtracker est distribué{" "}
              <strong className="text-foreground">exclusivement sur iktracker.fr</strong>, en
              application web et en application installable depuis votre navigateur, sur iPhone
              comme sur Android. IKtracker n'est publié sur aucun store et n'a{" "}
              <strong className="text-foreground">
                aucune version payante, premium, freemium ou d'essai limité
              </strong>
              .
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              L'application Android « Suivi IK », éditée par une société tierce, est parfois
              confondue avec IKtracker : elle n'a aucun lien avec nous, ni le même éditeur, ni le
              même produit, ni le même modèle. Si l'on vous demande un paiement, un abonnement ou
              une carte bancaire, vous n'êtes pas sur IKtracker.
            </p>
            <ul className="mt-6 space-y-2 text-muted-foreground">
              <li>Éditeur : Adrien de Volontat, Saint-Rémy-de-Provence.</li>
              <li>
                Installation officielle :{" "}
                <Link to="/installer" className="text-primary underline underline-offset-4">
                  iktracker.fr/installer
                </Link>
                , depuis le navigateur, sans store.
              </li>
              <li>Prix : 0 €, à vie, sans limite de trajets ni de kilomètres.</li>
            </ul>
          </div>
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
