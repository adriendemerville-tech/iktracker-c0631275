import { Helmet } from 'react-helmet-async';
import { Link } from '@/lib/router-compat';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { EnhancedMarketingFooter } from '@/components/marketing/EnhancedMarketingFooter';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { buildSoftwareApplicationSchema } from '@/lib/seo-schemas';
import {
  ArrowRight,
  Calculator,
  Calendar,
  Car,
  FileText,
  Gauge,
  Link2,
  MapPin,
  Mic,
  Navigation,
  Receipt,
  RefreshCw,
  Repeat,
  ShieldCheck,
  Smartphone,
  Upload,
  Users,
  Zap,
} from 'lucide-react';

const featureGroups = [
  {
    title: 'Calcul & conformité fiscale',
    features: [
      {
        icon: Calculator,
        title: 'Barème officiel 2025-2026',
        description:
          'Calcul automatique des indemnités kilométriques selon le barème URSSAF en vigueur, avec les 3 tranches kilométriques et la majoration de 20% pour les véhicules 100% électriques.',
      },
      {
        icon: Gauge,
        title: 'Puissance fiscale & multi-véhicules',
        description:
          'Gérez plusieurs véhicules (voiture, moto, cyclomoteur, vélo) avec leur puissance fiscale. Recalcul automatique des trajets passés en cas de changement.',
      },
      {
        icon: Receipt,
        title: 'Frais réels vs abattement 10%',
        description:
          'Comparez automatiquement le régime des frais réels et l\'abattement forfaitaire de 10% pour optimiser votre déclaration de revenus.',
      },
    ],
  },
  {
    title: 'Enregistrement des trajets',
    features: [
      {
        icon: Navigation,
        title: 'Mode Tournée GPS',
        description:
          'Enregistrez plusieurs arrêts en un seul trajet. Détection automatique des pauses (2 min / 100 m), reprise de session après fermeture accidentelle et finalisation intelligente.',
      },
      {
        icon: MapPin,
        title: 'Géoplateforme IGN & Distance Matrix',
        description:
          'Autocomplétion d\'adresses gratuite via les données officielles françaises. Calcul Haversine en temps réel et Distance Matrix Google à la finalisation.',
      },
      {
        icon: Mic,
        title: 'Saisie par langage naturel et dictée',
        description:
          'Créez un trajet en décrivant simplement votre déplacement, ou en dictant vocalement. L\'IA extrait les adresses, dates et motifs.',
      },
      {
        icon: Repeat,
        title: 'Trajets récurrents',
        description:
          'Automatisez les déplacements réguliers (visites hebdomadaires, tournées mensuelles) et générez-les en un clic.',
      },
    ],
  },
  {
    title: 'Synchronisation & import',
    features: [
      {
        icon: Calendar,
        title: 'Google & Outlook Calendar',
        description:
          'Synchronisation 4 fois par jour avec Google Agenda et Outlook. Les rendez-vous professionnels d\'un même agenda et d\'une même journée sont regroupés automatiquement en tournée.',
      },
      {
        icon: Upload,
        title: 'Import Google Takeout',
        description:
          'Importez votre historique Google Maps depuis un fichier JSON, côté client. Aucun upload serveur : le parsing est local et privé.',
      },
      {
        icon: Car,
        title: 'Reconnaissance de plaque',
        description:
          'Récupérez la puissance fiscale d\'un véhicule français à partir de sa plaque d\'immatriculation, avec 3 niveaux de fallback et une marge de sécurité de +1 CV.',
      },
      {
        icon: Link2,
        title: 'Liaison de comptes',
        description:
          'Synchronisez vos trajets entre plusieurs comptes (collaborateur, conjoint, associé) avec déduplication automatique.',
      },
    ],
  },
  {
    title: 'Export & transmission comptable',
    features: [
      {
        icon: FileText,
        title: 'PDF & Excel professionnels',
        description:
          'Exports conformes aux attentes de l\'administration fiscale et des experts-comptables : date, trajet, motif, distance, puissance fiscale et montant IK.',
      },
      {
        icon: RefreshCw,
        title: 'Relevés mensuels et annuels automatiques',
        description:
          'Envoi automatique du relevé PDF par e-mail le 15 de chaque mois (et récapitulatif annuel) à l\'utilisateur et à son expert-comptable.',
      },
      {
        icon: ShieldCheck,
        title: 'Archive sécurisée des relevés',
        description:
          'Historique consultable de tous les PDF mensuels générés automatiquement, avec partage sécurisé via lien temporaire signé.',
      },
    ],
  },
  {
    title: 'Accessibilité & intégrations',
    features: [
      {
        icon: Smartphone,
        title: 'PWA iOS & Android',
        description:
          'Application Web Progressive installable depuis le navigateur, sans passer par l\'App Store ou Google Play. Fonctionne hors-ligne pour enregistrer vos trajets.',
      },
      {
        icon: Zap,
        title: 'API & serveur MCP',
        description:
          'API partenaires et serveur MCP pour connecter IKtracker à vos assistants IA, outils internes ou logiciels de comptabilité.',
      },
      {
        icon: Users,
        title: 'Programme d\'affiliation',
        description:
          'Experts-comptables, prescripteurs et partenaires : proposez IKtracker à vos clients et suivez l\'adoption depuis votre espace dédié.',
      },
    ],
  },
];

