import { Helmet } from 'react-helmet-async';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from '@/lib/router-compat';
import { Button } from '@/components/ui/button';
import founderImage from '@/assets/founder-adrien-optimized.webp';
import { Breadcrumb } from '@/components/Breadcrumb';

const MentionsLegales = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Mentions Légales | IKtracker - Éditeur et Hébergeur</title>
        <meta name="description" content="Mentions légales d'IKtracker : informations sur l'éditeur, l'hébergeur, la propriété intellectuelle et les conditions d'utilisation du site iktracker.fr." />
        <link rel="canonical" href="https://iktracker.fr/mentions-legales" />
        <meta name="robots" content="index, follow" />

        <meta property="og:title" content="Mentions Légales | IKtracker" />
        <meta property="og:description" content="Mentions légales d'IKtracker : éditeur, hébergeur et informations juridiques." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://iktracker.fr/mentions-legales" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:site_name" content="IKtracker" />

        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Mentions Légales | IKtracker" />
        <meta name="twitter:description" content="Mentions légales d'IKtracker : éditeur, hébergeur et informations juridiques." />

        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Mentions Légales IKtracker",
            "description": "Mentions légales du site iktracker.fr",
            "url": "https://iktracker.fr/mentions-legales",
            "inLanguage": "fr-FR",
            "isPartOf": {
              "@type": "WebSite",
              "name": "IKtracker",
              "url": "https://iktracker.fr"
            }
          })}
        </script>
      </Helmet>

      <a
        href="#main-content"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          const main = document.getElementById('main-content');
          if (main) { main.focus(); main.scrollIntoView({ behavior: 'smooth' }); }
        }}
      >
        Aller au contenu principal
      </a>

      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xs border-b border-border" role="banner">
        <nav className="container mx-auto px-4 py-4 flex items-center gap-4" aria-label="Navigation">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Retour">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
          <h1 className="text-xl font-semibold" id="page-heading">Mentions Légales</h1>
        </nav>
      </header>

      <main id="main-content" tabIndex={-1} className="container mx-auto px-4 py-8 max-w-3xl outline-hidden" aria-labelledby="page-heading">
        <Breadcrumb items={[{ label: 'Mentions légales' }]} />
        <article className="prose prose-sm dark:prose-invert max-w-none space-y-6">

          <section aria-labelledby="ml-editeur">
            <h2 id="ml-editeur" className="text-lg font-semibold text-foreground">1. Éditeur du site</h2>
            <p className="text-muted-foreground">
              Le site <strong>iktracker.fr</strong> est édité par :
            </p>
            <ul className="list-none pl-0 text-muted-foreground space-y-1">
              <li><strong>Nom :</strong> Adrien de Volontat</li>
              <li><strong>Statut :</strong> Entrepreneur individuel</li>
              <li><strong>Activité principale :</strong> Avenir Rénovations — agence de rénovation</li>
              <li><strong>Adresse :</strong> Saint-Rémy-de-Provence (13210), France</li>
              <li><strong>Email :</strong> <a href="mailto:contact@iktracker.fr" className="text-primary hover:underline">contact@iktracker.fr</a></li>
            </ul>
          </section>

          <section aria-labelledby="ml-directeur">
            <h2 id="ml-directeur" className="text-lg font-semibold text-foreground">2. Directeur de la publication</h2>
            <p className="text-muted-foreground">
              Adrien de Volontat, en qualité d'éditeur du site.
            </p>
          </section>

          <section aria-labelledby="ml-hebergeur">
            <h2 id="ml-hebergeur" className="text-lg font-semibold text-foreground">3. Hébergement</h2>
            <p className="text-muted-foreground">Le site est hébergé par :</p>
            <ul className="list-none pl-0 text-muted-foreground space-y-1">
              <li><strong>Front-end :</strong> Netlify, Inc. — 44 Montgomery Street, Suite 300, San Francisco, CA 94104, USA</li>
              <li><strong>Base de données :</strong> Supabase, Inc. — 970 Toa Payoh North, #07-04, Singapore 318992</li>
              <li><strong>CDN / DNS :</strong> Cloudflare, Inc. — 101 Townsend St, San Francisco, CA 94107, USA</li>
            </ul>
            <p className="text-muted-foreground text-sm mt-2">
              Les données sont stockées sur des serveurs situés dans l'Union européenne (région AWS eu-west).
            </p>
          </section>

          <section aria-labelledby="ml-pi">
            <h2 id="ml-pi" className="text-lg font-semibold text-foreground">4. Propriété intellectuelle</h2>
            <p className="text-muted-foreground">
              L'ensemble du contenu du site iktracker.fr (textes, images, graphismes, logo, icônes, logiciels) 
              est la propriété exclusive de l'éditeur ou de ses partenaires et est protégé par les lois françaises 
              et internationales relatives à la propriété intellectuelle. Toute reproduction, représentation, 
              modification ou exploitation non autorisée est interdite.
            </p>
          </section>

          <section aria-labelledby="ml-donnees">
            <h2 id="ml-donnees" className="text-lg font-semibold text-foreground">5. Données personnelles & RGPD</h2>
            <p className="text-muted-foreground">
              Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique 
              et Libertés, vous disposez d'un droit d'accès, de rectification, de portabilité et de suppression 
              de vos données personnelles.
            </p>
            <p className="text-muted-foreground">
              Pour exercer ces droits, contactez-nous à l'adresse : <a href="mailto:contact@iktracker.fr" className="text-primary hover:underline">contact@iktracker.fr</a>
            </p>
            <p className="text-muted-foreground">
              Pour plus de détails, consultez notre <Link to="/privacy" className="text-primary hover:underline">Politique de confidentialité</Link>.
            </p>
          </section>

          <section aria-labelledby="ml-cookies">
            <h2 id="ml-cookies" className="text-lg font-semibold text-foreground">6. Cookies</h2>
            <p className="text-muted-foreground">
              IKtracker utilise uniquement des cookies essentiels au fonctionnement du service (authentification, 
              préférences utilisateur). Aucun cookie publicitaire ou de tracking tiers n'est utilisé. 
              Aucun consentement spécifique n'est donc requis au titre de la directive ePrivacy.
            </p>
          </section>

          <section aria-labelledby="ml-responsabilite">
            <h2 id="ml-responsabilite" className="text-lg font-semibold text-foreground">7. Limitation de responsabilité</h2>
            <p className="text-muted-foreground">
              IKtracker est un outil d'aide au calcul des indemnités kilométriques. Les résultats fournis sont 
              basés sur le barème fiscal officiel mais ne constituent pas un conseil fiscal. L'utilisateur reste 
              seul responsable de ses déclarations auprès de l'administration fiscale.
            </p>
          </section>

          <section aria-labelledby="ml-droit">
            <h2 id="ml-droit" className="text-lg font-semibold text-foreground">8. Droit applicable</h2>
            <p className="text-muted-foreground">
              Les présentes mentions légales sont régies par le droit français. Tout litige relatif à l'utilisation 
              du site iktracker.fr sera soumis à la compétence exclusive des tribunaux français.
            </p>
            <p className="text-muted-foreground mt-4 text-sm">
              Dernière mise à jour : avril 2026
            </p>
          </section>

          {/* Founder section */}
          <section className="mt-12 pt-8 border-t border-border" aria-labelledby="ml-founder">
            <h2 id="ml-founder" className="sr-only">À propos du fondateur</h2>
            <div className="bg-muted/50 rounded-2xl p-6">
              <figure className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                <img
                  src={founderImage}
                  alt="Adrien de Volontat, fondateur d'IKtracker"
                  width={60}
                  height={60}
                  className="w-[60px] h-[60px] rounded-full object-cover flex-shrink-0 border-2 border-border"
                  loading="lazy"
                />
                <figcaption className="text-center sm:text-left">
                  <blockquote className="text-sm text-muted-foreground leading-relaxed italic">
                    "Dirigeant d'une agence Avenir Rénovations, je n'ai trouvé aucune solution satisfaisante pour automatiser mes indemnités kilométriques. J'ai donc créé IKtracker pour mon usage professionnel."
                  </blockquote>
                  <p className="mt-3 text-xs text-muted-foreground">— Adrien de Volontat, fondateur</p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2">
                    <a href="https://www.avenir-renovations.fr/agence/avenir-renovations-13-saint-remy-de-provence/" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                      Avenir Rénovations →
                    </a>
                    <span className="text-muted-foreground/50" aria-hidden="true">•</span>
                    <Link to="/" className="text-xs text-muted-foreground hover:text-primary transition-colors">Accueil</Link>
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

export default MentionsLegales;
