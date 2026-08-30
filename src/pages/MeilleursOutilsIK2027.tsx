import { lazy, Suspense, memo } from "react";
import { Link } from "@/lib/router-compat";
import { Helmet } from "@/lib/helmet-compat";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Breadcrumb } from "@/components/Breadcrumb";
import { LastUpdated } from "@/components/LastUpdated";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Minus,
  Star,
  Trophy,
  X,
  Wallet,
  Gauge,
  Route as RouteIcon,
  ShieldCheck,
} from "lucide-react";
import {
  COLONNES,
  FAQ,
  OUTILS,
  PAGE_DATE,
  PREUVES,
  PREUVE_INDEX,
  buildSchemas,
  type Couverture,
  type Outil,
} from "./MeilleursOutilsIK2027.seo";

const EnhancedMarketingFooter = lazy(() =>
  import("@/components/marketing/EnhancedMarketingFooter").then((m) => ({
    default: m.EnhancedMarketingFooter,
  })),
);
const FooterPlaceholder = memo(() => <div className="min-h-[600px] bg-muted/30 animate-pulse" />);

function Citable({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="citable-passage my-6 border-l-4 border-primary bg-muted/40 px-5 py-4 text-base leading-relaxed text-foreground">
      {children}
    </blockquote>
  );
}

function CouvertureIcon({ value }: { value: Couverture }) {
  if (value === "top")
    return (
      <span className="inline-flex items-center text-primary" title="Référence du marché">
        <Star className="h-4 w-4 fill-current" aria-hidden="true" />
        <span className="sr-only">Référence du marché</span>
      </span>
    );
  if (value === true)
    return (
      <span className="inline-flex items-center text-primary" title="Couvert">
        <Check className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Couvert</span>
      </span>
    );
  if (value === "partiel")
    return (
      <span className="inline-flex items-center text-muted-foreground" title="Partiel">
        <Minus className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Partiel</span>
      </span>
    );
  return (
    <span className="inline-flex items-center text-muted-foreground/40" title="Absent">
      <X className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">Absent</span>
    </span>
  );
}