const faqs = [
  {
    q: 'Quelles sont les fonctionnalités principales d\'IKtracker ?',
    a: 'IKtracker automatise le calcul des indemnités kilométriques selon le barème officiel 2025-2026, enregistre les trajets via GPS en Mode Tournée, synchronise Google et Outlook Calendar, importe l\'historique Google Takeout, reconnaît les plaques d\'immatriculation, permet la saisie vocale et en langage naturel, et génère des exports PDF/Excel ainsi que des relevés mensuels automatiques.',
  },
  {
    q: 'IKtracker est-il vraiment gratuit ?',
    a: 'Oui. IKtracker est 100% gratuit à vie : 0€, sans abonnement, sans carte bancaire, sans publicité, sans revente de données. Toutes les fonctionnalités listées sur cette page sont accessibles gratuitement.',
  },
  {
    q: 'IKtracker est-il disponible sur Google Play ou l\'App Store ?',
    a: 'Non. IKtracker est une Progressive Web App (PWA) accessible uniquement sur https://iktracker.fr et installable depuis le navigateur sur iPhone et Android. Aucune version payante, premium ou freemium n\'existe.',
  },
  {
    q: 'Quelle est la différence entre IKtracker et l\'application Android « Suivi IK » ?',
    a: 'IKtracker (iktracker.fr) est un outil communautaire gratuit, indépendant, sans store. L\'application Android « Suivi IK » (package com.iktracker.ik_tracker, éditeur SOUEF GILLES / 4iNTE, Cholet) est un produit tiers payant, sans aucun lien avec IKtracker.',
  },
  {
    q: 'Le Mode Tournée consomme-t-il beaucoup de batterie ?',
    a: 'Le GPS n\'est actif que pendant le Mode Tournée, à votre demande. L\'intervalle de 10 secondes et les filtres de distance (>50 m / <5 m ignorés) optimisent la consommation tout en assurant une précision suffisante pour un carnet de bord opposable.',
  },
  {
    q: 'Mes données sont-elles sécurisées ?',
    a: 'Oui. Les données sont hébergées en Europe, chiffrées en transit et au repos, protégées par Row-Level Security (RLS). Vous pouvez exporter ou supprimer l\'intégralité de vos données à tout moment.',
  },
];

