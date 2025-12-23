import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import founderImage from '@/assets/founder-adrien-optimized.webp';

const Privacy = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Page title
    document.title = 'Politique de confidentialité | IKtracker - Protection des données RGPD';
    
    // Meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Découvrez comment IKtracker protège vos données personnelles. Conformité RGPD, droits d\'accès, rectification et suppression. Sécurité de vos informations de trajets professionnels garantie.');
    }

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', 'https://iktracker.fr/privacy');
    }

    // Open Graph tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogTitle) ogTitle.setAttribute('content', 'Politique de confidentialité | IKtracker');
    if (ogDescription) ogDescription.setAttribute('content', 'Découvrez comment IKtracker protège vos données personnelles. Conformité RGPD et sécurité garantie.');
    if (ogUrl) ogUrl.setAttribute('content', 'https://iktracker.fr/privacy');

    // Twitter tags
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (twitterTitle) twitterTitle.setAttribute('content', 'Politique de confidentialité | IKtracker');
    if (twitterDescription) twitterDescription.setAttribute('content', 'Découvrez comment IKtracker protège vos données personnelles. Conformité RGPD et sécurité garantie.');

    // Add JSON-LD structured data
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'privacy-jsonld';
    script.textContent = JSON.stringify({
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
    });
    document.head.appendChild(script);

    return () => {
      document.title = 'IKtracker - Calcul automatique et facile des indemnités kilométriques';
      const jsonld = document.getElementById('privacy-jsonld');
      if (jsonld) jsonld.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/profile')} aria-label="Retour au profil">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Politique de confidentialité</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Introduction</h2>
            <p className="text-muted-foreground">
              IKtracker s'engage à protéger la vie privée de ses utilisateurs. Cette politique de confidentialité 
              explique comment nous collectons, utilisons et protégeons vos informations personnelles.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Données collectées</h2>
            <p className="text-muted-foreground">Nous collectons les informations suivantes :</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Adresse e-mail (pour l'authentification)</li>
              <li>Informations sur vos véhicules (puissance fiscale, immatriculation)</li>
              <li>Données de trajets (adresses de départ et d'arrivée, distances)</li>
              <li>Préférences de l'application</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Utilisation des données</h2>
            <p className="text-muted-foreground">Vos données sont utilisées pour :</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Calculer vos indemnités kilométriques</li>
              <li>Générer des rapports de déplacements</li>
              <li>Améliorer l'expérience utilisateur</li>
              <li>Vous envoyer des notifications importantes liées au service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Stockage et sécurité</h2>
            <p className="text-muted-foreground">
              Vos données sont stockées de manière sécurisée sur des serveurs protégés. 
              Nous utilisons le chiffrement et d'autres mesures de sécurité pour protéger vos informations 
              contre tout accès non autorisé.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Partage des données</h2>
            <p className="text-muted-foreground">
              Nous ne vendons, n'échangeons ni ne transférons vos informations personnelles à des tiers, 
              sauf si cela est nécessaire pour fournir nos services ou si la loi l'exige.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Vos droits</h2>
            <p className="text-muted-foreground">Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Droit d'accès à vos données</li>
              <li>Droit de rectification</li>
              <li>Droit à l'effacement (droit à l'oubli)</li>
              <li>Droit à la portabilité des données</li>
              <li>Droit d'opposition au traitement</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Cookies</h2>
            <p className="text-muted-foreground">
              Nous utilisons des cookies essentiels pour le fonctionnement de l'application, 
              notamment pour maintenir votre session de connexion.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Contact</h2>
            <p className="text-muted-foreground">
              Pour toute question concernant cette politique de confidentialité ou pour exercer vos droits, 
              veuillez nous contacter via le formulaire de feedback dans l'application.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">9. Modifications</h2>
            <p className="text-muted-foreground">
              Nous nous réservons le droit de modifier cette politique de confidentialité à tout moment. 
              Les modifications seront publiées sur cette page avec une date de mise à jour.
            </p>
            <p className="text-muted-foreground mt-4 text-sm">
              Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </section>

          {/* Founder Disclaimer */}
          <section className="mt-12 pt-8 border-t border-border">
            <div className="bg-muted/50 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                <img 
                  src={founderImage} 
                  alt="Adrien de Volontat, fondateur d'IKtracker" 
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-full object-cover flex-shrink-0 border-2 border-border"
                />
                <div className="text-center sm:text-left">
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
                      className="text-xs text-primary hover:underline transition-colors"
                    >
                      Avenir Rénovations →
                    </a>
                    <span className="text-muted-foreground/50">•</span>
                    <Link to="/" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                      Accueil
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Privacy;