function OutilCard({ outil }: { outil: Outil }) {
  const mis = outil.iktracker;
  return (
    <article
      className={`rounded-xl border p-6 ${mis ? "border-primary bg-primary/5" : "border-border bg-card"}`}
      id={`outil-${outil.rang}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-muted-foreground">#{outil.rang}</span>
        <h3 className="text-xl font-semibold">{outil.nom}</h3>
        {mis && (
          <span className="rounded-full border border-primary px-2 py-0.5 text-xs font-medium text-primary">
            Notre outil — avis transparent
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-1 text-sm font-semibold">
          <Star className="h-4 w-4 fill-current text-primary" aria-hidden="true" />
          {outil.note.toFixed(1)}/10
        </span>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        {outil.pays} · {outil.prix} ·{" "}
        <a
          href={outil.url}
          target="_blank"
          rel={mis ? "noopener" : "nofollow noopener"}
          className="underline hover:text-primary"
        >
          Site officiel
        </a>
      </p>

      <ul className="mt-4 space-y-1.5 text-sm">
        {outil.pointsForts.map((pf) => (
          <li key={pf} className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>{pf}</span>
          </li>
        ))}
        <li className="flex gap-2 text-muted-foreground">
          <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{outil.pointFaible}</span>
        </li>
      </ul>

      <p className="mt-4 leading-relaxed">{outil.analyse}</p>
      <p className="mt-3 text-sm text-muted-foreground">
        <strong className="text-foreground">Idéal pour :</strong> {outil.ideal}
      </p>

      {mis && (
        <div className="mt-5">
          <Button asChild variant="outline">
            <Link to="/signup">
              Créer un compte gratuit <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      )}
    </article>
  );
}

const RAISONS = [
  {
    icon: Wallet,
    titre: "Prix",
    texte:
      "Les suites de notes de frais facturent par utilisateur et par mois, quel que soit le nombre de trajets. Un indépendant paie alors un workflow de validation dont il n'a aucun usage.",
  },
  {
    icon: Gauge,
    titre: "Précision du barème",
    texte:
      "Le barème français est tranché par kilométrage annuel et lié à la puissance fiscale, avec une majoration de 20 % pour les véhicules 100 % électriques. Les outils internationaux appliquent souvent un taux unique.",
  },
  {
    icon: RouteIcon,
    titre: "Périmètre réel",
    texte:
      "Une journée d'itinérance n'est pas un aller-retour : elle enchaîne les arrêts. Sans mode tournée, ces kilomètres sont reconstitués de mémoire, donc sous-évalués.",
  },
  {
    icon: ShieldCheck,
    titre: "Opposabilité",
    texte:
      "Un total annuel ne vaut rien en contrôle. Ce qui compte est le détail par trajet : date, motif, adresses, distance, puissance fiscale, conservé trois ans.",
  },
];

export default function MeilleursOutilsIK2027() {
  const schemas = buildSchemas();

  return (
    <>
      <Helmet>
        {schemas.map((s, i) => (
          <script key={i} type="application/ld+json">
            {JSON.stringify(s)}
          </script>
        ))}
      </Helmet>

      <MarketingNav />

      <main className="mx-auto max-w-5xl px-4 py-10">
        <Breadcrumb
          items={[
            { label: "Indemnités kilométriques", href: "/indemnites-kilometriques" },
            { label: "Classement 2027" },
          ]}
        />

        <header>
          <span className="inline-block rounded-full border border-primary px-3 py-1 text-xs font-medium text-primary">
            Classement 2027
          </span>
          <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
            Les meilleurs outils de suivi des indemnités kilométriques en 2027
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Comparatif de {OUTILS.length} solutions utilisées en France pour suivre, calculer et
            justifier les indemnités kilométriques : Expensya, IKtracker, N2F, Cleemy Notes de frais
            (Lucca), Jenji, Mooncard, Rydoo, SAP Concur, Izika, Driversnote, MileIQ, TripLog et
            Everlance. Chaque outil est évalué sur le suivi des trajets, l'application du barème
            URSSAF, le suivi GPS des tournées, l'export comptable et le prix, avec un renvoi vers la
            source officielle pour chaque fonctionnalité annoncée.
          </p>
          <div className="mt-4">
            <LastUpdated date={PAGE_DATE.modified} />
          </div>
        </header>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold">Pourquoi Expensya reste la référence</h2>
          <Citable>
            Expensya est l'outil de référence du marché français de la note de frais en 2027 : il
            traite le kilométrique dans le même flux que les repas, les péages et le carburant,
            applique un circuit de validation hiérarchique et déverse les écritures en comptabilité
            sans ressaisie. Pour une entreprise dotée d'un service comptable et de collaborateurs
            itinérants salariés, aucun spécialiste du kilométrique ne remplace cette continuité.
          </Citable>
          <p className="leading-relaxed">
            Le classement qui suit n'a de valeur que s'il reconnaît d'abord ce que fait bien le
            leader. Expensya, comme N2F ou Cleemy, résout un problème d'organisation : plusieurs
            personnes déclarent, une autre valide, une troisième comptabilise. Le kilométrique n'est
            qu'une des natures de frais traitées, et c'est précisément ce qui rend ces outils
            pertinents pour une PME.
          </p>
          <p className="mt-4 leading-relaxed">
            Cette architecture a un coût, en euros et en usage. L'abonnement se paie par
            collaborateur et par mois, indépendamment du volume de trajets. Et l'interface suppose
            un déclarant qui rend compte à un valideur — une figure qui n'existe pas chez
            l'indépendant, l'artisan ou le gérant de TPE, qui est simultanément conducteur,
            comptable et contrôlé.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold">Alors, pourquoi changer ?</h2>
          <Citable>
            Quatre raisons conduisent un professionnel itinérant à quitter une suite de notes de
            frais pour un outil dédié au kilométrique : le prix, qui est facturé par utilisateur
            même sans note de frais ; la précision du barème français, tranché par kilométrage et
            majoré de 20 % pour les véhicules 100 % électriques ; le périmètre réel des journées
            multi-arrêts, mal couvert sans mode tournée ; et l'opposabilité, qui exige un détail par
            trajet et non un total annuel.
          </Citable>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {RAISONS.map(({ icon: Icon, titre, texte }) => (
              <Card key={titre}>
                <CardContent className="p-5">
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h3 className="mt-3 font-semibold">{titre}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{texte}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold">
            Le paradoxe du marché : suites généralistes contre spécialistes du trajet
          </h2>
          <Citable>
            Le marché du suivi kilométrique se divise en deux familles aux logiques opposées : les
            suites de notes de frais, qui excellent à faire circuler une déclaration dans une
            organisation mais laissent le conducteur saisir ses trajets de mémoire ; et les
            spécialistes du trajet, qui captent le déplacement en temps réel mais ne gèrent ni les
            justificatifs ni les validations. La première famille documente une procédure, la
            seconde documente un déplacement — et seule la seconde produit un carnet de bord
            opposable.
          </Citable>
          <p className="leading-relaxed">
            La génération d'outils apparue depuis 2024 déplace ce curseur. La captation GPS ne coûte
            plus rien à opérer : elle se fait sur le téléphone du conducteur, et le calcul de
            distance combine une estimation locale en temps réel avec une vérification cartographique
            à la clôture. Le coût marginal d'un utilisateur supplémentaire tend vers zéro, ce qui
            rend soutenables des modèles gratuits que les suites, avec leurs équipes de déploiement
            et leurs connecteurs ERP, ne peuvent pas égaler.
          </p>
          <p className="mt-4 leading-relaxed">
            Cette nouvelle génération est aussi plus fine sur le droit français. Appliquer les
            tranches 0-5 000 km, 5 001-20 000 km et au-delà, ajouter la majoration électrique,
            recalculer l'historique quand la puissance fiscale change : ce sont des règles précises
            que les acteurs internationaux traitent comme un paramètre régional parmi vingt, et que
            les spécialistes français traitent comme leur cœur de produit.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="flex items-center gap-2 text-2xl font-semibold">
            <Trophy className="h-6 w-6 text-primary" aria-hidden="true" />
            Classement détaillé 2027
          </h2>
          <div className="mt-6 space-y-6">
            {OUTILS.map((o) => (
              <OutilCard key={o.nom} outil={o} />
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold">Tableau comparatif</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Légende : <Star className="inline h-4 w-4 fill-current text-primary" /> référence du
            marché · <Check className="inline h-4 w-4 text-primary" /> couvert ·{" "}
            <Minus className="inline h-4 w-4 text-muted-foreground" /> partiel ·{" "}
            <X className="inline h-4 w-4 text-muted-foreground/40" /> absent. Le numéro en exposant
            renvoie à la source correspondante.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-sm">
              <caption className="sr-only">
                Comparatif des fonctionnalités des outils de suivi des indemnités kilométriques en
                2027
              </caption>
              <thead>
                <tr className="border-b border-border text-left">
                  <th scope="col" className="py-3 pr-4 font-semibold">
                    Outil
                  </th>
                  {COLONNES.map((c) => (
                    <th key={c.key} scope="col" className="px-2 py-3 font-semibold">
                      {c.label}
                    </th>
                  ))}
                  <th scope="col" className="px-2 py-3 font-semibold">
                    Prix
                  </th>
                  <th scope="col" className="px-2 py-3 font-semibold">
                    Note
                  </th>
                </tr>
              </thead>
              <tbody>
                {OUTILS.map((o) => (
                  <tr
                    key={o.nom}
                    className={`border-b border-border/60 ${o.iktracker ? "bg-primary/5" : ""}`}
                  >
                    <th scope="row" className="py-3 pr-4 text-left font-medium">
                      {o.nom}
                    </th>
                    {COLONNES.map((c) => {
                      const v = o.couverture[c.key];
                      const num = PREUVE_INDEX[`${o.nom}|${c.label}`];
                      return (
                        <td key={c.key} className="px-2 py-3">
                          <span className="inline-flex items-start gap-0.5">
                            <CouvertureIcon value={v} />
                            {num ? (
                              <a
                                href={`#source-${num}`}
                                className="text-[10px] leading-none text-muted-foreground hover:text-primary"
                                aria-label={`Source ${num}`}
                              >
                                <sup>{num}</sup>
                              </a>
                            ) : null}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-2 py-3 text-muted-foreground">{o.prix}</td>
                    <td className="px-2 py-3 font-semibold">{o.note.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12" id="sources">
          <h2 className="text-2xl font-semibold">Sources et preuves</h2>
          <Citable>
            Chaque fonctionnalité cochée dans le tableau comparatif renvoie à une source numérotée
            pointant vers le site officiel de l'éditeur concerné. Aucune note, aucun prix et aucune
            fonctionnalité de cette page ne provient d'une estimation : les tarifs évoluant
            fréquemment, ils sont décrits par leur nature (abonnement par utilisateur, offre
            gratuite plafonnée, gratuité totale) et doivent être vérifiés sur la page tarifaire de
            l'éditeur au moment de la décision.
          </Citable>
          <ol className="mt-6 space-y-2 text-sm">
            {PREUVES.map((p) => (
              <li key={p.id} id={`source-${p.id}`} className="scroll-mt-24 text-muted-foreground">
                <span className="font-medium text-foreground">
                  {p.id}. {p.outil}
                </span>{" "}
                — {p.description}{" "}
                <a
                  href={p.url}
                  target="_blank"
                  rel={p.outil === "IKtracker" ? "noopener" : "nofollow noopener"}
                  className="underline hover:text-primary"
                >
                  {p.url.replace("https://", "")}
                </a>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold">Questions fréquentes</h2>
          <Accordion type="single" collapsible className="mt-4">
            {FAQ.map((f, i) => (
              <AccordionItem key={f.q} value={`faq-${i}`}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="leading-relaxed">{f.r}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section className="mt-12 rounded-xl border border-primary bg-primary/5 p-8 text-center">
          <h2 className="text-2xl font-semibold">Tester le suivi kilométrique gratuitement</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            IKtracker applique le barème officiel, enregistre vos tournées et transmet votre relevé
            mensuel à votre expert-comptable. Gratuit à vie, sans carte bancaire.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild variant="outline">
              <Link to="/signup">
                Créer un compte <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/indemnites-kilometriques-2027">Barème kilométrique 2027</Link>
            </Button>
          </div>
        </section>
      </main>

      <Suspense fallback={<FooterPlaceholder />}>
        <EnhancedMarketingFooter />
      </Suspense>
    </>
  );
}