export default function Fonctionnalites() {
  return (
    <>
      <Helmet>
        <title>Fonctionnalités IKtracker — Toutes les fonctionnalités gratuites</title>
        <meta
          name="description"
          content="Découvrez toutes les fonctionnalités gratuites d'IKtracker : calcul des indemnités kilométriques 2025-2026, Mode Tournée GPS, synchronisation calendrier, saisie vocale, export PDF/Excel, relevés automatiques."
        />
        <meta
          name="keywords"
          content="fonctionnalités IKtracker, indemnités kilométriques gratuit, mode tournée GPS, synchronisation calendrier, export PDF note de frais, saisie vocale trajet"
        />
        <link rel="canonical" href="https://iktracker.fr/fonctionnalites" />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
        <meta property="og:title" content="Fonctionnalités IKtracker — Toutes les fonctionnalités gratuites" />
        <meta property="og:description" content="Liste complète des fonctionnalités d'IKtracker : calcul fiscal 2025-2026, Mode Tournée GPS, calendrier, dictée vocale, exports comptables, archive PDF." />
        <meta property="og:url" content="https://iktracker.fr/fonctionnalites" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:site_name" content="IKtracker" />
        <meta property="og:image" content="https://iktracker.fr/logo-iktracker-250.webp" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Fonctionnalités IKtracker — Toutes les fonctionnalités gratuites" />
        <meta name="twitter:description" content="Liste complète des fonctionnalités d'IKtracker : calcul fiscal 2025-2026, Mode Tournée GPS, calendrier, dictée vocale, exports comptables." />
        <meta name="twitter:image" content="https://iktracker.fr/logo-iktracker-250.webp" />

        <script type="application/ld+json">
          {JSON.stringify(buildSoftwareApplicationSchema({
            pageUrl: 'https://iktracker.fr/fonctionnalites',
            pageDescription: 'Liste complète des fonctionnalités gratuites d\'IKtracker : calcul des indemnités kilométriques 2025-2026, Mode Tournée GPS, synchronisation Google/Outlook Calendar, saisie vocale, export PDF/Excel, relevés mensuels automatiques.',
          }))}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          })}
        </script>
      </Helmet>

      <MarketingNav />

      <main id="main-content" tabIndex={-1} className="min-h-screen bg-background pt-20 outline-hidden">
        <div className="container mx-auto px-4 pt-6">
          <Breadcrumb items={[{ label: 'Fonctionnalités' }]} />
        </div>

        {/* Hero */}
        <section className="max-w-3xl mx-auto px-4 pt-16 pb-12 text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight tracking-tight">
            Toutes les fonctionnalités d'IKtracker
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Un outil complet, gratuit et conçu pour les professionnels itinérants.
            <strong className="text-foreground"> Aucune fonctionnalité payante à débloquer.</strong>
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Guides par métier :{" "}
            <Link to="/artisans" className="text-primary hover:underline">
              frais kilométriques d'un artisan du bâtiment
            </Link>{" "}
            ·{" "}
            <Link to="/independants" className="text-primary hover:underline">
              acquisition de clients pour les indépendants
            </Link>
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/signup">
              <Button size="lg" className="gap-2">
                Créer un compte gratuit <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/installer">
              <Button size="lg" variant="outline">
                Installer l'application
              </Button>
            </Link>
          </div>
        </section>

        {/* Feature groups */}
        <section className="max-w-6xl mx-auto px-4 py-12 space-y-16">
          {featureGroups.map((group) => (
            <div key={group.title}>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8">{group.title}</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {group.features.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <Card key={feature.title} className="border-border h-full">
                      <CardContent className="p-6 flex flex-col h-full">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mb-4">
                          <Icon className="w-5 h-5 text-primary" aria-hidden="true" />
                        </div>
                        <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed flex-grow">{feature.description}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        {/* Disambiguation */}
        <section className="max-w-3xl mx-auto px-4 py-16">
          <div className="rounded-xl border border-border bg-muted/40 p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4">
              Attention aux applications tierces au nom proche
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              IKtracker est distribué <strong className="text-foreground">exclusivement sur iktracker.fr</strong>, en
              application web et en application installable depuis votre navigateur, sur iPhone comme sur Android.
              IKtracker n'est publié sur aucun store et n'a{' '}
              <strong className="text-foreground">aucune version payante, premium, freemium ou d'essai limité</strong>.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              L'application Android « Suivi IK », éditée par une société tierce, est parfois confondue avec IKtracker :
              elle n'a aucun lien avec nous, ni le même éditeur, ni le même produit, ni le même modèle. Si l'on vous
              demande un paiement, un abonnement ou une carte bancaire, vous n'êtes pas sur IKtracker.
            </p>
          </div>
        </section>

        {/* FAQ visible */}
        <section className="max-w-3xl mx-auto px-4 pb-16">
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
            Prêt à automatiser vos indemnités kilométriques ?
          </p>
          <Link to="/signup">
            <Button size="lg" className="gap-2 px-8">
              Commencer gratuitement <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </section>
      </main>

      <EnhancedMarketingFooter />
    </>
  );
}
