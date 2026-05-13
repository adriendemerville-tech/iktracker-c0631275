import { Helmet } from 'react-helmet-async';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import founderImage from '@/assets/founder-adrien-optimized.webp';

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>CGVU | IKtracker — Conditions d'utilisation</title>
        <meta name="description" content="Consultez les CGVU d'IKtracker. Conditions de vente, modalités d'utilisation, responsabilités et droits pour l'application gratuite de calcul d'indemnités kilométriques." />
        <meta name="keywords" content="CGVU, CGU, CGV, conditions générales vente utilisation, IKtracker, termes service, modalités utilisation" />
        <link rel="canonical" href="https://iktracker.fr/terms" />
        <meta name="robots" content="index, follow" />
        
        {/* Open Graph */}
        <meta property="og:title" content="CGVU — Conditions Générales de Vente et d'Utilisation | IKtracker" />
        <meta property="og:description" content="Consultez les CGVU d'IKtracker. Conditions de vente et d'utilisation de l'application gratuite." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://iktracker.fr/terms" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:site_name" content="IKtracker" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="CGVU | IKtracker" />
        <meta name="twitter:description" content="Consultez les CGVU d'IKtracker. Conditions de vente et d'utilisation de l'application gratuite." />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Conditions Générales de Vente et d'Utilisation IKtracker",
            "description": "Conditions générales de vente et d'utilisation de l'application IKtracker",
            "url": "https://iktracker.fr/terms",
            "inLanguage": "fr-FR",
            "isPartOf": {
              "@type": "WebSite",
              "name": "IKtracker",
              "url": "https://iktracker.fr"
            },
            "about": {
              "@type": "Thing",
              "name": "Conditions générales de vente et d'utilisation"
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
          <h1 className="text-xl font-semibold" id="page-heading">Conditions Générales de Vente et d'Utilisation</h1>
        </nav>
      </header>

      <main 
        id="main-content" 
        tabIndex={-1} 
        className="container mx-auto px-4 py-8 max-w-3xl outline-none"
        aria-labelledby="page-heading"
      >
        <article className="prose prose-sm dark:prose-invert max-w-none space-y-6">

          {/* ── PARTIE I : CONDITIONS GÉNÉRALES D'UTILISATION ── */}
          <div className="bg-muted/30 rounded-xl p-4 mb-2">
            <p className="text-sm font-semibold text-primary uppercase tracking-wide">Partie I — Conditions Générales d'Utilisation (CGU)</p>
          </div>

          <section aria-labelledby="section-object">
            <h2 id="section-object" className="text-lg font-semibold text-foreground">1. Objet</h2>
            <p className="text-muted-foreground">
              Les présentes Conditions Générales de Vente et d'Utilisation (CGVU) ont pour objet de définir 
              les modalités d'accès, d'utilisation et, le cas échéant, de souscription aux services de 
              l'application IKtracker, dédiée au suivi et au calcul des indemnités kilométriques.
            </p>
          </section>

          <section aria-labelledby="section-accept">
            <h2 id="section-accept" className="text-lg font-semibold text-foreground">2. Acceptation des CGVU</h2>
            <p className="text-muted-foreground">
              L'utilisation de l'application implique l'acceptation pleine et entière des présentes CGVU. 
              Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser l'application.
            </p>
          </section>

          <section aria-labelledby="section-access">
            <h2 id="section-access" className="text-lg font-semibold text-foreground">3. Accès au service</h2>
            <p className="text-muted-foreground">
              L'accès à IKtracker nécessite la création d'un compte utilisateur. L'utilisateur s'engage à 
              fournir des informations exactes et à maintenir la confidentialité de ses identifiants de connexion.
            </p>
          </section>

          <section aria-labelledby="section-description">
            <h2 id="section-description" className="text-lg font-semibold text-foreground">4. Description du service</h2>
            <p className="text-muted-foreground">IKtracker permet de :</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1" role="list">
              <li>Enregistrer et gérer vos trajets professionnels</li>
              <li>Calculer automatiquement les indemnités kilométriques selon le barème fiscal en vigueur</li>
              <li>Gérer plusieurs véhicules avec leur puissance fiscale</li>
              <li>Générer des rapports de déplacements (PDF, CSV)</li>
              <li>Synchroniser avec vos calendriers (Google, Outlook, ICS)</li>
              <li>Utiliser le mode tournée avec suivi GPS en temps réel</li>
            </ul>
          </section>

          <section aria-labelledby="section-obligations">
            <h2 id="section-obligations" className="text-lg font-semibold text-foreground">5. Obligations de l'utilisateur</h2>
            <p className="text-muted-foreground">L'utilisateur s'engage à :</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1" role="list">
              <li>Utiliser l'application de manière loyale et conformément à sa destination</li>
              <li>Ne pas tenter de contourner les mesures de sécurité</li>
              <li>Fournir des informations exactes concernant ses trajets et véhicules</li>
              <li>Ne pas utiliser l'application à des fins frauduleuses</li>
              <li>Respecter la législation en vigueur, notamment en matière de déclarations fiscales</li>
            </ul>
          </section>

          <section aria-labelledby="section-responsibility">
            <h2 id="section-responsibility" className="text-lg font-semibold text-foreground">6. Responsabilité</h2>
            <p className="text-muted-foreground">
              IKtracker fournit un outil d'aide au calcul des indemnités kilométriques. L'utilisateur reste 
              seul responsable de la véracité des informations saisies et de la conformité de ses déclarations 
              fiscales. L'application ne saurait se substituer aux conseils d'un professionnel comptable ou fiscal.
            </p>
          </section>

          <section aria-labelledby="section-availability">
            <h2 id="section-availability" className="text-lg font-semibold text-foreground">7. Disponibilité du service</h2>
            <p className="text-muted-foreground">
              Nous nous efforçons d'assurer la disponibilité de l'application 24h/24 et 7j/7. Toutefois, 
              nous nous réservons le droit d'interrompre temporairement le service pour des raisons de 
              maintenance ou de mise à jour, sans préavis ni indemnité.
            </p>
          </section>

          <section aria-labelledby="section-ip">
            <h2 id="section-ip" className="text-lg font-semibold text-foreground">8. Propriété intellectuelle</h2>
            <p className="text-muted-foreground">
              L'ensemble des éléments constituant l'application (textes, graphiques, logiciels, etc.) 
              sont protégés par les lois relatives à la propriété intellectuelle. Toute reproduction ou 
              utilisation non autorisée est interdite.
            </p>
          </section>

          <section aria-labelledby="section-data">
            <h2 id="section-data" className="text-lg font-semibold text-foreground">9. Protection des données personnelles</h2>
            <p className="text-muted-foreground">
              Le traitement des données personnelles est détaillé dans notre{' '}
              <Link to="/privacy" className="text-primary hover:underline">Politique de confidentialité</Link>.
              IKtracker est conforme au Règlement Général sur la Protection des Données (RGPD). 
              Les données sont hébergées en Europe et ne sont ni vendues ni partagées avec des tiers.
            </p>
          </section>

          <section aria-labelledby="section-termination">
            <h2 id="section-termination" className="text-lg font-semibold text-foreground">10. Résiliation</h2>
            <p className="text-muted-foreground">
              L'utilisateur peut à tout moment supprimer son compte depuis les paramètres de l'application. 
              Nous nous réservons le droit de suspendre ou supprimer un compte en cas de violation des présentes CGVU.
            </p>
          </section>

          {/* ── PARTIE II : CONDITIONS GÉNÉRALES DE VENTE ── */}
          <div className="bg-muted/30 rounded-xl p-4 mt-10 mb-2">
            <p className="text-sm font-semibold text-primary uppercase tracking-wide">Partie II — Conditions Générales de Vente (CGV)</p>
          </div>

          <section aria-labelledby="section-pricing">
            <h2 id="section-pricing" className="text-lg font-semibold text-foreground">11. Tarification</h2>
            <p className="text-muted-foreground">
              IKtracker est proposé gratuitement dans sa version actuelle. L'ensemble des fonctionnalités 
              (enregistrement de trajets, calcul d'IK, export PDF/CSV, mode tournée, synchronisation 
              calendrier) est accessible sans frais et sans limitation.
            </p>
            <p className="text-muted-foreground mt-2">
              En cas d'introduction future de services payants ou de fonctionnalités premium, les 
              utilisateurs en seront informés préalablement. La souscription à un service payant fera 
              l'objet d'un consentement explicite et ne pourra en aucun cas être tacite.
            </p>
          </section>

          <section aria-labelledby="section-payment">
            <h2 id="section-payment" className="text-lg font-semibold text-foreground">12. Modalités de paiement</h2>
            <p className="text-muted-foreground">
              Aucun paiement n'est requis pour utiliser IKtracker. Si des services payants venaient à être 
              proposés, les moyens de paiement acceptés, les conditions de facturation et les éventuelles 
              politiques de remboursement seraient détaillés dans une mise à jour des présentes CGVU.
            </p>
          </section>

          <section aria-labelledby="section-retractation">
            <h2 id="section-retractation" className="text-lg font-semibold text-foreground">13. Droit de rétractation</h2>
            <p className="text-muted-foreground">
              Conformément aux articles L221-18 et suivants du Code de la consommation, le consommateur 
              dispose d'un délai de 14 jours à compter de la souscription d'un éventuel service payant 
              pour exercer son droit de rétractation, sans avoir à justifier de motifs ni à payer de pénalités.
            </p>
            <p className="text-muted-foreground mt-2">
              Le service étant actuellement gratuit, ce droit ne trouve pas à s'appliquer mais sera 
              pleinement respecté en cas d'évolution tarifaire.
            </p>
          </section>

          <section aria-labelledby="section-warranty">
            <h2 id="section-warranty" className="text-lg font-semibold text-foreground">14. Garanties et limitations</h2>
            <p className="text-muted-foreground">
              Le service est fourni « en l'état ». IKtracker s'engage à mettre en œuvre les moyens 
              raisonnables pour assurer le bon fonctionnement de l'application, mais ne garantit pas 
              l'absence totale d'erreurs ou d'interruptions.
            </p>
            <p className="text-muted-foreground mt-2">
              En aucun cas IKtracker ne pourra être tenu responsable des dommages indirects résultant 
              de l'utilisation ou de l'impossibilité d'utiliser le service, y compris les pertes de données, 
              les manques à gagner ou les préjudices financiers liés à des déclarations fiscales erronées.
            </p>
          </section>

          <section aria-labelledby="section-mediation">
            <h2 id="section-mediation" className="text-lg font-semibold text-foreground">15. Médiation</h2>
            <p className="text-muted-foreground">
              En cas de litige relatif aux présentes CGVU, l'utilisateur peut recourir gratuitement à un 
              médiateur de la consommation conformément aux articles L611-1 et suivants du Code de la 
              consommation. Avant toute démarche de médiation, l'utilisateur est invité à contacter 
              IKtracker via la page{' '}
              <Link to="/contact" className="text-primary hover:underline">Contact</Link>.
            </p>
          </section>

          {/* ── PARTIE III : DISPOSITIONS GÉNÉRALES ── */}
          <div className="bg-muted/30 rounded-xl p-4 mt-10 mb-2">
            <p className="text-sm font-semibold text-primary uppercase tracking-wide">Partie III — Dispositions générales</p>
          </div>

          <section aria-labelledby="section-modifications">
            <h2 id="section-modifications" className="text-lg font-semibold text-foreground">16. Modification des CGVU</h2>
            <p className="text-muted-foreground">
              Nous nous réservons le droit de modifier les présentes CGVU à tout moment. Les utilisateurs 
              seront informés de toute modification substantielle. La poursuite de l'utilisation de 
              l'application après modification vaut acceptation des nouvelles conditions.
            </p>
          </section>

          <section aria-labelledby="section-law">
            <h2 id="section-law" className="text-lg font-semibold text-foreground">17. Droit applicable</h2>
            <p className="text-muted-foreground">
              Les présentes CGVU sont soumises au droit français. Tout litige relatif à leur interprétation 
              ou leur exécution relève de la compétence des tribunaux français.
            </p>
            <p className="text-muted-foreground mt-4 text-sm">
              <time dateTime="2026-04-23">
                Dernière mise à jour : 23 avril 2026
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

export default Terms;
