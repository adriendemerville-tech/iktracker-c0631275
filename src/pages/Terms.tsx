import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import founderImage from '@/assets/founder-adrien-optimized.webp';

const Terms = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Page title
    document.title = 'Conditions Générales d\'Utilisation | IKtracker - CGU Application';
    
    // Meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Consultez les CGU d\'IKtracker. Modalités d\'utilisation, responsabilités et droits pour l\'application gratuite de calcul d\'indemnités kilométriques pour professionnels indépendants.');
    }

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', 'https://iktracker.fr/terms');
    }

    // Open Graph tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogTitle) ogTitle.setAttribute('content', 'Conditions Générales d\'Utilisation | IKtracker');
    if (ogDescription) ogDescription.setAttribute('content', 'Consultez les CGU d\'IKtracker. Modalités d\'utilisation de l\'application gratuite de calcul d\'indemnités kilométriques.');
    if (ogUrl) ogUrl.setAttribute('content', 'https://iktracker.fr/terms');

    // Twitter tags
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (twitterTitle) twitterTitle.setAttribute('content', 'Conditions Générales d\'Utilisation | IKtracker');
    if (twitterDescription) twitterDescription.setAttribute('content', 'Consultez les CGU d\'IKtracker. Modalités d\'utilisation de l\'application gratuite.');

    // Add JSON-LD structured data
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'terms-jsonld';
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Conditions Générales d'Utilisation IKtracker",
      "description": "Conditions générales d'utilisation de l'application IKtracker pour le calcul des indemnités kilométriques",
      "url": "https://iktracker.fr/terms",
      "inLanguage": "fr-FR",
      "isPartOf": {
        "@type": "WebSite",
        "name": "IKtracker",
        "url": "https://iktracker.fr"
      },
      "about": {
        "@type": "Thing",
        "name": "Conditions générales d'utilisation"
      }
    });
    document.head.appendChild(script);

    return () => {
      document.title = 'IKtracker - Calcul automatique et facile des indemnités kilométriques';
      const jsonld = document.getElementById('terms-jsonld');
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
          <h1 className="text-xl font-semibold">Conditions Générales d'Utilisation</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Objet</h2>
            <p className="text-muted-foreground">
              Les présentes Conditions Générales d'Utilisation (CGU) ont pour objet de définir les modalités 
              d'accès et d'utilisation de l'application IKtracker, dédiée au suivi et au calcul des 
              indemnités kilométriques.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Acceptation des CGU</h2>
            <p className="text-muted-foreground">
              L'utilisation de l'application implique l'acceptation pleine et entière des présentes CGU. 
              Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser l'application.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Accès au service</h2>
            <p className="text-muted-foreground">
              L'accès à IKtracker nécessite la création d'un compte utilisateur. L'utilisateur s'engage à 
              fournir des informations exactes et à maintenir la confidentialité de ses identifiants de connexion.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Description du service</h2>
            <p className="text-muted-foreground">IKtracker permet de :</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Enregistrer et gérer vos trajets professionnels</li>
              <li>Calculer automatiquement les indemnités kilométriques selon le barème fiscal</li>
              <li>Gérer plusieurs véhicules avec leur puissance fiscale</li>
              <li>Générer des rapports de déplacements</li>
              <li>Synchroniser avec vos calendriers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Obligations de l'utilisateur</h2>
            <p className="text-muted-foreground">L'utilisateur s'engage à :</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Utiliser l'application de manière loyale et conformément à sa destination</li>
              <li>Ne pas tenter de contourner les mesures de sécurité</li>
              <li>Fournir des informations exactes concernant ses trajets et véhicules</li>
              <li>Ne pas utiliser l'application à des fins frauduleuses</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Responsabilité</h2>
            <p className="text-muted-foreground">
              IKtracker fournit un outil d'aide au calcul des indemnités kilométriques. L'utilisateur reste 
              seul responsable de la véracité des informations saisies et de la conformité de ses déclarations 
              fiscales. L'application ne saurait se substituer aux conseils d'un professionnel comptable ou fiscal.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Disponibilité du service</h2>
            <p className="text-muted-foreground">
              Nous nous efforçons d'assurer la disponibilité de l'application 24h/24 et 7j/7. Toutefois, 
              nous nous réservons le droit d'interrompre temporairement le service pour des raisons de 
              maintenance ou de mise à jour, sans préavis ni indemnité.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Propriété intellectuelle</h2>
            <p className="text-muted-foreground">
              L'ensemble des éléments constituant l'application (textes, graphiques, logiciels, etc.) 
              sont protégés par les lois relatives à la propriété intellectuelle. Toute reproduction ou 
              utilisation non autorisée est interdite.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">9. Résiliation</h2>
            <p className="text-muted-foreground">
              L'utilisateur peut à tout moment supprimer son compte depuis les paramètres de l'application. 
              Nous nous réservons le droit de suspendre ou supprimer un compte en cas de violation des présentes CGU.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">10. Modification des CGU</h2>
            <p className="text-muted-foreground">
              Nous nous réservons le droit de modifier les présentes CGU à tout moment. Les utilisateurs 
              seront informés de toute modification substantielle. La poursuite de l'utilisation de 
              l'application après modification vaut acceptation des nouvelles conditions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">11. Droit applicable</h2>
            <p className="text-muted-foreground">
              Les présentes CGU sont soumises au droit français. Tout litige relatif à leur interprétation 
              ou leur exécution relève de la compétence des tribunaux français.
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
                  srcSet={`${founderImage} 1x, ${founderImage} 2x`}
                  sizes="60px"
                  alt="Adrien de Volontat, fondateur d'IKtracker" 
                  width={60}
                  height={60}
                  className="w-[60px] h-[60px] rounded-full object-cover flex-shrink-0 border-2 border-border"
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

export default Terms;
