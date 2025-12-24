import { Helmet } from 'react-helmet-async';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import founderImage from '@/assets/founder-adrien-optimized.webp';

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Politique de confidentialité | IKtracker - Protection des données RGPD</title>
        <meta name="description" content="Découvrez comment IKtracker protège vos données personnelles. Conformité RGPD, droits d'accès, rectification et suppression. Sécurité de vos informations garantie." />
        <meta name="keywords" content="politique confidentialité, RGPD, protection données, vie privée, IKtracker, données personnelles" />
        <link rel="canonical" href="https://iktracker.fr/privacy" />
        <meta name="robots" content="index, follow" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Politique de confidentialité | IKtracker" />
        <meta property="og:description" content="Découvrez comment IKtracker protège vos données personnelles. Conformité RGPD et sécurité garantie." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://iktracker.fr/privacy" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:site_name" content="IKtracker" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Politique de confidentialité | IKtracker" />
        <meta name="twitter:description" content="Découvrez comment IKtracker protège vos données personnelles. Conformité RGPD." />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Politique de confidentialité IKtracker",
            "description": "Politique de confidentialité et protection des données personnelles de l'application IKtracker",
            "url": "https://iktracker.fr/privacy",
            "inLanguage": "fr-FR",
            "isPartOf": {
              "@type": "WebSite",
              "name": "IKtracker",
              "url": "https://iktracker.fr"
            },
            "about": {
              "@type": "Thing",
              "name": "Protection des données personnelles RGPD"
            }
          })}
        </script>
      </Helmet>

      {/* Skip to content link */}
      <a 
        href="#main-content" 
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          const main = document.getElementById('main-content');
          if (main) {
            main.focus();
            main.scrollIntoView({ behavior: 'smooth' });
          }
        }}
      >
        Aller au contenu principal
      </a>

      <header 
        className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border"
        role="banner"
      >
        <nav className="container mx-auto px-4 py-4 flex items-center gap-4" aria-label="Navigation">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)} 
            aria-label="Retour à la page précédente"
            className="focus-visible-ring"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
          <h1 className="text-xl font-semibold" id="page-heading">Politique de confidentialité</h1>
        </nav>
      </header>

      <main 
        id="main-content" 
        tabIndex={-1} 
        className="container mx-auto px-4 py-8 max-w-3xl outline-none"
        aria-labelledby="page-heading"
      >
        <article className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section aria-labelledby="section-intro">
            <h2 id="section-intro" className="text-lg font-semibold text-foreground">1. Introduction</h2>
            <p className="text-muted-foreground">
              IKtracker s'engage à protéger la vie privée de ses utilisateurs. Cette politique de confidentialité 
              explique comment nous collectons, utilisons et protégeons vos informations personnelles.
            </p>
          </section>

          <section aria-labelledby="section-data">
            <h2 id="section-data" className="text-lg font-semibold text-foreground">2. Données collectées</h2>
            <p className="text-muted-foreground">Nous collectons les informations suivantes :</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1" role="list">
              <li>Adresse e-mail (pour l'authentification)</li>
              <li>Informations sur vos véhicules (puissance fiscale, immatriculation)</li>
              <li>Données de trajets (adresses de départ et d'arrivée, distances)</li>
              <li>Préférences de l'application</li>
            </ul>
          </section>

          <section aria-labelledby="section-usage">
            <h2 id="section-usage" className="text-lg font-semibold text-foreground">3. Utilisation des données</h2>
            <p className="text-muted-foreground">Vos données sont utilisées pour :</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1" role="list">
              <li>Calculer vos indemnités kilométriques</li>
              <li>Générer des rapports de déplacements</li>
              <li>Améliorer l'expérience utilisateur</li>
              <li>Vous envoyer des notifications importantes liées au service</li>
            </ul>
          </section>

          <section aria-labelledby="section-security">
            <h2 id="section-security" className="text-lg font-semibold text-foreground">4. Stockage et sécurité</h2>
            <p className="text-muted-foreground">
              Vos données sont stockées de manière sécurisée sur des serveurs protégés. 
              Nous utilisons le chiffrement et d'autres mesures de sécurité pour protéger vos informations 
              contre tout accès non autorisé.
            </p>
          </section>

          <section aria-labelledby="section-sharing">
            <h2 id="section-sharing" className="text-lg font-semibold text-foreground">5. Partage des données</h2>
            <p className="text-muted-foreground">
              Nous ne vendons, n'échangeons ni ne transférons vos informations personnelles à des tiers, 
              sauf si cela est nécessaire pour fournir nos services ou si la loi l'exige.
            </p>
          </section>

          <section aria-labelledby="section-rights">
            <h2 id="section-rights" className="text-lg font-semibold text-foreground">6. Vos droits</h2>
            <p className="text-muted-foreground">Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1" role="list">
              <li>Droit d'accès à vos données</li>
              <li>Droit de rectification</li>
              <li>Droit à l'effacement (droit à l'oubli)</li>
              <li>Droit à la portabilité des données</li>
              <li>Droit d'opposition au traitement</li>
            </ul>
          </section>

          <section aria-labelledby="section-cookies">
            <h2 id="section-cookies" className="text-lg font-semibold text-foreground">7. Cookies</h2>
            <p className="text-muted-foreground">
              Nous utilisons des cookies essentiels pour le fonctionnement de l'application, 
              notamment pour maintenir votre session de connexion.
            </p>
          </section>

          <section aria-labelledby="section-contact">
            <h2 id="section-contact" className="text-lg font-semibold text-foreground">8. Contact</h2>
            <p className="text-muted-foreground">
              Pour toute question concernant cette politique de confidentialité ou pour exercer vos droits, 
              veuillez nous contacter via le formulaire de feedback dans l'application.
            </p>
          </section>

          <section aria-labelledby="section-changes">
            <h2 id="section-changes" className="text-lg font-semibold text-foreground">9. Modifications</h2>
            <p className="text-muted-foreground">
              Nous nous réservons le droit de modifier cette politique de confidentialité à tout moment. 
              Les modifications seront publiées sur cette page avec une date de mise à jour.
            </p>
            <p className="text-muted-foreground mt-4 text-sm">
              <time dateTime="2024-12-24">
                Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </time>
            </p>
          </section>

          {/* Founder Disclaimer */}
          <section className="mt-12 pt-8 border-t border-border" aria-labelledby="section-founder">
            <h2 id="section-founder" className="sr-only">À propos du fondateur</h2>
            <div className="bg-muted/50 rounded-2xl p-6">
              <figure className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                <img 
                  src={founderImage} 
                  srcSet={`${founderImage} 1x, ${founderImage} 2x`}
                  sizes="60px"
                  alt="Adrien de Volontat, fondateur d'IKtracker" 
                  width={60}
                  height={60}
                  className="w-[60px] h-[60px] rounded-full object-cover flex-shrink-0 border-2 border-border"
                  loading="lazy"
                />
                <figcaption className="text-center sm:text-left">
                  <blockquote className="text-sm text-muted-foreground leading-relaxed italic">
                    "Dirigeant d'une agence Avenir Rénovations, je n'ai trouvé aucune solution satisfaisante pour automatiser mes indemnités kilométriques. J'ai donc créé IKtracker pour mon usage professionnel. L'infrastructure étant en place, je la partage gratuitement avec ceux qui ont les mêmes besoins de gestion. Pas de carte bancaire, pas de frais cachés."
                  </blockquote>
                  <p className="mt-3 text-xs text-muted-foreground">
                    — Adrien de Volontat, fondateur
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2">
                    <a 
                      href="https://www.avenir-renovations.fr/agence/avenir-renovations-13-saint-remy-de-provence/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline transition-colors focus-visible-ring rounded-sm"
                    >
                      Avenir Rénovations →
                    </a>
                    <span className="text-muted-foreground/50" aria-hidden="true">•</span>
                    <Link 
                      to="/" 
                      className="text-xs text-muted-foreground hover:text-primary transition-colors focus-visible-ring rounded-sm"
                    >
                      Accueil
                    </Link>
                  </div>
                </figcaption>
              </figure>
            </div>
          </section>
        </article>
      </main>
    </div>
  );
};

export default Privacy;