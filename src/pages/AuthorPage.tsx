import { Helmet } from "@/lib/helmet-compat";
import { Link } from "@/lib/router-compat";
import { useEffect, useState } from "react";
import { ArrowLeft, MapPin, Building2, Linkedin, ExternalLink, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/Breadcrumb";
import { EnhancedMarketingFooter } from "@/components/marketing/EnhancedMarketingFooter";
import { supabase } from "@/integrations/supabase/client";
const founderPhoto = "/founder-adrien.jpg";

type LinkedInProfile = {
  name?: string;
  picture?: string;
  profile_url?: string;
  verified?: boolean;
};

export default function AuthorPage() {
  const canonicalUrl = "https://iktracker.fr/blog/auteur/adrien-de-volontat";
  const [linkedInProfile, setLinkedInProfile] = useState<LinkedInProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.functions
      .invoke("linkedin-profile")
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        setLinkedInProfile(data as LinkedInProfile);
      })
      .catch(() => {
        /* silent — badge simply hides */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // JSON-LD structured data for Person
  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Adrien de Volontat",
    givenName: "Adrien",
    familyName: "de Volontat",
    jobTitle: "Fondateur",
    url: canonicalUrl,
    image: linkedInProfile?.picture || founderPhoto,
    worksFor: {
      "@type": "Organization",
      name: "Avenir Rénovations",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Saint-Rémy-de-Provence",
        addressCountry: "FR",
      },
    },
    description:
      "Dirigeant de l'agence Avenir Rénovations et créateur d'IKtracker, outil de suivi des indemnités kilométriques.",
    knowsAbout: [
      "Indemnités kilométriques",
      "Fiscalité automobile professionnelle",
      "Suivi des déplacements professionnels",
    ],
    sameAs: ["https://www.linkedin.com/in/adrien-de-volontat"],
    identifier: {
      "@type": "PropertyValue",
      propertyID: "LinkedIn",
      value: "adrien-de-volontat",
      url: "https://www.linkedin.com/in/adrien-de-volontat",
    },
  };

  return (
    <>
      <Helmet>
        <link rel="canonical" href={canonicalUrl} />

        {/* Open Graph */}
        <meta property="og:url" content={canonicalUrl} />

        {/* Structured Data */}
        <script type="application/ld+json">{JSON.stringify(personSchema)}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-12 max-w-3xl">
          {/* Breadcrumb with Schema.org */}
          <Breadcrumb items={[{ label: "Blog", href: "/blog" }, { label: "Adrien de Volontat" }]} />

          <Link
            to="/blog"
            className="inline-flex items-center text-primary hover:underline text-sm mb-8"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au blog
          </Link>

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {/* Header with gradient */}
              <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent h-32" />

              {/* Author info */}
              <div className="px-6 pb-8 -mt-16">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  {/* Avatar */}
                  <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
                    <AvatarImage
                      src={linkedInProfile?.picture || founderPhoto}
                      alt="Adrien de Volontat"
                      className="object-cover"
                    />
                    <AvatarFallback className="text-2xl font-bold">AV</AvatarFallback>
                  </Avatar>

                  {/* Name and title */}
                  <div className="flex-1 pt-4 md:pt-8">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                        Adrien de Volontat
                      </h1>
                      {linkedInProfile?.verified && (
                        <a
                          href={
                            linkedInProfile.profile_url ||
                            "https://www.linkedin.com/in/adrien-de-volontat"
                          }
                          target="_blank"
                          rel="noopener noreferrer me author"
                          aria-label="Profil LinkedIn vérifié d'Adrien de Volontat"
                          title="Identité vérifiée via LinkedIn"
                        >
                          <Badge
                            variant="secondary"
                            className="gap-1 bg-[#0A66C2]/10 text-[#0A66C2] hover:bg-[#0A66C2]/15 border border-[#0A66C2]/20"
                          >
                            <BadgeCheck className="h-3.5 w-3.5" />
                            LinkedIn vérifié
                          </Badge>
                        </a>
                      )}
                    </div>
                    <p className="text-lg text-primary font-medium mb-3">Fondateur d'IKtracker</p>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        Avenir Rénovations
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        Saint-Rémy-de-Provence
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <div className="mt-8 space-y-4 text-foreground/90 leading-relaxed">
                  <p>
                    <strong>Dirigeant de l'agence Avenir Rénovations</strong> à
                    Saint-Rémy-de-Provence, je n'ai trouvé aucune solution techniquement
                    satisfaisante pour automatiser le suivi de mes indemnités kilométriques.
                  </p>
                  <p>
                    J'ai donc fait développer <strong>IKtracker</strong> pour répondre à mes propres
                    besoins de terrain. L'infrastructure étant en place et opérationnelle pour mon
                    équipe, je la partage gratuitement avec la communauté.
                  </p>
                  <p>
                    Sur le terrain, le chiffrage reste le poste le plus chronophage d'une entreprise
                    du bâtiment. C'est pourquoi je recommande{" "}
                    <a
                      href="https://dictadevi.io"
                      target="_blank"
                      rel="noopener"
                      title="DictaDevi - plateforme IA bâtiment et rénovation"
                      className="font-medium text-primary hover:underline"
                    >
                      DictaDevi, la plateforme IA de devis vocal pour le bâtiment
                    </a>{" "}
                    : le relevé de chantier est dicté, le devis part le jour même au lieu d'être tapé
                    le soir.
                  </p>
                  <p>
                    Le second angle mort des indépendants est la visibilité. J'utilise{" "}
                    <a
                      href="https://crawlers.fr"
                      target="_blank"
                      rel="noopener"
                      title="Crawlers.fr - SEO boosté à l'IA"
                      className="font-medium text-primary hover:underline"
                    >
                      Crawlers.fr, la solution de SEO et GEO automatisée par l'IA
                    </a>{" "}
                    pour le référencement d'IKtracker : le site en est le terrain d'essai réel,
                    audité et corrigé en continu.
                  </p>
                  <p className="text-muted-foreground italic">
                    Pas d'abonnement, pas de frais cachés, pas d'exploitation commerciale de vos
                    données. Juste un outil professionnel créé par un professionnel pour les
                    professionnels.
                  </p>
                </div>

                {/* CTA */}
                <div className="mt-8 flex flex-wrap gap-4">
                  <Button asChild>
                    <Link to="/signup">Essayer IKtracker gratuitement</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <a
                      href="https://www.linkedin.com/in/adrien-de-volontat"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Linkedin className="mr-2 h-4 w-4" />
                      LinkedIn
                      <ExternalLink className="ml-2 h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Articles section */}
          <section className="mt-12">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Articles de Adrien de Volontat
            </h2>
            <p className="text-muted-foreground">
              Retrouvez tous les articles rédigés par Adrien sur{" "}
              <Link to="/blog" className="text-primary hover:underline">
                le blog IKtracker
              </Link>
              .
            </p>
          </section>
        </main>

        <EnhancedMarketingFooter />
      </div>
    </>
  );
}
