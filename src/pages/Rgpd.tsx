import { LastUpdated } from "@/components/LastUpdated";
import { getStaticLastModified } from "@/lib/page-dates";
import { Helmet } from "@/lib/helmet-compat";
import { ArrowLeft, Mail, Shield, FileText, User, Clock, Server, Cookie, Lock } from "lucide-react";
import { useNavigate, Link } from "@/lib/router-compat";
import { Button } from "@/components/ui/button";
import founderImage from "@/assets/founder-adrien-optimized.webp";
import { Breadcrumb } from "@/components/Breadcrumb";

const PAGE_LASTMOD = getStaticLastModified("/rgpd");

const Rgpd = () => {
  const navigate = useNavigate();

  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "RGPD — Protection des données personnelles | IKtracker",
    description:
      "Politique RGPD d'IKtracker : droits d'accès, rectification, effacement, portabilité. Conformité totale au Règlement Général sur la Protection des Données pour les indépendants français.",
    url: "https://iktracker.fr/rgpd",
    inLanguage: "fr-FR",
    isPartOf: {
      "@type": "WebSite",
      name: "IKtracker",
      url: "https://iktracker.fr",
    },
    about: {
      "@type": "Thing",
      name: "Conformité RGPD et protection des données personnelles",
    },
    dateModified: "2026-05-25",
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <a
        href="#main-content"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          const main = document.getElementById("main-content");
          if (main) {
            main.focus();
            main.scrollIntoView({ behavior: "smooth" });
          }
        }}
      >
        Aller au contenu principal
      </a>

      <header
        className="sticky top-0 z-10 bg-background/80 backdrop-blur-xs border-b border-border"
        role="banner"
      >
        <nav
          className="container mx-auto px-4 py-4 flex items-center gap-4"
          aria-label="Navigation"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            aria-label="Retour"
            className="focus-visible-ring"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
          <h1 className="text-xl font-semibold" id="page-heading">
            RGPD — Protection des données
          </h1>
          {PAGE_LASTMOD ? <LastUpdated date={PAGE_LASTMOD} className="mt-2 mb-4" /> : null}
        </nav>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="container mx-auto px-4 py-8 max-w-3xl outline-hidden"
        aria-labelledby="page-heading"
      >
        <Breadcrumb items={[{ label: "RGPD" }]} />

        <div className="mb-8">
          <p className="text-muted-foreground">
            IKtracker s'engage à respecter la vie privée de ses utilisateurs et à traiter leurs
            données personnelles dans le respect du
            <strong> Règlement (UE) 2016/679 du 27 avril 2016</strong> (RGPD) et de la loi
            Informatique et Libertés modifiée.
          </p>
        </div>

        <article className="prose prose-sm dark:prose-invert max-w-none space-y-8">
          {/* Section 1 — Responsable */}
          <section aria-labelledby="rgpd-responsable" className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 id="rgpd-responsable" className="text-lg font-semibold text-foreground m-0">
                1. Responsable du traitement
              </h2>
            </div>
            <p className="text-muted-foreground">
              Le responsable du traitement des données collectées sur IKtracker est la société
              éditrice Voluntas Novare, représentée par Adrien de Volontat en qualité de directeur
              de la publication.
            </p>
            <ul className="list-none pl-0 text-muted-foreground space-y-1">
              <li>
                <strong>Société éditrice :</strong> Voluntas Novare
              </li>
              <li>
                <strong>Directeur de la publication :</strong> Adrien de Volontat
              </li>
              <li>
                <strong>Adresse postale :</strong> Saint-Rémy-de-Provence (13210), France
              </li>
              <li>
                <strong>Email :</strong>{" "}
                <a href="mailto:contact@iktracker.fr" className="text-primary hover:underline">
                  contact@iktracker.fr
                </a>
              </li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Iktracker.fr, son nom, son domaine et ses technologies sont la propriété exclusive de la société éditrice Voluntas Novare.
            </p>
            <p className="text-muted-foreground text-sm">
              Conformément à l'article 37 du RGPD, un Délégué à la Protection des Données (DPO)
              n'est pas désigné, l'activité n'entrant pas dans le champ des obligations légales de
              désignation. Le responsable du traitement assure directement la fonction de contact
              pour toute question relative à la protection des données.
            </p>
          </section>

          {/* Section 2 — Données collectées */}
          <section aria-labelledby="rgpd-donnees" className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 id="rgpd-donnees" className="text-lg font-semibold text-foreground m-0">
                2. Données collectées et finalités
              </h2>
            </div>
            <p className="text-muted-foreground">
              IKtracker collecte uniquement les données strictement nécessaires au fonctionnement du
              service :
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-muted-foreground border border-border rounded-lg">
                <thead className="bg-muted text-foreground font-medium">
                  <tr>
                    <th className="px-4 py-2">Catégorie</th>
                    <th className="px-4 py-2">Exemples</th>
                    <th className="px-4 py-2">Finalité</th>
                    <th className="px-4 py-2">Base légale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-4 py-2 font-medium">Identité</td>
                    <td className="px-4 py-2">Adresse email, prénom (optionnel)</td>
                    <td className="px-4 py-2">Authentification et personnalisation</td>
                    <td className="px-4 py-2">Art. 6.1.b — exécution du contrat</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium">Véhicules</td>
                    <td className="px-4 py-2">Puissance fiscale, immatriculation</td>
                    <td className="px-4 py-2">Application du barème kilométrique</td>
                    <td className="px-4 py-2">Art. 6.1.b — exécution du contrat</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium">Trajets</td>
                    <td className="px-4 py-2">Adresses de départ/arrivée, distances, dates</td>
                    <td className="px-4 py-2">Calcul des indemnités kilométriques</td>
                    <td className="px-4 py-2">Art. 6.1.b — exécution du contrat</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium">Préférences</td>
                    <td className="px-4 py-2">Thème, paramètres d'export</td>
                    <td className="px-4 py-2">Personnalisation de l'expérience</td>
                    <td className="px-4 py-2">Art. 6.1.a — consentement</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium">Témoignages</td>
                    <td className="px-4 py-2">Numéro de téléphone (volontaire)</td>
                    <td className="px-4 py-2">Retour d'expérience et amélioration</td>
                    <td className="px-4 py-2">Art. 6.1.a — consentement explicite</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground text-sm">
              Aucune donnée sensible (données de santé, opinions politiques, convictions
              religieuses) n'est collectée.
            </p>
          </section>

          {/* Section 3 — Durées */}
          <section aria-labelledby="rgpd-durees" className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 id="rgpd-durees" className="text-lg font-semibold text-foreground m-0">
                3. Durées de conservation
              </h2>
            </div>
            <p className="text-muted-foreground">
              Les données sont conservées pour la durée strictement nécessaire aux finalités
              poursuivies :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1" role="list">
              <li>
                <strong>Données de compte :</strong> conservées tant que le compte est actif, puis 1
                an après suppression
              </li>
              <li>
                <strong>Trajets :</strong> conservés tant que le compte est actif (archivage
                possible par l'utilisateur)
              </li>
              <li>
                <strong>Numéros de téléphone (feedback) :</strong> 7 jours maximum, puis suppression
                automatique
              </li>
              <li>
                <strong>Logs techniques :</strong> 30 jours (sécurité et débogage)
              </li>
            </ul>
          </section>

          {/* Section 4 — Hébergement */}
          <section aria-labelledby="rgpd-hebergement" className="space-y-3">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 id="rgpd-hebergement" className="text-lg font-semibold text-foreground m-0">
                4. Hébergement et sous-traitants
              </h2>
            </div>
            <p className="text-muted-foreground">
              Les données sont hébergées par des prestataires sélectionnés pour leur conformité RGPD
              :
            </p>
            <ul className="list-none pl-0 text-muted-foreground space-y-1">
              <li>
                <strong>Front-end :</strong> Lovable Publish — hébergement Edge européen
              </li>
              <li>
                <strong>Base de données :</strong> Lovable Cloud — serveurs situés dans l'Union
                européenne (région AWS eu-west)
              </li>
              <li>
                <strong>CDN / DNS :</strong> Cloudflare, Inc. — traitement des données limité au
                routement (Standard Contractual Clauses)
              </li>
            </ul>
            <p className="text-muted-foreground text-sm">
              Aucun transfert de données hors de l'Union européenne n'est réalisé dans le cadre du
              traitement principal. Les sous-traitants sont liés par des contrats conformes à
              l'article 28 du RGPD.
            </p>
          </section>

          {/* Section 5 — Sécurité */}
          <section aria-labelledby="rgpd-securite" className="space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 id="rgpd-securite" className="text-lg font-semibold text-foreground m-0">
                5. Mesures de sécurité
              </h2>
            </div>
            <p className="text-muted-foreground">
              IKtracker met en œuvre les mesures techniques et organisationnelles suivantes :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1" role="list">
              <li>Chiffrement des données en transit (TLS 1.3)</li>
              <li>Authentification sécurisée (JWT, sessions cryptées)</li>
              <li>
                Row Level Security (RLS) sur la base de données — chaque utilisateur n'accède qu'à
                ses propres données
              </li>
              <li>Pas de stockage des mots de passe en clair (hashage bcrypt)</li>
              <li>Sauvegardes régulières et redondées</li>
              <li>Journalisation des accès à des fins de sécurité</li>
            </ul>
          </section>

          {/* Section 6 — Cookies */}
          <section aria-labelledby="rgpd-cookies" className="space-y-3">
            <div className="flex items-center gap-2">
              <Cookie className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 id="rgpd-cookies" className="text-lg font-semibold text-foreground m-0">
                6. Cookies et traceurs
              </h2>
            </div>
            <p className="text-muted-foreground">
              IKtracker utilise uniquement des <strong>cookies strictement nécessaires</strong> au
              fonctionnement du service (authentification, maintien de session, préférences
              d'affichage). Aucun cookie publicitaire, de mesure d'audience ou de tracking tiers
              n'est déposé. Par conséquent, aucune bannière de consentement n'est requise au titre
              de la directive ePrivacy.
            </p>
          </section>

          {/* Section 7 — Droits */}
          <section aria-labelledby="rgpd-droits" className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 id="rgpd-droits" className="text-lg font-semibold text-foreground m-0">
                7. Vos droits sur vos données
              </h2>
            </div>
            <p className="text-muted-foreground">
              Conformément aux articles 15 à 22 du RGPD, vous disposez des droits suivants :
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="bg-muted/40 rounded-xl p-4 space-y-1">
                <h3 className="font-semibold text-foreground text-sm">Droit d'accès (art. 15)</h3>
                <p className="text-sm text-muted-foreground">
                  Obtenir une copie de vos données personnelles et des informations sur leur
                  traitement.
                </p>
              </div>
              <div className="bg-muted/40 rounded-xl p-4 space-y-1">
                <h3 className="font-semibold text-foreground text-sm">
                  Droit de rectification (art. 16)
                </h3>
                <p className="text-sm text-muted-foreground">
                  Faire corriger vos données inexactes ou les compléter.
                </p>
              </div>
              <div className="bg-muted/40 rounded-xl p-4 space-y-1">
                <h3 className="font-semibold text-foreground text-sm">
                  Droit à l'effacement (art. 17)
                </h3>
                <p className="text-sm text-muted-foreground">
                  Demander la suppression de vos données (« droit à l'oubli »). Action immédiate
                  depuis les paramètres du compte.
                </p>
              </div>
              <div className="bg-muted/40 rounded-xl p-4 space-y-1">
                <h3 className="font-semibold text-foreground text-sm">
                  Droit à la portabilité (art. 20)
                </h3>
                <p className="text-sm text-muted-foreground">
                  Récupérer vos données dans un format structuré et couramment utilisé (CSV, JSON).
                </p>
              </div>
              <div className="bg-muted/40 rounded-xl p-4 space-y-1">
                <h3 className="font-semibold text-foreground text-sm">
                  Droit d'opposition (art. 21)
                </h3>
                <p className="text-sm text-muted-foreground">
                  Vous opposer au traitement de vos données, pour des motifs liés à votre situation
                  particulière.
                </p>
              </div>
              <div className="bg-muted/40 rounded-xl p-4 space-y-1">
                <h3 className="font-semibold text-foreground text-sm">
                  Droit à la limitation (art. 18)
                </h3>
                <p className="text-sm text-muted-foreground">
                  Obtenir la limitation du traitement le temps de vérifier l'exactitude de vos
                  données.
                </p>
              </div>
            </div>
            <p className="text-muted-foreground text-sm mt-3">
              Pour exercer ces droits, contactez-nous à{" "}
              <a href="mailto:contact@iktracker.fr" className="text-primary hover:underline">
                contact@iktracker.fr
              </a>{" "}
              ou utilisez directement la fonction de suppression de compte dans les paramètres de
              l'application. Une réponse vous sera adressée dans un délai maximum d'
              <strong>un mois</strong>.
            </p>
          </section>

          {/* Section 8 — Réclamation */}
          <section aria-labelledby="rgpd-recours" className="space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 id="rgpd-recours" className="text-lg font-semibold text-foreground m-0">
                8. Réclamation auprès de la CNIL
              </h2>
            </div>
            <p className="text-muted-foreground">
              Si vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés,
              vous pouvez introduire une réclamation auprès de la{" "}
              <strong>Commission Nationale de l'Informatique et des Libertés (CNIL)</strong> :
            </p>
            <ul className="list-none pl-0 text-muted-foreground space-y-1">
              <li>
                <strong>Site web :</strong>{" "}
                <a
                  href="https://www.cnil.fr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  www.cnil.fr
                </a>
              </li>
              <li>
                <strong>Adresse :</strong> 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07
              </li>
              <li>
                <strong>Téléphone :</strong> 01 53 73 22 22
              </li>
            </ul>
          </section>

          {/* Section 9 — Modifications */}
          <section aria-labelledby="rgpd-modifications" className="space-y-3">
            <h2 id="rgpd-modifications" className="text-lg font-semibold text-foreground">
              9. Modifications de la politique RGPD
            </h2>
            <p className="text-muted-foreground">
              La présente politique peut être modifiée pour tenir compte des évolutions légales ou
              techniques. Les utilisateurs en seront informés en cas de changement substantiel. La
              date de dernière mise à jour est indiquée ci-dessous.
            </p>
            <p className="text-muted-foreground text-sm">
              <time dateTime="2026-05-25">Dernière mise à jour : 25 mai 2026</time>
            </p>
          </section>

          {/* Related pages */}
          <section aria-labelledby="rgpd-related" className="space-y-3 pt-4 border-t border-border">
            <h2 id="rgpd-related" className="text-lg font-semibold text-foreground">
              Pages connexes
            </h2>
            <ul className="flex flex-wrap gap-3" role="list">
              <li>
                <Link
                  to="/privacy"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline bg-primary/5 px-3 py-1.5 rounded-full transition-colors"
                >
                  Politique de confidentialité
                </Link>
              </li>
              <li>
                <Link
                  to="/mentions-legales"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline bg-primary/5 px-3 py-1.5 rounded-full transition-colors"
                >
                  Mentions légales
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline bg-primary/5 px-3 py-1.5 rounded-full transition-colors"
                >
                  CGVU
                </Link>
              </li>
            </ul>
          </section>

          {/* Founder */}
          <section className="mt-12 pt-8 border-t border-border" aria-labelledby="rgpd-founder">
            <h2 id="rgpd-founder" className="sr-only">
              À propos du fondateur
            </h2>
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
                    "La protection de vos données n'est pas une option. IKtracker a été conçu
                    privacy-by-design : vos trajets vous appartiennent, personne d'autre n'y a
                    accès."
                  </blockquote>
                  <p className="mt-3 text-xs text-muted-foreground">
                    — Adrien de Volontat, fondateur
                  </p>
                </figcaption>
              </figure>
            </div>
          </section>
        </article>
      </main>
    </div>
  );
};

export default Rgpd;
